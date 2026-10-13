package com.anyrent.pos.ui.home.v2

import com.anyrent.pos.data.UserRole
import com.anyrent.pos.data.model.Customer
import com.anyrent.pos.domain.customers.CustomerEditForm
import com.anyrent.pos.domain.customers.CustomerPickerEdit
import com.anyrent.pos.domain.products.CartDateRow
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

/** #952 (owner 13/10/26, iOS reference): cart date row, pencil in the customer picker, no floating cart bar */
class Cart952Test {
    @Test
    fun `date row is empty until both days are chosen, then one line and the day count`() {
        assertTrue(CartDateRow.state(null, null).isEmpty)
        assertTrue(CartDateRow.state(LocalDate.of(2026, 10, 12), null).isEmpty)
        assertNull(CartDateRow.state(null, null).text)
        assertNull(CartDateRow.state(null, null).days)

        val chosen = CartDateRow.state(LocalDate.of(2026, 10, 12), LocalDate.of(2026, 10, 15))
        assertFalse(chosen.isEmpty)
        assertEquals("12/10/26 → 15/10/26", chosen.text)
        assertEquals(4, chosen.days)
        assertEquals("same circle as the customer row avatar", 40, CartDateRow.ICON_DP)
    }

    @Test
    fun `pencil shows on picker rows for a user who may edit customers`() {
        assertTrue(CustomerPickerEdit.showsEdit(isPicker = true, role = UserRole.MERCHANT))
        assertTrue(CustomerPickerEdit.showsEdit(isPicker = true, role = UserRole.OUTLET_STAFF))
        assertFalse(CustomerPickerEdit.showsEdit(isPicker = true, role = UserRole.UNKNOWN))
        assertFalse(CustomerPickerEdit.showsEdit(isPicker = false, role = UserRole.MERCHANT))
        assertEquals(
            listOf(CustomerPickerEdit.Field.PHONE, CustomerPickerEdit.Field.NAME, CustomerPickerEdit.Field.ADDRESS, CustomerPickerEdit.Field.NOTES),
            CustomerPickerEdit.sheetFields,
        )
    }

    @Test
    fun `the cart customer takes the saved name, phone and address when it is the edited one`() {
        val inCart = Customer(7, "Mai", "Nguyễn", "0912345678", "m@x.vn", null)
        val form = CustomerEditForm(phone = " 0912000111 ", name = "Nguyễn Thị Mai (cô dâu)", email = "m@x.vn", address = "45 Võ Văn Tần")
        val updated = CustomerPickerEdit.cartCustomerAfterSave(form, customerId = 7, cart = inCart)!!
        assertEquals(Customer(7, "Nguyễn", "Thị Mai (cô dâu)", "0912000111", "m@x.vn", "45 Võ Văn Tần"), updated)
        assertEquals("Nguyễn Thị Mai (cô dâu)", updated.displayName)
        assertNull(CustomerPickerEdit.cartCustomerAfterSave(form, customerId = 8, cart = inCart))
        assertNull(CustomerPickerEdit.cartCustomerAfterSave(form, customerId = 7, cart = null))
    }

    @Test
    fun `home has no floating cart bar and no add toast`() {
        assertFalse(HomeCart.showsFloatingBar)
        assertFalse(HomeCart.showsAddedToast)
    }

    @Test
    fun `toast after a save reads like iOS`() {
        fun strings(folder: String): Map<String, String> {
            val file = listOf("src/main/res/$folder/strings.xml", "app/src/main/res/$folder/strings.xml").map { java.io.File(it) }.first { it.exists() }
            val root = javax.xml.parsers.DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(file).documentElement
            val nodes = root.getElementsByTagName("string")
            return (0 until nodes.length).map { nodes.item(it) as org.w3c.dom.Element }.associate { it.getAttribute("name") to it.textContent }
        }
        assertEquals("Đã lưu khách hàng", strings("values-vi")["customers_v2_saved"])
        assertEquals("Customer saved", strings("values")["customers_v2_saved"])
    }
}
