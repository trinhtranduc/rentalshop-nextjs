package com.anyrent.pos.domain.guide

/**
 * #1394: the bubbles of the first-run guide: 6 bubbles on 4 screens, run only after a row of the card is tapped. The order is
 * a pure rule here; the screens only say which one they are. Same rules as iOS `FirstRunCoach.swift`.
 */
enum class CoachScreen { PRODUCT_FORM, CART, CUSTOMER_PICKER, NEW_CUSTOMER }

enum class CoachBubble(
    /** Test tag of the control the bubble lights; a missing one skips the bubble */
    val anchor: String,
    /** "Bước n/3": the row of the card it belongs to */
    val step: Int,
    val screen: CoachScreen,
    /** The Tạo đơn button sits at the bottom, so its bubble goes above; the others below when there is room */
    val prefersAbove: Boolean = false,
) {
    PRODUCT_NAME("product.form.nameRow", 1, CoachScreen.PRODUCT_FORM),
    CART_CUSTOMER("cart.customerRow", 2, CoachScreen.CART),
    PICKER_NEW("customers.picker.new", 2, CoachScreen.CUSTOMER_PICKER),
    NEW_CUSTOMER_FIELDS("customers.new.fields", 2, CoachScreen.NEW_CUSTOMER),
    CART_DATES("cart.datesRow", 3, CoachScreen.CART),
    CART_CREATE("cart.cta", 3, CoachScreen.CART, prefersAbove = true),
}

/** What a row of the card started: the product row only has its form, the customer and order rows are one run in the cart */
enum class CoachRun {
    PRODUCT, ORDER;

    companion object {
        fun of(step: FirstRunGuideStep) = if (step == FirstRunGuideStep.PRODUCT) PRODUCT else ORDER
    }
}

data class CoachCart(val hasCustomer: Boolean, val isSale: Boolean, val hasDates: Boolean, val isEditing: Boolean)

object FirstRunCoachRules {
    /**
     * The bubble this screen owes, or null. Each bubble shows once in a run: closing it by the dim area does not bring it back.
     * [customersExist]: "Khách đầu tiên của shop" would be wrong then, the owner picks from the list.
     */
    fun next(
        run: CoachRun?,
        screen: CoachScreen,
        shown: Set<CoachBubble>,
        cart: CoachCart? = null,
        customersExist: Boolean = false,
    ): CoachBubble? {
        val wanted = when {
            run == CoachRun.PRODUCT && screen == CoachScreen.PRODUCT_FORM -> CoachBubble.PRODUCT_NAME
            run != CoachRun.ORDER -> null
            screen == CoachScreen.CART -> cartBubble(cart)
            screen == CoachScreen.CUSTOMER_PICKER -> if (customersExist) null else CoachBubble.PICKER_NEW
            screen == CoachScreen.NEW_CUSTOMER -> CoachBubble.NEW_CUSTOMER_FIELDS
            else -> null
        }
        return wanted?.takeUnless { it in shown }
    }

    private fun cartBubble(cart: CoachCart?): CoachBubble? = when {
        cart == null || cart.isEditing -> null
        !cart.hasCustomer -> CoachBubble.CART_CUSTOMER
        !cart.isSale && !cart.hasDates -> CoachBubble.CART_DATES // a sale has no dates
        else -> CoachBubble.CART_CREATE
    }
}
