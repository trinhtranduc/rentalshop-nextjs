package com.anyrent.pos.domain.customers

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** #387 KH-sua — form from the API, validation, update payload, civil-date round trip */
class CustomerEditRulesTest {
    @Test
    fun `form keeps the stored date and tolerates missing fields`() {
        val form = CustomerEditRules.formFrom(
            JSONObject("""{"id":64,"firstName":"Trần","lastName":"Văn Minh","phone":"0901387002","email":null,"address":"12 Lê Lợi","dateOfBirth":"1990-05-12T00:00:00.000Z","notes":"VIP"}"""),
        )
        assertEquals("Trần Văn Minh", form.name)
        assertEquals("", form.email)
        assertEquals("12/05/1990", form.dateOfBirth)
        assertEquals("VIP", form.notes)
        assertEquals(CustomerEditForm(), CustomerEditRules.formFrom(JSONObject("""{"id":1}""")))
    }

    @Test
    fun `validation in field order`() {
        var form = CustomerEditForm(phone = "0901", name = "Lan")
        assertNull(CustomerEditRules.validate(form))
        assertEquals(CustomerEditRules.Problem.MISSING_PHONE, CustomerEditRules.validate(form.copy(phone = " ")))
        assertEquals(CustomerEditRules.Problem.MISSING_NAME, CustomerEditRules.validate(form.copy(name = "")))
        assertEquals(CustomerEditRules.Problem.BAD_EMAIL, CustomerEditRules.validate(form.copy(email = "lan@")))
        assertEquals(CustomerEditRules.Problem.BAD_DATE, CustomerEditRules.validate(form.copy(dateOfBirth = "31/02/1990")))
        form = form.copy(email = "lan@email.com", dateOfBirth = "29/02/2024")
        assertNull(CustomerEditRules.validate(form))
    }

    @Test
    fun `payload clears emptied fields and splits the name`() {
        val body = CustomerEditRules.updatePayload(
            CustomerEditForm(phone = " 0901 387 002 ", name = "Trần Văn Minh", address = "12 Lê Lợi", dateOfBirth = "12/05/1990", notes = " "),
        )
        assertEquals("Trần", body.getString("firstName"))
        assertEquals("Văn Minh", body.getString("lastName"))
        assertEquals("0901 387 002", body.getString("phone"))
        assertEquals("", body.getString("email"))
        assertEquals("", body.getString("idNumber"))
        assertEquals("", body.getString("notes"))
        assertEquals("1990-05-12T00:00:00.000Z", body.getString("dateOfBirth"))
        assertEquals("", CustomerEditRules.updatePayload(CustomerEditForm(phone = "1", name = "A")).getString("dateOfBirth"))
        assertEquals("", CustomerEditRules.updatePayload(CustomerEditForm(phone = "1", name = "A")).getString("lastName"))
    }

    @Test
    fun `date helpers`() {
        assertEquals("1990-05-12T00:00:00.000Z", CustomerEditRules.isoDate("12/05/1990"))
        assertNull(CustomerEditRules.isoDate("12/13/1990"))
        assertNull(CustomerEditRules.isoDate("12/05/90"))
        assertEquals("12/05/1990", CustomerEditRules.displayDate("1990-05-12T00:00:00.000Z"))
        assertEquals("", CustomerEditRules.displayDate(""))
    }
}
