package com.anyrent.pos.print

import android.content.SharedPreferences
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.data.repository.BankAccountRepository
import com.anyrent.pos.domain.bank.OutletBankAccount
import com.anyrent.pos.domain.bank.VietQr
import java.net.InetSocketAddress
import java.net.Socket
import java.nio.charset.Charset
import java.text.NumberFormat
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/**
 * Network thermal printer (ESC/POS over TCP :9100).
 *
 * Mirrors iOS `PrinterManager` + `Order.toPrintData()`:
 * store header, rent/sale details, line items, totals, printer note +
 * signature block (RENT), bank account + VietQR when switched on (#622), thank-you, Code128 barcode, feed + cut.
 * Connection-per-request (same recommended pattern as iOS network path).
 */
object ThermalPrinter {
    private val money: NumberFormat = NumberFormat.getNumberInstance(Locale("vi", "VN")).apply {
        maximumFractionDigits = 0
        minimumFractionDigits = 0
    }
    private val dateFmt: DateTimeFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy")
    private val dateTimeFmt: DateTimeFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")

    data class Config(
        val ip: String,
        val port: Int = 9100,
        val paperWidthMm: Int = 80,
        val name: String = "",
        /** Footer note for RENT receipts — iOS `Utils.loadNotePrinter()`. */
        val note: String = DEFAULT_PRINTER_NOTE,
        /** #622: print the outlet's bank account + VietQR (this device only, off by default) — iOS `Utils.loadPrintBankQr()` */
        val printBankQr: Boolean = false,
        /** Bank block labels (string resources at the call site) */
        val bankTitle: String = "BANK TRANSFER",
        val bankAccountLabel: String = "Account: %s",
    )

    sealed class Result {
        data object Success : Result()
        data class Failure(val message: String) : Result()
    }

    const val DEFAULT_PRINTER_NOTE = "*** Vui lòng mang theo CMND/BLX khi lấy đồ"

    /** SharedPreferences `anyrent.printer` key of the bank QR switch (#622) */
    const val KEY_PRINT_BANK_QR = "printBankQr"

    fun configFromPrefs(
        prefs: SharedPreferences,
        bankTitle: String = "BANK TRANSFER",
        bankAccountLabel: String = "Account: %s",
    ): Config = Config(
        ip = prefs.getString("printerIp", "").orEmpty(),
        port = prefs.getString("printerPort", "9100")?.toIntOrNull() ?: 9100,
        paperWidthMm = prefs.getString("paperWidth", "80")?.toIntOrNull() ?: 80,
        name = prefs.getString("printerName", "").orEmpty(),
        note = prefs.getString("printerNote", DEFAULT_PRINTER_NOTE).orEmpty()
            .ifBlank { DEFAULT_PRINTER_NOTE },
        printBankQr = prefs.getBoolean(KEY_PRINT_BANK_QR, false),
        bankTitle = bankTitle,
        bankAccountLabel = bankAccountLabel,
    )

    fun testPrint(config: Config): Result = runCatching {
        send(config, buildTestReceipt(config))
        Result.Success
    }.getOrElse { Result.Failure(it.message ?: "Print failed") }

    /**
     * Blocking (run on Dispatchers.IO). With the bank QR switch on, the order's outlet account is loaded first;
     * no account, a failed load or no answer within 5 s prints the bill as before, without an error (#622).
     */
    fun printOrder(
        config: Config,
        order: OrderDetail,
        bankLookup: (Int) -> OutletBankAccount? = BankAccountRepository::printAccount,
    ): Result = runCatching {
        val account = if (config.printBankQr) lookupBankAccount(order, bankLookup) else null
        send(config, buildOrderReceipt(config, order, account))
        Result.Success
    }.getOrElse { Result.Failure(it.message ?: "Print failed") }

    /** The bill's account of [order]'s outlet, 5 s at most; also the share image's (#640) */
    internal fun lookupBankAccount(
        order: OrderDetail,
        lookup: (Int) -> OutletBankAccount? = BankAccountRepository::printAccount,
    ): OutletBankAccount? {
        val outletId = order.outletId ?: runCatching { SessionStore.outletId }.getOrNull() ?: return null
        val executor = Executors.newSingleThreadExecutor()
        return try {
            runCatching { executor.submit<OutletBankAccount?> { lookup(outletId) }.get(5, TimeUnit.SECONDS) }.getOrNull()
        } finally {
            executor.shutdownNow()
        }
    }

    /** Bytes sent for an order: the bank block only when the switch is on and an account was found */
    internal fun billBytes(config: Config, order: OrderDetail, account: OutletBankAccount?): ByteArray =
        buildOrderReceipt(config, order, if (config.printBankQr) account else null)

    private fun send(config: Config, payload: ByteArray) {
        require(config.ip.isNotBlank()) { "Printer IP required" }
        Socket().use { socket ->
            socket.connect(InetSocketAddress(config.ip, config.port), 5_000)
            socket.soTimeout = 8_000
            socket.getOutputStream().use { out ->
                out.write(payload)
                out.flush()
            }
        }
    }

    private fun buildTestReceipt(config: Config): ByteArray = buildBytes(config.paperWidthMm) {
        init()
        alignCenter()
        text("========================")
        bold(true)
        text("TEST PRINT PAGE")
        bold(false)
        text("========================")
        alignLeft()
        text("")
        text("Printer: ${config.name.ifBlank { config.ip }}")
        text("IP: ${config.ip}:${config.port}")
        text("Paper: ${config.paperWidthMm}mm")
        text("")
        text("------------------------")
        text("If you can read this,")
        text("your printer is working!")
        text("------------------------")
        feed(3)
        cut()
    }

    internal fun buildOrderReceipt(config: Config, order: OrderDetail, bankAccount: OutletBankAccount? = null): ByteArray {
        val summary = order.summary
        val isRent = summary.orderType.equals("RENT", ignoreCase = true)
        val store = (runCatching { SessionStore.outletName ?: SessionStore.merchantName }.getOrNull() ?: "AnyRent")
            .uppercase(Locale.getDefault())
        val chars = if (config.paperWidthMm <= 58) 32 else 42
        val divider = "-".repeat(chars.coerceAtMost(48))

        return buildBytes(config.paperWidthMm) {
            init()

            // Store header
            alignCenter()
            bold(true)
            text(store)
            bold(false)
            alignLeft()
            alignCenter()
            text(divider.take(18))
            text("")

            // Order number
            bold(true)
            text("Order #${summary.orderNumber}")
            bold(false)
            alignLeft()
            text("")

            // Customer
            bold(true)
            val customerLine = buildString {
                append("Customer: ${summary.customerName ?: "—"}")
                summary.customerPhone?.takeIf { it.isNotBlank() }?.let { append(" - $it") }
            }
            text(customerLine)
            bold(false)

            if (isRent) {
                if (summary.depositAmount > 0) {
                    text("Deposit: ${money.format(summary.depositAmount)}")
                } else {
                    text("Deposit: NO DEPOSIT")
                }
                val pickup = formatDate(summary.pickupPlanAt)
                val ret = formatDate(summary.returnPlanAt)
                if (pickup != null || ret != null) {
                    text("Rent Date: ${pickup ?: "—"}    Return Date: ${ret ?: "—"}")
                }
                formatDateTime(summary.createdAt)?.let { text("Order Date: $it") }
            } else {
                formatDateTime(summary.createdAt)?.let { text("Order Date: $it") }
            }

            text(divider)

            // Line items
            order.items.forEachIndexed { index, item ->
                val name = item.productName ?: "#${item.productId}"
                val withNote = item.note?.takeIf { it.isNotBlank() }?.let { "$name ($it)" } ?: name
                text("${index + 1}. $withNote")
                alignRight()
                text(
                    "${money.format(item.quantity)} x ${money.format(item.unitPrice)} = ${money.format(item.totalPrice)}",
                )
                alignLeft()
            }

            summary.notes?.takeIf { it.isNotBlank() }?.let {
                bold(true)
                text("*** Note: $it")
                bold(false)
            }

            text(divider)
            bold(true)
            alignRight()
            val subtotal = order.items.sumOf { it.totalPrice }
            text("SUBTOTAL: ${money.format(subtotal)}")
            // Discount not on OrderDetail yet — still show total like iOS footer.
            text("------------------")
            text("TOTAL: ${money.format(summary.totalAmount)}")
            text("")
            bold(false)
            alignLeft()

            if (isRent) {
                bold(true)
                alignCenter()
                text("Note")
                alignLeft()
                bold(false)
                text(config.note)
                text(divider)
                text("Customer Signature          Store Signature")
                text("")
                text("")
                text("")
                text("")
            }

            // #622: bank transfer block, only when the printer switch is on and the outlet has an account
            bankAccount?.let { bankBlock(config, it, divider) }

            text("")
            alignCenter()
            text("THANK YOU FOR SHOPPING")
            text("")

            // Code128 barcode of order number (iOS PrinterCommand.printBarcode)
            barcodeCode128(summary.orderNumber)

            text(divider)
            text("Download AnyRent on App Store")
            alignLeft()
            text("")
            text("")
            feed(2)
            cut()
        }
    }

    /** Centered: title, bank name, account number, holder name, then the VietQR (only when the bank has a BIN) */
    private fun EscPosBuilder.bankBlock(config: Config, account: OutletBankAccount, divider: String) {
        alignCenter()
        text(divider)
        bold(true)
        text(config.bankTitle)
        bold(false)
        text(account.bankName)
        text(runCatching { config.bankAccountLabel.format(account.accountNumber) }.getOrDefault(account.accountNumber))
        text(account.accountHolderName.uppercase(Locale.getDefault()))
        VietQr.payload(account)?.let {
            qrCode(it)
            text("")
        }
        alignLeft()
    }

    private fun formatDate(iso: String?): String? {
        if (iso.isNullOrBlank()) return null
        // Shop day (#602); already a display string / date-only: as is
        return ReceiptDates.day(iso, dateFmt) ?: iso.take(10)
    }

    private fun formatDateTime(iso: String?): String? {
        if (iso.isNullOrBlank()) return null
        return ReceiptDates.dateTime(iso, dateTimeFmt) ?: iso.take(16).replace('T', ' ')
    }

    internal fun escPosQr(data: String, size: Int = 6): ByteArray {
        val bytes = data.toByteArray(Charsets.UTF_8)
        val length = bytes.size + 3
        return byteArrayOf(0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00) +
            byteArrayOf(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, size.coerceIn(1, 16).toByte()) +
            byteArrayOf(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31) +
            byteArrayOf(0x1D, 0x28, 0x6B, (length and 0xFF).toByte(), (length shr 8).toByte(), 0x31, 0x50, 0x30) +
            bytes +
            byteArrayOf(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30)
    }

    private fun buildBytes(paperWidthMm: Int, block: EscPosBuilder.() -> Unit): ByteArray {
        val builder = EscPosBuilder(charsPerLine = if (paperWidthMm <= 58) 32 else 42)
        builder.block()
        return builder.toByteArray()
    }

    private class EscPosBuilder(private val charsPerLine: Int) {
        private val out = ArrayList<Byte>()
        // UTF-8: Vietnamese on most modern ESC/POS printers; falls back poorly on very old ones.
        private val charset: Charset = Charset.forName("UTF-8")

        fun init() {
            out += byteArrayOf(0x1B, 0x40).toList()
        }

        fun alignCenter() {
            out += byteArrayOf(0x1B, 0x61, 0x01).toList()
        }

        fun alignLeft() {
            out += byteArrayOf(0x1B, 0x61, 0x00).toList()
        }

        fun alignRight() {
            out += byteArrayOf(0x1B, 0x61, 0x02).toList()
        }

        fun bold(on: Boolean) {
            out += byteArrayOf(0x1B, 0x45, if (on) 0x01 else 0x00).toList()
        }

        fun text(value: String) {
            // Soft-wrap long lines instead of hard-clipping mid-word like before.
            if (value.isEmpty()) {
                out += 0x0A
                return
            }
            var remaining = value
            while (remaining.isNotEmpty()) {
                val chunk = if (remaining.length <= charsPerLine) {
                    remaining
                } else {
                    remaining.take(charsPerLine)
                }
                out += chunk.toByteArray(charset).toList()
                out += 0x0A
                remaining = remaining.drop(chunk.length)
            }
        }

        fun feed(n: Int) {
            out += byteArrayOf(0x1B, 0x64, n.toByte()).toList()
        }

        /** GS V A 0 — full cut (iOS PrinterCommand.cutPaper). */
        fun cut() {
            out += byteArrayOf(0x1D, 0x56, 0x41, 0x00).toList()
        }

        /**
         * Code128 via GS k 73 (0x49) — same as iOS `PrinterCommand.printBarcode`.
         * Non-ASCII in order numbers is stripped so ESC/POS length stays valid.
         */
        fun barcodeCode128(raw: String) {
            val data = raw.filter { it.code in 32..126 }.ifBlank { raw.take(20) }
            val bytes = data.toByteArray(Charsets.US_ASCII)
            if (bytes.isEmpty()) return
            // Height ~162 dots, width medium
            out += byteArrayOf(0x1D, 0x68, 0xA2.toByte()).toList()
            out += byteArrayOf(0x1D, 0x77, 0x03).toList()
            out += byteArrayOf(0x1D, 0x6B, 0x49, bytes.size.toByte()).toList()
            out += bytes.toList()
            out += 0x0A
        }

        /**
         * ESC/POS QR (GS ( k): model 2, module size, error correction M, store, print — iOS `PrinterCommand.printQRCode`.
         * Size 6 keeps a VietQR (version 6, 41 modules) about 31 mm wide, inside 58 mm paper.
         */
        fun qrCode(data: String, size: Int = 6) {
            out += escPosQr(data, size).toList()
        }

        fun toByteArray(): ByteArray = out.toByteArray()
    }
}
