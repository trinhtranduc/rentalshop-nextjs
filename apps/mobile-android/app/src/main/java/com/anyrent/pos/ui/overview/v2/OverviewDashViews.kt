package com.anyrent.pos.ui.overview.v2

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.domain.overview.OverviewChipTone
import com.anyrent.pos.domain.overview.OverviewDashBar
import com.anyrent.pos.domain.overview.OverviewDashLogic
import com.anyrent.pos.domain.overview.OverviewForecast
import com.anyrent.pos.ui.theme.DS
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/** #725: colours of the iOS Overview (`OVColor`, light) */
internal object OV {
    val Page = Color(0xFFF3F4F6)
    val Surface = Color(0xFFFFFFFF)
    val Line = Color(0xFFE2E8F0)
    val Ink = Color(0xFF0F172A)
    val Ink2 = Color(0xFF334155)
    val Muted = Color(0xFF475569)
    val Faint = Color(0xFF94A3B8)
    val Track = Color(0xFFF1F5F9)
    val Blue = Color(0xFF2563EB)
    val Amber = Color(0xFFD97706)
    val Green = Color(0xFF059669)
    val Violet = Color(0xFF7C3AED)
    val Red = Color(0xFFDC2626)
    val Total = Color(0xFF0F172A)
    val Link = Color(0xFF1D4ED8)

    /** Chip text on its fill */
    fun chip(tone: OverviewChipTone): Pair<Color, Color> = when (tone) {
        OverviewChipTone.UP -> Color(0xFF047857) to Color(0xFFD1FAE5)
        OverviewChipTone.DOWN -> Color(0xFFB91C1C) to Color(0xFFFEE2E2)
        OverviewChipTone.WARN -> Color(0xFF92400E) to Color(0xFFFEF3C7)
        OverviewChipTone.INFO -> Color(0xFF1E40AF) to Color(0xFFDBEAFE)
    }
}

/** Diagonal hatch (135°) for "expected / upcoming" marks, clipped to [rect] */
internal fun DrawScope.hatch(rect: Rect, color: Color, spacing: Float, lineWidth: Float) {
    if (rect.width <= 0 || rect.height <= 0) return
    var x = rect.left - rect.height
    while (x < rect.right + rect.height) {
        drawLine(color, Offset(x, rect.bottom), Offset(x + rect.height, rect.top), lineWidth)
        x += spacing
    }
}

/** A white card with a 1 dp line and 14 dp corners */
@Composable
internal fun OVCard(modifier: Modifier = Modifier, spacing: Int = 10, content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(OV.Surface)
            .border(1.dp, OV.Line, RoundedCornerShape(14.dp)).padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(spacing.dp),
        content = content,
    )
}

/** A rounded pill ("▲ 12%", "1 đơn quá ngày") */
@Composable
internal fun OVPill(text: String, tone: OverviewChipTone) {
    val (fg, bg) = OV.chip(tone)
    Text(
        text, fontSize = DS.TextSize.Pill, fontWeight = FontWeight.Bold, color = fg, maxLines = 1, overflow = TextOverflow.Ellipsis,
        modifier = Modifier.clip(RoundedCornerShape(10.dp)).background(bg).padding(horizontal = 8.dp, vertical = 3.dp),
    )
}

/** Period chip: ink when on, white with a line when off */
@Composable
internal fun OVChipButton(title: String, on: Boolean, onClick: () -> Unit) {
    Box(
        Modifier.heightIn(min = 36.dp).clip(RoundedCornerShape(999.dp)).background(if (on) OV.Ink else OV.Surface)
            .border(1.dp, if (on) OV.Ink else OV.Line, RoundedCornerShape(999.dp))
            .clickable(role = Role.Button, onClick = onClick).padding(horizontal = 14.dp, vertical = 8.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(title, fontSize = DS.TextSize.Secondary, fontWeight = if (on) FontWeight.SemiBold else FontWeight.Normal, color = if (on) OV.Surface else OV.Ink2, maxLines = 1)
    }
}

/** Collected (solid) then expected (hatched, bordered) in one thin bar */
@Composable
internal fun OVForecastBar(collectedShare: Double, modifier: Modifier = Modifier) {
    Canvas(modifier.fillMaxWidth().height(5.dp)) {
        val r = 3.dp.toPx()
        val gap = 2.dp.toPx()
        val done = (size.width - gap) * collectedShare.coerceIn(0.0, 1.0).toFloat()
        if (done > 0) drawRoundRect(OV.Blue, size = Size(done, size.height), cornerRadius = CornerRadius(r))
        val start = if (done > 0) done + gap else 0f
        val rest = Rect(start, 0f, size.width, size.height)
        if (rest.width <= 0) return@Canvas
        val path = Path().apply { addRoundRect(RoundRect(rest, CornerRadius(r))) }
        clipPath(path) { hatch(rest, OV.Blue, 4.dp.toPx(), 1.2.dp.toPx()) }
        drawRoundRect(OV.Blue, Offset(rest.left + 0.6f, 0.6f), Size(rest.width - 1.2f, rest.height - 1.2f), CornerRadius(r), style = Stroke(1.2.dp.toPx()))
    }
}

/** A bar on a track: solid, or hatched with a border (upcoming); [left] and [width] are 0…1 of the track */
@Composable
internal fun OVTrackBar(left: Double, width: Double, color: Color, hatched: Boolean, modifier: Modifier = Modifier, showsTrack: Boolean = true) {
    Canvas(modifier) {
        val r = CornerRadius(3.dp.toPx())
        if (showsTrack) drawRoundRect(OV.Track, cornerRadius = r)
        val w = max(if (width > 0) 3.dp.toPx() else 0f, size.width * width.toFloat())
        if (w <= 0) return@Canvas
        val x = min(size.width - w, size.width * left.toFloat())
        val bar = Rect(x, 0f, x + w, size.height)
        if (hatched) {
            clipPath(Path().apply { addRoundRect(RoundRect(bar, r)) }) { hatch(bar, color, 5.dp.toPx(), 1.6.dp.toPx()) }
            drawRoundRect(color, Offset(bar.left + 0.75f, 0.75f), Size(bar.width - 1.5f, bar.height - 1.5f), r, style = Stroke(1.5.dp.toPx()))
        } else {
            drawRoundRect(color, bar.topLeft, bar.size, r)
        }
    }
}

/** One bar split into coloured parts (shares 0…1), 2 dp between parts; a grey track when all are 0 */
@Composable
internal fun OVStackedBar(parts: List<Pair<Double, Color>>) {
    val kept = parts.filter { it.first > 0 }
    Canvas(Modifier.fillMaxWidth().height(16.dp).clip(RoundedCornerShape(3.dp))) {
        if (kept.isEmpty()) {
            drawRect(OV.Track)
            return@Canvas
        }
        val gap = 2.dp.toPx()
        val gaps = (kept.size - 1) * gap
        var x = 0f
        kept.forEachIndexed { index, (share, color) ->
            val w = if (index == kept.size - 1) size.width - x else (size.width - gaps) * share.toFloat()
            drawRect(color, Offset(x, 0f), Size(max(0f, w), size.height))
            x += w + gap
        }
    }
}

/** KPI tile: title, value, the forecast bar of Thực thu, then its chips */
@Composable
internal fun OVTile(
    title: String,
    value: String,
    loading: Boolean,
    forecast: OverviewForecast?,
    forecastText: String?,
    pills: List<Pair<String, OverviewChipTone>>,
    description: String,
    modifier: Modifier,
    onClick: () -> Unit,
) {
    Column(
        modifier.heightIn(min = 108.dp).clip(RoundedCornerShape(14.dp)).background(OV.Surface)
            .border(1.dp, OV.Line, RoundedCornerShape(14.dp))
            .clickable(role = Role.Button, onClick = onClick)
            .semantics(mergeDescendants = true) { contentDescription = description }
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Text(title, fontSize = DS.TextSize.Secondary, color = OV.Ink2, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Text(if (loading) "…" else value, fontSize = DS.TextSize.Amount, fontWeight = FontWeight.Bold, color = OV.Ink, maxLines = 1)
        if (!loading && forecast != null && forecastText != null) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                OVForecastBar(forecast.collectedShare)
                Text(forecastText, fontSize = DS.TextSize.Pill, color = OV.Muted, maxLines = 2, lineHeight = 15.sp)
            }
        }
        if (!loading && pills.isNotEmpty()) {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                pills.forEach { (text, tone) -> OVPill(text, tone) }
            }
        }
    }
}

/** "Hôm nay" counter: dot + label, then the number */
@Composable
internal fun OVCounter(title: String, value: String, valueColor: Color, dot: Color, description: String, modifier: Modifier, onClick: () -> Unit) {
    Column(
        modifier.heightIn(min = DS.TouchTarget).clip(RoundedCornerShape(12.dp)).border(1.dp, OV.Line, RoundedCornerShape(12.dp))
            .clickable(role = Role.Button, onClick = onClick)
            .semantics(mergeDescendants = true) { contentDescription = description }
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Box(Modifier.size(8.dp).clip(RoundedCornerShape(2.dp)).background(dot))
            Text(title, fontSize = DS.TextSize.Pill, color = OV.Ink2, maxLines = 1)
        }
        Text(value, fontSize = 22.sp, fontWeight = FontWeight.Bold, color = valueColor, maxLines = 1)
    }
}

/** Top sản phẩm / Top khách hàng row: name and amount, then a thin bar (against the top row) and the count */
@Composable
internal fun OVTopRow(name: String, amount: String, subtitle: String, ratio: Double, color: Color, onClick: (() -> Unit)?) {
    Column(
        Modifier.fillMaxWidth().heightIn(min = DS.TouchTarget)
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .semantics(mergeDescendants = true) {}
            .padding(vertical = 4.dp),
        verticalArrangement = Arrangement.spacedBy(5.dp),
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(
                name.ifBlank { "—" }, fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Medium, color = OV.Ink,
                maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f),
            )
            Text(amount, fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Bold, color = OV.Ink, maxLines = 1)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            OVTrackBar(0.0, ratio, color, false, Modifier.weight(1f).height(4.dp))
            Text(subtitle, fontSize = DS.TextSize.Pill, color = OV.Muted, maxLines = 1)
        }
    }
}

/** Legend swatch + text of the chart card */
@Composable
internal fun OVLegend(text: String, hatched: Boolean) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        OVTrackBar(0.0, 1.0, OV.Blue, hatched, Modifier.size(10.dp), showsTrack = false)
        Text(text, fontSize = DS.TextSize.Pill, color = OV.Ink2, maxLines = 1)
    }
}

/**
 * "Thực thu theo ngày": solid collected, hatched forecast on top, a dashed "Hôm nay" marker, axis labels at the first
 * day, today and the last day. Tap a bar for its values; tap it again (or outside the bars) to hide them.
 */
@Composable
internal fun OVDayChart(
    bars: List<OverviewDashBar>,
    todayText: String,
    collectedText: String,
    forecastText: String,
    totalText: String,
    label: (OverviewDashBar) -> String,
    axis: (OverviewDashBar) -> String,
) {
    val measurer = rememberTextMeasurer()
    var selected by remember(bars) { mutableStateOf<Int?>(null) }
    var boxSize by remember { mutableStateOf(IntSize.Zero) }
    val density = LocalDensity.current
    val topInset = with(density) { 20.dp.toPx() }
    val axisHeight = with(density) { 20.dp.toPx() }
    val gap = with(density) { (if (bars.size > 20) 2.dp else 4.dp).toPx() }
    fun barFrame(index: Int, width: Float): Pair<Float, Float> {
        val n = max(1, bars.size)
        val w = (width - gap * (n - 1)) / n
        return index * (w + gap) to w
    }
    Box(Modifier.fillMaxWidth().height(190.dp).onSizeChanged { boxSize = it }) {
        Canvas(
            Modifier.fillMaxWidth().height(190.dp).pointerInput(bars) {
                detectTapGestures { point ->
                    val index = bars.indices.firstOrNull { i ->
                        val (x, w) = barFrame(i, this.size.width.toFloat())
                        point.x >= x - gap / 2 && point.x <= x + w + gap / 2
                    }
                    selected = if (index == null || index == selected) null else index
                }
            },
        ) {
            if (bars.isEmpty()) return@Canvas
            val plotTop = topInset
            val plotBottom = size.height - axisHeight
            val plotHeight = max(0f, plotBottom - plotTop)
            bars.forEachIndexed { index, bar ->
                val (x, w) = barFrame(index, size.width)
                val alpha = if (selected != null && selected != index) 0.35f else 1f
                val color = OV.Blue.copy(alpha = alpha)
                val totalH = if (bar.ratio > 0) max(3.dp.toPx(), plotHeight * bar.ratio.toFloat()) else 0f
                val forecastH = if (bar.forecastRatio > 0) max(3.dp.toPx(), plotHeight * bar.forecastRatio.toFloat()) else 0f
                val valueH = max(0f, totalH - forecastH)
                val r = min(3.dp.toPx(), w / 2)
                if (valueH > 0) {
                    val rect = Rect(x, plotBottom - valueH, x + w, plotBottom)
                    val path = Path().apply {
                        addRoundRect(
                            RoundRect(
                                rect,
                                topLeft = if (forecastH > 0) CornerRadius.Zero else CornerRadius(r),
                                topRight = if (forecastH > 0) CornerRadius.Zero else CornerRadius(r),
                                bottomLeft = CornerRadius.Zero, bottomRight = CornerRadius.Zero,
                            ),
                        )
                    }
                    drawPath(path, color)
                }
                if (forecastH > 0) {
                    val rect = Rect(x, plotBottom - totalH, x + w, plotBottom - totalH + forecastH)
                    val shape = RoundRect(rect, topLeft = CornerRadius(r), topRight = CornerRadius(r), bottomLeft = CornerRadius.Zero, bottomRight = CornerRadius.Zero)
                    clipPath(Path().apply { addRoundRect(shape) }) { hatch(rect, color, 4.5.dp.toPx(), 1.4.dp.toPx()) }
                    val inner = RoundRect(
                        Rect(rect.left + 0.75f, rect.top + 0.75f, rect.right - 0.75f, rect.bottom - 0.75f),
                        topLeft = CornerRadius(r), topRight = CornerRadius(r), bottomLeft = CornerRadius.Zero, bottomRight = CornerRadius.Zero,
                    )
                    drawPath(Path().apply { addRoundRect(inner) }, color, style = Stroke(1.5.dp.toPx()))
                }
            }
            // Base line
            drawRect(OV.Line, Offset(0f, plotBottom), Size(size.width, 1.dp.toPx()))
            // "Hôm nay" marker
            val today = bars.indexOfFirst { it.isToday }
            if (today >= 0) {
                val (x0, w) = barFrame(today, size.width)
                val x = x0 + w / 2
                drawLine(
                    OV.Faint, Offset(x, plotTop - 6.dp.toPx()), Offset(x, plotBottom + 4.dp.toPx()), 1.5.dp.toPx(),
                    pathEffect = PathEffect.dashPathEffect(floatArrayOf(4.dp.toPx(), 3.dp.toPx())),
                )
                val layout = measurer.measure(todayText, TextStyle(fontSize = DS.TextSize.Pill, fontWeight = FontWeight.SemiBold, color = OV.Ink2))
                val lx = (x - layout.size.width / 2f).coerceIn(0f, max(0f, size.width - layout.size.width))
                drawRect(OV.Surface, Offset(lx - 4.dp.toPx(), 0f), Size(layout.size.width + 8.dp.toPx(), layout.size.height.toFloat()))
                drawText(layout, topLeft = Offset(lx, 0f))
            }
            // Axis labels: first, today, last
            var lastMaxX = -Float.MAX_VALUE
            for (index in OverviewDashLogic.axisLabelIndexes(bars)) {
                val bar = bars[index]
                val bold = bar.isToday
                val layout = measurer.measure(
                    axis(bar),
                    TextStyle(fontSize = DS.TextSize.Pill, fontWeight = if (bold) FontWeight.Bold else FontWeight.Normal, color = if (bold) OV.Ink else OV.Muted),
                )
                val (x0, w) = barFrame(index, size.width)
                var x = x0 + w / 2 - layout.size.width / 2f
                if (index == 0) x = 0f
                if (index == bars.size - 1) x = size.width - layout.size.width
                x = x.coerceIn(0f, max(0f, size.width - layout.size.width))
                if (x < lastMaxX + 4.dp.toPx()) continue
                drawText(layout, topLeft = Offset(x, plotBottom + 5.dp.toPx()))
                lastMaxX = x + layout.size.width
            }
        }
        // Callout of the tapped bar
        val index = selected
        if (index != null && index in bars.indices && boxSize.width > 0) {
            val bar = bars[index]
            var calloutWidth by remember(index) { mutableStateOf(0) }
            val (x0, w) = barFrame(index, boxSize.width.toFloat())
            val x = (x0 + w / 2 - calloutWidth / 2f).coerceIn(0f, max(0f, boxSize.width.toFloat() - calloutWidth))
            Column(
                Modifier.offset { IntOffset(x.roundToInt(), 0) }.widthIn(max = 220.dp)
                    .onSizeChanged { calloutWidth = it.width }
                    .shadow(8.dp, RoundedCornerShape(10.dp)).clip(RoundedCornerShape(10.dp)).background(OV.Surface)
                    .border(1.dp, OV.Line, RoundedCornerShape(10.dp)).padding(horizontal = 10.dp, vertical = 8.dp),
            ) {
                Text(label(bar), fontSize = DS.TextSize.Pill, fontWeight = FontWeight.Bold, color = OV.Ink)
                CalloutRow(collectedText, OverviewDashLogic.money(bar.value))
                if (bar.forecast > 0) {
                    CalloutRow(forecastText, OverviewDashLogic.money(bar.forecast))
                    CalloutRow(totalText, OverviewDashLogic.money(bar.value + bar.forecast))
                }
            }
        }
    }
}

@Composable
private fun CalloutRow(name: String, value: String) {
    Text(
        buildAnnotatedString {
            withStyle(SpanStyle(color = OV.Ink2)) { append("$name  ") }
            withStyle(SpanStyle(color = OV.Ink, fontWeight = FontWeight.SemiBold)) { append(value) }
        },
        fontSize = DS.TextSize.Pill,
    )
}

// Detail sheet parts

/** Label (112 dp) · bar · amount (≥ 82 dp), as the board's grid */
@Composable
internal fun OVBarRow(name: String, note: String?, value: String, strong: Boolean, bar: @Composable (Modifier) -> Unit) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            buildAnnotatedString {
                withStyle(SpanStyle(color = if (strong) OV.Ink else OV.Ink2, fontWeight = if (strong) FontWeight.Bold else FontWeight.Normal)) { append(name) }
                if (note != null) withStyle(SpanStyle(color = OV.Muted)) { append(" · $note") }
            },
            fontSize = DS.TextSize.Pill, lineHeight = 15.sp, modifier = Modifier.width(112.dp),
        )
        bar(Modifier.weight(1f).height(10.dp))
        Text(
            value, fontSize = DS.TextSize.Pill, fontWeight = if (strong) FontWeight.Bold else FontWeight.Normal,
            color = if (strong) OV.Ink else OV.Ink2, textAlign = TextAlign.End, maxLines = 1, modifier = Modifier.widthIn(min = 82.dp),
        )
    }
}

/** Dot · "name · note" · amount */
@Composable
internal fun OVLegendRow(color: Color, name: String, note: String, value: String) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Box(Modifier.size(10.dp).clip(RoundedCornerShape(3.dp)).background(color))
        Text(
            buildAnnotatedString {
                withStyle(SpanStyle(color = OV.Ink)) { append(name) }
                withStyle(SpanStyle(color = OV.Muted)) { append(" · $note") }
            },
            fontSize = DS.TextSize.Secondary, modifier = Modifier.weight(1f),
        )
        Text(value, fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.SemiBold, color = OV.Ink, maxLines = 1)
    }
}

@Composable
internal fun OVSpacer(height: Int) = Spacer(Modifier.height(height.dp))
