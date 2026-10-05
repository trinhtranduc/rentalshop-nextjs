package com.anyrent.pos.domain.orders

/**
 * Review after the new cart (#448), following iOS `PreviewViewController` for a cart: the sections it
 * shows and the "collect" sheet it asks to confirm before the order is created
 * (`PaymentCollectionViewController`, deposit for a rental, the total for a sale). The sheet only
 * confirms; it does not change the create request.
 */
object OrderReviewV2 {
    enum class Section { INFO, DATES, PRODUCTS, DEPOSIT_PAPERS, NOTES, SUMMARY }

    enum class ConfirmKind { DEPOSIT, SALE }

    data class Confirm(val kind: ConfirmKind, val amount: Double)

    /** iOS `visibleSections()`: the deposit & papers section only for a rental */
    fun sections(isSale: Boolean): List<Section> = buildList {
        add(Section.INFO)
        add(Section.DATES)
        add(Section.PRODUCTS)
        if (!isSale) add(Section.DEPOSIT_PAPERS)
        add(Section.NOTES)
        add(Section.SUMMARY)
    }

    /** iOS `showPaymentDialogForNewOrder`: `.deposit(depositAmount)` or `.sale(toCollectAmount)` */
    fun confirm(isSale: Boolean, deposit: Double, total: Double): Confirm =
        if (isSale) Confirm(ConfirmKind.SALE, total) else Confirm(ConfirmKind.DEPOSIT, deposit)
}
