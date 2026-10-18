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

    /** #1056 (owner: "note cần xuống dòng"): a note shows in full, its own line breaks kept, blank lines dropped */
    @Test
    fun noteShownKeepsTheLines() {
        assertEquals(null, CartV2Logic.noteShown(null))
        assertEquals(null, CartV2Logic.noteShown(" \n\t "))
        assertEquals("Giao 9h\nKhách lấy tại tiệm", CartV2Logic.noteShown("  Giao 9h \n\n Khách lấy tại tiệm  "))
        val long = "Giao trước 9h ".repeat(20).trim()
        assertEquals(long, CartV2Logic.noteShown(long))
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

    /** #1067 (iOS testDiscountLimitIsTheSubtotalOrOneHundredPercent): the subtotal before discount, or 100% */
    @Test
    fun discountLimitIsTheSubtotalOrOneHundredPercent() {
        assertEquals(77.0, CartV2Logic.discountLimit(subtotal = 77.0, isPercent = false), 0.0)
        assertEquals(100.0, CartV2Logic.discountLimit(subtotal = 77.0, isPercent = true), 0.0)
        assertEquals(0.0, CartV2Logic.discountLimit(subtotal = -5.0, isPercent = false), 0.0)
        assertEquals("(77đ)", "(" + CartV2Logic.discountLimitText(77.0, isPercent = false) { "${it.toLong()}đ" } + ")")
        assertEquals("100%", CartV2Logic.discountLimitText(77.0, isPercent = true) { "${it.toLong()}đ" })
    }

    /** #1067: the e2e cart had −5.000.050.000 on a 77đ order */
    @Test
    fun discountAboveTheSubtotalIsRefused() {
        assertTrue(CartV2Logic.discountExceeds(5_000_050_000.0, subtotal = 77.0, isPercent = false))
        assertTrue(CartV2Logic.discountExceeds(78.0, subtotal = 77.0, isPercent = false))
        assertFalse("equal: total 0 is allowed", CartV2Logic.discountExceeds(77.0, subtotal = 77.0, isPercent = false))
        assertFalse("no discount on an empty cart is fine", CartV2Logic.discountExceeds(0.0, subtotal = 0.0, isPercent = false))
        assertTrue("items removed below the saved discount", CartV2Logic.discountExceeds(10.0, subtotal = 0.0, isPercent = false))
        assertTrue(CartV2Logic.discountExceeds(101.0, subtotal = 77.0, isPercent = true))
        assertFalse(CartV2Logic.discountExceeds(100.0, subtotal = 77.0, isPercent = true))
        assertFalse("50% of nothing is 0", CartV2Logic.discountExceeds(50.0, subtotal = 0.0, isPercent = true))
    }
}
