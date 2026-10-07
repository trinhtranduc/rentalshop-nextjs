package com.anyrent.pos.domain.bank

/**
 * #622: VietQR (EMV QR, NAPAS) string of a bank account, built on the device. The stored `qrCode` of an account
 * (`acc|name|code`) cannot be scanned by banking apps; this string can. Same output as the web
 * `generateVietQRString(info)` (packages/utils/src/core/bank-qr.ts) without amount, and as iOS `VietQR`.
 */
object VietQr {
    /** Bank name -> BIN, same list as iOS `VietnamBankCodes.bankCodes` / web `VIETNAM_BANK_CODES` (bank picker) */
    val binByBankName: Map<String, String> = linkedMapOf(
        "Vietcombank" to "970436",
        "Vietinbank" to "970415",
        "BIDV" to "970418",
        "Techcombank" to "970407",
        "ACB" to "970416",
        "VPBank" to "970432",
        "MBBank" to "970422",
        "TPBank" to "970423",
        "VietABank" to "970427",
        "SHB" to "970443",
        "HDBank" to "970437",
        "MSB" to "970426",
        "Sacombank" to "970403",
        "Eximbank" to "970431",
        "VIB" to "970441",
        "OCB" to "970448",
        "SeABank" to "970440",
        "PGBank" to "970430",
        "NamABank" to "970428",
        "BacABank" to "970409",
        "ABBank" to "970425",
        "VietBank" to "970433",
        "PVcomBank" to "970412",
        "GPBank" to "970408",
        "Agribank" to "970405",
        "LienVietPostBank" to "970449",
        "DongABank" to "970406",
        "KienLongBank" to "970452",
        "NCB" to "970419",
        "OceanBank" to "970410",
        "PublicBank" to "970439",
        "SCB" to "970429",
        "VietCapitalBank" to "970454",
        "VietnamBank" to "970433",
        "SaigonBank" to "970400",
        "StandardChartered" to "970410",
        "VRBank" to "970421",
        "ShinhanBank" to "970424",
        "IndovinaBank" to "970434",
        "BaoVietBank" to "970438",
        "CBBank" to "970444",
        "COOPBANK" to "970446",
        "HongLeong" to "970442",
        "Woori" to "970457",
        "UnitedOverseas" to "970458",
        "CIMBBank" to "970459",
        "KookminHN" to "970462",
        "KookminHCM" to "970463",
        "SINOPAC" to "970465",
        "KEBHanaHCM" to "970466",
        "KEBHANAHN" to "970467",
        "IBKHN" to "970455",
        "IBKHCM" to "970456",
    )

    /** Bank code -> BIN, same table as web `VIETNAM_BANK_BIN_CODES` */
    val binByBankCode: Map<String, String> = mapOf(
        "VCB" to "970436",
        "CTG" to "970415",
        "ICB" to "970415",
        "BID" to "970418",
        "BIDV" to "970418",
        "TCB" to "970407",
        "ACB" to "970416",
        "VPB" to "970432",
        "VPBank" to "970432",
        "MBB" to "970422",
        "MB" to "970422",
        "TPB" to "970423",
        "TPBank" to "970423",
        "VAB" to "970427",
        "SHB" to "970443",
        "HDB" to "970437",
        "HDBank" to "970437",
        "MSB" to "970426",
        "STB" to "970403",
        "STP" to "970403",
        "EIB" to "970431",
        "VIB" to "970441",
        "OCB" to "970448",
        "SSB" to "970440",
        "SEAB" to "970440",
        "PGB" to "970430",
        "NAB" to "970428",
        "BAB" to "970409",
        "ABB" to "970425",
        "VCC" to "970433",
        "VIETBANK" to "970433",
        "PVC" to "970412",
        "PVCB" to "970412",
        "GPB" to "970408",
        "VBA" to "970405",
        "LPB" to "970449",
        "DAB" to "970406",
        "DOB" to "970406",
        "KLB" to "970452",
        "NCB" to "970419",
        "OCE" to "970410",
        "PBV" to "970439",
        "PBVN" to "970439",
        "SCB" to "970429",
        "VCCB" to "970454",
        "VNB" to "970433",
        "SGICB" to "970400",
        "SCVN" to "970410",
        "VRB" to "970421",
        "SHBVN" to "970424",
        "IVB" to "970434",
        "BVB" to "970438",
        "CBB" to "970444",
        "COOPBANK" to "970446",
        "HLBVN" to "970442",
        "WVN" to "970457",
        "UOB" to "970458",
        "CIMB" to "970459",
        "KBHN" to "970462",
        "KBHCM" to "970463",
        "SINOPAC" to "970465",
        "KEBHANAHCM" to "970466",
        "KEBHANAHN" to "970467",
        "IBKHN" to "970455",
        "IBKHCM" to "970456",
    )

    /** Bank names for the picker, A-Z */
    val bankNames: List<String> = binByBankName.keys.sortedBy { it.lowercase() }

    private val knownBins: Set<String> = (binByBankName.values + binByBankCode.values).toSet()

    /**
     * BIN of an account, looked up like the web (`getBankBINCode`): bank code first, then bank name. The apps save
     * the BIN itself as `bankCode` (bank picker), so a known 6-digit BIN is accepted as is.
     */
    fun bin(bankName: String?, bankCode: String?): String? {
        val code = bankCode?.trim().orEmpty()
        binByBankCode[code]?.let { return it }
        bankName?.trim()?.let { binByBankName[it] }?.let { return it }
        return code.takeIf { it in knownBins }
    }

    /** EMV string, or null when the bank has no BIN or the number is not 8-16 digits (web rules) */
    fun payload(account: OutletBankAccount): String? {
        val number = account.accountNumber.trim()
        val bin = bin(account.bankName, account.bankCode) ?: return null
        if (number.length !in 8..16 || !number.all { it in '0'..'9' }) return null
        return payload(bin, number)
    }

    /** Static VietQR (no amount): 00 01 · 01 11 · 38 {00 GUID · 01 {00 BIN · 01 account} · 02 QRIBFTTA} · 53 704 · 58 VN · 63 CRC */
    fun payload(bin: String, accountNumber: String): String {
        val beneficiary = tlv("00", bin) + tlv("01", accountNumber)
        val merchant = tlv("00", "A000000727") + tlv("01", beneficiary) + tlv("02", "QRIBFTTA")
        val body = tlv("00", "01") + tlv("01", "11") + tlv("38", merchant) + tlv("53", "704") + tlv("58", "VN") + "6304"
        return body + crc16(body)
    }

    fun tlv(tag: String, value: String): String = tag + value.toByteArray(Charsets.UTF_8).size.toString().padStart(2, '0') + value

    /** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), 4 uppercase hex digits */
    fun crc16(text: String): String {
        var crc = 0xFFFF
        for (byte in text.toByteArray(Charsets.UTF_8)) {
            crc = crc xor ((byte.toInt() and 0xFF) shl 8)
            repeat(8) {
                crc = if (crc and 0x8000 != 0) (crc shl 1) xor 0x1021 else crc shl 1
                crc = crc and 0xFFFF
            }
        }
        return "%04X".format(crc)
    }
}
