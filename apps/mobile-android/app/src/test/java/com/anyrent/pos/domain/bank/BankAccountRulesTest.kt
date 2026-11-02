package com.anyrent.pos.domain.bank

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** #1319: the outlet admin sees the row and the list; only the shop owner adds, edits, deletes, sets the default (as iOS) */
class BankAccountRulesTest {
    @Test
    fun `only the owner manages bank accounts`() {
        assertTrue(BankAccountRules.canManage("MERCHANT"))
        listOf("OUTLET_ADMIN", "OUTLET_STAFF", "OUTLET_INVENTORY", null).forEach { assertFalse("$it", BankAccountRules.canManage(it)) }
    }

    @Test
    fun `owner and outlet admin see the screen, staff do not`() {
        listOf("MERCHANT", "OUTLET_ADMIN").forEach { assertTrue(it, BankAccountRules.canView(it)) }
        listOf("OUTLET_STAFF", "OUTLET_INVENTORY", null).forEach { assertFalse("$it", BankAccountRules.canView(it)) }
    }
}
