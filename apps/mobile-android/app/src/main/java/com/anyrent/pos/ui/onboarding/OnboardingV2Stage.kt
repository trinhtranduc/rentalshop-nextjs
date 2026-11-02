package com.anyrent.pos.ui.onboarding

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Stable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.layout
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import com.anyrent.pos.R
import com.anyrent.pos.ui.common.AppIcon
import com.anyrent.pos.ui.common.AppIcons
import com.anyrent.pos.ui.theme.DS

/** The mockup's phone colours, light and dark (the iOS app is locked Light) */
data class OnboardingV2Palette(
    val screen: Color,
    val stage: Color,
    val dot: Color,
    val card: Color,
    val ink: Color,
    val ink2: Color,
    val muted: Color,
    val line: Color,
    val wordmark: Color,
    val redFill: Color,
    val redInk: Color,
    val okFill: Color,
    val okInk: Color,
    val lowFill: Color,
    val lowInk: Color,
    val purple: Color,
    val primary: Color,
    val shadow: Color,
) {
    companion object {
        val Light = OnboardingV2Palette(
            screen = Color(0xFFFFFFFF), stage = Color(0xFFEFF6FF), dot = Color(0xFFE2E8F0), card = Color(0xFFFFFFFF),
            ink = Color(0xFF0F172A), ink2 = Color(0xFF334155), muted = Color(0xFF64748B), line = Color(0xFFE2E8F0),
            wordmark = Color(0xFF1E3A8A), redFill = Color(0xFFFEE2E2), redInk = Color(0xFFB91C1C), okFill = Color(0xFFECFDF5),
            okInk = Color(0xFF047857), lowFill = Color(0xFFFFF3E0), lowInk = Color(0xFFC2410C), purple = Color(0xFF7C3AED),
            primary = Color(0xFF1D4ED8), shadow = Color(0xFF0F172A),
        )
        val Dark = OnboardingV2Palette(
            screen = Color(0xFF0B1120), stage = Color(0xFF0F1A33), dot = Color(0xFF1E293B), card = Color(0xFF0B1120),
            ink = Color(0xFFF1F5F9), ink2 = Color(0xFFCBD5E1), muted = Color(0xFF94A3B8), line = Color(0xFF243044),
            wordmark = Color(0xFFBFDBFE), redFill = Color(0xFF3F1518), redInk = Color(0xFFFCA5A5), okFill = Color(0xFF052E1F),
            okInk = Color(0xFF6EE7B7), lowFill = Color(0xFF3A2410), lowInk = Color(0xFFFDBA74), purple = Color(0xFFC4B5FD),
            primary = Color(0xFF3B82F6), shadow = Color(0xFF000000),
        )
    }
}

private val DayRed = Color(0xFFDC2626)
private val Tick = Color(0xFF059669)
private val StockDot = Color(0xFF10B981)
private val PickupFill = Color(0xFFDBEAFE)
private val PickupInk = Color(0xFF1E40AF)
private val ReturnFill = Color(0xFFEDE9FE)
private val ReturnInk = Color(0xFF6D28D9)

/** What the stage draws right now. Only the layers that use `clock` are touched each frame, not the whole screen. */
@Stable
class OnboardingV2StageState(metrics: OnboardingV2Metrics) {
    /** One state for the whole screen: the insets arrive after the first frame, and that must not lose the page */
    var metrics by mutableStateOf(metrics)
    var page by mutableStateOf(0)
    var leaving by mutableStateOf<Int?>(null)
    var clock by mutableFloatStateOf(0f)
    private var heroFrom = metrics.heroRect(0)
    private var heroFromRadius = 0f

    val settle: Float get() = max0(clock)
    val travel: Float get() = if (leaving == null) 1f else OnboardingV2Travel.hero(settle)
    val fade: Float get() = if (leaving == null) 1f else OnboardingV2Travel.fade(settle)
    val slide: Float get() = if (leaving == null) 1f else OnboardingV2Travel.slide(settle)

    val photo by derivedStateOf { if (page == 0) OnboardingV2Effect.photoSearch(clock) else OnboardingV2Effect.PhotoSearch.Finished }
    val overlap by derivedStateOf { if (page == 1) OnboardingV2Effect.overlap(clock) else OnboardingV2Effect.Overlap.Finished }
    val calendar by derivedStateOf { if (page == 2) OnboardingV2Effect.calendar(clock) else OnboardingV2Effect.Calendar.Finished }

    private fun max0(value: Float) = if (value < 0f) 0f else value

    fun heroRect(): OnboardingV2Rect =
        if (leaving == null) metrics.heroRect(page) else heroFrom.lerp(metrics.heroRect(page), travel)

    fun heroRadius(): Float =
        if (leaving == null) metrics.heroRadius(page) else OnboardingV2Travel.radius(heroFromRadius, metrics.heroRadius(page), travel)

    /** A run begins: the photo leaves from wherever it is now */
    fun begin(run: OnboardingV2Run) {
        heroFrom = heroRect()
        heroFromRadius = heroRadius()
        page = run.page
        leaving = run.travelFrom
        clock = if (!run.animated) OnboardingV2Timing.EFFECT else if (run.isRepeat) -OnboardingV2Timing.REPEAT_FADE else 0f
    }

    fun finish() {
        leaving = null
        clock = OnboardingV2Timing.EFFECT
    }

    fun cardAlpha(of: Int): Float = when (of) {
        page -> fade
        leaving -> 1 - fade
        else -> 0f
    }

    fun cardOffset(of: Int): Float = when (of) {
        page -> 24f * (1 - slide)
        leaving -> 24f * fade
        else -> 0f
    }

    fun textOffset(of: Int): Float = when (of) {
        page -> 18f * (1 - fade)
        leaving -> 18f * fade
        else -> 0f
    }
}

/** Text in the stage is sample art: its size ignores the system font scale, so a large font never breaks the art */
@Composable
private fun art(size: Float): TextUnit = (size / LocalDensity.current.fontScale).sp

@Composable
fun OnboardingV2Stage(state: OnboardingV2StageState, palette: OnboardingV2Palette, sample: OnboardingV2Sample) {
    val m = state.metrics
    val density = LocalDensity.current
    Box(
        Modifier
            .fillMaxWidth()
            .height(m.stageHeight.dp)
            .clip(RoundedCornerShape(bottomStart = if (m.compact) 22.dp else 30.dp, bottomEnd = if (m.compact) 22.dp else 30.dp))
            .background(palette.stage)
            .clearAndSetSemantics { },
    ) {
        DotGrid(palette.dot)
        val cardModifier = Modifier.padding(start = m.cardInset.dp, end = m.cardInset.dp, top = m.cardTop.dp).fillMaxWidth()
        OverlapCard(
            state,
            palette,
            cardModifier.graphicsLayer {
                alpha = state.cardAlpha(1)
                translationY = state.cardOffset(1) * density.density
            },
        )
        TodayCard(
            state,
            palette,
            sample,
            cardModifier.graphicsLayer {
                alpha = state.cardAlpha(2)
                translationY = state.cardOffset(2) * density.density
            },
        )
        Hero(state)
        ScanFrame(state)
        val side = if (m.compact) 10f else 14f
        val panelInset = maxOf(side, m.cardInset - 6f)
        val panelBottom = if (m.compact) 8f else 14f
        val panelModifier = Modifier
            .align(Alignment.BottomCenter)
            .padding(start = panelInset.dp, end = panelInset.dp, bottom = panelBottom.dp)
            .fillMaxWidth()
        ResultsPanel(
            state,
            palette,
            panelModifier.graphicsLayer {
                alpha = state.photo.resultAlpha * state.cardAlpha(0)
            },
        )
        WarningPanel(
            m,
            palette,
            panelModifier.graphicsLayer {
                val w = state.overlap.warning
                alpha = if (state.page == 1) w.coerceAtMost(1f) else state.cardAlpha(1)
                translationY = if (state.page == 1) 22f * (1 - w) * density.density else 0f
                val scale = if (state.page == 1) 0.94f + 0.06f * w else 1f
                scaleX = scale
                scaleY = scale
            },
        )
    }
}

@Composable
private fun DotGrid(color: Color) {
    Canvas(Modifier.fillMaxSize()) {
        val step = 18.dp.toPx()
        val radius = 1.dp.toPx()
        var y = step / 2
        while (y < size.height) {
            var x = step / 2
            while (x < size.width) {
                drawCircle(color, radius, Offset(x, y))
                x += step
            }
            y += step
        }
    }
}

@Composable
private fun Hero(state: OnboardingV2StageState) {
    val density = LocalDensity.current
    Image(
        painter = painterResource(R.drawable.onboarding_v2_dress),
        contentDescription = null,
        contentScale = ContentScale.Crop,
        alignment = Alignment.TopCenter,
        modifier = Modifier
            .zIndex(1f)
            .layout { measurable, _ ->
                val r = state.heroRect()
                val w = (r.width * density.density).toInt().coerceAtLeast(1)
                val h = (r.height * density.density).toInt().coerceAtLeast(1)
                val placeable = measurable.measure(Constraints.fixed(w, h))
                layout(w, h) { placeable.place((r.x * density.density).toInt(), (r.y * density.density).toInt()) }
            }
            .graphicsLayer {
                val r = state.heroRect()
                val lift = (1 - r.width / state.metrics.width).coerceIn(0f, 1f)
                shape = RoundedCornerShape(state.heroRadius().dp)
                clip = true
                shadowElevation = 8.dp.toPx() * lift
            },
    )
}

// Page 1

@Composable
private fun ScanFrame(state: OnboardingV2StageState) {
    val m = state.metrics
    val sideInset = if (m.compact) 84f else 70f
    val height = maxOf(70f, m.stageHeight - m.cardTop - if (m.compact) 144f else 262f)
    Canvas(
        Modifier
            .zIndex(2f)
            .padding(start = sideInset.dp, end = sideInset.dp, top = m.cardTop.dp)
            .fillMaxWidth()
            .height(height.dp)
            .graphicsLayer { alpha = state.cardAlpha(0) },
    ) {
        val stroke = 3.dp.toPx()
        val arm = 30.dp.toPx()
        val r = 10.dp.toPx()
        val w = size.width
        val h = size.height
        val corners = Path().apply {
            moveTo(0f, arm); lineTo(0f, r); quadraticBezierTo(0f, 0f, r, 0f); lineTo(arm, 0f)
            moveTo(w - arm, 0f); lineTo(w - r, 0f); quadraticBezierTo(w, 0f, w, r); lineTo(w, arm)
            moveTo(0f, h - arm); lineTo(0f, h - r); quadraticBezierTo(0f, h, r, h); lineTo(arm, h)
            moveTo(w - arm, h); lineTo(w - r, h); quadraticBezierTo(w, h, w, h - r); lineTo(w, h - arm)
        }
        drawPath(corners, Color.White, style = Stroke(stroke, cap = StrokeCap.Round))
        val y = state.photo.scan * h
        val line = 6.dp.toPx()
        val glow = 10.dp.toPx()
        drawRect(
            Brush.verticalGradient(
                0f to Color.Transparent,
                0.5f to Color(0x737C3AED),
                1f to Color.Transparent,
                startY = y - glow,
                endY = y + glow,
            ),
            topLeft = Offset(line, y - glow),
            size = Size(w - line * 2, glow * 2),
        )
        drawRoundRect(Color.White, Offset(line, y - stroke / 2), Size(w - line * 2, stroke), CornerRadius(stroke / 2))
    }
}

@Composable
private fun Thumb(image: Int, size: Float, radius: Float) {
    Image(
        painterResource(image),
        contentDescription = null,
        contentScale = ContentScale.Crop,
        alignment = Alignment.TopCenter,
        modifier = Modifier.size(size.dp).clip(RoundedCornerShape(radius.dp)),
    )
}

@Composable
private fun ResultsPanel(state: OnboardingV2StageState, palette: OnboardingV2Palette, modifier: Modifier) {
    val compact = state.metrics.compact
    val shape = RoundedCornerShape(if (compact) 13.dp else 18.dp)
    Column(
        modifier
            .zIndex(3f)
            .shadow(14.dp, shape, ambientColor = Color(0x4D1E2846), spotColor = Color(0x4D1E2846))
            .background(palette.card, shape)
            .padding(horizontal = if (compact) 8.dp else 12.dp, vertical = if (compact) 6.dp else 10.dp),
    ) {
        Row(
            Modifier.padding(bottom = if (compact) 3.dp else 7.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(if (compact) 7.dp else 10.dp),
        ) {
            Box(
                Modifier
                    .size(if (compact) 24.dp else 40.dp)
                    .background(DS.Gradients.AiScan, RoundedCornerShape(if (compact) 7.dp else 11.dp)),
                contentAlignment = Alignment.Center,
            ) {
                AppIcon(AppIcons.AiScan, contentDescription = null, tint = Color.White, size = if (compact) 15.dp else 22.dp)
            }
            Column {
                Text(stringResource(R.string.onboarding_v2_scan_count), fontSize = art(if (compact) 12.5f else 16f), fontWeight = FontWeight.ExtraBold, color = palette.ink, maxLines = 1, lineHeight = art(if (compact) 15f else 20f))
                if (!compact) {
                    Text(stringResource(R.string.onboarding_v2_scan_from), fontSize = art(12.5f), color = palette.muted, maxLines = 1, lineHeight = art(16f))
                }
            }
        }
        val rows = listOf(
            Triple(R.drawable.onboarding_v2_dress, R.string.onboarding_v2_scan_dress1, R.string.onboarding_v2_scan_dress1_meta),
            Triple(R.drawable.onboarding_v2_dress2, R.string.onboarding_v2_scan_dress2, R.string.onboarding_v2_scan_dress2_meta),
            Triple(R.drawable.onboarding_v2_dress3, R.string.onboarding_v2_scan_dress3, R.string.onboarding_v2_scan_dress3_meta),
        )
        val density = LocalDensity.current
        rows.forEachIndexed { index, (image, name, meta) ->
            Column(
                Modifier.graphicsLayer {
                    val p = state.photo.rows[index]
                    alpha = p
                    translationY = 10f * (1 - p) * density.density
                },
            ) {
                HorizontalDivider(thickness = 1.dp, color = palette.line)
                Row(
                    Modifier.padding(vertical = if (compact) 3.dp else 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(if (compact) 7.dp else 10.dp),
                ) {
                    Thumb(image, if (compact) 26f else 40f, if (compact) 6f else 9f)
                    Column(Modifier.weight(1f)) {
                        Text(stringResource(name), fontSize = art(if (compact) 11.5f else 14f), fontWeight = FontWeight.Bold, color = palette.ink, maxLines = 1, overflow = TextOverflow.Ellipsis, lineHeight = art(if (compact) 13f else 18f))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(if (compact) 5.dp else 6.dp).background(StockDot, CircleShape))
                            Spacer(Modifier.width(4.dp))
                            Text(stringResource(meta), fontSize = art(if (compact) 10f else 12f), color = palette.muted, maxLines = 1, overflow = TextOverflow.Ellipsis, lineHeight = art(if (compact) 12f else 16f))
                        }
                    }
                    Box(
                        Modifier
                            .size(if (compact) 18.dp else 24.dp)
                            .graphicsLayer {
                                val p = state.photo.ticks[index]
                                alpha = p.coerceAtMost(1f)
                                scaleX = 0.3f + 0.7f * p
                                scaleY = 0.3f + 0.7f * p
                            }
                            .background(Tick, CircleShape),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(Icons.Filled.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(if (compact) 12.dp else 16.dp))
                    }
                }
            }
        }
    }
}

// Page 2

private enum class DayKind { Other, Free, Low, Hit, Out }

private data class Day(val number: Int, val kind: DayKind, val count: Int = 0)

private val calendarDays = listOf(
    listOf(Day(28, DayKind.Other), Day(29, DayKind.Other), Day(30, DayKind.Other), Day(1, DayKind.Free, 2), Day(2, DayKind.Free, 2), Day(3, DayKind.Low, 1), Day(4, DayKind.Free, 2)),
    listOf(Day(5, DayKind.Free, 2), Day(6, DayKind.Low, 1), Day(7, DayKind.Low, 1), Day(8, DayKind.Hit, 1), Day(9, DayKind.Low, 1), Day(10, DayKind.Low, 1), Day(11, DayKind.Free, 2)),
    listOf(Day(12, DayKind.Free, 2), Day(13, DayKind.Free, 2), Day(14, DayKind.Free, 2), Day(15, DayKind.Low, 1), Day(16, DayKind.Free, 2), Day(17, DayKind.Out), Day(18, DayKind.Out)),
    listOf(Day(19, DayKind.Free, 2), Day(20, DayKind.Free, 2), Day(21, DayKind.Free, 2), Day(22, DayKind.Free, 2), Day(23, DayKind.Free, 2), Day(24, DayKind.Low, 1), Day(25, DayKind.Free, 2)),
    listOf(Day(26, DayKind.Free, 2), Day(27, DayKind.Free, 2), Day(28, DayKind.Free, 2), Day(29, DayKind.Free, 2), Day(30, DayKind.Low, 1), Day(31, DayKind.Free, 2), Day(1, DayKind.Other)),
)

@Composable
private fun Card(palette: OnboardingV2Palette, compact: Boolean, modifier: Modifier, content: @Composable () -> Unit) {
    val shape = RoundedCornerShape(if (compact) 16.dp else 22.dp)
    val shadow = palette.shadow.copy(alpha = if (palette === OnboardingV2Palette.Dark) 0.5f else 0.14f)
    Box(modifier.shadow(18.dp, shape, ambientColor = shadow, spotColor = shadow).background(palette.card, shape)) { content() }
}

@Composable
private fun OverlapCard(state: OnboardingV2StageState, palette: OnboardingV2Palette, modifier: Modifier) {
    val m = state.metrics
    val compact = m.compact
    val hero = m.heroRect(1)
    Card(palette, compact, modifier) {
        Column(Modifier.padding(start = m.cardPadding.dp, end = m.cardPadding.dp, top = m.cardPadding.dp, bottom = if (compact) m.cardPadding.dp else 14.dp)) {
            Row(
                Modifier.height(hero.height.dp).padding(start = (hero.width + if (compact) 6f else 12f).dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(if (compact) 6.dp else 9.dp),
            ) {
                Thumb(R.drawable.onboarding_v2_vest, if (compact) 30f else 44f, if (compact) 7f else 10f)
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                    val titleSize = if (compact) 12.5f else if (m.narrow) 13.5f else 15f
                    val subSize = if (compact) 10f else if (m.narrow) 11f else 12.5f
                    Text(stringResource(R.string.onboarding_v2_cal_title), fontSize = art(titleSize), fontWeight = FontWeight.Bold, color = palette.ink, maxLines = 1, overflow = TextOverflow.Ellipsis, lineHeight = art(titleSize + 3))
                    Text(stringResource(R.string.onboarding_v2_cal_subtitle), fontSize = art(subSize), color = palette.muted, maxLines = 1, overflow = TextOverflow.Ellipsis, lineHeight = art(subSize + 3))
                }
            }
            Spacer(Modifier.height(if (compact) 4.dp else 10.dp))
            CalendarGrid(state, palette)
        }
    }
}

@Composable
private fun CalendarGrid(state: OnboardingV2StageState, palette: OnboardingV2Palette) {
    val compact = state.metrics.compact
    val gap = if (compact) 2.dp else 4.dp
    val headers = listOf(
        R.string.onboarding_v2_cal_mon, R.string.onboarding_v2_cal_tue, R.string.onboarding_v2_cal_wed, R.string.onboarding_v2_cal_thu,
        R.string.onboarding_v2_cal_fri, R.string.onboarding_v2_cal_sat, R.string.onboarding_v2_cal_sun,
    )
    Column(verticalArrangement = Arrangement.spacedBy(gap)) {
        Row(horizontalArrangement = Arrangement.spacedBy(gap)) {
            headers.forEach {
                Text(stringResource(it), Modifier.weight(1f), fontSize = art(if (compact) 9.5f else 11f), fontWeight = FontWeight.SemiBold, color = palette.muted, textAlign = TextAlign.Center, maxLines = 1, lineHeight = art(if (compact) 11f else 14f))
            }
        }
        calendarDays.forEachIndexed { rowIndex, week ->
            Row(
                Modifier.zIndex(if (rowIndex == 1) 1f else 0f),
                horizontalArrangement = Arrangement.spacedBy(gap),
            ) {
                week.forEach { day ->
                    val cellModifier = Modifier
                        .weight(1f)
                        .height(if (compact) 23.dp else 42.dp)
                    if (day.kind == DayKind.Hit) {
                        HitCell(state, palette, cellModifier.zIndex(1f), compact)
                    } else {
                        Cell(day, palette, cellModifier, compact)
                    }
                }
            }
        }
    }
}

@Composable
private fun CellLabels(number: Int, count: String, ink: Color, compact: Boolean) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Text(number.toString(), fontSize = art(if (compact) 11f else 13f), fontWeight = FontWeight.SemiBold, color = ink, maxLines = 1, lineHeight = art(if (compact) 13f else 15f))
        if (!compact && count.isNotEmpty()) {
            Text(count, fontSize = art(10f), fontWeight = FontWeight.Bold, color = ink, maxLines = 1, lineHeight = art(12f))
        }
    }
}

@Composable
private fun Cell(day: Day, palette: OnboardingV2Palette, modifier: Modifier, compact: Boolean) {
    val shape = RoundedCornerShape(if (compact) 6.dp else 9.dp)
    val (fill, ink) = when (day.kind) {
        DayKind.Free -> palette.okFill to palette.okInk
        DayKind.Low, DayKind.Hit -> palette.lowFill to palette.lowInk
        DayKind.Out -> DayRed to Color.White
        DayKind.Other -> Color.Transparent to palette.line
    }
    val count = when (day.kind) {
        DayKind.Out -> stringResource(R.string.onboarding_v2_cal_out)
        DayKind.Other -> ""
        else -> day.count.toString()
    }
    Box(modifier.background(fill, shape), contentAlignment = Alignment.Center) { CellLabels(day.number, count, ink, compact) }
}

@Composable
private fun HitCell(state: OnboardingV2StageState, palette: OnboardingV2Palette, modifier: Modifier, compact: Boolean) {
    val density = LocalDensity.current
    val radius = if (compact) 6.dp else 9.dp
    Box(modifier) {
        Box(
            Modifier
                .fillMaxSize()
                .graphicsLayer { translationX = state.overlap.shake * density.density }
                .drawBehind {
                    drawRoundRect(lerp(palette.lowFill, DayRed, state.overlap.red), cornerRadius = CornerRadius(radius.toPx()))
                },
            contentAlignment = Alignment.Center,
        ) {
            HitLabels(state, palette, compact)
        }
        Chip(state, palette, booked = true, compact)
        Chip(state, palette, booked = false, compact)
    }
}

/** Its own function: only this text recomposes while the cell changes */
@Composable
private fun HitLabels(state: OnboardingV2StageState, palette: OnboardingV2Palette, compact: Boolean) {
    val frame = state.overlap
    val out = stringResource(R.string.onboarding_v2_cal_out)
    CellLabels(8, if (frame.showsOut) out else "1", lerp(palette.lowInk, Color.White, frame.red), compact)
}

@Composable
private fun Chip(state: OnboardingV2StageState, palette: OnboardingV2Palette, booked: Boolean, compact: Boolean) {
    val density = LocalDensity.current
    val lift = with(density) { (if (compact) 11.dp else 14.dp).roundToPx() }
    Text(
        stringResource(if (booked) R.string.onboarding_v2_cal_chip_booked else R.string.onboarding_v2_cal_chip_new),
        color = Color.White,
        fontWeight = FontWeight.Bold,
        fontSize = art(if (compact) 9.5f else 11f),
        lineHeight = art(if (compact) 11f else 13f),
        maxLines = 1,
        softWrap = false,
        modifier = Modifier
            .layout { measurable, constraints ->
                val placeable = measurable.measure(Constraints())
                layout(0, 0) {
                    val centerX = constraints.maxWidth / 2
                    val x = if (booked) centerX - placeable.width else centerX
                    val y = if (booked) -lift else constraints.maxHeight + lift - placeable.height
                    placeable.place(x, y)
                }
            }
            .graphicsLayer {
                val frame = if (booked) state.overlap.chipBooked else state.overlap.chipNew
                alpha = frame.alpha
                translationX = frame.offsetX * density.density
                scaleX = frame.scale
                scaleY = frame.scale
            }
            .background(if (booked) Color(0xFF1D4ED8) else Color(0xFF7C3AED), RoundedCornerShape(7.dp))
            .padding(horizontal = if (compact) 5.dp else 7.dp, vertical = if (compact) 2.dp else 3.dp),
    )
}

@Composable
private fun WarningPanel(m: OnboardingV2Metrics, palette: OnboardingV2Palette, modifier: Modifier) {
    val compact = m.compact
    val shape = RoundedCornerShape(if (compact) 13.dp else 18.dp)
    val shadow = palette.shadow.copy(alpha = 0.32f)
    Column(
        modifier
            .zIndex(3f)
            .shadow(18.dp, shape, ambientColor = shadow, spotColor = shadow)
            .background(palette.card, shape)
            .border(1.dp, palette.line, shape)
            .padding(horizontal = if (compact) 10.dp else 14.dp, vertical = if (compact) 7.dp else 12.dp),
    ) {
        Text(stringResource(R.string.v2_create_overlap_title), fontSize = art(if (compact) 13f else 16f), fontWeight = FontWeight.ExtraBold, color = palette.redInk, maxLines = 1, lineHeight = art(if (compact) 16f else 20f))
        Spacer(Modifier.height(if (compact) 1.dp else 3.dp))
        Text(stringResource(R.string.onboarding_v2_warn_body), fontSize = art(if (compact) 11f else 13f), color = palette.ink2, lineHeight = art(if (compact) 14f else 18f))
        Spacer(Modifier.height(if (compact) 5.dp else 9.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            val buttonShape = RoundedCornerShape(if (compact) 8.dp else 10.dp)
            val height = if (compact) 28.dp else 40.dp
            Box(Modifier.weight(0.6f).height(height).border(1.dp, palette.line, buttonShape), contentAlignment = Alignment.Center) {
                Text(stringResource(R.string.cancel), fontSize = art(if (compact) 12f else 14f), fontWeight = FontWeight.Bold, color = palette.ink, maxLines = 1)
            }
            Box(Modifier.weight(1f).height(height).background(palette.primary, buttonShape), contentAlignment = Alignment.Center) {
                Text(stringResource(R.string.v2_create_anyway), fontSize = art(if (compact) 12f else 14f), fontWeight = FontWeight.Bold, color = Color.White, maxLines = 1)
            }
        }
    }
}

// Page 3

@Composable
private fun TodayCard(state: OnboardingV2StageState, palette: OnboardingV2Palette, sample: OnboardingV2Sample, modifier: Modifier) {
    val m = state.metrics
    val compact = m.compact
    Card(palette, compact, modifier) {
        Column(Modifier.padding(start = m.todayPaddingX.dp, end = m.todayPaddingX.dp, top = m.todayPaddingTop.dp, bottom = if (compact) 0.dp else 4.dp)) {
            Row(Modifier.height(m.todayHeaderHeight.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(stringResource(R.string.onboarding_v2_today_head), Modifier.weight(1f), fontSize = art(if (compact) 11f else 13f), fontWeight = FontWeight.Bold, color = palette.ink2, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(stringResource(R.string.onboarding_v2_today_count), fontSize = art(if (compact) 11f else 13f), color = palette.muted, maxLines = 1)
            }
            TodayRow(state, palette, sample, 0, null, R.string.onboarding_v2_today_pickup, R.string.onboarding_v2_today_name1, R.string.onboarding_v2_today_item1, R.string.onboarding_v2_today_amount1, m.todayRowHeight)
            TodayRow(state, palette, sample, 1, R.drawable.onboarding_v2_vest, R.string.onboarding_v2_today_pickup, R.string.onboarding_v2_today_name2, R.string.onboarding_v2_today_item2, R.string.onboarding_v2_today_amount2, if (compact) 54f else 76f)
            TodayRow(state, palette, sample, 2, R.drawable.onboarding_v2_camera, R.string.onboarding_v2_today_return, R.string.onboarding_v2_today_name3, R.string.onboarding_v2_today_item3, R.string.onboarding_v2_today_amount3, if (compact) 54f else 76f)
        }
    }
}

@Composable
private fun TodayRow(
    state: OnboardingV2StageState,
    palette: OnboardingV2Palette,
    sample: OnboardingV2Sample,
    index: Int,
    image: Int?,
    kind: Int,
    name: Int,
    item: Int,
    amount: Int,
    height: Float,
) {
    val compact = state.metrics.compact
    val density = LocalDensity.current
    val isReturn = index == 2
    Column(
        Modifier
            .height(height.dp)
            .graphicsLayer {
                val p = state.calendar.rows[index]
                alpha = p
                translationY = 10f * (1 - p) * density.density
            },
    ) {
        HorizontalDivider(thickness = 1.dp, color = palette.line)
        Row(Modifier.fillMaxSize(), verticalAlignment = Alignment.CenterVertically) {
            val thumb = if (compact) 40f else 56f
            if (image != null) Thumb(image, thumb, if (compact) 9f else 12f) else Spacer(Modifier.size(thumb.dp))
            Spacer(Modifier.width(if (compact) 8.dp else 10.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(if (compact) 2.dp else 4.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        stringResource(kind),
                        Modifier
                            .background(if (isReturn) ReturnFill else PickupFill, RoundedCornerShape(6.dp))
                            .padding(horizontal = if (compact) 5.dp else 6.dp, vertical = 1.dp),
                        color = if (isReturn) ReturnInk else PickupInk,
                        fontSize = art(if (compact) 10f else 11.5f),
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        lineHeight = art(if (compact) 12f else 14f),
                    )
                    Text(stringResource(name), fontSize = art(if (compact) 13f else 15f), fontWeight = FontWeight.Bold, color = palette.ink, maxLines = 1, overflow = TextOverflow.Ellipsis, lineHeight = art(if (compact) 16f else 18f))
                }
                Text(stringResource(item), fontSize = art(if (compact) 10.5f else 11.5f), color = palette.muted, maxLines = 1, overflow = TextOverflow.Ellipsis, lineHeight = art(if (compact) 13f else 15f))
            }
            Spacer(Modifier.width(6.dp))
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(if (compact) 2.dp else 4.dp)) {
                Text(stringResource(amount), fontSize = art(if (compact) 12f else 14f), fontWeight = FontWeight.Bold, color = palette.ink, maxLines = 1, lineHeight = art(if (compact) 15f else 18f))
                val noteSize = art(if (compact) 10f else 11.5f)
                val noteLine = art(if (compact) 13f else 15f)
                if (isReturn) {
                    Text(stringResource(R.string.onboarding_v2_today_refund), fontSize = noteSize, fontWeight = FontWeight.Bold, color = palette.purple, maxLines = 1, lineHeight = noteLine)
                } else {
                    CollectText(state, palette, sample, sample.collectTargets[index], noteSize, noteLine)
                }
            }
        }
    }
}

/** Its own function: only this text recomposes while the number counts up */
@Composable
private fun CollectText(state: OnboardingV2StageState, palette: OnboardingV2Palette, sample: OnboardingV2Sample, target: Int, size: TextUnit, line: TextUnit) {
    val value = sample.money(target * state.calendar.collect)
    Text(
        stringResource(R.string.onboarding_v2_today_collect, value),
        fontSize = size,
        fontWeight = FontWeight.Bold,
        color = palette.redInk,
        maxLines = 1,
        lineHeight = line,
        style = LocalTextStyle.current.copy(fontFeatureSettings = "tnum"),
    )
}
