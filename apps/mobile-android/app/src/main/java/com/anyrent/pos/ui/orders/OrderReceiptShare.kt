package com.anyrent.pos.ui.orders

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.text.Layout
import android.text.SpannableString
import android.text.Spanned
import android.text.StaticLayout
import android.text.TextPaint
import android.text.style.AbsoluteSizeSpan
import android.text.style.ForegroundColorSpan
import android.text.style.StyleSpan
import androidx.core.content.FileProvider
import com.anyrent.pos.R
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.ui.common.formatMoney
import java.io.File
import java.io.FileOutputStream
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Share receipt as JPG — content + layout parity with iOS
 * `PreviewViewController.generateJPGReceipt` default style `.alternate`.
 */
internal suspend fun shareOrderReceipt(context: Context, order: OrderDetail) {
    val file = withContext(Dispatchers.IO) { generateOrderReceipt(context, order) }
    val uri = FileProvider.getUriForFile(
        context,
        "${context.packageName}.fileprovider",
        file,
    )
    val share = Intent(Intent.ACTION_SEND).apply {
        type = "image/jpeg"
        putExtra(Intent.EXTRA_STREAM, uri)
        putExtra(Intent.EXTRA_SUBJECT, order.summary.orderNumber)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    val chooser = Intent.createChooser(share, context.getString(R.string.share_receipt)).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    context.startActivity(chooser)
}

private fun generateOrderReceipt(context: Context, order: OrderDetail): File {
    // iOS imageWidth ≈ 595pt; 2× for crisp share (iOS renderer also uses screen scale).
    val painter = ReceiptPainter(context.applicationContext, order, scale = 2f)
    val height = painter.measureHeight().coerceAtLeast((200 * painter.scale).toInt())
    val bitmap = Bitmap.createBitmap(painter.width, height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    canvas.drawColor(Color.WHITE)
    painter.draw(canvas)

    val directory = File(context.cacheDir, "receipts").apply { mkdirs() }
    val safeNumber = order.summary.orderNumber
        .trim()
        .removePrefix("#")
        .replace(Regex("[^A-Za-z0-9_-]"), "_")
        .ifBlank { "order" }
    val file = File(directory, "Order_$safeNumber.jpg")
    FileOutputStream(file).use { bitmap.compress(Bitmap.CompressFormat.JPEG, 92, it) }
    bitmap.recycle()
    return file
}

/**
 * Document-style receipt matching iOS `ReceiptStyle.alternate` content + typography.
 */
private class ReceiptPainter(
    private val context: Context,
    private val order: OrderDetail,
    val scale: Float,
) {
    val width: Int = (595.2f * scale).toInt()
    private val margin = 50f * scale
    private val topPadding = 50f * scale
    private val bottomPadding = 80f * scale
    private val contentWidth = width - margin * 2
    private val rowSpacing = 6f * scale
    private val sectionSpacing = 18f * scale
    private val separatorSpacing = 14f * scale
    private val labelColumnWidth = 175f * scale
    private val valueColumnWidth = 145f * scale

    private val accent = Color.rgb(51, 102, 204) // iOS (0.2, 0.4, 0.8)
    private val primary = Color.BLACK
    private val secondary = Color.DKGRAY
    private val discountRed = Color.RED // iOS UIColor.red

    private val largeTitle = textPaint(16f * scale, bold = true)
    private val orderNumberPaint = textPaint(14f * scale, bold = true)
    private val sectionPaint = textPaint(14f * scale, bold = true)
    private val bodyPaint = textPaint(12f * scale, bold = false)
    private val bodyBoldPaint = textPaint(12f * scale, bold = true)
    private val smallPaint = textPaint(10f * scale, bold = false)
    private val tinyPaint = textPaint(8f * scale, bold = false)
    private val receiptTypePaint = textPaint(10f * scale, bold = true)

    // iOS: dateTimeInString = "dd/MM/yy HH:mm", dateInString = "dd/MM/yy"
    private val dateTimeFmt = DateTimeFormatter.ofPattern("dd/MM/yy HH:mm")
    private val dateFmt = DateTimeFormatter.ofPattern("dd/MM/yy")
    private val zone = ZoneId.systemDefault()

    private fun textPaint(size: Float, bold: Boolean, italic: Boolean = false): TextPaint {
        val style = when {
            bold && italic -> Typeface.BOLD_ITALIC
            bold -> Typeface.BOLD
            italic -> Typeface.ITALIC
            else -> Typeface.NORMAL
        }
        return TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = primary
            textSize = size
            typeface = Typeface.create(Typeface.DEFAULT, style)
        }
    }

    fun measureHeight(): Int = (drawInternal(null) + 0.5f).toInt()

    fun draw(canvas: Canvas) {
        drawInternal(canvas)
    }

    private fun drawInternal(canvas: Canvas?): Float {
        var y = drawAlternateHeader(canvas)
        y += sectionSpacing

        // Customer — same labels as iOS
        y += drawBilingualHeader(canvas, y, "Thông Tin Khách Hàng", "Customer Information") + 8f * scale
        order.summary.customerName?.trim()?.takeIf { it.isNotEmpty() }?.let {
            y += drawLabelValue(
                canvas, y,
                vi = "Tên", en = "Name",
                value = it,
                labelBold = true,
            ) + rowSpacing
        }
        order.summary.customerPhone?.trim()?.takeIf { it.isNotEmpty() }?.let {
            y += drawLabelValue(
                canvas, y,
                vi = "Điện Thoại", en = "Phone",
                value = it,
                labelBold = true,
            ) + rowSpacing
        }

        y += 4f * scale
        drawSeparator(canvas, y)
        y += sectionSpacing

        val isRent = order.summary.orderType.equals("RENT", ignoreCase = true)
        y += drawBilingualHeader(
            canvas, y,
            if (isRent) "Thời Gian Thuê" else "Thông Tin Đơn Hàng",
            if (isRent) "Rental Period" else "Order Information",
        ) + 8f * scale
        y += drawLabelValue(
            canvas, y,
            vi = "Ngày Tạo", en = "Create Date",
            value = formatDateTime(order.summary.createdAt),
            labelBold = true,
        ) + rowSpacing
        // iOS only draws pickup/return when dates exist
        if (isRent) {
            order.summary.pickupPlanAt?.trim()?.takeIf { it.isNotEmpty() && it != "null" }?.let { raw ->
                y += drawLabelValue(
                    canvas, y,
                    vi = "Ngày Lấy", en = "Pickup Date",
                    value = formatDate(raw),
                    labelBold = true,
                ) + rowSpacing
            }
            order.summary.returnPlanAt?.trim()?.takeIf { it.isNotEmpty() && it != "null" }?.let { raw ->
                y += drawLabelValue(
                    canvas, y,
                    vi = "Ngày Trả", en = "Return Date",
                    value = formatDate(raw),
                    labelBold = true,
                ) + rowSpacing
            }
        }

        y += 4f * scale
        drawSeparator(canvas, y)
        y += sectionSpacing

        // Items table
        y += drawBilingualHeader(canvas, y, "Sản Phẩm", "Items") + 10f * scale

        val sttW = 30f * scale
        val sttX = margin
        val itemX = sttX + sttW + 10f * scale
        val qtyW = 50f * scale
        val priceW = 120f * scale
        val totalW = 120f * scale
        val totalX = width - margin - totalW
        val priceX = totalX - priceW - 10f * scale
        val qtyX = priceX - qtyW - 10f * scale
        val itemW = (qtyX - itemX - 10f * scale).coerceAtLeast(80f * scale)

        val headerH = maxOf(
            drawPlain(canvas, "#", bodyBoldPaint, secondary, sttX, y, sttW),
            drawBilingualInline(
                canvas, y, itemX, itemW, "Tên", "Item",
                bodyBoldPaint, smallPaint, secondary,
            ),
            drawBilingualInline(
                canvas, y, qtyX, qtyW, "SL", "Quantity",
                bodyBoldPaint, smallPaint, secondary,
                align = Layout.Alignment.ALIGN_OPPOSITE,
            ),
            drawBilingualInline(
                canvas, y, priceX, priceW, "Giá", "Price",
                bodyBoldPaint, smallPaint, secondary,
                align = Layout.Alignment.ALIGN_OPPOSITE,
            ),
            drawBilingualInline(
                canvas, y, totalX, totalW, "Tổng", "Total",
                bodyBoldPaint, smallPaint, secondary,
                align = Layout.Alignment.ALIGN_OPPOSITE,
            ),
        )
        y += headerH + 6f * scale
        drawSeparator(canvas, y)
        y += 8f * scale

        order.items.forEachIndexed { index, item ->
            val rowTop = y
            val name = item.productName?.takeIf {
                it.isNotBlank() && !it.equals("null", ignoreCase = true)
            } ?: "Product"
            val nameH = drawPlain(canvas, name, bodyPaint, primary, itemX, rowTop, itemW)
            val metricsH = maxOf(
                drawPlain(canvas, "${index + 1}", bodyPaint, primary, sttX, rowTop, sttW),
                drawPlain(canvas, "${item.quantity}", bodyPaint, primary, qtyX, rowTop, qtyW, Layout.Alignment.ALIGN_OPPOSITE),
                drawPlain(canvas, formatMoney(item.unitPrice), bodyPaint, primary, priceX, rowTop, priceW, Layout.Alignment.ALIGN_OPPOSITE),
                drawPlain(canvas, formatMoney(item.totalPrice), bodyBoldPaint, primary, totalX, rowTop, totalW, Layout.Alignment.ALIGN_OPPOSITE),
            )
            y = rowTop + maxOf(nameH, metricsH) + 4f * scale
            item.note?.trim()?.takeIf { it.isNotEmpty() }?.let { note ->
                y += drawLabelValue(
                    canvas, y,
                    vi = "Ghi Chú", en = "Note",
                    value = note,
                    labelWidth = 75f * scale,
                    labelPaint = smallPaint,
                    enPaint = tinyPaint,
                    labelColor = secondary,
                    valuePaint = smallPaint,
                    valueColor = secondary,
                ) + 4f * scale
            } ?: run { y += 4f * scale }
        }

        drawSeparator(canvas, y)
        y += sectionSpacing

        // Payment summary — iOS uses order.subtotal / order.discountAmount / percentage label
        y += drawBilingualHeader(canvas, y, "Tóm Tắt Thanh Toán", "Payment Summary") + 10f * scale
        val subtotal = order.items.sumOf { it.totalPrice }
        y += drawSummaryRow(canvas, y, "Tạm Tính", "Subtotal", formatMoney(subtotal)) + rowSpacing

        val discountAmount = when {
            order.discountAmount > 0 -> order.discountAmount
            else -> (subtotal - order.summary.totalAmount).coerceAtLeast(0.0)
        }
        if (discountAmount > 0) {
            val isPercentage = order.discountType.equals("percentage", ignoreCase = true)
            val pct = order.discountValue.toInt()
            val vi = if (isPercentage) "Giảm Giá ($pct%)" else "Giảm Giá"
            val en = if (isPercentage) "Discount ($pct%)" else "Discount"
            y += drawSummaryRow(
                canvas, y, vi, en, formatMoney(discountAmount),
                valueColor = discountRed,
            ) + rowSpacing
        }

        drawSeparator(canvas, y + 2f * scale)
        y += separatorSpacing
        y += drawSummaryRow(
            canvas, y, "Tổng Cộng", "Total", formatMoney(order.summary.totalAmount),
            labelBold = true,
            valueColor = accent,
            valueBold = true,
        ) + sectionSpacing

        if (isRent) {
            y += drawSummaryRow(
                canvas, y, "Cọc", "Deposit",
                formatMoney(order.summary.depositAmount),
            ) + rowSpacing
            if (order.securityDeposit > 0) {
                y += drawSummaryRow(
                    canvas, y, "Tiền Thế Chân", "Security Deposit",
                    formatMoney(order.securityDeposit),
                ) + rowSpacing
            }
            order.collateralDetails?.trim()?.takeIf { it.isNotEmpty() }?.let {
                y += drawLabelValue(
                    canvas, y,
                    vi = "Giấy Tờ Thế Chân", en = "Collateral",
                    value = it,
                ) + rowSpacing
            }
            if (order.damageFee > 0) {
                y += drawSummaryRow(
                    canvas, y, "Phí Hư Hại", "Damage Fee", formatMoney(order.damageFee),
                ) + rowSpacing
            }
        }

        y += 4f * scale
        drawSeparator(canvas, y)
        y += sectionSpacing

        val thanks = context.getString(
            if (isRent) R.string.receipt_thanks_rent else R.string.receipt_thanks_sale,
        )
        y += drawPlain(canvas, thanks, bodyBoldPaint, accent, margin, y, contentWidth, Layout.Alignment.ALIGN_CENTER) + 10f * scale
        val generated = context.getString(
            R.string.receipt_generated_on,
            formatDateTime(order.summary.createdAt),
        )
        y += drawPlain(canvas, generated, smallPaint, secondary, margin, y, contentWidth, Layout.Alignment.ALIGN_CENTER) + 5f * scale
        y += drawPlain(
            canvas,
            context.getString(R.string.receipt_generated_by),
            smallPaint,
            secondary,
            margin,
            y,
            contentWidth,
            Layout.Alignment.ALIGN_CENTER,
        )

        return y + bottomPadding
    }

    private fun drawAlternateHeader(canvas: Canvas?): Float {
        val accentBarHeight = 28f * scale
        canvas?.drawRect(0f, 0f, width.toFloat(), accentBarHeight, Paint().apply { color = accent })

        var y = topPadding + accentBarHeight + 14f * scale
        val normalized = order.summary.orderNumber.trim().removePrefix("#")
        val orderTitle = if (normalized.equals("DRAFT", ignoreCase = true)) "ORDER" else "ORDER #$normalized"
        val orderColor = if (normalized.equals("DRAFT", ignoreCase = true)) Color.rgb(255, 140, 0) else accent
        val leftHalf = contentWidth * 0.55f
        val rightHalf = contentWidth - leftHalf
        val orderH = drawPlain(canvas, orderTitle, orderNumberPaint, orderColor, margin, y, leftHalf)
        drawPlain(
            canvas,
            formatDateTime(order.summary.createdAt),
            smallPaint,
            secondary,
            margin + leftHalf,
            y,
            rightHalf,
            Layout.Alignment.ALIGN_OPPOSITE,
        )
        y += maxOf(orderH, 14f * scale) + 10f * scale

        // iOS: order.outletName (then phone/address from session user)
        val store = (
            order.outletName
                ?: SessionStore.outletName
                ?: SessionStore.merchantName
            ).orEmpty().trim()
        if (store.isNotEmpty()) {
            y += drawPlain(canvas, store, largeTitle, primary, margin, y, contentWidth) + 4f * scale
        }
        SessionStore.storePhone?.trim()?.takeIf { it.isNotEmpty() }?.let { phone ->
            y += drawPlain(canvas, phone, bodyPaint, secondary, margin, y, contentWidth) + 4f * scale
        }
        SessionStore.storeAddress?.trim()?.takeIf { it.isNotEmpty() }?.let { address ->
            y += drawPlain(canvas, address, smallPaint, secondary, margin, y, contentWidth) + 6f * scale
        }

        val receiptType = if (order.summary.orderType.equals("RENT", ignoreCase = true)) {
            "RENTAL RECEIPT"
        } else {
            "SALE RECEIPT"
        }
        y += drawPlain(canvas, receiptType, receiptTypePaint, secondary, margin, y, contentWidth) + 12f * scale
        drawSeparator(canvas, y)
        return y
    }

    private fun drawBilingualHeader(canvas: Canvas?, y: Float, vi: String, en: String): Float =
        drawBilingualInline(
            canvas, y, margin, contentWidth, vi, en,
            sectionPaint, smallPaint, primary,
            includeColon = false,
        )

    /** iOS `makeBilingualAttributedText`: `"Vi/En"` (+ optional `: `), English italic. */
    private fun drawBilingualInline(
        canvas: Canvas?,
        y: Float,
        x: Float,
        maxWidth: Float,
        vi: String,
        en: String,
        main: TextPaint,
        enPaint: TextPaint,
        color: Int,
        includeColon: Boolean = false,
        align: Layout.Alignment = Layout.Alignment.ALIGN_NORMAL,
    ): Float {
        val suffix = if (includeColon) ": " else ""
        val text = "$vi/$en$suffix"
        val spannable = SpannableString(text)
        val enStart = vi.length + 1
        spannable.setSpan(
            StyleSpan(Typeface.ITALIC),
            enStart,
            enStart + en.length,
            Spanned.SPAN_EXCLUSIVE_EXCLUSIVE,
        )
        spannable.setSpan(
            ForegroundColorSpan(color),
            0,
            text.length,
            Spanned.SPAN_EXCLUSIVE_EXCLUSIVE,
        )
        if (enPaint.textSize != main.textSize) {
            spannable.setSpan(
                AbsoluteSizeSpan(enPaint.textSize.toInt(), false),
                enStart,
                enStart + en.length,
                Spanned.SPAN_EXCLUSIVE_EXCLUSIVE,
            )
        }
        val tp = TextPaint(main).apply { this.color = color }
        val layout = StaticLayout.Builder.obtain(spannable, 0, spannable.length, tp, maxWidth.toInt().coerceAtLeast(1))
            .setAlignment(align)
            .setLineSpacing(0f, 1f)
            .setIncludePad(false)
            .build()
        if (canvas != null) {
            canvas.save()
            canvas.translate(x, y)
            layout.draw(canvas)
            canvas.restore()
        }
        return layout.height.toFloat().coerceAtLeast(1f)
    }

    private fun drawLabelValue(
        canvas: Canvas?,
        y: Float,
        vi: String,
        en: String,
        value: String,
        labelWidth: Float = labelColumnWidth,
        labelBold: Boolean = false,
        labelPaint: TextPaint = if (labelBold) bodyBoldPaint else bodyPaint,
        enPaint: TextPaint = smallPaint,
        labelColor: Int = primary,
        valuePaint: TextPaint = bodyPaint,
        valueColor: Int = primary,
    ): Float {
        val labelH = drawBilingualInline(
            canvas, y, margin, labelWidth, vi, en, labelPaint, enPaint, labelColor,
            includeColon = true,
        )
        val valueX = margin + labelWidth + 10f * scale
        val valueW = contentWidth - labelWidth - 10f * scale
        val valueH = drawPlain(canvas, value, valuePaint, valueColor, valueX, y, valueW)
        return maxOf(labelH, valueH)
    }

    private fun drawSummaryRow(
        canvas: Canvas?,
        y: Float,
        vi: String,
        en: String,
        value: String,
        labelBold: Boolean = false,
        valueColor: Int = primary,
        valueBold: Boolean = false,
    ): Float {
        val summaryLabelWidth = contentWidth - valueColumnWidth - 12f * scale
        val labelPaint = if (labelBold) bodyBoldPaint else bodyPaint
        val valuePaint = if (valueBold) bodyBoldPaint else bodyPaint
        val labelH = drawBilingualInline(
            canvas, y, margin, summaryLabelWidth, vi, en, labelPaint, smallPaint, primary,
            includeColon = true,
        )
        val valueX = margin + summaryLabelWidth + 12f * scale
        val valueH = drawPlain(
            canvas, value, valuePaint, valueColor, valueX, y, valueColumnWidth,
            Layout.Alignment.ALIGN_OPPOSITE,
        )
        return maxOf(labelH, valueH)
    }

    private fun drawPlain(
        canvas: Canvas?,
        text: String,
        paint: TextPaint,
        color: Int,
        x: Float,
        y: Float,
        maxWidth: Float,
        align: Layout.Alignment = Layout.Alignment.ALIGN_NORMAL,
    ): Float {
        val tp = TextPaint(paint).apply { this.color = color }
        val layout = StaticLayout.Builder.obtain(text, 0, text.length, tp, maxWidth.toInt().coerceAtLeast(1))
            .setAlignment(align)
            .setLineSpacing(0f, 1f)
            .setIncludePad(false)
            .build()
        if (canvas != null) {
            canvas.save()
            canvas.translate(x, y)
            layout.draw(canvas)
            canvas.restore()
        }
        return layout.height.toFloat().coerceAtLeast(1f)
    }

    private fun drawSeparator(canvas: Canvas?, y: Float) {
        if (canvas == null) return
        val p = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = primary
            strokeWidth = 0.5f * scale
        }
        canvas.drawLine(margin, y, width - margin, y, p)
    }

    /** Match iOS `dateTimeInString()` → `dd/MM/yy HH:mm`. */
    private fun formatDateTime(iso: String?): String {
        if (iso.isNullOrBlank() || iso == "null") return "N/A"
        return runCatching {
            Instant.parse(iso).atZone(zone).format(dateTimeFmt)
        }.getOrElse {
            runCatching {
                // date-only ISO → midnight local
                LocalDate.parse(iso.trim().take(10)).atStartOfDay(zone).format(dateTimeFmt)
            }.getOrElse { "N/A" }
        }
    }

    /** Match iOS `dateInString()` → `dd/MM/yy`. */
    private fun formatDate(iso: String?): String {
        if (iso.isNullOrBlank() || iso == "null") return "N/A"
        return runCatching {
            Instant.parse(iso).atZone(zone).toLocalDate().format(dateFmt)
        }.getOrElse {
            runCatching {
                LocalDate.parse(iso.trim().take(10)).format(dateFmt)
            }.getOrDefault("N/A")
        }
    }
}
