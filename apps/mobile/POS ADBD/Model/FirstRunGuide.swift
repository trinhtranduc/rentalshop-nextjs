//
//  FirstRunGuide.swift
//  POS ADBD
//
//  #1393: the card "Bắt đầu: 3 việc" on Home for a new shop's owner. Pure rules plus a small tracker: no API change, the
//  ticks come from data the app can already read. Android: `domain/guide/FirstRunGuide.kt`.
//

import Foundation

enum FirstRunGuideStep: Int, CaseIterable, Equatable {
    case product, customer, order
}

/// What the app knows about the shop. nil is "not known": a read has not answered, or it failed.
struct FirstRunGuideFacts: Equatable {
    var hasProduct: Bool?
    var customerTotal: Int?
    var orderTotal: Int?
}

/// Per phone and per shop
struct FirstRunGuideMarks: Equatable {
    /// Bỏ qua
    var skipped = false
    /// This phone showed the steps card, so the first order earns the finish card
    var seen = false
    /// The shop has an order: the guide is over and no more calls are made
    var done = false
    /// Done on a phone that followed the guide; Đóng clears it
    var finishPending = false
}

enum FirstRunGuideCard: Equatable {
    case hidden
    case steps(done: Set<FirstRunGuideStep>)
    case finished
}

enum FirstRunGuideAction: Equatable {
    case openProductForm
    case openCart(addFirstProduct: Bool)
}

enum FirstRunGuide {
    /// Only the owner: an outlet role's order count is its branch only, so a new branch of an old shop would read as 0.
    /// The old screens (`newProducts` / `newCustomers` off) have nothing the guide can point at.
    static func isAudience(role: Role?, merchantId: Int?, newProducts: Bool, newCustomers: Bool) -> Bool {
        role == .merchant && merchantId != nil && newProducts && newCustomers
    }

    /// nil until every read has answered
    static func doneSteps(_ facts: FirstRunGuideFacts) -> Set<FirstRunGuideStep>? {
        guard let hasProduct = facts.hasProduct, let customers = facts.customerTotal, let orders = facts.orderTotal else { return nil }
        if orders > 0 { return Set(FirstRunGuideStep.allCases) }
        var done = Set<FirstRunGuideStep>()
        if hasProduct { done.insert(.product) }
        if customers > 0 { done.insert(.customer) }
        return done
    }

    /// The first row not done yet
    static func current(done: Set<FirstRunGuideStep>) -> FirstRunGuideStep? {
        FirstRunGuideStep.allCases.first { !done.contains($0) }
    }

    static func card(audience: Bool, marks: FirstRunGuideMarks, facts: FirstRunGuideFacts, searching: Bool) -> FirstRunGuideCard {
        guard audience, !searching else { return .hidden }
        if marks.finishPending { return .finished }
        guard !marks.done, !marks.skipped, let done = doneSteps(facts) else { return .hidden }
        return .steps(done: done)
    }

    /// The "n/3" of the Settings row; nil hides the row. A skip keeps the row: it is how the guide comes back.
    static func settingsDoneCount(audience: Bool, marks: FirstRunGuideMarks, facts: FirstRunGuideFacts) -> Int? {
        guard audience, !marks.done, !marks.finishPending else { return nil }
        return doneSteps(facts)?.count
    }

    /// An order ends the guide. Only a phone that showed the card, and did not skip it, shows the finish card.
    static func marks(_ marks: FirstRunGuideMarks, afterOrderTotal total: Int) -> FirstRunGuideMarks {
        guard total > 0, !marks.done else { return marks }
        var next = marks
        next.done = true
        next.finishPending = marks.seen && !marks.skipped
        return next
    }

    /// A row of the card. The customer and order rows work in the cart, so the cart needs a product first.
    static func action(for step: FirstRunGuideStep, hasProduct: Bool, cartIsEmpty: Bool) -> FirstRunGuideAction {
        guard step != .product, hasProduct else { return .openProductForm }
        return .openCart(addFirstProduct: cartIsEmpty)
    }
}

struct FirstRunGuideStore {
    let defaults: UserDefaults

    /// Carries the shop: the phone may sign in to another shop, and nothing here is cleared on logout
    static func key(_ name: String, merchantId: Int) -> String {
        "firstRunGuide.\(name).\(merchantId)"
    }

    func marks(merchantId: Int) -> FirstRunGuideMarks {
        let read = { (name: String) in defaults.bool(forKey: Self.key(name, merchantId: merchantId)) }
        return FirstRunGuideMarks(skipped: read("skipped"), seen: read("seen"), done: read("done"), finishPending: read("finishPending"))
    }

    func save(_ marks: FirstRunGuideMarks, merchantId: Int) {
        let write = { (name: String, value: Bool) in defaults.set(value, forKey: Self.key(name, merchantId: merchantId)) }
        write("skipped", marks.skipped)
        write("seen", marks.seen)
        write("done", marks.done)
        write("finishPending", marks.finishPending)
    }
}

protocol FirstRunGuideDataSource {
    /// nil on any failure
    func orderTotal(completion: @escaping (Int?) -> Void)
    func customerTotal(completion: @escaping (Int?) -> Void)
}

struct LiveFirstRunGuideDataSource: FirstRunGuideDataSource {
    /// No branch filter: a shop with an order at any branch has started
    func orderTotal(completion: @escaping (Int?) -> Void) {
        OrderService.shared.performGET(path: APIEndpoint.Path.orders, parameters: ["limit": 1, "page": 1],
                                       responseType: OrdersTotalResponse.self,
                                       context: "FirstRunGuide.orderTotal") { response, _ in
            DispatchQueue.main.async { completion(response?.success == true ? response?.data?.total : nil) }
        }
    }

    func customerTotal(completion: @escaping (Int?) -> Void) {
        LiveCustomersV2DataSource().loadCustomers(query: nil, page: 1, limit: 1) { page, _ in
            DispatchQueue.main.async { completion(page?.total) }
        }
    }
}

struct FirstRunGuideContext {
    let role: Role?
    let merchantId: Int?
    let newProducts: Bool
    let newCustomers: Bool

    static func current() -> FirstRunGuideContext {
        let user = User.current()
        return FirstRunGuideContext(role: user?.role, merchantId: user?.merchantId,
                                    newProducts: FeatureFlags.shared.isOn(.newProducts),
                                    newCustomers: FeatureFlags.shared.isOn(.newCustomers))
    }
}

/// Holds what is known for the shop signed in and tells Home and Settings when it changes
final class FirstRunGuideTracker {
    static let didChange = Notification.Name("FirstRunGuideTracker.didChange")
    /// Cài đặt asks Home to run a step; `stepKey` carries the step's raw value
    static let runStep = Notification.Name("FirstRunGuideTracker.runStep")
    static let stepKey = "step"
    static let shared = FirstRunGuideTracker(dataSource: LiveFirstRunGuideDataSource(), defaults: .standard, context: FirstRunGuideContext.current)

    private let dataSource: FirstRunGuideDataSource
    private let store: FirstRunGuideStore
    private let context: () -> FirstRunGuideContext
    private var facts = FirstRunGuideFacts()
    private var factsShop: Int?
    /// Bumped on every read and shop change; an older answer is dropped
    private var generation = 0
    private var isReading = false
    private var readAgain: Bool?

    init(dataSource: FirstRunGuideDataSource, defaults: UserDefaults, context: @escaping () -> FirstRunGuideContext) {
        self.dataSource = dataSource
        store = FirstRunGuideStore(defaults: defaults)
        self.context = context
    }

    private var isAudience: Bool {
        let now = context()
        return FirstRunGuide.isAudience(role: now.role, merchantId: now.merchantId, newProducts: now.newProducts, newCustomers: now.newCustomers)
    }

    /// The shop signed in now; facts of another shop are forgotten
    private func currentShop() -> Int? {
        let shop = context().merchantId
        if shop != factsShop {
            factsShop = shop
            facts = FirstRunGuideFacts()
            generation += 1
            isReading = false
            readAgain = nil
        }
        return shop
    }

    private var marks: FirstRunGuideMarks {
        guard let shop = currentShop() else { return FirstRunGuideMarks() }
        return store.marks(merchantId: shop)
    }

    func card(searching: Bool) -> FirstRunGuideCard {
        FirstRunGuide.card(audience: isAudience, marks: marks, facts: facts, searching: searching)
    }

    var settingsDoneCount: Int? {
        FirstRunGuide.settingsDoneCount(audience: isAudience, marks: marks, facts: facts)
    }

    /// The rows ticked, for the sheet in Cài đặt
    var doneSteps: Set<FirstRunGuideStep>? { _ = currentShop(); return FirstRunGuide.doneSteps(facts) }

    /// False while the list has not answered or failed with no rows
    var hasProduct: Bool { _ = currentShop(); return facts.hasProduct == true }

    /// Home's list while not searching. nil: it failed with nothing to show.
    func noteProducts(_ hasProduct: Bool?) {
        _ = currentShop()
        guard facts.hasProduct != hasProduct else { return }
        facts.hasProduct = hasProduct
        publish()
    }

    /// - forSettings: the Settings row reads a skipped guide too, so it can show "n/3"; Home does not call after a skip
    func refresh(forSettings: Bool = false) {
        guard isAudience, let shop = currentShop() else { return }
        let marks = store.marks(merchantId: shop)
        guard !marks.done, forSettings || !marks.skipped else { return }
        guard !isReading else {
            readAgain = (readAgain ?? false) || forSettings
            return
        }
        isReading = true
        generation += 1
        let token = generation
        dataSource.orderTotal { [weak self] total in
            guard let self, token == self.generation else { return }
            guard self.context().merchantId == shop else { return }
            self.facts.orderTotal = total
            if let total, total > 0 {
                self.store.save(FirstRunGuide.marks(self.store.marks(merchantId: shop), afterOrderTotal: total), merchantId: shop)
                self.finishRead()
                return
            }
            guard total != nil else {
                self.facts.customerTotal = nil
                self.finishRead()
                return
            }
            self.dataSource.customerTotal { [weak self] customers in
                guard let self, token == self.generation, self.context().merchantId == shop else { return }
                self.facts.customerTotal = customers
                self.finishRead()
            }
        }
    }

    private func finishRead() {
        isReading = false
        publish()
        if let again = readAgain {
            readAgain = nil
            refresh(forSettings: again)
        }
    }

    /// The steps card reached the screen
    func noteCardShown() {
        update { $0.seen = true }
    }

    func skip() {
        update { $0.skipped = true }
        publish()
    }

    func clearSkip() {
        update { $0.skipped = false }
        publish()
    }

    func closeFinish() {
        update { $0.finishPending = false }
        publish()
    }

    private func update(_ change: (inout FirstRunGuideMarks) -> Void) {
        guard let shop = currentShop() else { return }
        var next = store.marks(merchantId: shop)
        change(&next)
        store.save(next, merchantId: shop)
    }

    private func publish() {
        NotificationCenter.default.post(name: Self.didChange, object: self)
    }
}
