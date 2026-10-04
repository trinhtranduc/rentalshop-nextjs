package com.anyrent.pos.domain.customers

import org.json.JSONObject
import java.time.DateTimeException
import java.time.LocalDate

/** The edit form's text, as typed (board KH-sua, #387) */
data class CustomerEditForm(
    val phone: String = "",
    val name: String = "",
    val email: String = "",
    val address: String = "",
    val idNumber: String = "",
    /** dd/MM/yyyy */
    val dateOfBirth: String = "",
    val notes: String = "",
)

object CustomerEditRules {
    enum class Problem { MISSING_PHONE, MISSING_NAME, BAD_EMAIL, BAD_DATE }

    /** `data` of `GET /api/customers/{id}` → form */
    fun formFrom(o: JSONObject): CustomerEditForm {
        fun str(key: String) = if (!o.has(key) || o.isNull(key)) "" else o.optString(key).trim()
        val name = listOf(str("firstName"), str("lastName")).filter { it.isNotEmpty() }.joinToString(" ")
        return CustomerEditForm(
            phone = str("phone"), name = name, email = str("email"), address = str("address"),
            idNumber = str("idNumber"), dateOfBirth = displayDate(str("dateOfBirth")), notes = str("notes"),
        )
    }

    /** The first problem, in field order */
    fun validate(form: CustomerEditForm): Problem? {
        when (CustomerRules.validate(form.name, form.phone)) {
            CustomerRules.FormProblem.MISSING_PHONE -> return Problem.MISSING_PHONE
            CustomerRules.FormProblem.MISSING_NAME -> return Problem.MISSING_NAME
            null -> Unit
        }
        val email = form.email.trim()
        if (email.isNotEmpty()) {
            val parts = email.split("@")
            if (parts.size != 2 || parts[0].isEmpty() || !parts[1].contains(".") || email.contains(" ")) return Problem.BAD_EMAIL
        }
        if (form.dateOfBirth.isNotBlank() && isoDate(form.dateOfBirth) == null) return Problem.BAD_DATE
        return null
    }

    /** `PUT /api/customers/{id}` body: every field the form shows; an emptied field is sent as "" so the API clears it */
    fun updatePayload(form: CustomerEditForm): JSONObject {
        val (first, last) = CustomerRules.splitName(form.name)
        return JSONObject()
            .put("firstName", first)
            .put("lastName", last)
            .put("phone", form.phone.trim())
            .put("email", form.email.trim())
            .put("address", form.address.trim())
            .put("idNumber", form.idNumber.trim())
            .put("notes", form.notes.trim())
            .put("dateOfBirth", isoDate(form.dateOfBirth) ?: "")
    }

    /** "12/05/1990" → "1990-05-12T00:00:00.000Z" (a civil date kept as UTC midnight); null when not a real date */
    fun isoDate(text: String): String? {
        val parts = text.trim().split("/")
        if (parts.size != 3 || parts[2].length != 4) return null
        val (d, m, y) = parts.map { it.toIntOrNull() ?: return null }
        return try {
            "${LocalDate.of(y, m, d)}T00:00:00.000Z"
        } catch (e: DateTimeException) {
            null
        }
    }

    /** "1990-05-12T00:00:00.000Z" → "12/05/1990" (the stored date part, no time-zone shift) */
    fun displayDate(iso: String): String {
        if (iso.length < 10) return ""
        val parts = iso.take(10).split("-")
        if (parts.size != 3) return ""
        return "${parts[2]}/${parts[1]}/${parts[0]}"
    }
}
