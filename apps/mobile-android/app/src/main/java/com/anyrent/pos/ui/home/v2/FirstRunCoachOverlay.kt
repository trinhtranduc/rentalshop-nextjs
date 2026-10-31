package com.anyrent.pos.ui.home.v2

import android.widget.Toast
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.ime
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathFillType
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.boundsInWindow
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.layout.positionInWindow
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.data.FirstRunGuideApp
import com.anyrent.pos.domain.guide.CoachBubble
import com.anyrent.pos.domain.guide.CoachCart
import com.anyrent.pos.domain.guide.CoachRun
import com.anyrent.pos.domain.guide.CoachScreen
import com.anyrent.pos.domain.guide.FirstRunCoachRules
import com.anyrent.pos.domain.guide.FirstRunGuideStep
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlin.math.roundToInt

/** #1394: the run in progress: which row started it, which bubbles it already showed, where the anchors are */
object FirstRunCoach {
    private var run: CoachRun? = null
    private val shown = mutableSetOf<CoachBubble>()
    private val _bubble = MutableStateFlow<CoachBubble?>(null)
    val bubble: StateFlow<CoachBubble?> = _bubble.asStateFlow()
    internal val anchors = mutableStateMapOf<String, Rect>()

    fun start(step: FirstRunGuideStep) {
        stop()
        anchors.clear()
        run = CoachRun.of(step)
    }

    fun stop() {
        run = null
        shown.clear()
        _bubble.value = null
    }

    /** A screen came to the front, or its state changed */
    fun screenChanged(screen: CoachScreen, cart: CoachCart? = null) {
        if (run == null) return
        val next = FirstRunCoachRules.next(run, screen, shown, cart, FirstRunGuideApp.tracker.hasCustomers()) ?: return
        shown += next
        _bubble.value = next
    }

    fun close() {
        _bubble.value = null
    }

    /** The lit control was touched */
    fun closeIfLit(anchor: String) {
        if (_bubble.value?.anchor == anchor) close()
    }
}

/** Marks a control a bubble can light: its place on screen, and a touch on it closes the bubble without taking the touch */
fun Modifier.coachAnchor(tag: String): Modifier = this
    .testTag(tag)
    .onGloballyPositioned { coordinates ->
        val bounds = coordinates.boundsInWindow()
        if (FirstRunCoach.anchors[tag] != bounds) FirstRunCoach.anchors[tag] = bounds
    }
    .pointerInput(tag) {
        awaitEachGesture {
            awaitFirstDown(requireUnconsumed = false, pass = PointerEventPass.Initial)
            FirstRunCoach.closeIfLit(tag)
        }
    }

private val BubbleBlue = Color(0xFF1D4ED8)
private val Dim = Color(0xA80F172A)

/**
 * "Làm mờ, sáng một chỗ" (iOS `FirstRunCoachOverlayView`). Nothing sits over the hole, so a touch there reaches the control; four
 * catchers around it close the bubble only, so the screen is never blocked. Put it last in the screen's root Box.
 */
@Composable
fun FirstRunCoachOverlay(screen: CoachScreen, cart: CoachCart? = null) {
    LaunchedEffect(screen, cart) { FirstRunCoach.screenChanged(screen, cart) }
    val bubble by FirstRunCoach.bubble.collectAsState()
    val current = bubble?.takeIf { it.screen == screen } ?: return
    val rect = FirstRunCoach.anchors[current.anchor]
    // The screen has changed and the control is gone: this bubble is skipped, silently
    LaunchedEffect(current, rect == null) {
        if (rect == null) {
            delay(1500)
            FirstRunCoach.close()
            FirstRunCoach.screenChanged(screen, cart)
        }
    }
    if (rect == null) return

    val density = LocalDensity.current
    val context = LocalContext.current
    var origin by remember { mutableStateOf(Offset.Zero) }
    var boxHeight by remember { mutableStateOf(0) }
    var boxWidth by remember { mutableStateOf(0) }
    var cardHeight by remember(current) { mutableStateOf(0) }
    val top = WindowInsets.statusBars.getTop(density)
    val bottomInset = maxOf(WindowInsets.navigationBars.getBottom(density), WindowInsets.ime.getBottom(density))
    val skippedText = stringResource(R.string.first_run_guide_skipped)
    val inset = with(density) { 4.dp.toPx() }
    val hole = Rect(
        rect.left - origin.x - inset, rect.top - origin.y - inset,
        rect.right - origin.x + inset, rect.bottom - origin.y + inset,
    )
    val close = { FirstRunCoach.close() }

    Box(
        Modifier
            .fillMaxSize()
            .onGloballyPositioned { origin = it.positionInWindow() }
            .onSizeChanged { boxHeight = it.height; boxWidth = it.width },
    ) {
        Canvas(Modifier.fillMaxSize()) {
            val path = Path().apply {
                fillType = PathFillType.EvenOdd
                addRect(Rect(Offset.Zero, size))
                addRoundRect(RoundRect(hole, CornerRadius(12.dp.toPx())))
            }
            drawPath(path, Dim)
            drawPath(Path().apply { addRoundRect(RoundRect(hole, CornerRadius(12.dp.toPx()))) }, Color.White, style = Stroke(3.dp.toPx()))
        }
        val w = boxWidth.toFloat()
        val h = boxHeight.toFloat()
        Catcher(0f, 0f, w, hole.top, close)
        Catcher(0f, hole.bottom, w, h, close)
        Catcher(0f, hole.top, hole.left, hole.bottom, close)
        Catcher(hole.right, hole.top, w, hole.bottom, close)

        val margin = with(density) { 16.dp.toPx() }
        val gap = with(density) { 11.dp.toPx() }
        val floor = h - bottomInset
        val roomBelow = floor - hole.bottom - gap
        val roomAbove = hole.top - gap - top
        val above = if (current.prefersAbove) roomAbove >= cardHeight || roomAbove > roomBelow else roomBelow < cardHeight && roomAbove > roomBelow
        val y = (if (above) hole.top - gap - cardHeight else hole.bottom + gap).coerceAtMost(floor - cardHeight).coerceAtLeast(top.toFloat())
        val widthPx = (w - 2 * margin).coerceAtLeast(0f)
        // Under the control: its centre when narrow, near the left edge like the mockup when it is wide
        val arrowX = if (hole.width < widthPx * 0.6f) hole.center.x else margin + with(density) { 31.dp.toPx() }
        val arrowSize = with(density) { 14.dp.toPx() }
        Box(
            Modifier
                .offset { IntOffset((arrowX - arrowSize / 2).roundToInt(), ((if (above) y + cardHeight else y) - arrowSize / 2).roundToInt()) }
                .size(14.dp)
                .rotate(45f)
                .background(BubbleBlue),
        )
        Column(
            Modifier
                .offset { IntOffset(margin.roundToInt(), y.roundToInt()) }
                .width(with(density) { widthPx.toDp() })
                .onSizeChanged { cardHeight = it.height }
                .testTag("guide.bubble.${current.name.lowercase()}")
                .shadow(10.dp, RoundedCornerShape(14.dp))
                .clip(RoundedCornerShape(14.dp))
                .background(BubbleBlue)
                .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null) { }
                .padding(start = 13.dp, end = 13.dp, top = 11.dp, bottom = 6.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(stringResource(textOf(current)), fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = Color.White, lineHeight = 20.sp)
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    stringResource(R.string.first_run_guide_bubble_step, current.step, FirstRunGuideStep.entries.size),
                    fontSize = 13.sp, fontWeight = FontWeight.Medium, color = Color.White.copy(alpha = 0.88f), modifier = Modifier.weight(1f),
                )
                Text(
                    stringResource(R.string.first_run_guide_skip),
                    fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White,
                    modifier = Modifier
                        .testTag("guide.bubble.skip")
                        .clickable {
                            FirstRunCoach.stop()
                            FirstRunGuideApp.tracker.skip()
                            Toast.makeText(context, skippedText, Toast.LENGTH_LONG).show()
                        }
                        .heightIn(min = 32.dp)
                        .padding(start = 8.dp, end = 2.dp, top = 8.dp, bottom = 8.dp),
                )
            }
        }
    }
}

/** A clear area of the dim: a tap closes the bubble, the screen under it stays as it was */
@Composable
private fun Catcher(left: Float, top: Float, right: Float, bottom: Float, onTap: () -> Unit) {
    if (right <= left || bottom <= top) return
    val density = LocalDensity.current
    Box(
        Modifier
            .offset { IntOffset(left.roundToInt(), top.roundToInt()) }
            .size(with(density) { (right - left).toDp() }, with(density) { (bottom - top).toDp() })
            .clearAndSetSemantics { }
            .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null, onClick = onTap),
    )
}

private fun textOf(bubble: CoachBubble) = when (bubble) {
    CoachBubble.PRODUCT_NAME -> R.string.first_run_guide_bubble_product_name
    CoachBubble.CART_CUSTOMER -> R.string.first_run_guide_bubble_cart_customer
    CoachBubble.PICKER_NEW -> R.string.first_run_guide_bubble_picker_new
    CoachBubble.NEW_CUSTOMER_FIELDS -> R.string.first_run_guide_bubble_new_customer
    CoachBubble.CART_DATES -> R.string.first_run_guide_bubble_cart_dates
    CoachBubble.CART_CREATE -> R.string.first_run_guide_bubble_cart_create
}
