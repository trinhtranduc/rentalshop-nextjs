package com.anyrent.pos.domain.products

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** #1056 (owner, mockup cartmoney): TIỀN rows — blue + pencil = tappable, black = read only (iOS ProductsV2Tests) */
class CartMoneyRowsTest {
    @Test
    fun onlyDiscountDepositAndNoteAreEditable() {
        assertFalse(CartMoneyRow.SUBTOTAL.editable)
        assertFalse(CartMoneyRow.TOTAL.editable)
        assertTrue(CartMoneyRow.DISCOUNT.editable)
        assertTrue(CartMoneyRow.DEPOSIT.editable)
        assertTrue(CartMoneyRow.NOTE.editable)
    }

    @Test
    fun valueTonePerRow() {
        assertEquals(CartMoneyTone.PLAIN, CartV2Logic.moneyRowTone(CartMoneyRow.SUBTOTAL))
        assertEquals(CartMoneyTone.PLAIN, CartV2Logic.moneyRowTone(CartMoneyRow.TOTAL))
        // a discount of 0 is blue too (it used to be grey, and green above 0)
        assertEquals(CartMoneyTone.ACTION, CartV2Logic.moneyRowTone(CartMoneyRow.DISCOUNT))
        assertEquals(CartMoneyTone.ACTION, CartV2Logic.moneyRowTone(CartMoneyRow.DEPOSIT))
        // empty note: blue "Thêm"; a note: its text in dark grey
        assertEquals(CartMoneyTone.ACTION, CartV2Logic.moneyRowTone(CartMoneyRow.NOTE, note = null))
        assertEquals(CartMoneyTone.ACTION, CartV2Logic.moneyRowTone(CartMoneyRow.NOTE, note = "  \n "))
        assertEquals(CartMoneyTone.NOTE_TEXT, CartV2Logic.moneyRowTone(CartMoneyRow.NOTE, note = "Khách lấy lúc 9h"))
    }

    @Test
    fun discountShowsMinusOrZero() {
        assertEquals(0.0, CartV2Logic.discountShown(0.0), 0.0)
        assertEquals(0.0, CartV2Logic.discountShown(-5.0), 0.0)
        assertEquals(-50_000.0, CartV2Logic.discountShown(50_000.0), 0.0)
    }

    @Test
    fun talkBackReadsTitleValueAndEdit() {
        assertEquals("Giảm giá, 0đ, Sửa", CartV2Logic.moneyRowSpoken("Giảm giá", "0đ", "Sửa"))
        assertEquals("Ghi chú, Thêm, Sửa", CartV2Logic.moneyRowSpoken("Ghi chú", "Thêm", "Sửa"))
        assertEquals("Ghi chú, Khách lấy lúc 9h, 2 ảnh, Sửa", CartV2Logic.moneyRowSpoken("Ghi chú", "Khách lấy lúc 9h", "Sửa", photos = "2 ảnh"))
    }
}
