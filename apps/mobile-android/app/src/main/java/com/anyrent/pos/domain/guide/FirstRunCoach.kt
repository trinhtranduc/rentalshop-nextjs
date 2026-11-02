package com.anyrent.pos.domain.guide

/**
 * #1394, #1412: the walk of the first-run guide: 9 bubbles on 4 screens, run only after a row of the card is tapped. What comes next
 * and how far along it is are pure rules here; the screens only say which one they are. Same rules as iOS `FirstRunCoach.swift`.
 */
enum class CoachScreen { PRODUCT_FORM, CART, CUSTOMER_PICKER, NEW_CUSTOMER }

enum class CoachBubble(
    /** The Tạo đơn and Lưu buttons sit at the bottom, so their bubble goes above; the others below when there is room */
    val prefersAbove: Boolean = false,
) {
    PRODUCT_PHOTO,
    PRODUCT_NAME,
    PRODUCT_PRICE,
    PRODUCT_SAVE(prefersAbove = true),
    CART_CUSTOMER,
    NEW_CUSTOMER,
    NEW_CUSTOMER_SAVE(prefersAbove = true),
    CART_DATES,
    CART_CREATE(prefersAbove = true);

    /**
     * Test tag of the control the bubble lights; a missing one skips the bubble.
     * Bubble 6 has two places: Khách mới on the picker, then the phone and name on the form.
     */
    fun anchor(screen: CoachScreen): String = when (this) {
        PRODUCT_PHOTO -> "product.form.photos"
        PRODUCT_NAME -> "product.form.nameRow"
        PRODUCT_PRICE -> "product.form.prices"
        PRODUCT_SAVE -> "product.form.save"
        CART_CUSTOMER -> "cart.customerRow"
        NEW_CUSTOMER -> if (screen == CoachScreen.CUSTOMER_PICKER) "customers.picker.new" else "customers.new.fields"
        NEW_CUSTOMER_SAVE -> "customers.new.save"
        CART_DATES -> "cart.datesRow"
        CART_CREATE -> "cart.cta"
    }

    /** Tiếp goes on from here. On every other bubble the user taps the real control and Tiếp never acts for them. */
    fun nextAdvances(screen: CoachScreen): Boolean = when (this) {
        PRODUCT_PHOTO, PRODUCT_NAME, PRODUCT_PRICE -> true
        NEW_CUSTOMER -> screen == CoachScreen.NEW_CUSTOMER
        else -> false
    }
}

/** The bubbles this shop and order will see. Read from the state, nothing is stored. */
data class CoachPlan(
    /** Read when the run starts: the customer just created in this run must not change the counter */
    val customersExist: Boolean = false,
    val isSale: Boolean = false,
) {
    val bubbles: List<CoachBubble>
        get() = CoachBubble.entries.filter { bubble ->
            when (bubble) {
                CoachBubble.NEW_CUSTOMER, CoachBubble.NEW_CUSTOMER_SAVE -> !customersExist // picks from the list
                CoachBubble.CART_DATES -> !isSale // a sale has no dates
                else -> true
            }
        }

    /** "n/9" */
    fun counter(bubble: CoachBubble): String? {
        val index = bubbles.indexOf(bubble)
        return if (index < 0) null else "${index + 1}/${bubbles.size}"
    }
}

/** What a row of the card started: the product form only, or the one run in the cart */
enum class CoachRun {
    PRODUCT, ORDER;

    companion object {
        fun of(action: FirstRunGuideAction) = if (action == FirstRunGuideAction.OpenProductForm) PRODUCT else ORDER
    }
}

data class CoachCart(
    val isEmpty: Boolean = false,
    val hasCustomer: Boolean,
    val isSale: Boolean,
    val hasDates: Boolean,
    val isEditing: Boolean,
)

object FirstRunCoachRules {
    /**
     * The bubble this screen owes, or null.
     * [passed]: moved on with Tiếp, or skipped because its control is gone. The cart asks its data, so going back and forth resumes.
     */
    fun next(
        run: CoachRun?,
        screen: CoachScreen,
        passed: Set<CoachBubble>,
        cart: CoachCart? = null,
        customersExist: Boolean = false,
    ): CoachBubble? {
        val wanted = when {
            run == CoachRun.PRODUCT && screen == CoachScreen.PRODUCT_FORM ->
                listOf(CoachBubble.PRODUCT_PHOTO, CoachBubble.PRODUCT_NAME, CoachBubble.PRODUCT_PRICE, CoachBubble.PRODUCT_SAVE)
            run != CoachRun.ORDER -> emptyList()
            screen == CoachScreen.CART -> cartBubbles(cart)
            customersExist -> emptyList()
            screen == CoachScreen.CUSTOMER_PICKER -> listOf(CoachBubble.NEW_CUSTOMER)
            screen == CoachScreen.NEW_CUSTOMER -> listOf(CoachBubble.NEW_CUSTOMER, CoachBubble.NEW_CUSTOMER_SAVE)
            else -> emptyList()
        }
        return wanted.firstOrNull { it !in passed }
    }

    private fun cartBubbles(cart: CoachCart?): List<CoachBubble> {
        if (cart == null || cart.isEditing || cart.isEmpty) return emptyList() // empty: the order was just created
        return buildList {
            if (!cart.hasCustomer) add(CoachBubble.CART_CUSTOMER)
            if (!cart.isSale && !cart.hasDates) add(CoachBubble.CART_DATES)
            add(CoachBubble.CART_CREATE)
        }
    }

    /** Inside the guide only; the normal form keeps saving without a photo */
    fun photoIsValid(count: Int): Boolean = count >= 1

    /** Inside the guide only; the normal form keeps saving 0đ */
    fun priceIsValid(perRental: Double?, perDay: Double?): Boolean = (perRental ?: 0.0) > 0 || (perDay ?: 0.0) > 0
}
