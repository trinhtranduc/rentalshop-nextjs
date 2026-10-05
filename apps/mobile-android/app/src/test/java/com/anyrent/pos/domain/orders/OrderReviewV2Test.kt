package com.anyrent.pos.domain.orders

import org.junit.Assert.assertEquals
import org.junit.Test

/** #448 — the review after the new cart follows iOS `PreviewViewController` + `PaymentCollectionViewController` */
class OrderReviewV2Test {
    @Test
    fun rentShowsTheDepositAndPapersSection() {
        assertEquals(
            listOf(
                OrderReviewV2.Section.INFO,
                OrderReviewV2.Section.DATES,
                OrderReviewV2.Section.PRODUCTS,
                OrderReviewV2.Section.DEPOSIT_PAPERS,
                OrderReviewV2.Section.NOTES,
                OrderReviewV2.Section.SUMMARY,
            ),
            OrderReviewV2.sections(isSale = false),
        )
    }

    @Test
    fun saleHasNoDepositSection() {
        assertEquals(
            listOf(
                OrderReviewV2.Section.INFO,
                OrderReviewV2.Section.DATES,
                OrderReviewV2.Section.PRODUCTS,
                OrderReviewV2.Section.NOTES,
                OrderReviewV2.Section.SUMMARY,
            ),
            OrderReviewV2.sections(isSale = true),
        )
    }

    @Test
    fun rentConfirmsTheDeposit() {
        assertEquals(
            OrderReviewV2.Confirm(OrderReviewV2.ConfirmKind.DEPOSIT, 200_000.0),
            OrderReviewV2.confirm(isSale = false, deposit = 200_000.0, total = 500_000.0),
        )
    }

    @Test
    fun saleConfirmsTheTotal() {
        assertEquals(
            OrderReviewV2.Confirm(OrderReviewV2.ConfirmKind.SALE, 500_000.0),
            OrderReviewV2.confirm(isSale = true, deposit = 200_000.0, total = 500_000.0),
        )
    }
}
