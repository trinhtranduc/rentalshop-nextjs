//
//  ProductsV2.swift
//  POS ADBD
//
//  Pure rules of the redesigned products, product form and cart (#373, flag `newProducts`).
//  No UIKit here; the screens in `Viewcontrollers/Products/v2/` read these and the unit tests cover them.
//

import Foundation

// MARK: - Who may do what

/// Product rights by role and permissions. The API is the real gate (`products.update` for PUT, pricing fields
/// stripped without `products.manage`); these only decide which controls are shown.
enum ProductAccess {
    static func canCreate(role: Role?, permissions: [String]) -> Bool {
        permissions.contains("products.manage") || permissions.contains("products.create")
    }

    /// `OUTLET_STAFF` never edits a product, whatever the permission list says
    static func canEdit(role: Role?, permissions: [String]) -> Bool {
        guard role != .outletStaff else { return false }
        return permissions.contains("products.manage") || permissions.contains("products.update")
    }

    /// `DELETE /api/products/{id}` needs `products.manage`; never `OUTLET_STAFF` (#390)
    static func canDelete(role: Role?, permissions: [String]) -> Bool {
        guard role != .outletStaff else { return false }
        return permissions.contains("products.manage")
    }

    /// Price fields in the form and price edits in the cart
    static func showsPriceFields(role: Role?, permissions: [String]) -> Bool {
        guard role != .outletStaff else { return false }
        return permissions.contains("products.manage")
    }

    static var currentRole: Role? { User.current()?.role }
    static var currentPermissions: [String] { User.current()?.permissions ?? [] }
}

// MARK: - Prices of a product

enum ProductPricingMode: String {
    case perRental = "FIXED"
    case perDay = "DAILY"
}

enum ProductPricing {
    private static func activeOptions(_ product: Product) -> [PricingOption] {
        (product.pricingOptions ?? []).filter { $0.isActive != false }
    }

    /// Price per rental ("Theo lần"); nil when the product has none
    static func perRental(_ product: Product) -> Double? {
        let options = activeOptions(product)
        if options.isEmpty {
            guard !product.isDailyPricing else { return nil }
            let price = product.rentPrice ?? product.rent
            return price > 0 ? price : nil
        }
        guard let price = options.first(where: { $0.type.uppercased() == ProductPricingMode.perRental.rawValue })?.price,
              price > 0 else { return nil }
        return price
    }

    /// Price per day ("Theo ngày"); nil when the product has none
    static func perDay(_ product: Product) -> Double? {
        let options = activeOptions(product)
        if options.isEmpty {
            guard product.isDailyPricing else { return nil }
            let price = product.rentPrice ?? product.rent
            return price > 0 ? price : nil
        }
        guard let price = options.first(where: { $0.type.uppercased() == ProductPricingMode.perDay.rawValue })?.price,
              price > 0 else { return nil }
        return price
    }

    static func sale(_ product: Product) -> Double? {
        let price = product.salePrice ?? product.sale
        return price > 0 ? price : nil
    }

    static func defaultMode(_ product: Product) -> ProductPricingMode {
        let type = product.defaultPricingOption?.type.uppercased() ?? product.pricingType?.uppercased()
        return type == ProductPricingMode.perDay.rawValue ? .perDay : .perRental
    }

    /// Options sent on save. The API keeps one default and copies its price into `rentPrice`.
    /// A default without a price falls back to the mode that has one.
    static func options(perRental: Double?, perDay: Double?, defaultMode: ProductPricingMode) -> [PricingOptionRequest] {
        let fixed = (perRental ?? 0) > 0 ? perRental : nil
        let daily = (perDay ?? 0) > 0 ? perDay : nil
        var mode = defaultMode
        if mode == .perDay && daily == nil { mode = .perRental }
        if mode == .perRental && fixed == nil && daily != nil { mode = .perDay }
        var result: [PricingOptionRequest] = []
        if let fixed {
            result.append(PricingOptionRequest(type: ProductPricingMode.perRental.rawValue, price: fixed, isDefault: mode == .perRental))
        }
        if let daily {
            result.append(PricingOptionRequest(type: ProductPricingMode.perDay.rawValue, price: daily, isDefault: mode == .perDay))
        }
        return result
    }
}

// MARK: - Stock

struct ProductStockCounts: Equatable {
    let total: Int
    let rented: Int
    let free: Int
}

enum ProductStock {
    /// Rented and free units. With `outletId`, the row of that outlet; else the product totals
    /// (rented = total − available when the API sends no `renting`).
    static func counts(_ product: Product, outletId: Int? = nil) -> ProductStockCounts {
        if let outletId, let row = product.outletStock?.first(where: { $0.outletId == outletId }) {
            let stock = row.stock ?? 0
            let rented = row.renting ?? max(0, stock - (row.available ?? stock))
            return ProductStockCounts(total: stock, rented: rented, free: max(0, stock - rented))
        }
        let total = product.totalStock ?? product.quantity
        let rented: Int
        if let renting = product.renting {
            rented = renting
        } else if let available = product.available {
            rented = max(0, total - available)
        } else {
            rented = 0
        }
        return ProductStockCounts(total: total, rented: rented, free: max(0, total - rented))
    }

    /// Free today for the list badge ("Còn N" / "Hết hôm nay")
    static func freeToday(_ product: Product) -> Int {
        product.effectiveAvailableToday ?? product.available ?? counts(product).free
    }
}

// MARK: - Home row (#383)

/// The + button on a Home row: add, already in the cart (shows the count), or out today (grey)
enum ProductAddState: Equatable {
    case add
    case inCart(Int)
    case out
}

/// The line under the name: the product code and today's free count (no category)
struct ProductRowSubtitle: Equatable {
    let code: String?
    let free: Int
}

enum ProductRowLogic {
    /// The id the cart stores for this product (same rule as `CartItem(from:)`)
    static func cartId(_ product: Product) -> Int {
        product.product_id != 0 ? product.product_id : (product.id ?? 0)
    }

    /// Units of this product already in the cart
    static func cartCount(productId: Int, in items: [CartItem]) -> Int {
        items.filter { $0.productId == productId }.reduce(0) { $0 + $1.quantity }
    }

    static func subtitle(_ product: Product) -> ProductRowSubtitle {
        let code = product.barcode?.trimmingCharacters(in: .whitespacesAndNewlines)
        let valid = code.flatMap { $0.isEmpty || $0.lowercased() == "null" ? nil : $0 }
        return ProductRowSubtitle(code: valid, free: ProductStock.freeToday(product))
    }

    /// Out today wins over the cart count, so the button stays grey as before
    static func addState(free: Int, inCart: Int) -> ProductAddState {
        if free <= 0 { return .out }
        return inCart > 0 ? .inCart(inCart) : .add
    }
}

// MARK: - Barcode

enum BarcodeMatch {
    /// The product whose barcode equals the scanned code (trimmed, case-insensitive). The search API also matches
    /// names, so a scan keeps only an exact barcode.
    static func exact(_ code: String, in products: [Product]) -> Product? {
        let wanted = code.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !wanted.isEmpty else { return nil }
        return products.first {
            ($0.barcode ?? "").trimmingCharacters(in: .whitespacesAndNewlines).caseInsensitiveCompare(wanted) == .orderedSame
        }
    }
}

// MARK: - Form

struct ProductFormInput {
    var name: String
    var perRental: Double?
    var perDay: Double?
    var defaultMode: ProductPricingMode
    var salePrice: Double?
    var deposit: Double?
    var quantity: Int
    /// Units out on rent now (edit only); quantity may not go below it
    var rented: Int
    var photoCount: Int
    var showsPrices: Bool
}

enum ProductFormIssue: Equatable {
    case nameRequired
    case negativeAmount
    case perDayDefaultNeedsPrice
    case negativeQuantity
    case quantityBelowRented(Int)
    case tooManyPhotos(Int)

    var message: String {
        switch self {
        case .nameRequired: return "products.form.error.name".localized()
        case .negativeAmount: return "products.form.error.negative".localized()
        case .perDayDefaultNeedsPrice: return "products.form.error.dailyDefault".localized()
        case .negativeQuantity: return "products.form.error.quantity".localized()
        case .quantityBelowRented(let rented): return String(format: "products.form.error.belowRented".localized(), rented)
        case .tooManyPhotos(let max): return String(format: "products.form.error.photos".localized(), max)
        }
    }
}

enum ProductFormValidator {
    static let maxPhotos = 5

    static func validate(_ input: ProductFormInput) -> [ProductFormIssue] {
        var issues: [ProductFormIssue] = []
        if input.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            issues.append(.nameRequired)
        }
        var amounts = [input.deposit]
        if input.showsPrices {
            amounts += [input.perRental, input.perDay, input.salePrice]
        }
        if amounts.contains(where: { ($0 ?? 0) < 0 }) {
            issues.append(.negativeAmount)
        }
        if input.showsPrices && input.defaultMode == .perDay && (input.perDay ?? 0) <= 0 {
            issues.append(.perDayDefaultNeedsPrice)
        }
        if input.quantity < 0 {
            issues.append(.negativeQuantity)
        } else if input.quantity < input.rented {
            issues.append(.quantityBelowRented(input.rented))
        }
        if input.photoCount > maxPhotos {
            issues.append(.tooManyPhotos(maxPhotos))
        }
        return issues
    }
}

// MARK: - Cart

/// What one cart line costs and how the cart explains it ("150.000/ngày × 3 ngày")
struct CartLineCalc: Equatable {
    enum Unit: Equatable { case perRental, perDay(days: Int), sale }
    let unitPrice: Double
    let unit: Unit
    let quantity: Int
    let total: Double

    var text: String {
        let price = MoneyFormatter.format(unitPrice)
        switch unit {
        case .sale:
            return String(format: "products.cart.calc.sale".localized(), price, quantity)
        case .perRental:
            return String(format: "products.cart.calc.perRental".localized(), price, quantity)
        case .perDay(let days):
            let base = PluralText.format("products.cart.calc.perDay", count: days, price, days)
            return quantity > 1 ? base + " × \(quantity)" : base
        }
    }
}

enum CartV2Logic {
    static func calc(_ item: CartItem, orderType: OrderType) -> CartLineCalc {
        let unit: CartLineCalc.Unit
        if orderType == .sale {
            unit = .sale
        } else if item.isDailyPricing {
            unit = .perDay(days: max(1, item.rentalDays))
        } else {
            unit = .perRental
        }
        return CartLineCalc(unitPrice: item.price, unit: unit, quantity: item.quantity, total: item.subTotal(for: orderType))
    }

    /// "Theo lần / Theo ngày" only when the product has a price for both
    static func offersBothModes(_ item: CartItem) -> Bool {
        let options = (item.pricingOptions ?? []).filter { $0.isActive != false && $0.price > 0 }
        let types = Set(options.map { $0.type.uppercased() })
        return types.contains(ProductPricingMode.perRental.rawValue) && types.contains(ProductPricingMode.perDay.rawValue)
    }

    /// Units free for the chosen dates (rent) or in stock today (sale), from batch availability; nil = not loaded
    static func shortage(_ item: CartItem) -> Int? {
        guard let status = item.availabilityStatus, status.available < item.quantity else { return nil }
        return max(0, status.available)
    }

    /// Paid now: the prepaid deposit for a rental, the order total for a sale
    static func collectNow(_ cart: Cart) -> Double {
        cart.orderType == .rent ? cart.depositAmount : cart.amountDue
    }

    /// Inclusive civil days between pickup and return ("T7 03/10 → T2 05/10" = 3 ngày)
    static func rentalDays(pickup: Date, return returnDate: Date, timeZone: TimeZone = .current) -> Int {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        let days = calendar.dateComponents([.day], from: calendar.startOfDay(for: pickup),
                                           to: calendar.startOfDay(for: returnDate)).day ?? 0
        return max(1, days + 1)
    }

    /// Where the cart's "+ Add" goes (#433)
    enum AddMoreRoute: Equatable {
        case pop
        case openHomeTab
    }

    /// The product list: one step back when the cart came from Products Home, else the Home tab
    /// (the cart opened from a customer would otherwise go back to the customer page)
    static func addMoreRoute(previousIsProductsHome: Bool) -> AddMoreRoute {
        previousIsProductsHome ? .pop : .openHomeTab
    }
}

// MARK: - Inputs

enum MoneyInput {
    /// "1.250.000" → 1250000; empty → nil
    static func parse(_ text: String?) -> Double? {
        let digits = (text ?? "").filter { $0.isNumber }
        guard !digits.isEmpty else { return nil }
        return Double(digits)
    }

    /// 1250000 → "1.250.000"
    static func display(_ value: Double?) -> String {
        guard let value else { return "" }
        return MoneyFormatter.format(value)
    }
}

enum ProductOutletChoice {
    /// Outlet whose stock the form writes: the user's outlet, else the product's first outlet row,
    /// else the merchant's default (or first) outlet
    static func outletId(userOutletId: Int?, product: Product?, merchantOutlets: [(id: Int, isDefault: Bool)]) -> Int? {
        if let userOutletId { return userOutletId }
        if let row = product?.outletStock?.first(where: { $0.outletId != nil })?.outletId { return row }
        return (merchantOutlets.first(where: { $0.isDefault }) ?? merchantOutlets.first)?.id
    }
}
