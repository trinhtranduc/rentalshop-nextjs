package com.anyrent.pos.print

import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.data.model.OrderDetail
import java.io.OutputStream
import java.net.InetSocketAddress
import java.net.Socket
import java.nio.charset.Charset
import java.text.NumberFormat
import java.util.Locale

/**
 * Network thermal printer (ESC/POS over TCP :9100) — mirrors iOS PrinterManager network path.
 * Label printing is intentionally out of scope.
 */
object ThermalPrinter {
    data class Config(
        val ip: String,
        val port: Int = 9100,
        val paperWidthMm: Int = 80,
        val name: String = "",
    )

    sealed class Result {
        data object Success : Result()
        data class Failure(val message: String) : Result()
    }

    fun testPrint(config: Config): Result = runCatching {
        send(config, buildTestReceipt(config))
        Result.Success
    }.getOrElse { Result.Failure(it.message ?: "Print failed") }

    fun printOrder(config: Config, order: OrderDetail): Result = runCatching {
        send(config, buildOrderReceipt(config, order))
        Result.Success
    }.getOrElse { Result.Failure(it.message ?: "Print failed") }

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
        bold(true)
        text("AnyRent POS")
        bold(false)
        text("Test print OK")
        text(config.name.ifBlank { config.ip })
        text("Paper ${config.paperWidthMm}mm")
        feed(3)
        cut()
    }

    private fun buildOrderReceipt(config: Config, order: OrderDetail): ByteArray {
        val money = NumberFormat.getNumberInstance(Locale.US)
        val store = SessionStore.outletName ?: SessionStore.merchantName ?: "AnyRent"
        return buildBytes(config.paperWidthMm) {
            init()
            alignCenter()
            bold(true)
            text(store)
            bold(false)
            text(order.summary.orderNumber)
            text("${order.summary.orderType} / ${order.summary.status}")
            alignLeft()
            line()
            text("Customer: ${order.summary.customerName ?: "—"}")
            order.summary.customerPhone?.let { text("Phone: $it") }
            line()
            order.items.forEach { item ->
                text(item.productName ?: "#${item.productId}")
                text("  x${money.format(item.quantity)}  ${money.format(item.totalPrice)}")
            }
            line()
            text("Total: ${money.format(order.summary.totalAmount)}")
            text("Paid:  ${money.format(order.summary.depositAmount)}")
            order.summary.notes?.takeIf { it.isNotBlank() }?.let {
                line()
                text("Notes: $it")
            }
            feed(4)
            cut()
        }
    }

    private fun buildBytes(paperWidthMm: Int, block: EscPosBuilder.() -> Unit): ByteArray {
        val builder = EscPosBuilder(charsPerLine = if (paperWidthMm <= 58) 32 else 42)
        builder.block()
        return builder.toByteArray()
    }

    private class EscPosBuilder(private val charsPerLine: Int) {
        private val out = ArrayList<Byte>()
        private val charset: Charset = Charset.forName("UTF-8")

        fun init() { out += byteArrayOf(0x1B, 0x40).toList() }
        fun alignCenter() { out += byteArrayOf(0x1B, 0x61, 0x01).toList() }
        fun alignLeft() { out += byteArrayOf(0x1B, 0x61, 0x00).toList() }
        fun bold(on: Boolean) { out += byteArrayOf(0x1B, 0x45, if (on) 0x01 else 0x00).toList() }
        fun text(value: String) {
            val clipped = if (value.length > charsPerLine) value.take(charsPerLine) else value
            out += clipped.toByteArray(charset).toList()
            out += 0x0A
        }
        fun line() = text("-".repeat(charsPerLine))
        fun feed(n: Int) { out += byteArrayOf(0x1B, 0x64, n.toByte()).toList() }
        fun cut() { out += byteArrayOf(0x1D, 0x56, 0x00).toList() }
        fun toByteArray(): ByteArray = out.toByteArray()
    }
}
