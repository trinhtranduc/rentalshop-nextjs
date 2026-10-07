package com.anyrent.pos.domain.bank

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** #622 — VietQR string, BIN lookup, account rules. Same vectors as iOS `BankQRTests`. */
class VietQrTest {
    private data class Vector(val bankName: String, val bankCode: String?, val account: String, val holder: String, val expected: String)

    /** Produced by the web `generateVietQRString({bankName, bankCode, accountNumber, accountHolderName})`, no amount */
    private val vectors = listOf(
        Vector(
            "Vietcombank", "VCB", "0123456789", "NGUYEN VAN A",
            "00020101021138540010A00000072701240006970436011001234567890208QRIBFTTA53037045802VN63046A15",
        ),
        Vector(
            "Techcombank", "TCB", "19036781234015", "TRAN THI B",
            "00020101021138580010A000000727012800069704070114190367812340150208QRIBFTTA53037045802VN63045B4B",
        ),
        Vector(
            "MBBank", "MB", "0901234567", "LE C",
            "00020101021138540010A00000072701240006970422011009012345670208QRIBFTTA53037045802VN63049779",
        ),
    )

    private fun account(name: String, code: String?, number: String, holder: String = "A", isDefault: Boolean = false, isActive: Boolean = true) =
        OutletBankAccount(id = number.hashCode(), bankName = name, accountNumber = number, accountHolderName = holder, bankCode = code,
            isDefault = isDefault, isActive = isActive)

    @Test
    fun payloadMatchesWebVectors() {
        for (v in vectors) {
            assertEquals(v.bankName, v.expected, VietQr.payload(account(v.bankName, v.bankCode, v.account, v.holder)))
            // The picker saves the BIN as bankCode; an account may also have no code (name only)
            assertEquals(v.bankName, v.expected, VietQr.payload(account(v.bankName, VietQr.binByBankName[v.bankName], v.account, v.holder)))
            assertEquals(v.bankName, v.expected, VietQr.payload(account(v.bankName, null, v.account, v.holder)))
        }
    }

    @Test
    fun crcIsCcittFalse() {
        assertEquals("29B1", VietQr.crc16("123456789"))
        for (v in vectors) assertEquals(v.expected.takeLast(4), VietQr.crc16(v.expected.dropLast(4)))
    }

    @Test
    fun noQrWithoutBinOrWithBadNumber() {
        assertNull(VietQr.bin("Ngân hàng Lạ", null))
        assertNull(VietQr.payload(account("Ngân hàng Lạ", "XYZ", "0123456789")))
        assertNull("under 8 digits", VietQr.payload(account("Vietcombank", "VCB", "12345")))
        assertNull("not digits", VietQr.payload(account("Vietcombank", "VCB", "0123-456789")))
    }

    @Test
    fun bankTablesMatchIos() {
        assertEquals(53, VietQr.binByBankName.size)
        assertEquals(65, VietQr.binByBankCode.size)
        assertEquals(VietQr.binByBankName.keys.sortedBy { it.lowercase() }, VietQr.bankNames)
    }

    @Test
    fun pickDefaultElseFirstActive() {
        val a = account("ACB", null, "11111111")
        val b = account("BIDV", null, "22222222", isDefault = true)
        val gone = account("VIB", null, "33333333", isDefault = true, isActive = false)
        assertEquals("22222222", BankAccountRules.pick(listOf(a, b))?.accountNumber)
        assertEquals("11111111", BankAccountRules.pick(listOf(gone, a))?.accountNumber)
        assertNull(BankAccountRules.pick(emptyList()))
        assertNull(BankAccountRules.pick(listOf(gone)))
    }

    @Test
    fun onlyOwnersAndOutletAdminsManage() {
        assertTrue(BankAccountRules.canManage("MERCHANT"))
        assertTrue(BankAccountRules.canManage("OUTLET_ADMIN"))
        assertFalse(BankAccountRules.canManage("OUTLET_STAFF"))
        assertFalse(BankAccountRules.canManage(null))
    }

    @Test
    fun formChecksAndBody() {
        assertEquals(BankAccountProblem.NO_BANK, BankAccountRules.validate("", "0123456789", "A"))
        assertEquals(BankAccountProblem.NO_NUMBER, BankAccountRules.validate("Vietcombank", " ", "A"))
        assertEquals(BankAccountProblem.NO_HOLDER, BankAccountRules.validate("Vietcombank", "0123456789", ""))
        assertNull(BankAccountRules.validate("Vietcombank", "0123456789", "A"))
        val body = BankAccountRules.body("Vietcombank", " 0123456789 ", " NGUYEN VAN A ", "", true)
        assertEquals("Vietcombank", body.getString("bankName"))
        assertEquals("970436", body.getString("bankCode"))
        assertEquals("0123456789", body.getString("accountNumber"))
        assertEquals("NGUYEN VAN A", body.getString("accountHolderName"))
        assertTrue(body.getBoolean("isDefault"))
        assertFalse(body.has("branch"))
    }

    @Test
    fun parsesApiRow() {
        val row = org.json.JSONObject(
            """{"id":4,"accountHolderName":"NGUYEN VAN A","accountNumber":"0123456789","bankName":"Vietcombank","bankCode":"970436","branch":null,"isDefault":true,"qrCode":"0123456789|NGUYEN VAN A|970436","isActive":true,"outletId":5}""",
        )
        val account = OutletBankAccount.fromJson(row)
        assertEquals(4, account.id)
        assertNull(account.branch)
        assertTrue(account.isDefault)
        assertEquals(vectors[0].expected, VietQr.payload(account))
    }
}
