//
//  OrderShareImage.swift
//  POS ADBD
//
//  #640 (#930): what the order share image says (spec .agent/changes/640-share-image/spec.md, behaviors 1–9), as plain
//  text, built from an order detail, an order or the cart (draft). Pure: no UIKit, no network. The drawing is
//  `OrderShareRenderer`. Same rules as the Android `OrderShareModel`.
//

import Foundation

/// The language of the image: the app's current one (vi or en), never mixed
struct ShareLanguage {
    let bundle: Bundle
    let locale: Locale

    var isVietnamese: Bool { locale.languageCode == "vi" }

    static var current: ShareLanguage { make(code: Bundle.main.preferredLocalizations.first ?? "en") }

    static func make(code: String) -> ShareLanguage {
        let vi = code.lowercased().hasPrefix("vi")
        let bundle = Bundle.main.path(forResource: vi ? "vi-VN" : "en", ofType: "lproj").flatMap(Bundle.init(path:)) ?? .main
        return ShareLanguage(bundle: bundle, locale: Locale(identifier: vi ? "vi" : "en"))
    }

    func text(_ key: String) -> String { bundle.localizedString(forKey: key, value: nil, table: nil) }
    func text(_ key: String, _ args: CVarArg...) -> String { String(format: text(key), arguments: args) }
}

/// The facts the image is made from (one order, or the cart before it is an order)
struct OrderShareSource {
    struct Item: Equatable {
        let name: String
        let quantity: Int
        let total: Double
        /// #930: the item's own note (the order's general note is never on the image)
        var note: String? = nil
        /// #1189: "120.000 (3 ngày) + 2 × 20.000 = 160.000" of a day-block line
        var formula: String? = nil
        /// #1252: "Khối 3 ngày + 2 ngày thêm" of a day-block line
        var blockSummary: String? = nil
    }

    var orderType: OrderType
    var isDraft: Bool
    var status: OrderStatus
    var orderNumber: String
    var shopName: String
    var outletName: String
    var outletPhone: String?
    var outletAddress: String?
    var outletId: Int?
    /// #1308: the order's outlet QR switch (server); nil = off
    var outletPrintBankQr: Bool? = nil
    var customerName: String?
    var customerPhone: String?
    var pickup: Date?
    var returnDate: Date?
    /// Civil days pickup → return, both ends counted (as Android and the detail header); `rentalDuration` only without dates
    var rentalDays: Int?
    var createdAt: Date
    var items: [Item]
    var discount: Double
    var total: Double
    var deposit: Double
    var collateralPapers: String?
    var collateralMoney: Double
    /// #1252: the order's deposit stages (only a client that sends `installments` receives them)
    var hasDepositPlan: Bool? = nil
    var stages: [OrderInstallment]? = nil
    var stageSummary: InstallmentSummary? = nil
}

struct OrderShareModel: Equatable {
    enum Highlight: Equatable { case rent, total, draft }

    struct Line: Equatable {
        let name: String
        let detail: String
        let amount: String
        /// #930: the item's note, under the price line
        let note: String?
        /// #1189: the sum of a day-block line, under its price line
        var formula: String? = nil
    }

    struct Row: Equatable {
        let label: String
        let value: String
    }

    struct Strip: Equatable {
        let pickupLabel: String
        let pickupDay: String
        /// "10 ngày" on a draft; nil on an order (#930: an arrow is drawn)
        let days: String?
        let returnLabel: String
        let returnDay: String
    }

    struct QR: Equatable {
        let title: String
        let payload: String
        let bankName: String
        let accountNumber: String
        let holder: String
        let content: String
    }

    let initials: String
    let shopName: String
    let outletLine: String
    let kindLine: String
    let title: String
    /// "Chưa chốt" on a draft only (#930: no status on an order)
    let pill: String?
    let isDraft: Bool
    let customerLabel: String
    let customerName: String
    let customerPhone: String?
    let strip: Strip?
    let itemsHeader: String
    let lines: [Line]
    let rows: [Row]
    let highlightLabel: String
    let highlightValue: String
    let highlight: Highlight
    let note: String?
    let qr: QR?
    let thanks: String
    let address: String?
    let madeWith: String
    let fileName: String
    /// #1252: "Thu cọc theo giai đoạn" under the rows of a rental that has stages; nil otherwise
    var plan: DepositPlanReceipt.Block? = nil

    // MARK: - Formatting

    /// `1.150.000đ` in every language (`$1,150,000` in a USD shop, #1145)
    static func money(_ amount: Double, currency: ShopCurrency = ShopCurrencyStore.current) -> String {
        MoneyFormatter.suffixed(amount, currency: currency)
    }

    /// `− 300.000đ`
    static func minus(_ amount: Double) -> String { "− " + money(abs(amount)) }

    /// First letters of the first two words: "Lan Anh Bridal" → "LA"
    static func initials(_ name: String) -> String {
        let words = name.split(whereSeparator: { $0.isWhitespace }).prefix(2)
        let letters = words.compactMap { $0.first.map(String.init) }.joined().uppercased()
        return letters.isEmpty ? "#" : letters
    }

    /// `0912 345 678` for a 10-digit number, else as typed
    static func phone(_ raw: String?) -> String? {
        guard let raw = raw?.trimmingCharacters(in: .whitespacesAndNewlines), !raw.isEmpty, raw != "N/A" else { return nil }
        let digits = raw.filter { !$0.isWhitespace }
        return digits.count == 10 && digits.allSatisfy(\.isNumber) ? digits.formatPhone(haveSpace: true) : raw
    }

    // MARK: - Build

    /// `bankAccount` is the bill's account (`BillBankQR.pick`); `qrSwitchOn` the "QR chuyển khoản trên hoá đơn" switch
    static func make(_ source: OrderShareSource, language: ShareLanguage = .current, bankAccount: BankAccount? = nil,
                     qrSwitchOn: Bool = false, now: Date = Date()) -> OrderShareModel {
        let t = language
        let day: (Date) -> String = { DayFormatter.short($0, timeZone: Date.shopTimeZone, locale: t.locale) }
        let isRent = source.orderType == .rent

        let kind = t.text(isRent ? "share.kind.rent" : "share.kind.sale")
        // #930: "Đơn thuê · tạo 05/10/26 14:30" (Vietnam time)
        let kindLine = source.isDraft
            ? t.text("share.kind.draft", kind, day(now))
            : t.text("share.kind.created", kind, createdText(source.createdAt))

        let name = source.customerName?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let hasCustomer = !name.isEmpty

        var strip: Strip?
        if isRent, let pickup = source.pickup, let back = source.returnDate {
            let days = source.rentalDays ?? OrderDetailLogic.rentalDays(pickup: pickup, return: back) ?? 1
            strip = Strip(pickupLabel: t.text("share.pickup"), pickupDay: day(pickup),
                          days: source.isDraft ? t.text(days == 1 ? "share.days.one" : "share.days", days) : nil,
                          returnLabel: t.text("share.return"), returnDay: day(back))
        }

        let lines = source.items.map { item -> Line in
            let unit = item.quantity > 0 ? item.total / Double(item.quantity) : item.total
            // #1252: a day-block line says which block it is ("Khối 3 ngày + 2 ngày thêm"), as the order detail does
            let detail = item.blockSummary.map { item.quantity > 1 ? "\($0) · \(item.quantity) × \(money(unit))" : $0 }
                ?? "\(item.quantity) × \(money(unit))"
            return Line(name: item.name, detail: detail, amount: money(item.total),
                        note: CartV2Logic.noteText(item.note), formula: item.formula)
        }
        // "3 món" counts lines, as the mockups (2 crowns are one line)
        let count = source.items.count
        let subtotal = OrderDetailLogic.saleSubtotal(itemTotals: source.items.map(\.total))

        let plan = source.isDraft ? nil : DepositPlanReceipt.block(
            hasPlan: source.hasDepositPlan, orderType: source.orderType, stages: source.stages, summary: source.stageSummary,
            today: DayFormatter.key(now), text: t.text)

        var rows: [Row] = []
        let highlightLabel: String
        let highlightValue: String
        let highlight: Highlight
        let collateral = collateralText(papers: source.collateralPapers, money: source.collateralMoney)
        if source.isDraft {
            if source.discount > 0 { rows.append(Row(label: t.text("share.discount"), value: minus(source.discount))) }
            if isRent {
                if source.deposit > 0 { rows.append(Row(label: t.text("share.draft.deposit"), value: money(source.deposit))) }
                if let collateral { rows.append(Row(label: t.text("share.collateral"), value: collateral)) }
            }
            highlightLabel = t.text("share.subtotal")
            highlightValue = money(source.total)
            highlight = .draft
        } else if isRent {
            // #930: no "Còn phải trả" (it changes with the status); the rent total is the highlight
            if source.discount > 0 { rows.append(Row(label: t.text("share.discount"), value: minus(source.discount))) }
            // #1252: with stages the block lists what was collected, so the single "Đã cọc" row goes
            if source.deposit > 0, plan == nil { rows.append(Row(label: t.text("share.deposit.paid"), value: money(source.deposit))) }
            if let collateral { rows.append(Row(label: t.text("share.collateral"), value: collateral)) }
            highlightLabel = t.text("share.rent.total")
            highlightValue = money(source.total)
            highlight = .rent
        } else {
            rows.append(Row(label: t.text("share.subtotal"), value: money(subtotal)))
            if source.discount > 0 { rows.append(Row(label: t.text("share.discount"), value: minus(source.discount))) }
            highlightLabel = t.text("share.total")
            highlightValue = money(source.total)
            highlight = .total
        }

        var qr: QR?
        if !source.isDraft, qrSwitchOn, let account = bankAccount {
            let content = "DH" + source.orderNumber
            // #930: no amount; the customer types it
            if let payload = VietQR.payload(for: account, amount: 0, content: content) {
                qr = QR(title: t.text("share.qr.title"), payload: payload, bankName: account.bankName,
                        accountNumber: account.accountNumber, holder: account.accountHolderName.uppercased(),
                        content: t.text("share.qr.content", content))
            }
        }

        let shop = source.shopName.trimmingCharacters(in: .whitespacesAndNewlines)
        let shopName = shop.isEmpty ? source.outletName : shop
        let outletLine = [source.outletName, phone(source.outletPhone)].compactMap { $0 }.filter { !$0.isEmpty }
            .joined(separator: " · ")
        let address = source.outletAddress?.trimmingCharacters(in: .whitespacesAndNewlines)

        var model = OrderShareModel(
            initials: initials(shopName),
            shopName: shopName,
            outletLine: outletLine,
            kindLine: kindLine,
            title: source.isDraft ? t.text("share.draft.title") : "#\(source.orderNumber)",
            pill: source.isDraft ? t.text("share.status.draft") : nil,
            isDraft: source.isDraft,
            customerLabel: t.text("share.customer"),
            customerName: hasCustomer ? name : t.text("share.walkIn"),
            customerPhone: hasCustomer ? phone(source.customerPhone) : nil,
            strip: strip,
            itemsHeader: t.text(isRent ? "share.items.rent" : "share.items.sale", count),
            lines: lines,
            rows: rows,
            highlightLabel: highlightLabel,
            highlightValue: highlightValue,
            highlight: highlight,
            note: source.isDraft ? t.text("share.draft.note") : nil,
            qr: qr,
            thanks: t.text("share.thanks", shopName),
            address: (address?.isEmpty ?? true) ? nil : address,
            madeWith: t.text("share.madeWith"),
            fileName: fileName(source, now: now)
        )
        model.plan = plan
        return model
    }

    /// "CCCD + 2.000.000đ", "CCCD", "2.000.000đ" or nil
    static func collateralText(papers: String?, money amount: Double) -> String? {
        let papers = papers?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        switch (papers.isEmpty, amount > 0) {
        case (false, true): return "\(papers) + \(money(amount))"
        case (false, false): return papers
        case (true, true): return money(amount)
        case (true, false): return nil
        }
    }

    /// `05/10/26 14:30` in shop time
    static func createdText(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = Date.shopTimeZone
        formatter.dateFormat = "dd/MM/yy HH:mm"
        return formatter.string(from: date)
    }

    /// `Order_482113.jpg` / `Draft_20261007-1430.jpg` (shop time)
    static func fileName(_ source: OrderShareSource, now: Date) -> String {
        guard source.isDraft else {
            let safe = source.orderNumber.filter { $0.isLetter || $0.isNumber || $0 == "-" }
            return "Order_\(safe).jpg"
        }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = Date.shopTimeZone
        formatter.dateFormat = "yyyyMMdd-HHmm"
        return "Draft_\(formatter.string(from: now)).jpg"
    }
}

// MARK: - Sources

extension OrderShareSource {
    /// Civil days pickup → return, both ends counted (as Android and the detail header): 10/10 → 12/10 is 3 days
    /// even when the order stores a billing `rentalDuration` of 2. The stored value only fills in without dates.
    static func rentalDays(pickup: Date?, return returnDate: Date?, stored: Int?) -> Int? {
        OrderDetailLogic.rentalDays(pickup: pickup, return: returnDate) ?? stored
    }

    /// The order detail screen's order
    init(detail: OrderDetail) {
        let customer = [detail.customer.firstName, detail.customer.lastName]
            .compactMap { $0?.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }.joined(separator: " ")
        self.init(
            orderType: detail.orderType, isDraft: false, status: detail.status, orderNumber: detail.orderNumber,
            shopName: detail.outlet.merchant.name, outletName: detail.outlet.name, outletPhone: detail.outlet.phone,
            outletAddress: detail.outlet.address, outletId: detail.outletId,
            customerName: customer, customerPhone: detail.customer.phone,
            pickup: detail.pickupPlanAt, returnDate: detail.returnPlanAt,
            rentalDays: Self.rentalDays(pickup: detail.pickupPlanAt, return: detail.returnPlanAt, stored: detail.rentalDuration),
            createdAt: detail.createdAt,
            items: detail.orderItems.map { Item(name: $0.productName, quantity: $0.quantity, total: $0.totalPrice, note: $0.notes, formula: $0.blockLines?.formula, blockSummary: detail.orderType == .rent ? $0.blockLines?.summary : nil) },
            discount: detail.discountAmount, total: detail.totalAmount, deposit: detail.depositAmount,
            collateralPapers: detail.collateralDetails, collateralMoney: detail.securityDeposit,
            hasDepositPlan: detail.hasDepositPlan, stages: detail.installments, stageSummary: detail.installmentSummary
        )
        outletPrintBankQr = detail.outlet.printBankQr
    }

    /// An order (old preview screen when the detail cannot load)
    init(order: Order, shop: ShareShop) {
        self.init(
            orderType: order.orderType, isDraft: false, status: order.status, orderNumber: order.orderNumber,
            shopName: order.merchantName ?? shop.name, outletName: order.outletName.isEmpty ? shop.outletName : order.outletName,
            outletPhone: shop.phone, outletAddress: shop.address, outletId: order.outletId,
            customerName: order.customerName, customerPhone: order.customerPhone,
            pickup: order.pickupPlanAt, returnDate: order.returnPlanAt,
            rentalDays: Self.rentalDays(pickup: order.pickupPlanAt, return: order.returnPlanAt, stored: order.rentalDuration),
            createdAt: order.createdAt,
            items: order.orderItems.map { Item(name: $0.productName, quantity: $0.quantity, total: $0.totalPrice, note: $0.notes, formula: $0.blockLines?.formula, blockSummary: order.orderType == .rent ? $0.blockLines?.summary : nil) },
            discount: order.discountAmount, total: order.totalAmount, deposit: order.depositAmount,
            collateralPapers: order.collateralDetails, collateralMoney: order.securityDeposit,
            hasDepositPlan: order.hasDepositPlan, stages: order.stages, stageSummary: order.stageSummary
        )
        outletPrintBankQr = order.outletPrintBankQr
    }

    /// The cart before it is an order (draft): no number, no QR
    init(cart: Cart, shop: ShareShop, now: Date = Date()) {
        let customer = cart.customer.map { c in
            [c.firstName, c.lastName].compactMap { $0?.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
                .joined(separator: " ")
        }
        self.init(
            orderType: cart.orderType, isDraft: true, status: .draft, orderNumber: "",
            shopName: shop.name, outletName: shop.outletName, outletPhone: shop.phone, outletAddress: shop.address,
            outletId: shop.outletId, customerName: customer, customerPhone: cart.customer?.phone,
            pickup: cart.pickupPlanAt, returnDate: cart.returnPlanAt,
            rentalDays: OrderDetailLogic.rentalDays(pickup: cart.pickupPlanAt, return: cart.returnPlanAt),
            createdAt: now,
            items: cart.items.map { Item(name: $0.productName ?? "", quantity: $0.quantity, total: $0.subTotal(for: cart.orderType),
                                         formula: cart.orderType == .rent ? $0.blockDetail.flatMap { $0.extraDays > 0 ? BlockPricing.formula($0) : nil } : nil,
                                         blockSummary: cart.orderType == .rent ? $0.blockDetail.map(BlockPricing.summary) : nil) },
            discount: cart.discountAmount, total: cart.totalAmount,
            deposit: cart.orderType == .rent ? cart.depositAmount : 0,
            collateralPapers: cart.orderType == .rent ? cart.collateralDetails : nil,
            collateralMoney: cart.orderType == .rent ? (cart.manualSecurityDeposit ?? 0) : 0
        )
    }
}

/// The signed-in user's shop and outlet (header and footer when the order does not carry them)
struct ShareShop: Equatable {
    var name: String
    var outletName: String
    var phone: String?
    var address: String?
    var outletId: Int?

    static func current() -> ShareShop {
        // #828: the branch in use (a merchant's chosen branch, an outlet user's own)
        let user = User.account()
        let outlet = CurrentOutlet.shared.outlet
        let outletName = outlet?.name ?? ""
        return ShareShop(name: user?.merchant?.name ?? outletName, outletName: outletName,
                         phone: outlet?.phone ?? user?.merchant?.phone,
                         address: outlet?.address ?? user?.merchant?.address,
                         outletId: CurrentOutlet.shared.id)
    }
}

/// Whether a cart can be shared as a draft: it has lines and, for a rental, both dates
enum DraftShareRule {
    static func canShare(itemCount: Int, orderType: OrderType, pickup: Date?, returnDate: Date?) -> Bool {
        itemCount > 0 && (orderType == .sale || (pickup != nil && returnDate != nil))
    }
}
