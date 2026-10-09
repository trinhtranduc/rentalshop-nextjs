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

// MARK: - Categories from the product form (#632)

/// Same gates as the API: `POST /api/categories` needs `products.manage` (MERCHANT, OUTLET_ADMIN);
/// `PUT`/`DELETE /api/categories/{id}` only MERCHANT (and ADMIN). Same name rule as the web form.
enum CategoryRules {
    static let nameMin = 2
    static let nameMax = 50

    enum NameError: Equatable { case required, tooShort, tooLong }

    static func canAdd(role: Role?, permissions: [String]) -> Bool {
        guard role != .outletStaff else { return false }
        return permissions.contains("products.manage")
    }

    /// Rename / delete: owners, and Nhân viên kho (#682); the API refuses outlet admins
    static func canManage(role: Role?) -> Bool {
        role == .merchant || role == .admin || role == .outletInventory
    }

    /// The default category ("General") is never deleted, only renamed
    static func canDelete(_ category: Category) -> Bool {
        category.isDefault != true
    }

    /// Search box of the category screen: accent- and case-insensitive ("ao cuoi" finds "Áo cưới"); blank keeps all
    static func matches(_ name: String?, query: String) -> Bool {
        let needle = fold(query)
        return needle.isEmpty || fold(name ?? "").contains(needle)
    }

    private static func fold(_ text: String) -> String {
        text.trimmingCharacters(in: .whitespacesAndNewlines)
            .folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "vi_VN"))
            .replacingOccurrences(of: "đ", with: "d")
    }

    static func validateName(_ name: String) -> NameError? {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { return .required }
        if trimmed.count < nameMin { return .tooShort }
        if trimmed.count > nameMax { return .tooLong }
        return nil
    }
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

    /// The cart count wins (#677): a product out today that is already in the cart still shows its count
    static func addState(free: Int, inCart: Int) -> ProductAddState {
        if inCart > 0 { return .inCart(inCart) }
        return free <= 0 ? .out : .add
    }
}

// MARK: - Full-screen photos (#472)

/// What the full-screen viewer shows: the photos and the one it opens at
struct ProductImageViewerRequest: Equatable {
    let urls: [String]
    let startIndex: Int
}

enum ProductImages {
    /// The product's photos in pager order: `images` without blanks, else `image_url` (same list as the detail pager)
    static func viewerUrls(_ product: Product) -> [String] {
        let images = (product.images ?? []).filter { !isBlank($0) }
        if !images.isEmpty { return images }
        guard let url = product.image_url, !isBlank(url) else { return [] }
        return [url]
    }

    /// The URL the Home row thumbnail loads (`image_url`, else the first of `images`); nil means the placeholder
    static func thumbnailUrl(_ product: Product) -> String? {
        guard let url = product.image_url ?? product.images?.first, !isBlank(url) else { return nil }
        return url
    }

    /// A tap on the Home row thumbnail: the viewer at that photo, or nil (placeholder) so the row opens detail
    static func thumbnailTap(_ product: Product) -> ProductImageViewerRequest? {
        guard let thumb = thumbnailUrl(product) else { return nil }
        let urls = viewerUrls(product)
        guard !urls.isEmpty else { return nil }
        return ProductImageViewerRequest(urls: urls, startIndex: urls.firstIndex(of: thumb) ?? 0)
    }

    /// A tap on the detail photo pager: the viewer at the page on screen (clamped), or nil without photos
    static func detailTap(_ product: Product, page: Int) -> ProductImageViewerRequest? {
        let urls = viewerUrls(product)
        guard !urls.isEmpty else { return nil }
        return ProductImageViewerRequest(urls: urls, startIndex: min(max(page, 0), urls.count - 1))
    }

    private static func isBlank(_ value: String) -> Bool {
        value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
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
/// One row of the "Cách tính giá" sheet (#482)
struct CartPricingChoice: Equatable {
    let type: String
    let catalogPrice: Double?
}

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

    /// "Theo lần / Theo ngày" on every rent line, whatever prices the product has (owner, 2026-10-05)
    static func showsPricingToggle(orderType: OrderType) -> Bool {
        orderType == .rent
    }

    /// A rent line with no price yet (a mode the product has no price for): the cart asks for one
    static func needsPrice(_ item: CartItem, orderType: OrderType) -> Bool {
        orderType == .rent && item.price <= 0
    }

    // MARK: Pricing sheet (#482, board Gio-hang-chon-gia)

    /// "150.000đ"
    static func money(_ amount: Double) -> String {
        MoneyFormatter.format(amount) + "đ"
    }

    /// "Theo lần", "Theo ngày", "Theo block", "Theo giờ"; another type reads as sent
    static func pricingLabel(_ type: String) -> String {
        switch type.uppercased() {
        case ProductPricingMode.perRental.rawValue: return "products.price.perRental".localized()
        case ProductPricingMode.perDay.rawValue: return "products.price.perDay".localized()
        case "BLOCK": return "products.cart.pricing.block".localized()
        case "HOURLY": return "products.cart.pricing.hourly".localized()
        default: return type.capitalized
        }
    }

    /// The rows of the sheet: Theo lần and Theo ngày always, then every other active option type of the product, each
    /// with its catalog price (nil = "Nhập giá")
    static func pricingChoices(_ item: CartItem) -> [CartPricingChoice] {
        let options = (item.pricingOptions ?? []).filter { $0.isActive != false }
        var types = [ProductPricingMode.perRental.rawValue, ProductPricingMode.perDay.rawValue]
        for option in options where !types.contains(option.type.uppercased()) {
            types.append(option.type.uppercased())
        }
        return types.map { type in
            let price = options.first { $0.type.uppercased() == type && $0.price > 0 }?.price
            return CartPricingChoice(type: type, catalogPrice: price)
        }
    }

    /// The line's pricing type (FIXED when it has none)
    static func currentType(_ item: CartItem) -> String {
        item.pricingType?.uppercased() ?? ProductPricingMode.perRental.rawValue
    }

    /// Price the field shows for a row: the line's price for its own mode, a price typed earlier for that mode, the
    /// catalog price, else 0
    static func startPrice(_ item: CartItem, type: String) -> Double {
        let type = type.uppercased()
        if type == currentType(item) { return item.price }
        let catalog = pricingChoices(item).first { $0.type == type }?.catalogPrice
        switch type {
        case ProductPricingMode.perDay.rawValue: return item.customDailyPrice ?? catalog ?? 0
        case ProductPricingMode.perRental.rawValue: return item.customFixedPrice ?? catalog ?? 0
        default: return catalog ?? 0
        }
    }

    /// The chip of a line: "Theo ngày" + "150.000đ/ngày × 2 ngày" ("Giá bán" on a sale); price nil = "Nhập giá".
    /// #684 (Dòng gọn): the chip carries the line's numbers, so a daily price over several days shows the days too
    static func chip(_ item: CartItem, orderType: OrderType) -> (label: String, price: String?) {
        let label = orderType == .sale ? "products.cart.pricing.sale".localized() : pricingLabel(currentType(item))
        guard item.price > 0 else { return (label, nil) }
        var price = priceText(item.price, type: currentType(item), orderType: orderType)
        if orderType == .rent, item.isDailyPricing, item.rentalDays > 1 {
            price += " × " + PluralText.format("products.cart.days", count: item.rentalDays, item.rentalDays)
        }
        return (label, price)
    }

    /// #684 (owner): the cart line's blue link reads price first — "200.000đ / theo lần", "400.000đ / theo ngày × 3 ngày",
    /// "900.000đ / giá bán"; `amount` nil = no price yet ("Nhập giá / theo lần")
    static func link(_ item: CartItem, orderType: OrderType) -> (amount: String?, unit: String) {
        let label = orderType == .sale ? "products.cart.pricing.sale".localized() : pricingLabel(currentType(item))
        var unit = label.lowercased(with: Locale(identifier: "vi_VN"))
        if orderType == .rent, item.isDailyPricing, item.rentalDays > 1 {
            unit += " × " + PluralText.format("products.cart.days", count: item.rentalDays, item.rentalDays)
        }
        return (item.price > 0 ? money(item.price) : nil, unit)
    }

    /// "150.000đ/ngày" for a daily rent price, "350.000đ" otherwise
    static func priceText(_ price: Double, type: String, orderType: OrderType) -> String {
        guard orderType == .rent, type.uppercased() == ProductPricingMode.perDay.rawValue else { return money(price) }
        return String(format: "products.cart.pricing.perDaySuffix".localized(), money(price))
    }

    /// Live preview under the field: "130.000đ × 3 ngày × 1" and its total (days only for a daily rent price)
    static func pricePreview(type: String, price: Double, days: Int, quantity: Int, orderType: OrderType) -> (text: String, total: Double) {
        if orderType == .rent && type.uppercased() == ProductPricingMode.perDay.rawValue {
            let days = max(1, days)
            let dayText = PluralText.format("products.cart.days", count: days, days)
            return ("\(money(price)) × \(dayText) × \(quantity)", price * Double(days) * Double(quantity))
        }
        return ("\(money(price)) × \(quantity)", price * Double(quantity))
    }

    /// #684: a line's note as shown and sent: trimmed; nil when blank (an empty sheet clears the note)
    static func noteText(_ note: String?) -> String? {
        let trimmed = (note ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }

    /// "Nhập giá cho …" for each rent line without a price; shown in the "Lỗi" alert before Tạo đơn
    static func missingPrices(_ cart: Cart) -> [String] {
        cart.items.filter { needsPrice($0, orderType: cart.orderType) }
            .map { String(format: "products.cart.needPrice".localized(), $0.productName ?? "") }
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

    /// Days tapped in the device-zone date picker → the cart's instants (#596): pickup at the first second of the
    /// first shop day, return at the last second of the last shop day (`[D-1T17:00:00Z, DT16:59:59Z]` for Vietnam).
    /// On a phone set to the shop zone this is the old `start.startOfDay()` / `max(start, end).endOfDay()`.
    static func rentalBounds(pickedStart: Date, pickedEnd: Date) -> (pickup: Date, return: Date) {
        (pickedStart.shopDayFromDevicePick().startOfShopDay(),
         max(pickedStart, pickedEnd).shopDayFromDevicePick().endOfShopDay())
    }

    /// Inclusive civil days between pickup and return ("T7 03/10 → T2 05/10" = 3 ngày)
    static func rentalDays(pickup: Date, return returnDate: Date, timeZone: TimeZone = Date.shopTimeZone) -> Int {
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

    /// What the cart button opens: a new order is confirmed in a sheet on the cart (#476); an edited order in the
    /// "Lưu thay đổi" sheet (#676). The old review screen is no longer used from this cart.
    enum CtaRoute: Equatable {
        case confirmSheet
        case editSheet
    }

    static func ctaRoute(isEditMode: Bool) -> CtaRoute {
        isEditMode ? .editSheet : .confirmSheet
    }

    /// The cart button: "Lưu thay đổi" for an edited order (#676), else "Tạo đơn" / "Bán & thu tiền"
    static func ctaTitleKey(isEditMode: Bool, isRent: Bool) -> String {
        if isEditMode { return "products.cart.edit.save" }
        return isRent ? "products.cart.create" : "products.cart.sellAndCollect"
    }

    /// #677: the action on the Home cart bar: "Sửa đơn #482913" (or "Sửa đơn") while the cart edits an order, else
    /// "Tạo đơn"
    static func cartBarAction(isEditMode: Bool, number: String?) -> String {
        guard isEditMode else { return "products.cart.create".localized() }
        return number.map { String(format: "products.cart.edit.title".localized(), $0) } ?? "products.cart.editTitle".localized()
    }
}

// MARK: - Edit order (#676, board sua-don)

/// "Sửa đơn #482913" + "Heather Robinson · Đơn thuê" on the cart while it edits an order
struct EditOrderHeader: Equatable {
    /// Short order number; nil for a draft saved before #676 (title "Sửa đơn")
    let number: String?
    /// `Heather Robinson · Đơn thuê`
    let subtitle: String
}

/// "Lưu thay đổi đơn #482913?" sheet content
struct EditOrderConfirm: Equatable {
    let number: String?
    let isSale: Bool
    /// `Heather Robinson · Đơn thuê`
    let subtitle: String
    /// `10/10 → 12/10`; nil for a sale
    let range: String?
    let days: Int?
    /// Units in the cart ("2 món")
    let itemCount: Int
    let total: Double
    /// "Đã thu" (#677): booking deposit + payments made toward the order, never thế chân; nil hides the row
    let paid: Double?
    /// "Thu khi giao" (#677): what Giao đồ will ask after saving (hand-over formula with the new total); rentals still
    /// booked only, else nil
    let collectAtHandOver: Double?
    let datesChanged: Bool
    let itemsChanged: Bool

    var itemsKey: String { isSale ? "products.cart.edit.saleItems" : "products.cart.edit.rentItems" }
}

enum EditOrderSheetLogic {
    static func typeKey(isSale: Bool) -> String {
        isSale ? "products.cart.edit.saleType" : "products.cart.edit.rentType"
    }

    static func subtitle(_ cart: Cart) -> String {
        let customer = cart.customer.map(CustomersV2Logic.displayName) ?? "—"
        return customer + " · " + typeKey(isSale: cart.orderType == .sale).localized()
    }

    /// Nil while the cart creates a new order
    static func header(_ cart: Cart) -> EditOrderHeader? {
        guard cart.isEditMode else { return nil }
        return EditOrderHeader(number: number(cart), subtitle: subtitle(cart))
    }

    static func number(_ cart: Cart) -> String? {
        guard let raw = cart.editOriginal?.orderNumber, !raw.isEmpty else { return nil }
        return OrdersHomeLogic.shortNumber(raw)
    }

    /// #677 "Huỷ sửa" confirm title: "Huỷ sửa đơn #482913?" (or "Huỷ sửa đơn này?")
    static func cancelTitle(number: String?) -> String {
        number.map { String(format: "products.cart.edit.cancelTitle".localized(), $0) }
            ?? "products.cart.edit.cancelTitleNoNumber".localized()
    }

    /// #677: "Huỷ sửa" leaves edit mode and empties the cart; the order to show again (nil = not editing)
    static func cancelEdit(_ cart: Cart) -> Int? {
        cart.isEditMode ? cart.orderId : nil
    }

    static func confirm(_ cart: Cart, timeZone: TimeZone = Date.shopTimeZone) -> EditOrderConfirm {
        let isSale = cart.orderType == .sale
        var range: String?
        var days: Int?
        if !isSale, let pickup = cart.pickupPlanAt, let ret = cart.returnPlanAt {
            range = CreateOrderSheetLogic.dayMonth(pickup, timeZone: timeZone) + " → " + CreateOrderSheetLogic.dayMonth(ret, timeZone: timeZone)
            days = CartV2Logic.rentalDays(pickup: pickup, return: ret, timeZone: timeZone)
        }
        let original = cart.editOriginal
        let paid = collected(cart)
        return EditOrderConfirm(
            number: number(cart),
            isSale: isSale,
            subtitle: subtitle(cart),
            range: range,
            days: days,
            itemCount: cart.itemCount,
            total: cart.totalAmount,
            paid: paid > 0 ? paid : nil,
            collectAtHandOver: collectAtHandOver(cart),
            datesChanged: !isSale && datesChanged(cart, original: original, timeZone: timeZone),
            itemsChanged: itemsChanged(cart, original: original)
        )
    }

    /// #677 "Đã thu": a rental's booking deposit (`depositAmount`) plus the payments the hand-over counts as paid
    /// before (PICKUP); a sale's SALE payments. Never thế chân. A draft saved before #677 has no payment notes: all
    /// its payments count, as before.
    static func collected(_ cart: Cart) -> Double {
        let isSale = cart.orderType == .sale
        let deposit = isSale ? 0 : cart.depositAmount
        guard let original = cart.editOriginal else { return deposit }
        guard let payments = original.payments else { return deposit + original.paid }
        return deposit + OrderDetailLogic.paid(payments, purpose: isSale ? "SALE" : "PICKUP")
    }

    /// #677 "Thu khi giao": `OrderDetailLogic.handOver(...).due` with the cart's new total, deposit and thế chân, so
    /// it matches Giao đồ after the save. Only for a rental still booked (RESERVED).
    static func collectAtHandOver(_ cart: Cart) -> Double? {
        guard cart.orderType == .rent, let original = cart.editOriginal, original.status == .reserved else { return nil }
        return OrderDetailLogic.handOver(total: cart.totalAmount, deposit: cart.depositAmount,
                                         securityDeposit: cart.manualSecurityDeposit ?? 0,
                                         payments: original.payments ?? []).due
    }

    /// "Đã đổi" on Ngày thuê: the pickup or return shop day differs from the loaded order (times inside a day do not
    /// count: the cart moves a picked day to its first / last second). Unknown original = no tag.
    static func datesChanged(_ cart: Cart, original: CartEditOriginal?, timeZone: TimeZone = Date.shopTimeZone) -> Bool {
        guard let original else { return false }
        return dayKey(cart.pickupPlanAt, timeZone) != dayKey(original.pickupPlanAt, timeZone)
            || dayKey(cart.returnPlanAt, timeZone) != dayKey(original.returnPlanAt, timeZone)
    }

    /// "Đã đổi" on Đồ thuê / Đồ bán: a line added or removed, or a line's quantity, price or pricing type changed.
    /// Line order does not count. Unknown original = no tag.
    static func itemsChanged(_ cart: Cart, original: CartEditOriginal?) -> Bool {
        guard let original else { return false }
        return sorted(CartEditOriginal.lines(of: cart)) != sorted(original.lines)
    }

    private static func sorted(_ lines: [CartEditOriginal.Line]) -> [CartEditOriginal.Line] {
        lines.sorted { a, b in
            if a.productId != b.productId { return a.productId < b.productId }
            if a.quantity != b.quantity { return a.quantity < b.quantity }
            if a.unitPrice != b.unitPrice { return a.unitPrice < b.unitPrice }
            return a.pricingType < b.pricingType
        }
    }

    private static func dayKey(_ date: Date?, _ timeZone: TimeZone) -> String? {
        guard let date else { return nil }
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        let parts = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", parts.year ?? 0, parts.month ?? 0, parts.day ?? 0)
    }
}

// MARK: - Create order sheet (#476, boards Gio-hang-xac-nhan, Gio-hang-da-tao)

/// "Tạo đơn thuê?" / "Bán & thu tiền?" sheet content
struct CreateOrderConfirm: Equatable {
    let isSale: Bool
    let customer: String
    /// `03/10 → 05/10`; nil for a sale
    let range: String?
    /// Inclusive civil days; nil for a sale
    let days: Int?
    /// `Vest đen slim fit, Áo dài lụa đỏ ×2`
    let items: String
    let total: Double
    /// Prepaid deposit (rent) or amount due (sale)
    let collect: Double

    var titleKey: String { isSale ? "products.cart.confirm.saleTitle" : "products.cart.confirm.rentTitle" }
    var collectKey: String { isSale ? "products.cart.confirm.collectSale" : "products.cart.confirm.collectDeposit" }
}

/// "Đã tạo đơn #0063" sheet content
struct CreatedOrderSummary: Equatable {
    let shortNumber: String
    /// `Trần Văn Minh · 03/10 → 05/10` (sale: the customer)
    let subtitle: String
    let paid: Double
    let isSale: Bool

    var paidKey: String { isSale ? "products.cart.created.paidSale" : "products.cart.created.paidDeposit" }
}

enum CreateOrderSheetLogic {
    static func confirm(_ cart: Cart, timeZone: TimeZone = Date.shopTimeZone) -> CreateOrderConfirm {
        let isSale = cart.orderType == .sale
        var range: String?
        var days: Int?
        if !isSale, let pickup = cart.pickupPlanAt, let ret = cart.returnPlanAt {
            range = dayMonth(pickup, timeZone: timeZone) + " → " + dayMonth(ret, timeZone: timeZone)
            days = CartV2Logic.rentalDays(pickup: pickup, return: ret, timeZone: timeZone)
        }
        let items = cart.items
            .map { item in
                let name = item.productName ?? ""
                return item.quantity > 1 ? "\(name) ×\(item.quantity)" : name
            }
            .joined(separator: ", ")
        return CreateOrderConfirm(
            isSale: isSale,
            customer: cart.customer.map(CustomersV2Logic.displayName) ?? "—",
            range: range,
            days: days,
            items: items,
            total: cart.totalAmount,
            collect: CartV2Logic.collectNow(cart)
        )
    }

    static func created(orderNumber: String, confirm: CreateOrderConfirm) -> CreatedOrderSummary {
        CreatedOrderSummary(
            shortNumber: OrdersHomeLogic.shortNumber(orderNumber),
            subtitle: [confirm.customer, confirm.range].compactMap { $0 }.joined(separator: " · "),
            paid: confirm.collect,
            isSale: confirm.isSale
        )
    }

    /// `03/10`, the civil day in `timeZone`
    static func dayMonth(_ date: Date, timeZone: TimeZone = Date.shopTimeZone) -> String {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        let parts = calendar.dateComponents([.day, .month], from: date)
        return String(format: "%02d/%02d", parts.day ?? 0, parts.month ?? 0)
    }
}

/// One create at a time, one Idempotency-Key per checkout, reused when staff retry after an error (#341)
final class CreateOrderSubmission {
    private(set) var idempotencyKey = UUID().uuidString
    private(set) var inFlight = false

    /// False while a create is already on its way (a double tap)
    func begin() -> Bool {
        guard !inFlight else { return false }
        inFlight = true
        return true
    }

    func failed() {
        inFlight = false
    }

    /// The next cart is a new checkout
    func succeeded() {
        inFlight = false
        idempotencyKey = UUID().uuidString
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
