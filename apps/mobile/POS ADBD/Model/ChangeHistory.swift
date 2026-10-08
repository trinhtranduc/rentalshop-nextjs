//
//  ChangeHistory.swift
//  POS ADBD
//
//  #519 "Lịch sử thay đổi" (boards LS-don, LS-san-pham): the payload of GET /api/orders/{id}/changes and
//  GET /api/products/{id}/changes, and the pure rules that turn it into rows: kind titles, field labels,
//  "old (struck) → new" values, Vietnam civil-day groups and the "6 lần thay đổi · gần nhất 15:10 hôm nay" line.
//  Decoding never fails on an unknown kind, field or value type; those show generically.
//

import Foundation

// MARK: - Instants

/// UTC ISO instants of the API ("2026-10-06T08:10:00.000Z", with or without fractions)
enum ISOInstant {
    private static let withFractions: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private static let plain: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    static func parse(_ text: String) -> Date? {
        let trimmed = text.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return nil }
        return withFractions.date(from: trimmed) ?? plain.date(from: trimmed)
    }
}

// MARK: - Payload

/// `from` / `to` of a field change: number, text, boolean or null
enum ChangeValue: Decodable, Equatable {
    case number(Double)
    case text(String)
    case bool(Bool)
    case null

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Double.self) {
            self = .number(value)
        } else if let value = try? container.decode(String.self) {
            self = .text(value)
        } else {
            self = .null
        }
    }
}

struct ChangeFieldChange: Decodable, Equatable {
    let field: String
    let from: ChangeValue
    let to: ChangeValue

    private enum CodingKeys: String, CodingKey { case field, from, to }

    init(field: String, from: ChangeValue, to: ChangeValue) {
        self.field = field
        self.from = from
        self.to = to
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        field = ((try? c.decodeIfPresent(String.self, forKey: .field)) ?? nil) ?? ""
        from = ((try? c.decodeIfPresent(ChangeValue.self, forKey: .from)) ?? nil) ?? .null
        to = ((try? c.decodeIfPresent(ChangeValue.self, forKey: .to)) ?? nil) ?? .null
    }
}

struct ChangeItemChange: Decodable, Equatable {
    let productId: Int?
    let name: String
    /// quantity | price | added | removed
    let field: String
    let from: Double?
    let to: Double?
    /// Pricing type of the line (DAILY, FIXED, …)
    let unit: String?

    private enum CodingKeys: String, CodingKey { case productId, name, field, from, to, unit }

    init(productId: Int?, name: String, field: String, from: Double?, to: Double?, unit: String? = nil) {
        self.productId = productId
        self.name = name
        self.field = field
        self.from = from
        self.to = to
        self.unit = unit
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        productId = (try? c.decodeIfPresent(Int.self, forKey: .productId)) ?? nil
        name = ((try? c.decodeIfPresent(String.self, forKey: .name)) ?? nil) ?? ""
        field = ((try? c.decodeIfPresent(String.self, forKey: .field)) ?? nil) ?? ""
        from = (try? c.decodeIfPresent(Double.self, forKey: .from)) ?? nil
        to = (try? c.decodeIfPresent(Double.self, forKey: .to)) ?? nil
        unit = (try? c.decodeIfPresent(String.self, forKey: .unit)) ?? nil
    }
}

struct ChangeNoteChange: Decodable, Equatable {
    let text: String?
    let imagesAdded: Int
    let imagesRemoved: Int

    private enum CodingKeys: String, CodingKey { case text, imagesAdded, imagesRemoved }

    init(text: String?, imagesAdded: Int, imagesRemoved: Int) {
        self.text = text
        self.imagesAdded = imagesAdded
        self.imagesRemoved = imagesRemoved
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        text = (try? c.decodeIfPresent(String.self, forKey: .text)) ?? nil
        imagesAdded = ((try? c.decodeIfPresent(Int.self, forKey: .imagesAdded)) ?? nil) ?? 0
        imagesRemoved = ((try? c.decodeIfPresent(Int.self, forKey: .imagesRemoved)) ?? nil) ?? 0
    }
}

struct ChangeActor: Decodable, Equatable {
    let name: String
    let role: String?

    private enum CodingKeys: String, CodingKey { case name, role }

    init(name: String, role: String?) {
        self.name = name
        self.role = role
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        name = ((try? c.decodeIfPresent(String.self, forKey: .name)) ?? nil) ?? ""
        role = (try? c.decodeIfPresent(String.self, forKey: .role)) ?? nil
    }
}

struct ChangeHistoryEntry: Decodable, Equatable {
    let id: Int
    /// UTC ISO instant
    let at: String
    let kind: String
    let actor: ChangeActor?
    let changes: [ChangeFieldChange]
    let items: [ChangeItemChange]
    let note: ChangeNoteChange?

    private enum CodingKeys: String, CodingKey { case id, at, kind, actor, changes, items, note }

    init(id: Int, at: String, kind: String, actor: ChangeActor?, changes: [ChangeFieldChange] = [],
         items: [ChangeItemChange] = [], note: ChangeNoteChange? = nil) {
        self.id = id
        self.at = at
        self.kind = kind
        self.actor = actor
        self.changes = changes
        self.items = items
        self.note = note
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = ((try? c.decodeIfPresent(Int.self, forKey: .id)) ?? nil) ?? 0
        at = ((try? c.decodeIfPresent(String.self, forKey: .at)) ?? nil) ?? ""
        kind = ((try? c.decodeIfPresent(String.self, forKey: .kind)) ?? nil) ?? "OTHER"
        actor = (try? c.decodeIfPresent(ChangeActor.self, forKey: .actor)) ?? nil
        changes = ((try? c.decodeIfPresent([ChangeFieldChange].self, forKey: .changes)) ?? nil) ?? []
        items = ((try? c.decodeIfPresent([ChangeItemChange].self, forKey: .items)) ?? nil) ?? []
        note = (try? c.decodeIfPresent(ChangeNoteChange.self, forKey: .note)) ?? nil
    }

    var date: Date? { ISOInstant.parse(at) }
}

/// `data` of the changes endpoints
struct ChangeHistoryPage: Decodable, Equatable {
    let entries: [ChangeHistoryEntry]
    let total: Int
    /// Newest change of the whole history (UTC ISO), nil when there is none
    let latestAt: String?

    private enum CodingKeys: String, CodingKey { case entries, total, latestAt }

    init(entries: [ChangeHistoryEntry], total: Int, latestAt: String?) {
        self.entries = entries
        self.total = total
        self.latestAt = latestAt
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        entries = ((try? c.decodeIfPresent([ChangeHistoryEntry].self, forKey: .entries)) ?? nil) ?? []
        total = ((try? c.decodeIfPresent(Int.self, forKey: .total)) ?? nil) ?? entries.count
        latestAt = (try? c.decodeIfPresent(String.self, forKey: .latestAt)) ?? nil
    }
}

// MARK: - Rows

/// One "Label: old → new" line; `label == nil` is a plain sentence in `to`; `from == nil` shows no old value
struct ChangeLine: Equatable {
    let label: String?
    let from: String?
    let to: String
}

/// Avatar colours of a row
enum ChangeTone: Equatable {
    case created, note, danger, staff, owner
}

/// One run of the row footer; the actor name is the only bold (ink) run
struct ChangeFooterPart: Equatable {
    let text: String
    let bold: Bool
}

struct ChangeRow: Equatable {
    let id: Int
    let title: String
    let lines: [ChangeLine]
    let initials: String
    let tone: ChangeTone
    /// "bởi Nguyễn An (nhân viên) · 15:10", or just "15:10" when the actor is unknown
    let footerParts: [ChangeFooterPart]
    /// Plain footer text (VoiceOver, tests)
    var footer: String { footerParts.map(\.text).joined() }
}

/// One Vietnam civil day of the list, newest first
struct ChangeDay: Equatable {
    let key: String
    /// "HÔM NAY · T3 06/10", "T2 05/10"
    let title: String
    let rows: [ChangeRow]
}

/// Where the screen was opened from
enum ChangeHistorySubject: Equatable {
    case order(id: Int, number: String, customer: String?)
    case product(id: Int, name: String, barcode: String?)

    /// "Đơn #787771 · Trần Văn Minh", "Vest đen slim fit · VS-004"
    var subtitle: String {
        switch self {
        case let .order(_, number, customer):
            let head = String(format: "history.subtitle.order".localized(), number)
            return [head, customer].compactMap { $0?.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }.joined(separator: " · ")
        case let .product(_, name, barcode):
            return [name, barcode].compactMap { $0?.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }.joined(separator: " · ")
        }
    }
}

enum ChangeHistoryLogic {
    static let pageSize = 50
    static var timeZone: TimeZone { Date.shopTimeZone }

    // MARK: Titles

    static let knownKinds: Set<String> = [
        "ORDER_CREATED", "ORDER_EDITED", "ORDER_ITEMS", "ORDER_ITEM_PRICE", "ORDER_DEPOSIT", "ORDER_PAYMENT",
        "ORDER_NOTE", "ORDER_PICKED_UP", "ORDER_RETURNED", "ORDER_COMPLETED", "ORDER_CANCELLED", "ORDER_RESTORED",
        "ORDER_DELETED", "PRODUCT_CREATED", "PRODUCT_EDITED", "PRODUCT_PRICE", "PRODUCT_STOCK", "PRODUCT_IMAGES",
        "PRODUCT_DELETED", "PRODUCT_RESTORED", "OTHER",
    ]

    /// "Tạo đơn", "Sửa giá trong đơn", …; an unknown kind reads "Thay đổi"
    static func title(_ entry: ChangeHistoryEntry) -> String {
        let kind = entry.kind.uppercased()
        if kind == "ORDER_PAYMENT", entry.changes.contains(where: { $0.field == "paymentRefunded" }) {
            return "history.kind.ORDER_REFUND".localized()
        }
        return ("history.kind." + (knownKinds.contains(kind) ? kind : "OTHER")).localized()
    }

    // MARK: Fields

    static let knownFields: Set<String> = [
        "status", "orderType", "pickupPlanAt", "returnPlanAt", "pickedUpAt", "returnedAt", "totalAmount",
        "depositAmount", "securityDeposit", "discountType", "discountValue", "discountAmount", "damageFee", "lateFee",
        "collateralType", "collateralDetails", "pickupNotes", "returnNotes", "damageNotes", "isReadyToDeliver",
        "paymentCollected", "paymentRefunded", "paymentMethod", "name", "barcode", "category", "isActive", "deposit",
        "rentPrice", "salePrice", "pricingType", "images",
    ]

    static let moneyFields: Set<String> = [
        "totalAmount", "depositAmount", "securityDeposit", "discountAmount", "damageFee", "lateFee",
        "paymentCollected", "paymentRefunded", "deposit", "rentPrice", "salePrice",
    ]

    static let dateFields: Set<String> = ["pickupPlanAt", "returnPlanAt", "pickedUpAt", "returnedAt"]

    /// Fields that only have a new value (a payment, photos added): no struck old value
    static let newValueOnlyFields: Set<String> = ["paymentCollected", "paymentRefunded", "paymentMethod"]

    /// "Ngày trả", "Thuê theo ngày" (`pricing.DAILY`), the outlet name (`stock.Chi nhánh chính`); else the key
    static func label(_ field: String) -> String {
        if field.hasPrefix("pricing.") {
            let type = String(field.dropFirst("pricing.".count)).uppercased()
            switch type {
            case ProductPricingMode.perDay.rawValue: return "history.field.pricing.DAILY".localized()
            case ProductPricingMode.perRental.rawValue: return "history.field.pricing.FIXED".localized()
            default: return String(format: "history.field.pricing.other".localized(), CartV2Logic.pricingLabel(type))
            }
        }
        if field.hasPrefix("stock.") {
            let outlet = String(field.dropFirst("stock.".count))
            return outlet.isEmpty ? "history.field.stock".localized() : outlet
        }
        return knownFields.contains(field) ? ("history.field." + field).localized() : field
    }

    /// One value as shown: money "1.000.000đ", dates "07/10" (Vietnam day), status and type names, "Có"/"Không"
    static func value(_ field: String, _ value: ChangeValue, timeZone: TimeZone = ChangeHistoryLogic.timeZone) -> String {
        switch value {
        case .null:
            return "—"
        case .bool(let flag):
            return (flag ? "history.value.yes" : "history.value.no").localized()
        case .number(let number):
            if moneyFields.contains(field) || field.hasPrefix("pricing.") { return CartV2Logic.money(number) }
            if field == "discountValue" { return MoneyFormatter.format(number) }
            return plainNumber(number)
        case .text(let text):
            let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
            if trimmed.isEmpty { return "—" }
            if dateFields.contains(field), let date = ISOInstant.parse(trimmed) {
                return CreateOrderSheetLogic.dayMonth(date, timeZone: timeZone)
            }
            switch field {
            case "status":
                guard let status = OrderStatus.from(apiString: trimmed), status != .unknown else { return trimmed }
                return OrdersHomeLogic.statusTag(status).text
            case "orderType":
                switch trimmed.uppercased() {
                case "RENT": return "history.value.rent".localized()
                case "SALE": return "history.value.sale".localized()
                default: return trimmed
                }
            case "pricingType":
                return CartV2Logic.pricingLabel(trimmed)
            case "discountType":
                switch trimmed.uppercased() {
                case "PERCENTAGE", "PERCENT": return "%"
                case "AMOUNT", "FIXED": return "history.value.discountAmount".localized()
                default: return trimmed
                }
            case "paymentMethod":
                switch trimmed.uppercased() {
                case "CASH": return "history.value.cash".localized()
                case "BANK_TRANSFER", "TRANSFER": return "history.value.transfer".localized()
                default: return trimmed
                }
            default:
                if (moneyFields.contains(field) || field.hasPrefix("pricing.")), let number = Double(trimmed) {
                    return CartV2Logic.money(number)
                }
                return trimmed
            }
        }
    }

    static func plainNumber(_ number: Double) -> String {
        if number.rounded() == number, abs(number) < 1e15 { return String(Int(number)) }
        return String(number)
    }

    /// "/ngày", "/lần" after an item price
    static func unitSuffix(_ unit: String?) -> String {
        switch (unit ?? "").uppercased() {
        case ProductPricingMode.perDay.rawValue: return "history.unit.daily".localized()
        case ProductPricingMode.perRental.rawValue: return "history.unit.fixed".localized()
        case "HOURLY": return "history.unit.hourly".localized()
        default: return ""
        }
    }

    // MARK: Lines

    /// "Thêm 2 ảnh, bỏ 1 ảnh, “khách lấy thêm cà vạt”"; nil when there is nothing to say
    static func photosAndText(added: Int, removed: Int, text: String?) -> String? {
        var parts: [String] = []
        if added > 0 { parts.append(PluralText.format("history.photos.added", count: added, added)) }
        if removed > 0 { parts.append(PluralText.format("history.photos.removed", count: removed, removed)) }
        if let text = text?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty {
            parts.append("“" + text + "”")
        }
        guard !parts.isEmpty else { return nil }
        let joined = parts.joined(separator: ", ")
        return joined.prefix(1).uppercased() + joined.dropFirst()
    }

    static func lines(_ entry: ChangeHistoryEntry, timeZone: TimeZone = ChangeHistoryLogic.timeZone) -> [ChangeLine] {
        var out: [ChangeLine] = []
        let changes = entry.changes.filter { !$0.field.isEmpty }
        let added = changes.first { $0.field == "imagesAdded" }
        let removed = changes.first { $0.field == "imagesRemoved" }
        let photoCount: (ChangeFieldChange?) -> Int = { change in
            if case .number(let n)? = change?.to { return max(0, Int(n)) }
            return 0
        }
        let hasPhotoDelta = added != nil || removed != nil

        for change in changes {
            switch change.field {
            case "imagesAdded", "imagesRemoved":
                continue
            case "images" where hasPhotoDelta:
                continue
            default:
                let to = value(change.field, change.to, timeZone: timeZone)
                let from: String? = newValueOnlyFields.contains(change.field) ? nil : value(change.field, change.from, timeZone: timeZone)
                out.append(ChangeLine(label: label(change.field), from: from, to: to))
            }
        }
        if hasPhotoDelta, let text = photosAndText(added: photoCount(added), removed: photoCount(removed), text: nil) {
            out.append(ChangeLine(label: nil, from: nil, to: text))
        }

        for item in entry.items {
            let name = item.name.isEmpty ? (item.productId.map { "#\($0)" } ?? "—") : item.name
            switch item.field {
            case "quantity":
                out.append(ChangeLine(label: name, from: item.from.map { "× " + plainNumber($0) } ?? "—",
                                      to: item.to.map { "× " + plainNumber($0) } ?? "—"))
            case "price":
                let suffix = unitSuffix(item.unit)
                out.append(ChangeLine(label: name, from: item.from.map { CartV2Logic.money($0) + suffix } ?? "—",
                                      to: item.to.map { CartV2Logic.money($0) + suffix } ?? "—"))
            case "added":
                let quantity = Int(item.to ?? 1)
                out.append(ChangeLine(label: nil, from: nil, to: String(format: "history.item.added".localized(), name, quantity)))
            case "removed":
                let quantity = Int(item.from ?? 1)
                out.append(ChangeLine(label: nil, from: nil, to: String(format: "history.item.removed".localized(), name, quantity)))
            default:
                let from = item.from.map(plainNumber) ?? "—"
                let to = item.to.map(plainNumber) ?? "—"
                out.append(ChangeLine(label: name, from: from, to: to))
            }
        }

        if let note = entry.note {
            let text = photosAndText(added: note.imagesAdded, removed: note.imagesRemoved, text: note.text)
                ?? "history.note.cleared".localized()
            out.append(ChangeLine(label: nil, from: nil, to: text))
        }
        return out
    }

    // MARK: Actor

    /// #670: change history is for ADMIN, OPS, MERCHANT and OUTLET_ADMIN; OUTLET_STAFF (and an unknown role) gets
    /// neither the entry points nor the changes request (the API answers 403)
    static func canView(_ role: String?) -> Bool {
        ["ADMIN", "OPS", "MERCHANT", "OUTLET_ADMIN"].contains((role ?? "").trimmingCharacters(in: .whitespaces).uppercased())
    }

    /// The signed-in user may open change history
    static var currentUserCanView: Bool { canView(User.account()?.roleCode) }

    static func isStaff(_ role: String?) -> Bool {
        ["OUTLET_STAFF", "OUTLET_ADMIN"].contains((role ?? "").uppercased())
    }

    /// "Nguyễn An (nhân viên)" for staff, the bare name for owners, nil when the actor is unknown
    static func actorName(_ actor: ChangeActor?) -> String? {
        let name = (actor?.name ?? "").trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty else { return nil }
        return isStaff(actor?.role) ? String(format: "history.actor.staff".localized(), name) : name
    }

    /// "bởi Nguyễn An (nhân viên)" split so the name alone can be bold; nil when the actor is unknown
    static func actorParts(_ actor: ChangeActor?) -> [ChangeFooterPart]? {
        let name = (actor?.name ?? "").trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty else { return nil }
        let (byHead, byTail) = splitFormat("history.actor.by".localized())
        var head = byHead, tail = byTail
        if isStaff(actor?.role) {
            let (staffHead, staffTail) = splitFormat("history.actor.staff".localized())
            head += staffHead
            tail = staffTail + tail
        }
        return [ChangeFooterPart(text: head, bold: false), ChangeFooterPart(text: name, bold: true),
                ChangeFooterPart(text: tail, bold: false)].filter { !$0.text.isEmpty }
    }

    /// "bởi %@" → ("bởi ", ""); a format without "%@" keeps the whole text before the name
    static func splitFormat(_ format: String) -> (String, String) {
        guard let range = format.range(of: "%@") else { return (format, "") }
        return (String(format[..<range.lowerBound]), String(format[range.upperBound...]))
    }

    static func tone(_ entry: ChangeHistoryEntry) -> ChangeTone {
        switch entry.kind.uppercased() {
        case "ORDER_CREATED", "PRODUCT_CREATED", "ORDER_RESTORED", "PRODUCT_RESTORED": return .created
        case "ORDER_NOTE": return .note
        case "ORDER_CANCELLED", "ORDER_DELETED", "PRODUCT_DELETED": return .danger
        default: return isStaff(entry.actor?.role) ? .staff : .owner
        }
    }

    /// "15:10" in the shop zone
    static func clock(_ date: Date, timeZone: TimeZone = ChangeHistoryLogic.timeZone) -> String {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        let parts = calendar.dateComponents([.hour, .minute], from: date)
        return String(format: "%02d:%02d", parts.hour ?? 0, parts.minute ?? 0)
    }

    static func row(_ entry: ChangeHistoryEntry, timeZone: TimeZone = ChangeHistoryLogic.timeZone) -> ChangeRow {
        let name = (entry.actor?.name ?? "").trimmingCharacters(in: .whitespaces)
        var footer = actorParts(entry.actor) ?? []
        if let date = entry.date {
            let time = clock(date, timeZone: timeZone)
            footer.append(ChangeFooterPart(text: footer.isEmpty ? time : " · " + time, bold: false))
        }
        return ChangeRow(id: entry.id, title: title(entry), lines: lines(entry, timeZone: timeZone),
                         initials: SettingsV2Logic.initials(name), tone: tone(entry), footerParts: footer)
    }

    // MARK: Days

    /// Groups in the order the API sends (newest first), by Vietnam civil day; an entry without a valid instant
    /// lands under "—" at the end
    static func days(_ entries: [ChangeHistoryEntry], now: Date = Date(),
                     timeZone: TimeZone = ChangeHistoryLogic.timeZone,
                     locale: Locale = OrdersHomeLogic.appLocale) -> [ChangeDay] {
        let todayKey = DayFormatter.key(now, timeZone: timeZone)
        var order: [String] = []
        var rows: [String: [ChangeRow]] = [:]
        var titles: [String: String] = [:]
        for entry in entries {
            let key: String
            if let date = entry.date {
                key = DayFormatter.key(date, timeZone: timeZone)
                if titles[key] == nil {
                    let short = DayFormatter.short(date, timeZone: timeZone, locale: locale)
                    let title = key == todayKey ? "\("Today section".localized()) · \(short)" : short
                    titles[key] = title.uppercased(with: locale)
                }
            } else {
                key = "—"
                titles[key] = "—"
            }
            if rows[key] == nil { order.append(key) }
            rows[key, default: []].append(row(entry, timeZone: timeZone))
        }
        if let index = order.firstIndex(of: "—"), index != order.count - 1 {
            order.remove(at: index)
            order.append("—")
        }
        return order.map { ChangeDay(key: $0, title: titles[$0] ?? $0, rows: rows[$0] ?? []) }
    }

    /// Entries of a page appended to what is shown, without the ones already there (a row added meanwhile shifts
    /// the offset by one)
    static func merge(_ shown: [ChangeHistoryEntry], _ page: [ChangeHistoryEntry]) -> [ChangeHistoryEntry] {
        let ids = Set(shown.map(\.id))
        return shown + page.filter { !ids.contains($0.id) }
    }

    static func hasMore(loaded: Int, total: Int, lastPageCount: Int) -> Bool {
        lastPageCount > 0 && loaded < total
    }

    // MARK: Summary

    /// "6 lần thay đổi · gần nhất 15:10 hôm nay", "· gần nhất 15:10 05/10"; "Chưa có thay đổi" for none
    static func summary(total: Int, latestAt: String?, now: Date = Date(),
                        timeZone: TimeZone = ChangeHistoryLogic.timeZone) -> String {
        guard total > 0 else { return "history.summary.none".localized() }
        guard let latest = latestAt.flatMap(ISOInstant.parse) else {
            return PluralText.format("history.summary.count", count: total, total)
        }
        let when: String
        if DayFormatter.key(latest, timeZone: timeZone) == DayFormatter.key(now, timeZone: timeZone) {
            when = String(format: "history.summary.today".localized(), clock(latest, timeZone: timeZone))
        } else {
            when = clock(latest, timeZone: timeZone) + " " + CreateOrderSheetLogic.dayMonth(latest, timeZone: timeZone)
        }
        return PluralText.format("history.summary", count: total, total, when)
    }
}
