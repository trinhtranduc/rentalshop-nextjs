package com.anyrent.pos.domain.customers

import com.anyrent.pos.data.UserRole
import com.anyrent.pos.data.model.Customer

/** #952 (owner, iOS `CustomerPickerEditLogic`): a pencil on each row of the cart's customer picker opens a short edit sheet */
object CustomerPickerEdit {
    enum class Field { PHONE, NAME, ADDRESS, NOTES }

    /** The sheet shows these; email, ID number and date of birth are loaded and sent back unchanged */
    val sheetFields = listOf(Field.PHONE, Field.NAME, Field.ADDRESS, Field.NOTES)

    /** Only on the picker's rows, for a user who may edit customers (same rule as the customer detail: customers.manage) */
    fun showsEdit(isPicker: Boolean, role: UserRole): Boolean = isPicker && role != UserRole.UNKNOWN

    /** The cart's customer with the saved name, phone and address when it is the edited one; null otherwise */
    fun cartCustomerAfterSave(form: CustomerEditForm, customerId: Int, cart: Customer?): Customer? {
        if (cart == null || cart.id != customerId) return null
        val (first, last) = CustomerRules.splitName(form.name)
        return cart.copy(
            firstName = first,
            lastName = last.ifEmpty { null },
            phone = form.phone.trim(),
            address = form.address.trim(),
        )
    }
}
