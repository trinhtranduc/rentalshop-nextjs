package com.anyrent.pos.ui.home.v2

import android.provider.Settings
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.keyframes
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.ScrollState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.animateScrollBy
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.ime
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
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
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.layout.positionInWindow
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.data.FirstRunGuideApp
import com.anyrent.pos.domain.guide.CoachBubble
import com.anyrent.pos.domain.guide.CoachCart
import com.anyrent.pos.domain.guide.CoachPlan
import com.anyrent.pos.domain.guide.CoachRun
import com.anyrent.pos.domain.guide.CoachScreen
import com.anyrent.pos.domain.guide.FirstRunCoachRules
import com.anyrent.pos.domain.guide.FirstRunGuideAction
import com.anyrent.pos.ui.common.AppAlertConfirm
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlin.math.roundToInt

/** #1394, #1412: the run in progress: which row started it, how far the forms went, where the anchors are */
object FirstRunCoach {
    var run by mutableStateOf<CoachRun?>(null)
        private set
    var passed by mutableStateOf(emptySet<CoachBubble>())
        private set
    var customersExist by mutableStateOf(false)
        private set

    /** What the form on screen says about its current step; the forms set these on every change */
    var formValid by mutableStateOf(emptySet<CoachBubble>())
    var formHasInput by mutableStateOf(false)
    /** The form's own message needs the screen (duplicate phone) */
    var paused by mutableStateOf(false)
    /** Bumped to flash the ring and scroll to the control */
    var pointTick by mutableIntStateOf(0)
        private set
    internal val anchors = mutableStateMapOf<String, Rect>()

    private val _exits = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    /** Thoát hướng dẫn: whoever holds a screen of the run closes it */
    val exits = _exits.asSharedFlow()

    fun start(action: FirstRunGuideAction) {
        stop()
        anchors.clear()
        run = CoachRun.of(action)
        customersExist = FirstRunGuideApp.tracker.hasCustomers()
    }

    fun stop() {
        run = null
        passed = emptySet()
        paused = false
        formValid = emptySet()
        formHasInput = false
    }

    fun pass(bubble: CoachBubble) {
        passed = passed + bubble
    }

    /** A form closed: it has no draft, so its bubbles start over when it opens again */
    fun formClosed(screen: CoachScreen) {
        passed = when (screen) {
            CoachScreen.PRODUCT_FORM -> passed - setOf(CoachBubble.PRODUCT_PHOTO, CoachBubble.PRODUCT_NAME, CoachBubble.PRODUCT_PRICE, CoachBubble.PRODUCT_SAVE)
            CoachScreen.NEW_CUSTOMER -> passed - setOf(CoachBubble.NEW_CUSTOMER, CoachBubble.NEW_CUSTOMER_SAVE)
            else -> passed
        }
        formValid = emptySet()
        formHasInput = false
        paused = false
    }

    fun point() {
        pointTick++
    }

    /** Back to the card, the guide goes on */
    fun leave() {
        stop()
        _exits.tryEmit(Unit)
    }
}

/** Marks a control a bubble can light. Where it is, not clipped: a control under the fold still has a place to scroll to. */
fun Modifier.coachAnchor(tag: String): Modifier = this
    .testTag(tag)
    .onGloballyPositioned { coordinates ->
        val at = coordinates.positionInWindow()
        val bounds = Rect(at, androidx.compose.ui.geometry.Size(coordinates.size.width.toFloat(), coordinates.size.height.toFloat()))
        if (FirstRunCoach.anchors[tag] != bounds) FirstRunCoach.anchors[tag] = bounds
    }

/**
 * The form's scroll: brings the lit control to the top of the form when its bubble shows, when Tiếp points at it, and when the keyboard
 * has shrunk the form. Put on the scrolling column, with [viewportTop] from its own position.
 */
@Composable
fun CoachScroll(screen: CoachScreen, scroll: ScrollState, viewportTop: Float) {
    val bubble = FirstRunCoachRules.next(FirstRunCoach.run, screen, FirstRunCoach.passed, customersExist = FirstRunCoach.customersExist)
    val density = LocalDensity.current
    val ime = WindowInsets.ime.getBottom(density)
    LaunchedEffect(bubble, FirstRunCoach.pointTick, ime) {
        val tag = bubble?.anchor(screen) ?: return@LaunchedEffect
        delay(120) // the form has laid out for the keyboard
        val rect = FirstRunCoach.anchors[tag] ?: return@LaunchedEffect
        if (tag == "product.form.save" || tag == "customers.new.save") return@LaunchedEffect // outside the scroll
        scroll.animateScrollBy(rect.top - viewportTop - with(density) { 8.dp.toPx() })
    }
}

private val BubbleBlue = Color(0xFF1D4ED8)
private val Dim = Color(0xA80F172A)

/**
 * "Làm mờ, sáng một chỗ" (iOS `FirstRunCoachOverlayView`). Nothing sits over the hole, so a touch there reaches the control; four
 * catchers around it only flash the ring. Tiếp moves on when the step is valid; otherwise it flashes the ring and scrolls to the control.
 * Put it last in the screen's root Box.
 * [covered]: a sheet of this screen is on top, so no bubble under it.
 */
@Composable
fun FirstRunCoachOverlay(screen: CoachScreen, cart: CoachCart? = null, covered: Boolean = false) {
    val coach = FirstRunCoach
    val current = FirstRunCoachRules.next(coach.run, screen, coach.passed, cart, coach.customersExist)
    if (current == null || covered || coach.paused) return
    val rect = coach.anchors[current.anchor(screen)]
    // The screen has changed and the control is gone: this bubble is skipped, silently
    LaunchedEffect(current, rect == null) {
        if (rect == null) {
            delay(3000)
            coach.pass(current)
        }
    }
    if (rect == null) return

    val density = LocalDensity.current
    val context = LocalContext.current
    var origin by remember { mutableStateOf(Offset.Zero) }
    var boxHeight by remember { mutableStateOf(0) }
    var boxWidth by remember { mutableStateOf(0) }
    var cardHeight by remember(current) { mutableStateOf(0) }
    var askDiscard by remember { mutableStateOf(false) }
    val ringAlpha = remember { Animatable(1f) }
    LaunchedEffect(coach.pointTick) {
        if (coach.pointTick == 0) return@LaunchedEffect
        val scale = Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f)
        if (scale > 0f) {
            ringAlpha.animateTo(1f, keyframes {
                durationMillis = 500
                0.15f at 125
                1f at 250
                0.15f at 375
            })
        } else {
            ringAlpha.snapTo(0.2f)
            delay(200)
            ringAlpha.snapTo(1f)
        }
    }
    val top = WindowInsets.statusBars.getTop(density)
    val bottomInset = maxOf(WindowInsets.navigationBars.getBottom(density), WindowInsets.ime.getBottom(density))
    val inset = with(density) { 4.dp.toPx() }
    val hole = Rect(
        rect.left - origin.x - inset, rect.top - origin.y - inset,
        rect.right - origin.x + inset, rect.bottom - origin.y + inset,
    )
    val point = { coach.point() }

    Box(
        Modifier
            .fillMaxSize()
            .onGloballyPositioned { origin = it.positionInWindow() }
            .onSizeChanged { boxHeight = it.height; boxWidth = it.width },
    ) {
        val alpha = ringAlpha.value
        Canvas(Modifier.fillMaxSize()) {
            val path = Path().apply {
                fillType = PathFillType.EvenOdd
                addRect(Rect(Offset.Zero, size))
                addRoundRect(RoundRect(hole, CornerRadius(12.dp.toPx())))
            }
            drawPath(path, Dim)
            drawPath(
                Path().apply { addRoundRect(RoundRect(hole, CornerRadius(12.dp.toPx()))) },
                Color.White.copy(alpha = alpha), style = Stroke(3.dp.toPx()),
            )
        }
        val w = boxWidth.toFloat()
        val h = boxHeight.toFloat()
        Catcher(0f, 0f, w, hole.top, point)
        Catcher(0f, hole.bottom, w, h, point)
        Catcher(0f, hole.top, hole.left, hole.bottom, point)
        Catcher(hole.right, hole.top, w, hole.bottom, point)

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
        val valid = current.nextAdvances(screen) && current in coach.formValid
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
                .padding(start = 13.dp, end = 13.dp, top = 11.dp, bottom = 9.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(stringResource(textOf(current)), fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = Color.White, lineHeight = 20.sp)
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    CoachPlan(coach.customersExist, cart?.isSale ?: false).counter(current).orEmpty(),
                    fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White.copy(alpha = 0.92f),
                    modifier = Modifier.testTag("guide.bubble.counter"),
                )
                Text(
                    stringResource(R.string.first_run_guide_exit),
                    fontSize = 13.sp, fontWeight = FontWeight.Medium, color = Color.White.copy(alpha = 0.92f),
                    textDecoration = TextDecoration.Underline,
                    modifier = Modifier
                        .testTag("guide.bubble.exit")
                        .clickable { if (coach.formHasInput) askDiscard = true else coach.leave() }
                        .heightIn(min = 40.dp)
                        .padding(vertical = 11.dp),
                )
                Spacer(Modifier.weight(1f))
                // "Visibly disabled": see-through with a thin outline. The tap still lands, to flash the ring.
                Box(
                    Modifier
                        .testTag(if (valid) "guide.bubble.next.on" else "guide.bubble.next.off")
                        .widthIn(min = 76.dp)
                        .height(40.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(if (valid) Color.White else Color.White.copy(alpha = 0.16f))
                        .then(if (valid) Modifier else Modifier.border(1.dp, Color.White.copy(alpha = 0.28f), RoundedCornerShape(10.dp)))
                        .clickable { if (valid) coach.pass(current) else coach.point() }
                        .padding(horizontal = 12.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        stringResource(R.string.first_run_guide_next),
                        fontSize = 15.sp, fontWeight = if (valid) FontWeight.ExtraBold else FontWeight.SemiBold,
                        color = if (valid) BubbleBlue else Color.White.copy(alpha = 0.72f),
                    )
                }
            }
        }
    }
    if (askDiscard) {
        AppAlertConfirm(
            title = stringResource(R.string.first_run_guide_exit_discard),
            message = "",
            confirmLabel = stringResource(R.string.first_run_guide_exit_discard_action),
            destructive = true,
            onDismiss = { askDiscard = false },
            onConfirm = {
                askDiscard = false
                coach.leave()
            },
        )
    }
}

/** A clear area of the dim: a tap flashes the ring, the screen under it stays as it was */
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
    CoachBubble.PRODUCT_PHOTO -> R.string.first_run_guide_bubble_product_photo
    CoachBubble.PRODUCT_NAME -> R.string.first_run_guide_bubble_product_name
    CoachBubble.PRODUCT_PRICE -> R.string.first_run_guide_bubble_product_price
    CoachBubble.PRODUCT_SAVE -> R.string.first_run_guide_bubble_product_save
    CoachBubble.CART_CUSTOMER -> R.string.first_run_guide_bubble_cart_customer
    CoachBubble.NEW_CUSTOMER -> R.string.first_run_guide_bubble_new_customer
    CoachBubble.NEW_CUSTOMER_SAVE -> R.string.first_run_guide_bubble_new_customer_save
    CoachBubble.CART_DATES -> R.string.first_run_guide_bubble_cart_dates
    CoachBubble.CART_CREATE -> R.string.first_run_guide_bubble_cart_create
}
