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

/// #1345 "Thu khi giao" of the image, fixed by the plan so it reads the same before and after hand-over (Android
/// `ShareMoneyRule`): the total minus the stages of the plan (void and the "rest" stage left out), or minus the single
/// deposit when the order has no plan. Never below zero, rounded to the currency's smallest unit. It does not add the
/// collateral (its own row) and, unlike the order detail's `HandOverMoney`, does not drop to what is unpaid.
enum ShareMoneyRule {
    /// The stages shown and counted: not void, not the "rest"; empty when the order has no plan
    static func planStages(hasPlan: Bool?, stages: [OrderInstallment]?) -> [OrderInstallment] {
        hasPlan == true ? (stages ?? []).filter { $0.status != "VOID" && !$0.isRest } : []
    }

    static func collectOnDelivery(total: Double, deposit: Double, hasPlan: Bool?, stages: [OrderInstallment]?,
                                  currency: ShopCurrency) -> Double {
        let explicit = planStages(hasPlan: hasPlan, stages: stages)
        let taken = explicit.isEmpty ? deposit : explicit.reduce(0) { $0 + $1.amount }
        return DepositPlanMath.roundMoney(max(0, total - taken), currency: currency)
    }

    /// "Thu cọc theo giai đoạn": each stage with Đã thu / Chưa thu (never "Trễ N ngày", "Hôm nay"); nil without stages
    static func stageBlock(hasPlan: Bool?, stages: [OrderInstallment]?, currency: ShopCurrency,
                           text: (String) -> String) -> OrderShareModel.StageBlock? {
        guard !planStages(hasPlan: hasPlan, stages: stages).isEmpty else { return nil }
        let shown = (stages ?? []).filter { $0.status != "VOID" }
        var rows: [OrderShareModel.Stage] = []
        for (index, stage) in shown.enumerated() where !stage.isRest {
            let percent = DepositPlanMath.percentText(stage.percent)
            let detail = stage.isPaid
                ? String(format: text("deposit.card.paidDetail"), percent, InstallmentCardView.paidDay(stage.collectedAt))
                : String(format: text("deposit.card.dueDetail"), percent, DepositUI.dayText(stage.dueDateKey))
            let status = stage.status == "PARTIAL" ? "share.stage.partial" : (stage.isPaid ? "share.stage.paid" : "share.stage.unpaid")
            rows.append(OrderShareModel.Stage(title: "\(index + 1). \(stage.label)",
                                              amount: OrderShareModel.money(stage.amount, currency: currency),
                                              detail: detail + " · " + text(status)))
        }
        return OrderShareModel.StageBlock(title: text("deposit.card.title"), stages: rows)
    }
}

/// The facts the image is made from (one order, or the cart before it is an order)
struct OrderShareSource {
    struct Item: Equatable {
        let name: String
        let quantity: Int
        let total: Double
        /// #930: the item's own note (the order's general note is `orderNote`, #1354)
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
    /// #1354: the order's own note (the one the shop writes on the order); on the image only when the shop turns it on
    var orderNote: String? = nil
}

/// #1354 "Hiện ghi chú đơn trên ảnh chia sẻ": who sets it, and when the order's note is on the image (Android `ShareOrderNoteRule`)
enum ShareOrderNoteRule {
    /// The shop owner only (`PUT /api/settings/merchant` answers 403 to every other role)
    static func canSet(role: Role?) -> Bool { role == .merchant }

    /// The shop's switch on the cached merchant; missing = off
    static func isOn(_ merchant: Merchant?) -> Bool { merchant?.shareOrderNote == true }

    /// The note block of the image: the order's note without surrounding blanks, only for an order (not a draft) while
    /// the switch is on; nil otherwise or when the note is empty
    static func text(_ note: String?, enabled: Bool, isDraft: Bool) -> String? {
        guard enabled, !isDraft else { return nil }
        let trimmed = note?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return trimmed.isEmpty ? nil : trimmed
    }
}

/// #1354 the note block is at most `maxLines` lines of the box it is drawn in
enum ShareNoteClip {
    static let maxLines = 4

    /// Wraps `text` by words into lines that `fits` (measured with the font and width the image draws it with). The
    /// author's line breaks stay, a word longer than a line is cut by characters. More than `maxLines` lines: the last
    /// kept line is shortened until it fits with "…". Pure; the Android `ShareNoteClip` is the same algorithm.
    static func lines(_ text: String, maxLines: Int = ShareNoteClip.maxLines, fits: (String) -> Bool) -> [String] {
        guard maxLines > 0 else { return [] }
        var out: [String] = []
        paragraphs: for paragraph in text.components(separatedBy: CharacterSet.newlines) {
            var current = ""
            for word in paragraph.split(whereSeparator: { $0.isWhitespace }).map(String.init) {
                let joined = current.isEmpty ? word : current + " " + word
                if fits(joined) {
                    current = joined
                    continue
                }
                if !current.isEmpty {
                    out.append(current)
                    current = ""
                }
                // A word longer than a line: cut it by characters; the last piece may share its line with the next word
                let characters = Array(word)
                var start = 0
                while start < characters.count {
                    var end = characters.count
                    while end > start + 1, !fits(String(characters[start..<end])) { end -= 1 }
                    if end == characters.count {
                        current = String(characters[start..<end])
                    } else {
                        out.append(String(characters[start..<end]))
                    }
                    start = end
                }
                if out.count > maxLines { break paragraphs }
            }
            if !current.isEmpty { out.append(current) }
            if out.count > maxLines { break }
        }
        guard out.count > maxLines else { return out }
        var kept = Array(out.prefix(maxLines))
        var last = kept[maxLines - 1]
        while !last.isEmpty, !fits(last + "…") {
            last.removeLast()
            while last.last?.isWhitespace == true { last.removeLast() }
        }
        kept[maxLines - 1] = last + "…"
        return kept
    }
}

/// #1354 `merchant.shareOrderNote` of GET /api/users/profile (and of the PUT answer), read so that a missing or odd
/// value is "off", never an error
struct ShareOrderNoteProfile: Decodable {
    struct Shop: Decodable {
        let shareOrderNote: Bool?

        enum CodingKeys: String, CodingKey { case shareOrderNote }

        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            // null, a string or a number is not a boolean: off
            shareOrderNote = (try? container.decodeIfPresent(Bool.self, forKey: .shareOrderNote)) ?? nil
        }
    }

    let merchant: Shop?

    /// nil without a shop (ADMIN); false when the key is missing, null or not a boolean
    var flag: Bool? { merchant.map { $0.shareOrderNote ?? false } }
}

/// #1354 the shop's switch cached on the signed-in user (`merchant.shareOrderNote`), read again from GET /api/users/profile
/// when the app comes to the front, when Cài đặt › In & phiếu opens and right before an image is made (at most once a
/// minute, like `ShopCurrencyStore`), so staff follow the owner's change (#1307). Never read = off.
enum ShareOrderNoteStore {
    /// A save is on its way: a refresh must not overwrite the optimistic value
    static var saving = false
    private static var lastRefresh: Date?

    static var isOn: Bool { ShareOrderNoteRule.isOn(User.account()?.merchant) }

    /// A user signed out: the next shop reads its own value at once
    static func userDidSignOut() { lastRefresh = nil }

    /// Writes the value into the cached user
    static func store(_ on: Bool) {
        guard let user = User.account(), user.merchant != nil, user.merchant?.shareOrderNote != on else { return }
        user.merchant?.shareOrderNote = on
        User.save(user: user)
    }

    /// Reads the shop's value, at most once a minute unless forced; every shop role reads it (the row is owner-only, the
    /// read is not). Completion runs on the main queue with the value in effect.
    static func refresh(force: Bool = false, completion: ((Bool) -> Void)? = nil) {
        guard let user = User.account(), user.merchant != nil,
              ShopCurrencyLogic.shouldRefresh(role: user.role, lastRefresh: lastRefresh, now: Date(), force: force) else {
            completion?(isOn)
            return
        }
        lastRefresh = Date()
        TabsV2APIService.shared.shareOrderNote { flag, _ in
            DispatchQueue.main.async {
                if let flag, !saving { store(flag) }
                completion?(isOn)
            }
        }
    }
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
        /// #1345: a grey row ("Cọc: Chưa cọc")
        var muted: Bool = false
    }

    /// #1345: one stage of the deposit block, "20% đơn · 05/10 · Đã thu" under its name and amount
    struct Stage: Equatable {
        let title: String
        let amount: String
        let detail: String
    }

    struct StageBlock: Equatable {
        let title: String
        let stages: [Stage]
    }

    /// #1345: the money part of the image, top to bottom
    enum Money: Equatable {
        case row(Row)
        case total(label: String, value: String, tone: Highlight)
        case stages(StageBlock)
        case collect(label: String, value: String)
    }

    struct OrderNote: Equatable {
        let title: String
        let text: String
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
    /// #1345: the money part, top to bottom: Tạm tính, Giảm giá, Tổng tiền thuê, Cọc, Thu khi giao, Thế chân
    let money: [Money]
    let note: String?
    /// #1354: the order's own note, "GHI CHÚ" block under the money part (nil: switch off, no note, or a draft)
    var orderNote: OrderNote? = nil
    let qr: QR?
    let thanks: String
    let address: String?
    let madeWith: String
    let fileName: String

    // MARK: - Formatting

    /// `1.150.000đ` in every language (`$1,150,000` in a USD shop, #1145)
    static func money(_ amount: Double, currency: ShopCurrency = ShopCurrencyStore.current) -> String {
        MoneyFormatter.suffixed(amount, currency: currency)
    }

    /// `− 300.000đ`
    static func minus(_ amount: Double, currency: ShopCurrency = ShopCurrencyStore.current) -> String {
        "− " + money(abs(amount), currency: currency)
    }

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
                     qrSwitchOn: Bool = false, showOrderNote: Bool = false, now: Date = Date(),
                     currency: ShopCurrency = ShopCurrencyStore.current) -> OrderShareModel {
        let t = language
        let day: (Date) -> String = { DayFormatter.short($0, timeZone: Date.shopTimeZone, locale: t.locale) }
        let isRent = source.orderType == .rent
        let fmt: (Double) -> String = { money($0, currency: currency) }

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
            let detail = item.blockSummary.map { item.quantity > 1 ? "\($0) · \(item.quantity) × \(fmt(unit))" : $0 }
                ?? "\(item.quantity) × \(fmt(unit))"
            return Line(name: item.name, detail: detail, amount: fmt(item.total),
                        note: CartV2Logic.noteText(item.note), formula: item.formula)
        }
        // "3 món" counts lines, as the mockups (2 crowns are one line)
        let count = source.items.count
        let subtotal = OrderDetailLogic.saleSubtotal(itemTotals: source.items.map(\.total))

        let collateral = collateralText(papers: source.collateralPapers, money: source.collateralMoney, currency: currency)
        let collect = ShareMoneyRule.collectOnDelivery(total: source.total, deposit: source.deposit, hasPlan: source.hasDepositPlan,
                                                       stages: source.stages, currency: currency)
        var entries: [Money] = []
        func row(_ key: String, _ value: String) { entries.append(.row(Row(label: t.text(key), value: value))) }
        func noDeposit() { entries.append(.row(Row(label: t.text("share.deposit.label"), value: t.text("share.deposit.none"), muted: true))) }
        func collectBox() { entries.append(.collect(label: t.text("share.collect"), value: fmt(collect))) }
        if source.isDraft {
            if source.discount > 0 { row("share.discount", minus(source.discount, currency: currency)) }
            entries.append(.total(label: t.text("share.subtotal"), value: fmt(source.total), tone: .draft))
            if isRent {
                // #1345: Cọc giữ đồ (or "Cọc: Chưa cọc"), Thu khi giao, Thế chân
                if source.deposit > 0 { row("share.draft.deposit", fmt(source.deposit)) } else { noDeposit() }
                collectBox()
                if let collateral { row("share.collateral", collateral) }
            }
        } else if isRent {
            // #1345: the order of the order detail. #930: nothing here changes with the status
            if source.discount > 0 {
                row("share.subtotal", fmt(subtotal))
                row("share.discount", minus(source.discount, currency: currency))
            }
            entries.append(.total(label: t.text("share.rent.total"), value: fmt(source.total), tone: .rent))
            if let block = ShareMoneyRule.stageBlock(hasPlan: source.hasDepositPlan, stages: source.stages, currency: currency, text: t.text) {
                entries.append(.stages(block))
            } else if source.deposit > 0 {
                row("share.deposit.paid", fmt(source.deposit))
            } else {
                noDeposit()
            }
            collectBox()
            if let collateral { row("share.collateral", collateral) }
        } else {
            row("share.subtotal", fmt(subtotal))
            if source.discount > 0 { row("share.discount", minus(source.discount, currency: currency)) }
            entries.append(.total(label: t.text("share.total"), value: fmt(source.total), tone: .total))
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

        // #1354: the order's own note, only while the shop's switch is on (never on a draft)
        let orderNote = ShareOrderNoteRule.text(source.orderNote, enabled: showOrderNote, isDraft: source.isDraft)
            .map { OrderNote(title: t.text("share.orderNote.title"), text: $0) }

        let model = OrderShareModel(
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
            money: entries,
            note: source.isDraft ? t.text("share.draft.note") : nil,
            orderNote: orderNote,
            qr: qr,
            thanks: t.text("share.thanks", shopName),
            address: (address?.isEmpty ?? true) ? nil : address,
            madeWith: t.text("share.madeWith"),
            fileName: fileName(source, now: now)
        )
        return model
    }

    /// "CCCD + 2.000.000đ", "CCCD", "2.000.000đ" or nil
    static func collateralText(papers: String?, money amount: Double, currency: ShopCurrency = ShopCurrencyStore.current) -> String? {
        let papers = papers?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        switch (papers.isEmpty, amount > 0) {
        case (false, true): return "\(papers) + \(money(amount, currency: currency))"
        case (false, false): return papers
        case (true, true): return money(amount, currency: currency)
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
        orderNote = detail.notes
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
        orderNote = order.notes
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
