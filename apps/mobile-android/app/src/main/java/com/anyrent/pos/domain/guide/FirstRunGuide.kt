package com.anyrent.pos.domain.guide

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * #1393: the card "Bắt đầu: 3 việc" on Home for a new shop's owner. Pure rules plus a small tracker: no API change, the
 * ticks come from data the app can already read. Same rules as iOS `FirstRunGuide.swift`.
 */
enum class FirstRunGuideStep { PRODUCT, CUSTOMER, ORDER }

/** What the app knows about the shop. null is "not known": a read has not answered, or it failed. */
data class FirstRunGuideFacts(
    val hasProduct: Boolean? = null,
    val customerTotal: Int? = null,
    val orderTotal: Int? = null,
)

/** Per phone and per shop */
data class FirstRunGuideMarks(
    /** Bỏ qua */
    val skipped: Boolean = false,
    /** This phone showed the steps card, so the first order earns the finish card */
    val seen: Boolean = false,
    /** The shop has an order: the guide is over and no more calls are made */
    val done: Boolean = false,
    /** Done on a phone that followed the guide; Đóng clears it */
    val finishPending: Boolean = false,
)

sealed interface FirstRunGuideCard {
    data object Hidden : FirstRunGuideCard
    data class Steps(val done: Set<FirstRunGuideStep>) : FirstRunGuideCard
    data object Finished : FirstRunGuideCard
}

sealed interface FirstRunGuideAction {
    data object OpenProductForm : FirstRunGuideAction
    data class OpenCart(val addFirstProduct: Boolean) : FirstRunGuideAction
}

object FirstRunGuide {
    /**
     * Only the owner: an outlet role's order count is its branch only, so a new branch of an old shop would read as 0.
     * The old screens (`newProducts` / `newCustomers` off) have nothing the guide can point at.
     */
    fun isAudience(role: String?, merchantId: Int?, newProducts: Boolean, newCustomers: Boolean): Boolean =
        role == "MERCHANT" && merchantId != null && newProducts && newCustomers

    /** null until every read has answered */
    fun doneSteps(facts: FirstRunGuideFacts): Set<FirstRunGuideStep>? {
        val hasProduct = facts.hasProduct ?: return null
        val customers = facts.customerTotal ?: return null
        val orders = facts.orderTotal ?: return null
        if (orders > 0) return FirstRunGuideStep.entries.toSet()
        return buildSet {
            if (hasProduct) add(FirstRunGuideStep.PRODUCT)
            if (customers > 0) add(FirstRunGuideStep.CUSTOMER)
        }
    }

    /** The first row not done yet */
    fun current(done: Set<FirstRunGuideStep>): FirstRunGuideStep? = FirstRunGuideStep.entries.firstOrNull { it !in done }

    fun card(audience: Boolean, marks: FirstRunGuideMarks, facts: FirstRunGuideFacts, searching: Boolean): FirstRunGuideCard {
        if (!audience || searching) return FirstRunGuideCard.Hidden
        if (marks.finishPending) return FirstRunGuideCard.Finished
        if (marks.done || marks.skipped) return FirstRunGuideCard.Hidden
        return doneSteps(facts)?.let { FirstRunGuideCard.Steps(it) } ?: FirstRunGuideCard.Hidden
    }

    /** The "n/3" of the Settings row; null hides the row. A skip keeps the row: it is how the guide comes back. */
    fun settingsDoneCount(audience: Boolean, marks: FirstRunGuideMarks, facts: FirstRunGuideFacts): Int? {
        if (!audience || marks.done || marks.finishPending) return null
        return doneSteps(facts)?.size
    }

    /** An order ends the guide. Only a phone that showed the card, and did not skip it, shows the finish card. */
    fun marksAfterOrders(marks: FirstRunGuideMarks, total: Int): FirstRunGuideMarks {
        if (total <= 0 || marks.done) return marks
        return marks.copy(done = true, finishPending = marks.seen && !marks.skipped)
    }

    /** A row of the card. The customer and order rows work in the cart, so the cart needs a product first. */
    fun action(step: FirstRunGuideStep, hasProduct: Boolean, cartIsEmpty: Boolean): FirstRunGuideAction =
        if (step == FirstRunGuideStep.PRODUCT || !hasProduct) {
            FirstRunGuideAction.OpenProductForm
        } else {
            FirstRunGuideAction.OpenCart(addFirstProduct = cartIsEmpty)
        }
}

interface FirstRunGuideStorage {
    fun get(key: String): Boolean
    fun set(key: String, value: Boolean)
}

class FirstRunGuideStore(private val storage: FirstRunGuideStorage) {
    fun marks(merchantId: Int) = FirstRunGuideMarks(
        skipped = storage.get(key("skipped", merchantId)),
        seen = storage.get(key("seen", merchantId)),
        done = storage.get(key("done", merchantId)),
        finishPending = storage.get(key("finishPending", merchantId)),
    )

    fun save(marks: FirstRunGuideMarks, merchantId: Int) {
        storage.set(key("skipped", merchantId), marks.skipped)
        storage.set(key("seen", merchantId), marks.seen)
        storage.set(key("done", merchantId), marks.done)
        storage.set(key("finishPending", merchantId), marks.finishPending)
    }

    companion object {
        /** Carries the shop: the phone may sign in to another shop, and nothing here is cleared on logout */
        fun key(name: String, merchantId: Int) = "firstRunGuide.$name.$merchantId"
    }
}

interface FirstRunGuideSource {
    /** null on any failure */
    suspend fun orderTotal(): Int?
    suspend fun customerTotal(): Int?
}

data class FirstRunGuideContext(
    val role: String?,
    val merchantId: Int?,
    val newProducts: Boolean,
    val newCustomers: Boolean,
)

/** Holds what is known for the shop signed in. [version] moves whenever Home or Settings should look again. */
class FirstRunGuideTracker(
    private val source: FirstRunGuideSource,
    storage: FirstRunGuideStorage,
    private val context: () -> FirstRunGuideContext,
) {
    private val store = FirstRunGuideStore(storage)
    private var facts = FirstRunGuideFacts()
    private var factsShop: Int? = null
    private val _version = MutableStateFlow(0L)
    val version: StateFlow<Long> = _version.asStateFlow()

    private val isAudience: Boolean
        get() = context().let { FirstRunGuide.isAudience(it.role, it.merchantId, it.newProducts, it.newCustomers) }

    /** The shop signed in now; facts of another shop are forgotten */
    @Synchronized
    private fun currentShop(): Int? {
        val shop = context().merchantId
        if (shop != factsShop) {
            factsShop = shop
            facts = FirstRunGuideFacts()
        }
        return shop
    }

    private fun marks(): FirstRunGuideMarks = currentShop()?.let(store::marks) ?: FirstRunGuideMarks()

    fun card(searching: Boolean): FirstRunGuideCard = FirstRunGuide.card(isAudience, marks(), facts, searching)

    fun settingsDoneCount(): Int? = FirstRunGuide.settingsDoneCount(isAudience, marks(), facts)

    /** The rows ticked, for the sheet in Cài đặt */
    fun doneSteps(): Set<FirstRunGuideStep>? {
        currentShop()
        return FirstRunGuide.doneSteps(facts)
    }

    /** The shop has a customer: the picker's "first customer" bubble would be wrong */
    fun hasCustomers(): Boolean {
        currentShop()
        return (facts.customerTotal ?: 0) > 0
    }

    /** False while the list has not answered or failed with no rows */
    fun hasProduct(): Boolean {
        currentShop()
        return facts.hasProduct == true
    }

    /** Home's list while not searching. null: it failed with nothing to show. */
    fun noteProducts(hasProduct: Boolean?) {
        currentShop()
        if (facts.hasProduct == hasProduct) return
        facts = facts.copy(hasProduct = hasProduct)
        publish()
    }

    /** [forSettings]: the Settings row reads a skipped guide too, so it can show "n/3"; Home does not call after a skip */
    suspend fun refresh(forSettings: Boolean = false) {
        val shop = currentShop() ?: return
        if (!isAudience) return
        val before = store.marks(shop)
        if (before.done || (before.skipped && !forSettings)) return
        val orders = source.orderTotal()
        if (context().merchantId != shop) return
        if (orders != null && orders > 0) {
            store.save(FirstRunGuide.marksAfterOrders(store.marks(shop), orders), shop)
            facts = facts.copy(orderTotal = orders)
            publish()
            return
        }
        if (orders == null) {
            facts = facts.copy(orderTotal = null, customerTotal = null)
            publish()
            return
        }
        val customers = source.customerTotal()
        if (context().merchantId != shop) return
        facts = facts.copy(orderTotal = orders, customerTotal = customers)
        publish()
    }

    /** The steps card reached the screen */
    fun noteCardShown() = update { it.copy(seen = true) }

    fun skip() {
        update { it.copy(skipped = true) }
        publish()
    }

    fun clearSkip() {
        update { it.copy(skipped = false) }
        publish()
    }

    fun closeFinish() {
        update { it.copy(finishPending = false) }
        publish()
    }

    private fun update(change: (FirstRunGuideMarks) -> FirstRunGuideMarks) {
        val shop = currentShop() ?: return
        store.save(change(store.marks(shop)), shop)
    }

    private fun publish() {
        _version.value += 1
    }
}
