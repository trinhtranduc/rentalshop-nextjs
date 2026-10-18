package com.anyrent.pos.domain.products

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** #1024 (option A, icon + word): the cart's icons, the item note on one line, and what TalkBack reads (iOS ProductsV2Tests) */
class CartNoteIconsTest {
    @Test
    fun iconsMatchIos() {
        assertEquals("AddCircleOutline", CartV2Icon.ADD_ITEM.material)
        assertEquals("plus.circle", CartV2Icon.ADD_ITEM.ios)
        // #1061 (owner: "đổi icon edit không giống", "icon đúng mockup"): one pen-line for every edit in the cart
        // (`CartIcons.EditLine`, the mockup's Lucide paths; iOS DS.editIcon)
        assertEquals("EditLine", CartV2Icon.EDIT.material)
        assertEquals("pen-line", CartV2Icon.EDIT.ios)
        assertEquals(CartV2Icon.EDIT, CartV2Icon.ITEM_NOTE)
        assertEquals(CartV2Icon.EDIT, CartV2Icon.ORDER_NOTE)
        assertEquals(listOf(CartV2Icon.ADD_ITEM, CartV2Icon.EDIT), CartV2Icon.values().toList())
    }

    @Test
    fun itemNoteIsOneLine() {
        // null = the entry shows "Ghi chú"
        assertNull(CartV2Logic.itemNoteLine(null))
        assertNull(CartV2Logic.itemNoteLine(" \n\t "))
        assertEquals("Sửa eo 2cm", CartV2Logic.itemNoteLine("  Sửa eo 2cm "))
        assertEquals("Tặng kèm size M giao trước 9h", CartV2Logic.itemNoteLine("Tặng kèm\n size M\r\n\ngiao trước 9h\n"))
        // the text stays whole; the entry cuts it with "…" (maxLines 1, Ellipsis)
        val long = "Giao trước 9h ".repeat(20)
        assertEquals(long.trim(), CartV2Logic.itemNoteLine(long))
    }

    @Test
    fun talkBackReadsNoteAndProduct() {
        val empty = CartV2Logic.itemNoteSpoken("Áo dài", "  ", noteLabel = "Ghi chú", accessibilityFormat = "Ghi chú cho %1\$s")
        assertEquals("Ghi chú", empty.text)
        assertEquals("Ghi chú cho Áo dài", empty.actionLabel)
        val has = CartV2Logic.itemNoteSpoken("Áo dài", " Size M ", noteLabel = "Ghi chú", accessibilityFormat = "Ghi chú cho %1\$s")
        assertEquals("Size M", has.text)
        assertEquals("Ghi chú cho Áo dài", has.actionLabel)
    }

    /** #1043: the order note uses the item note sheet; photos (#480) only on a new order (iOS ProductsV2Tests) */
    @Test
    fun orderNoteSheetPhotosOnlyOnNewOrder() {
        assertEquals(5, CartV2Logic.orderNoteMaxPhotos(editMode = false))
        assertEquals(com.anyrent.pos.domain.orders.OrderDetailLogic.MAX_NOTE_PHOTOS, CartV2Logic.orderNoteMaxPhotos(editMode = false))
        assertEquals(0, CartV2Logic.orderNoteMaxPhotos(editMode = true))
        // the cart entry shows the order note on one line, like an item note
        assertEquals("Giao trước 9h Khách lấy tại tiệm", CartV2Logic.itemNoteLine("Giao trước 9h\nKhách lấy tại tiệm"))
    }
}
