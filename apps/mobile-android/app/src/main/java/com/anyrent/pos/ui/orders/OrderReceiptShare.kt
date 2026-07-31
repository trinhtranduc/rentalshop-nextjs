package com.anyrent.pos.ui.orders

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import androidx.core.content.FileProvider
import com.anyrent.pos.R
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.ui.common.formatMoney
import com.anyrent.pos.ui.common.formatQuantity
import java.io.File
import java.io.FileOutputStream
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Produces the same share artifact as iOS: a clean, white JPG receipt rather
 * than a text-only message. The canvas is intentionally printer-friendly.
 */
internal suspend fun shareOrderReceipt(context: Context, order: OrderDetail) {
    val file = withContext(Dispatchers.IO) { generateOrderReceipt(context, order) }
    val uri = FileProvider.getUriForFile(
        context,
        "${context.packageName}.fileprovider",
        file,
    )
    context.startActivity(
        Intent.createChooser(
            Intent(Intent.ACTION_SEND).apply {
                type = "image/jpeg"
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_SUBJECT, order.summary.orderNumber)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            },
            context.getString(R.string.share_receipt),
        ),
    )
}

private fun generateOrderReceipt(context: Context, order: OrderDetail): File {
    val width = 1080
    val margin = 72f
    val rowHeight = 54f
    val itemExtra = order.items.sumOf { item ->
        ((item.productName.orEmpty().length / 34) + 1) * 42
    }
    val height = (1180 + itemExtra + order.items.size * 70 +
        if (order.summary.notes.isNullOrBlank()) 0 else 130).coerceAtLeast(1450)
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    canvas.drawColor(Color.WHITE)

    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.BLACK
        typeface = Typeface.create(Typeface.DEFAULT, Typeface.NORMAL)
    }
    val accent = Color.rgb(37, 84, 235)
    var y = 78f

    fun text(
        value: String,
        size: Float = 31f,
        bold: Boolean = false,
        color: Int = Color.BLACK,
        x: Float = margin,
        align: Paint.Align = Paint.Align.LEFT,
    ) {
        paint.textSize = size
        paint.color = color
        paint.typeface = Typeface.create(
            Typeface.DEFAULT,
            if (bold) Typeface.BOLD else Typeface.NORMAL,
        )
        paint.textAlign = align
        canvas.drawText(value, x, y, paint)
    }

    fun center(value: String, size: Float, bold: Boolean = false, color: Int = Color.BLACK) {
        text(value, size, bold, color, width / 2f, Paint.Align.CENTER)
    }

    fun separator(spaceBefore: Float = 22f, spaceAfter: Float = 32f) {
        y += spaceBefore
        paint.color = Color.rgb(218, 222, 230)
        paint.strokeWidth = 2f
        canvas.drawLine(margin, y, width - margin, y, paint)
        y += spaceAfter
    }

    fun labelValue(label: String, value: String, emphasized: Boolean = false) {
        text(label, 29f, bold = false, color = Color.DKGRAY)
        text(
            value,
            30f,
            bold = emphasized,
            color = if (emphasized) accent else Color.BLACK,
            x = width - margin,
            align = Paint.Align.RIGHT,
        )
        y += rowHeight
    }

    val outletName = SessionStore.outletName.orEmpty().ifBlank { "AnyRent" }
    center(outletName, 45f, bold = true, color = accent)
    y += 58f
    center(
        if (order.summary.orderType == "RENT") "RENTAL RECEIPT" else "SALE RECEIPT",
        38f,
        bold = true,
    )
    y += 54f
    val normalizedNumber = order.summary.orderNumber.trim().removePrefix("#")
    center("ORDER #$normalizedNumber", 34f, bold = true, color = accent)
    separator()

    text("THÔNG TIN KHÁCH HÀNG / CUSTOMER INFORMATION", 27f, bold = true)
    y += 48f
    labelValue("Tên / Name", order.summary.customerName.orEmpty().ifBlank { "N/A" })
    order.summary.customerPhone?.takeIf { it.isNotBlank() }?.let {
        labelValue("Điện thoại / Phone", it)
    }
    separator()

    text(
        if (order.summary.orderType == "RENT") {
            "THỜI GIAN THUÊ / RENTAL PERIOD"
        } else {
            "THÔNG TIN ĐƠN HÀNG / ORDER INFORMATION"
        },
        27f,
        bold = true,
    )
    y += 48f
    labelValue("Ngày tạo / Create date", formatOrderReceiptDate(order.summary.createdAt))
    if (order.summary.orderType == "RENT") {
        labelValue("Ngày nhận / Pickup date", formatOrderReceiptDate(order.summary.pickupPlanAt))
        labelValue("Ngày trả / Return date", formatOrderReceiptDate(order.summary.returnPlanAt))
    }
    separator()

    text("SẢN PHẨM / ITEMS", 27f, bold = true)
    y += 54f
    text("#", 25f, bold = true, color = Color.DKGRAY)
    text("Item", 25f, bold = true, color = Color.DKGRAY, x = 125f)
    text("Qty", 25f, bold = true, color = Color.DKGRAY, x = 655f, align = Paint.Align.RIGHT)
    text("Price", 25f, bold = true, color = Color.DKGRAY, x = 825f, align = Paint.Align.RIGHT)
    text("Total", 25f, bold = true, color = Color.DKGRAY, x = width - margin, align = Paint.Align.RIGHT)
    separator(16f, 38f)

    order.items.forEachIndexed { index, item ->
        text("${index + 1}", 27f)
        val productName = item.productName?.takeIf {
            it.isNotBlank() && !it.equals("null", ignoreCase = true)
        } ?: context.getString(R.string.unknown_product)
        text(productName.take(34), 27f, x = 125f)
        text(formatQuantity(item.quantity), 27f, x = 655f, align = Paint.Align.RIGHT)
        text(formatMoney(item.unitPrice), 27f, x = 825f, align = Paint.Align.RIGHT)
        text(formatMoney(item.totalPrice), 27f, bold = true, x = width - margin, align = Paint.Align.RIGHT)
        y += 62f
        if (productName.length > 34) {
            text(productName.drop(34).take(34), 25f, color = Color.DKGRAY, x = 125f)
            y += 42f
        }
    }
    separator(8f, 32f)

    val subtotal = order.items.sumOf { it.totalPrice }
    val discount = (subtotal - order.summary.totalAmount).coerceAtLeast(0.0)
    text("TÓM TẮT THANH TOÁN / PAYMENT SUMMARY", 27f, bold = true)
    y += 52f
    labelValue("Tạm tính / Subtotal", formatMoney(subtotal))
    if (discount > 0) labelValue("Giảm giá / Discount", formatMoney(discount))
    labelValue("Tổng cộng / Total", formatMoney(order.summary.totalAmount), emphasized = true)
    if (order.summary.orderType == "RENT") {
        labelValue("Đã thu / Deposit", formatMoney(order.summary.depositAmount))
        if (order.securityDeposit > 0) {
            labelValue("Tiền thế chân / Security deposit", formatMoney(order.securityDeposit))
        }
        order.collateralDetails?.takeIf { it.isNotBlank() }?.let {
            labelValue("Thế chấp / Collateral", it.take(30))
        }
        if (order.damageFee > 0) labelValue("Phí hư hại / Damage fee", formatMoney(order.damageFee))
    }
    order.summary.notes?.takeIf { it.isNotBlank() }?.let {
        separator(12f, 30f)
        text("GHI CHÚ / NOTES", 27f, bold = true)
        y += 45f
        text(it.take(70), 27f, color = Color.DKGRAY)
        y += 45f
    }
    separator()
    center(
        if (order.summary.orderType == "RENT") {
            "Thank you for your business!"
        } else {
            "Thank you for your purchase!"
        },
        29f,
        bold = true,
        color = accent,
    )
    y += 46f
    center("Receipt generated by AnyRent software", 23f, color = Color.GRAY)

    val directory = File(context.cacheDir, "receipts").apply { mkdirs() }
    val safeNumber = normalizedNumber.replace(Regex("[^A-Za-z0-9_-]"), "_")
    val file = File(directory, "Order_$safeNumber.jpg")
    FileOutputStream(file).use { bitmap.compress(Bitmap.CompressFormat.JPEG, 92, it) }
    bitmap.recycle()
    return file
}

private fun formatOrderReceiptDate(value: String?): String {
    val isoDate = value?.trim()?.takeIf { it.isNotBlank() && it != "null" }?.take(10)
        ?: return "N/A"
    return runCatching {
        val parts = isoDate.split("-")
        "${parts[2]}/${parts[1]}/${parts[0]}"
    }.getOrDefault("N/A")
}
