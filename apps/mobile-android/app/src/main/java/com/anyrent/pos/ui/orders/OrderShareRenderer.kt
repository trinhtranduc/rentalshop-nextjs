package com.anyrent.pos.ui.orders

import com.anyrent.pos.data.CurrentOutlet
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.text.TextUtils
import androidx.core.content.FileProvider
import com.anyrent.pos.R
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.domain.orders.OrderShareModel
import com.anyrent.pos.domain.orders.ShareMoney
import com.anyrent.pos.domain.orders.ShareNoteClip
import com.anyrent.pos.domain.orders.ShareShop
import com.anyrent.pos.domain.orders.ShareText
import com.anyrent.pos.domain.orders.ShareTone
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.MultiFormatWriter
import java.io.File
import java.io.FileOutputStream
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** The app language decides every label of the image (spec 7) */
internal fun Context.shareIsVietnamese(): Boolean =
    resources.configuration.locales[0].language == "vi"

/** Shop, outlet and address of the signed-in user, as the bill header reads them */
internal fun shareShop(outletName: String? = null): ShareShop {
    val outlet = outletName?.takeIf { it.isNotBlank() } ?: CurrentOutlet.name
    return ShareShop(
        name = SessionStore.merchantName?.takeIf { it.isNotBlank() } ?: outlet.orEmpty(),
        outletName = outlet,
        outletPhone = CurrentOutlet.storePhone,
        address = CurrentOutlet.storeAddress,
    )
}

internal fun Context.shareText(text: ShareText): String = when (text) {
    is ShareText.Plain -> text.text
    is ShareText.Plural -> resources.getQuantityString(text.id, text.count, text.count)
    is ShareText.Res -> getString(text.id, *text.args.map { if (it is ShareText) shareText(it) else it }.toTypedArray())
}

/** Writes the image as JPG (quality 92) and opens the system share sheet (spec 9) */
internal suspend fun shareOrderImage(context: Context, model: OrderShareModel, subject: String? = null) {
    val file = withContext(Dispatchers.IO) { writeOrderShareImage(context, model) }
    val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
    val share = Intent(Intent.ACTION_SEND).apply {
        type = "image/jpeg"
        putExtra(Intent.EXTRA_STREAM, uri)
        subject?.let { putExtra(Intent.EXTRA_SUBJECT, it) }
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    val chooser = Intent.createChooser(share, context.getString(R.string.share_receipt)).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    context.startActivity(chooser)
}

internal fun writeOrderShareImage(context: Context, model: OrderShareModel, directory: File = File(context.cacheDir, "receipts")): File {
    val bitmap = OrderShareRenderer(context, model).render()
    directory.mkdirs()
    val file = File(directory, model.fileName)
    FileOutputStream(file).use { bitmap.compress(Bitmap.CompressFormat.JPEG, 92, it) }
    bitmap.recycle()
    return file
}

/**
 * #640 share image (spec + mockups `.agent/changes/640-share-image/mockups`): 540 units wide at 2× (1080 px), the
 * height follows the content. Same layout as iOS `OrderShareRenderer`.
 */
internal class OrderShareRenderer(private val context: Context, private val model: OrderShareModel, private val scale: Float = 2f) {
    private val width = 540f

    private val ground = Color.parseColor("#EEF2F7")
    private val ink = Color.parseColor("#0F172A")
    private val muted = Color.parseColor("#475569")
    private val body = Color.parseColor("#334155")
    private val faint = Color.parseColor("#64748B")
    private val accent = Color.parseColor("#1D4ED8")
    private val divider = Color.parseColor("#E2E8F0")
    private val stripBg = Color.parseColor("#F1F5F9")

    private val black = Typeface.create("sans-serif-black", Typeface.NORMAL)
    private val bold = Typeface.create("sans-serif", Typeface.BOLD)
    private val medium = Typeface.create("sans-serif-medium", Typeface.NORMAL)
    private val regular = Typeface.create("sans-serif", Typeface.NORMAL)
    private val italic = Typeface.create("sans-serif", Typeface.ITALIC)

    private val left = 48f
    private val right = 492f
    private val contentWidth = right - left

    fun render(): Bitmap {
        val height = draw(null)
        val bitmap = Bitmap.createBitmap((width * scale).toInt(), (height * scale).toInt(), Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.scale(scale, scale)
        draw(canvas)
        return bitmap
    }

    private fun t(text: ShareText) = context.shareText(text)

    private fun paint(size: Float, face: Typeface, color: Int, spacing: Float = 0f) = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
        textSize = size
        typeface = face
        this.color = color
        letterSpacing = spacing
        isSubpixelText = true
    }

    private fun fill(color: Int) = Paint(Paint.ANTI_ALIAS_FLAG).apply { this.color = color }

    private fun Canvas?.text(text: String, p: TextPaint, x: Float, baseline: Float, align: Paint.Align = Paint.Align.LEFT, maxWidth: Float? = null) {
        if (this == null) return
        val shown = maxWidth?.let { TextUtils.ellipsize(text, p, it, TextUtils.TruncateAt.END).toString() } ?: text
        p.textAlign = align
        drawText(shown, x, baseline, p)
    }

    /** Wrapped text from [top]; returns its height */
    private fun Canvas?.block(text: String, p: TextPaint, x: Float, top: Float, w: Float, align: Layout.Alignment = Layout.Alignment.ALIGN_NORMAL, spacing: Float = 1f): Float {
        p.textAlign = Paint.Align.LEFT
        val layout = StaticLayout.Builder.obtain(text, 0, text.length, p, w.toInt().coerceAtLeast(1))
            .setAlignment(align).setLineSpacing(0f, spacing).setIncludePad(false).build()
        if (this != null) {
            save()
            translate(x, top)
            layout.draw(this)
            restore()
        }
        return layout.height.toFloat()
    }

    private fun draw(canvas: Canvas?): Float {
        canvas?.drawColor(ground)
        val upper = context.resources.configuration.locales[0]

        // 1. Header band (#930: an order's number is smaller, so its band is shorter)
        val bandHeight = if (model.isDraft) 225f else 205f
        canvas?.drawRect(0f, 0f, width, bandHeight, fill(accent))
        canvas?.drawRoundRect(RectF(32f, 28f, 76f, 72f), 11f, 11f, fill(Color.WHITE))
        canvas.text(model.initials, paint(19f, black, accent), 54f, 57f, Paint.Align.CENTER)
        canvas.text(model.shopName, paint(18f, bold, Color.WHITE), 88f, 46f, maxWidth = 420f)
        model.outletLine?.let { canvas.text(it, paint(13f, regular, Color.argb(235, 255, 255, 255)), 88f, 67f, maxWidth = 420f) }
        canvas.text(t(model.kind).uppercase(upper), paint(13f, medium, Color.argb(215, 255, 255, 255), 0.06f), 32f, 104f, maxWidth = 476f)

        // #930: only the draft has a pill ("Chưa chốt"); "#482113" is ~26 bold (the mockup's 18 px)
        var titleRight = 508f
        model.pill?.let { pill ->
            val pillPaint = paint(12.5f, bold, pillText(model.pillTone))
            val pillLabel = t(pill)
            val pillWidth = pillPaint.measureText(pillLabel) + 28f
            val pillRect = RectF(508f - pillWidth, 131f, 508f, 161f)
            canvas?.drawRoundRect(pillRect, 15f, 15f, fill(if (model.pillTone == ShareTone.ORANGE) Color.parseColor("#FFEDD5") else Color.WHITE))
            canvas.text(pillLabel, pillPaint, pillRect.centerX(), 150.5f, Paint.Align.CENTER)
            titleRight = pillRect.left - 12f
        }
        if (model.isDraft) {
            canvas.text(t(model.title), paint(42f, black, Color.WHITE), 30f, 151f, maxWidth = titleRight - 30f)
        } else {
            canvas.text(t(model.title), paint(26f, bold, Color.WHITE), 32f, 140f, maxWidth = titleRight - 32f)
        }

        // 2. Customer card
        var top = bandHeight - 40f
        val customerHeight = if (model.dayStrip != null) 166f else 78f
        card(canvas, top, customerHeight, shadow = true)
        val phonePaint = paint(16f, medium, body)
        val phoneWidth = model.customerPhone?.let { phonePaint.measureText(it) + 12f } ?: 0f
        canvas.text(t(ShareText.Res(R.string.share_customer)), paint(13f, regular, muted), left, top + 33f)
        canvas.text(t(model.customerName), paint(18f, bold, ink), left, top + 56f, maxWidth = contentWidth - phoneWidth)
        model.customerPhone?.let { canvas.text(it, phonePaint, right, top + 46f, Paint.Align.RIGHT) }
        model.dayStrip?.let { strip ->
            val s = top + 78f
            canvas?.drawRoundRect(RectF(left, s, right, s + 66f), 12f, 12f, fill(stripBg))
            val label = paint(13f, regular, muted)
            val day = paint(18f, bold, ink)
            canvas.text(t(ShareText.Res(R.string.share_pickup)), label, 64f, s + 26f)
            canvas.text(strip.pickup, day, 64f, s + 49f)
            canvas.text(t(ShareText.Res(R.string.share_return)), label, 476f, s + 26f, Paint.Align.RIGHT)
            canvas.text(strip.returnDay, day, 476f, s + 49f, Paint.Align.RIGHT)
            if (strip.days != null) {
                canvas.text(t(ShareText.Plural(R.plurals.v2_cart_days, strip.days)), paint(13f, bold, accent), 270f, s + 34f, Paint.Align.CENTER)
                canvas?.drawRect(RectF(204f, s + 41.5f, 336f, s + 43f), fill(accent))
            } else {
                // #930: a light arrow instead of the day count
                canvas.text("→", paint(20f, medium, Color.parseColor("#94A3B8")), 270f, s + 44f, Paint.Align.CENTER)
            }
        }
        top += customerHeight + 16f

        // 3. Items card
        val itemsTop = top
        val itemsHeight = itemsCard(null, itemsTop, upper)
        card(canvas, itemsTop, itemsHeight)
        itemsCard(canvas, itemsTop, upper)
        top += itemsHeight + 16f

        // 4. VietQR card
        model.qr?.let { qr ->
            card(canvas, top, 170f)
            val box = RectF(left, top + 18.5f, left + 133f, top + 151.5f)
            canvas?.drawRoundRect(box, 12f, 12f, fill(Color.WHITE))
            canvas?.drawRoundRect(box, 12f, 12f, Paint(Paint.ANTI_ALIAS_FLAG).apply { color = divider; style = Paint.Style.STROKE; strokeWidth = 1f })
            canvas?.let { drawQr(it, qr.payload, RectF(box.left + 8f, box.top + 8f, box.right - 8f, box.bottom - 8f)) }
            val x = 200f
            val w = right - x
            canvas.text(t(ShareText.Res(R.string.share_qr_title)).uppercase(upper), paint(12f, bold, muted, 0.08f), x, top + 41f, maxWidth = w)
            canvas.text(qr.bankName, paint(16f, bold, ink), x, top + 66f, maxWidth = w)
            canvas.text(qr.accountNumber, paint(15f, regular, body), x, top + 90f, maxWidth = w)
            canvas.text(qr.holder, paint(15f, regular, body), x, top + 113f, maxWidth = w)
            canvas.text(t(ShareText.Res(R.string.share_qr_content, listOf(qr.content))), paint(14f, regular, muted), x, top + 136f, maxWidth = w)
            top += 170f + 16f
        }

        // 5. Footer
        top += 30f
        top += canvas.block(t(model.thanks), paint(16f, bold, ink), left, top, contentWidth, Layout.Alignment.ALIGN_CENTER)
        model.address?.let {
            top += 6f
            top += canvas.block(it, paint(13f, regular, muted), left, top, contentWidth, Layout.Alignment.ALIGN_CENTER)
        }
        top += 9f
        top += canvas.block(t(ShareText.Res(R.string.share_made_with)), paint(12f, regular, faint), left, top, contentWidth, Layout.Alignment.ALIGN_CENTER)
        return top + 32f
    }

    /** Draws (or measures with a null canvas) the items card from [top]; returns its height */
    private fun itemsCard(canvas: Canvas?, top: Float, upper: java.util.Locale): Float {
        canvas.text(t(model.itemsTitle).uppercase(upper), paint(13f, bold, muted, 0.08f), left, top + 31f)
        var y = top + 46f
        val namePaint = paint(17f, bold, ink)
        val totalPaint = paint(17f, bold, ink)
        val qtyPaint = paint(14f, regular, muted)
        val notePaint = paint(14f, italic, Color.parseColor("#92400E"))
        model.lines.forEachIndexed { index, line ->
            if (index > 0) y += 14f
            val totalWidth = totalPaint.measureText(line.total)
            canvas.text(line.total, totalPaint, right, y - namePaint.fontMetrics.ascent, Paint.Align.RIGHT)
            y += canvas.block(line.name, namePaint, left, y, contentWidth - totalWidth - 16f)
            y += 2f
            y += canvas.block(line.quantity, qtyPaint, left, y, contentWidth)
            line.formula?.let {
                // #1189: the sum of a day-block line
                y += 2f
                y += canvas.block(it, qtyPaint, left, y, contentWidth)
            }
            line.note?.let {
                // #930: the item's own note, italic brown, under its price line
                y += 3f
                y += canvas.block(it, notePaint, left, y, contentWidth)
            }
        }
        y += 17f
        canvas?.drawRect(RectF(left, y, right, y + 1f), fill(divider))
        y += 1f
        val rowLabel = paint(15f, regular, body)
        val rowValue = paint(15f, medium, Color.parseColor("#1E293B"))
        val mutedLabel = paint(15f, regular, faint)
        val mutedValue = paint(15f, regular, faint)
        // #1345: the money part in the order of the order detail: Tạm tính / Giảm giá, Tổng tiền thuê, Cọc, Thu khi giao, Thế chân
        model.money.forEach { entry ->
            when (entry) {
                is ShareMoney.Row -> {
                    y += 31.5f
                    canvas.text(entry.row.value, rowValue, right, y - 3f, Paint.Align.RIGHT)
                    canvas.text(t(entry.row.label), rowLabel, left, y - 3f, maxWidth = contentWidth - rowValue.measureText(entry.row.value) - 16f)
                }
                is ShareMoney.Muted -> {
                    y += 31.5f
                    val value = t(entry.value)
                    canvas.text(value, mutedValue, right, y - 3f, Paint.Align.RIGHT)
                    canvas.text(t(entry.label), mutedLabel, left, y - 3f, maxWidth = contentWidth - mutedValue.measureText(value) - 16f)
                }
                is ShareMoney.Stages -> {
                    // #1252: stages of a staged deposit; #1345: each Đã thu / Chưa thu, no running totals
                    y += 22f
                    canvas.text(t(entry.title).uppercase(upper), paint(13f, bold, muted, 0.08f), left, y)
                    y += 14f
                    val stageTitle = paint(15f, medium, Color.parseColor("#1E293B"))
                    val stageDetail = paint(13f, regular, muted)
                    entry.stages.forEach { stage ->
                        val amountWidth = stageTitle.measureText(stage.amount)
                        canvas.text(stage.amount, stageTitle, right, y + 20f, Paint.Align.RIGHT)
                        y += canvas.block(t(stage.title), stageTitle, left, y, contentWidth - amountWidth - 16f)
                        val detail = listOf(stage.detail, stage.status).joinToString(" · ") { t(it) }
                        y += canvas.block(detail, stageDetail, left, y, contentWidth)
                        y += 8f
                    }
                }
                is ShareMoney.Total -> {
                    y += 14f
                    val h = entry.highlight
                    val (bg, labelColor, valueColor) = when (h.tone) {
                        ShareTone.GREEN -> Triple(Color.parseColor("#ECFDF5"), Color.parseColor("#047857"), Color.parseColor("#047857"))
                        ShareTone.ORANGE -> Triple(Color.parseColor("#FFF7ED"), Color.parseColor("#9A3412"), ink)
                        else -> Triple(Color.parseColor("#EFF6FF"), Color.parseColor("#1E3A8A"), accent)
                    }
                    canvas?.drawRoundRect(RectF(left, y, right, y + 61f), 14f, 14f, fill(bg))
                    val valuePaint = paint(30f, black, valueColor)
                    canvas.text(h.value, valuePaint, 476f, y + 41f, Paint.Align.RIGHT)
                    canvas.text(t(h.label), paint(16f, bold, labelColor), 64f, y + 36f, maxWidth = 412f - valuePaint.measureText(h.value) - 12f)
                    y += 61f
                }
                is ShareMoney.Collect -> {
                    // #1345: the second box, white with a light blue edge: what is paid at hand-over, fixed by the plan
                    y += 12f
                    val box = RectF(left, y, right, y + 54f)
                    canvas?.drawRoundRect(box, 14f, 14f, fill(Color.WHITE))
                    canvas?.drawRoundRect(
                        RectF(box.left + 0.75f, box.top + 0.75f, box.right - 0.75f, box.bottom - 0.75f), 14f, 14f,
                        Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#BFDBFE"); style = Paint.Style.STROKE; strokeWidth = 1.5f },
                    )
                    val valuePaint = paint(24f, black, ink)
                    canvas.text(entry.value, valuePaint, 476f, y + 35f, Paint.Align.RIGHT)
                    canvas.text(t(entry.label), paint(16f, bold, Color.parseColor("#1E3A8A")), 64f, y + 33f, maxWidth = 412f - valuePaint.measureText(entry.value) - 12f)
                    y += 54f
                }
            }
        }
        model.note?.let {
            y += 15f
            y += canvas.block(t(it), paint(14f, regular, body), left, y, contentWidth)
            y += 2f
        }
        model.orderNote?.let { block ->
            // #1354: the order's own note, last of the money part and above the QR and the thanks: "GHI CHÚ" and a grey
            // box of at most 4 lines, cut with "…" (measured with the font it is drawn in; iOS draws the same)
            y += 22f
            canvas.text(t(block.title).uppercase(upper), paint(13f, bold, muted, 0.08f), left, y + 12f)
            y += 16f + 8f
            val boxPad = 14f
            val textPaint = paint(14f, regular, muted)
            val textWidth = contentWidth - boxPad * 2
            val lines = ShareNoteClip.lines(block.text) { textPaint.measureText(it) <= textWidth }
            val metrics = textPaint.fontMetrics
            val lineHeight = kotlin.math.ceil(metrics.descent - metrics.ascent) + 3f
            val boxHeight = lines.size * lineHeight + 20f
            canvas?.drawRoundRect(RectF(left, y, right, y + boxHeight), 12f, 12f, fill(Color.parseColor("#F3F4F6")))
            lines.forEachIndexed { index, line ->
                canvas.text(line, textPaint, left + boxPad, y + 10f + index * lineHeight - metrics.ascent)
            }
            y += boxHeight
        }
        return y + 17.5f - top
    }

    private fun card(canvas: Canvas?, top: Float, height: Float, shadow: Boolean = false) {
        if (canvas == null) return
        val p = fill(Color.WHITE)
        if (shadow) p.setShadowLayer(14f, 0f, 5f, Color.argb(26, 15, 23, 42))
        canvas.drawRoundRect(RectF(24f, top, 516f, top + height), 20f, 20f, p)
    }

    private fun pillText(tone: ShareTone): Int = when (tone) {
        ShareTone.ACCENT -> accent
        ShareTone.GREEN -> Color.parseColor("#047857")
        ShareTone.ORANGE -> Color.parseColor("#9A3412")
        ShareTone.RED -> Color.parseColor("#B91C1C")
    }

    private fun drawQr(canvas: Canvas, payload: String, into: RectF) {
        val matrix = runCatching {
            MultiFormatWriter().encode(payload, BarcodeFormat.QR_CODE, 0, 0, mapOf(EncodeHintType.MARGIN to 0))
        }.getOrNull() ?: return
        val module = into.width() / matrix.width
        val p = fill(ink).apply { isAntiAlias = false }
        for (row in 0 until matrix.height) {
            for (col in 0 until matrix.width) {
                if (matrix[col, row]) {
                    canvas.drawRect(into.left + col * module, into.top + row * module, into.left + (col + 1) * module, into.top + (row + 1) * module, p)
                }
            }
        }
    }
}
