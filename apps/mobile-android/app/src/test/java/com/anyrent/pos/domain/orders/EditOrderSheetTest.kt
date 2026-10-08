package com.anyrent.pos.domain.orders

import com.anyrent.pos.data.model.CartLine
import com.anyrent.pos.data.model.Product
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

/** #676 — editing an order: "Lưu thay đổi" on the cart and a sheet that tags rows changed since the order loaded (iOS `EditOrderSheetLogic`) */
class EditOrderSheetTest {
    private fun product(id: Int, name: String, price: Double) = Product(
        id = id, name = name, barcode = null, rentPrice = price, salePrice = price, stock = 1, available = 1,
        renting = 0, categoryId = null, categoryName = null, imageUrl = null,
    )

    private val vest = CartLine(product(1, "Vest đen slim fit", 150_000.0), quantity = 1, unitPriceOverride = 150_000.0)
    private val aoDai = CartLine(product(2, "Áo dài lụa đỏ", 300_000.0), quantity = 2, unitPriceOverride = 300_000.0)
    private val pickup = LocalDate.of(2026, 10, 3)
    private val ret = LocalDate.of(2026, 10, 5)

    private fun original(paid: Double = 200_000.0, lines: List<CartLine> = listOf(vest, aoDai), isSale: Boolean = false) =
        EditOrderSheet.Original(
            orderNumber = "482913",
            pickup = if (isSale) null else pickup,
            returnDate = if (isSale) null else ret,
            lines = EditOrderSheet.lines(lines, isSale),
            paid = paid,
        )

    private fun confirm(
        lines: List<CartLine> = listOf(vest, aoDai),
        pickup: LocalDate = this.pickup,
        returnDate: LocalDate = ret,
        original: EditOrderSheet.Original? = original(),
        isSale: Boolean = false,
    ) = EditOrderSheet.confirm(
        isSale = isSale, customerName = "Trần Văn Minh", pickup = pickup, returnDate = returnDate,
        lines = lines, total = 750_000.0, original = original,
    )

    @Test
    fun `edit cart says save changes`() {
        assertEquals(EditOrderSheet.CtaLabel.SAVE_CHANGES, EditOrderSheet.ctaLabel(editing = true, isSale = false))
        assertEquals(EditOrderSheet.CtaLabel.SAVE_CHANGES, EditOrderSheet.ctaLabel(editing = true, isSale = true))
        assertEquals(EditOrderSheet.CtaLabel.CREATE, EditOrderSheet.ctaLabel(editing = false, isSale = false))
        assertEquals(EditOrderSheet.CtaLabel.SELL_AND_COLLECT, EditOrderSheet.ctaLabel(editing = false, isSale = true))
    }

    @Test
    fun `title number is the short order number`() {
        assertEquals("482913", EditOrderSheet.number(original()))
        assertEquals("0063", EditOrderSheet.number(original().copy(orderNumber = "ORD-17-0063")))
        assertNull("a draft saved before #676 has no snapshot", EditOrderSheet.number(null))
    }

    @Test
    fun `unchanged edit sheet has no tags`() {
        val confirm = confirm()
        assertEquals("482913", confirm.number)
        assertFalse(confirm.isSale)
        assertEquals("Trần Văn Minh", confirm.customer)
        assertEquals("same date format as the create sheet", "03/10 → 05/10", confirm.range)
        assertEquals(3, confirm.days)
        assertEquals(3, confirm.itemCount)
        assertEquals(750_000.0, confirm.total, 0.0)
        assertEquals(200_000.0, confirm.paid!!, 0.0)
        assertFalse(confirm.datesChanged)
        assertFalse(confirm.itemsChanged)
    }

    @Test
    fun `new dates tag the dates row only`() {
        val confirm = confirm(returnDate = LocalDate.of(2026, 10, 6))
        assertTrue(confirm.datesChanged)
        assertFalse(confirm.itemsChanged)
        assertEquals(4, confirm.days)
    }

    @Test
    fun `quantity price and line changes tag the items row`() {
        assertTrue(confirm(lines = listOf(vest.copy(quantity = 2), aoDai)).itemsChanged)
        assertFalse(confirm(lines = listOf(vest.copy(quantity = 2), aoDai)).datesChanged)
        assertTrue(confirm(lines = listOf(vest, aoDai.copy(unitPriceOverride = 280_000.0))).itemsChanged)
        assertTrue(confirm(lines = listOf(aoDai)).itemsChanged)
        assertTrue(confirm(lines = listOf(vest, aoDai.copy(pricingType = "DAILY"))).itemsChanged)
    }

    @Test
    fun `line order does not count`() {
        assertFalse(confirm(lines = listOf(aoDai, vest)).itemsChanged)
    }

    @Test
    fun `nothing collected hides the paid row`() {
        assertNull(confirm(original = original(paid = 0.0)).paid)
    }

    @Test
    fun `no snapshot means no tags`() {
        val confirm = confirm(lines = listOf(vest.copy(quantity = 5)), returnDate = LocalDate.of(2026, 10, 9), original = null)
        assertNull(confirm.number)
        assertNull(confirm.paid)
        assertFalse(confirm.datesChanged)
        assertFalse(confirm.itemsChanged)
    }

    @Test
    fun `sale edit has no dates row`() {
        val saleLines = listOf(vest.copy(isSale = true), aoDai.copy(isSale = true))
        val confirm = confirm(lines = saleLines, original = original(lines = saleLines, isSale = true), isSale = true)
        assertTrue(confirm.isSale)
        assertNull(confirm.range)
        assertNull(confirm.days)
        assertFalse(confirm.datesChanged)
        assertFalse(confirm.itemsChanged)
    }

    @Test
    fun `an edited order saves from its own sheet`() {
        assertEquals(CreateOrderSheet.CtaRoute.EDIT_SHEET, CreateOrderSheet.ctaRoute(editing = true))
    }
}
