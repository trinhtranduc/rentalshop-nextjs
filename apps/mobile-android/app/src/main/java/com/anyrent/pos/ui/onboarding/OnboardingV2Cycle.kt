package com.anyrent.pos.ui.onboarding

import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.roundToInt

/**
 * #1404 the logic of the 3-page onboarding, with no views: the cycle (which page plays, hold, repeat, cancel), each
 * page's effect as a pure function of time, and the layout numbers. iOS `OnboardingV2Cycle.swift` is the same file in
 * Swift. The curves and times are the mockup's (tab "★ 3 trang hướng dẫn").
 */
object OnboardingV2Timing {
    const val EFFECT = 1.5f
    const val HOLD = 4f
    const val TRAVEL = 0.45f

    /** A repeat fades the finished state out first, so the loop does not cut. Not part of [EFFECT]. */
    const val REPEAT_FADE = 0.2f
}

const val ONBOARDING_V2_PAGE_COUNT = 3

/** Compose has no reduce-motion flag: animator scale 0 is what the system's "remove animations" sets */
fun isReducedMotion(animatorScale: Float): Boolean = animatorScale == 0f

/** Fixed sample money for the count-up on page 3: it follows the language of the strings, never the shop's currency */
data class OnboardingV2Sample(val language: String) {
    val collectTargets: List<Int> get() = if (language == "vi") listOf(1_500_000, 720_000) else listOf(150, 75)

    fun money(value: Float): String {
        val whole = value.roundToInt()
        if (language != "vi") return "$$whole"
        return whole.toString().reversed().chunked(3).joinToString(".").reversed()
    }
}

data class OnboardingV2Run(
    val page: Int,
    val generation: Int,
    /** The page the photo travels from; null when it stays where it is */
    val travelFrom: Int?,
    val isRepeat: Boolean,
    /** false: reduced motion, show the finished state and do not loop */
    val animated: Boolean,
)

/** One cycle at most is ever alive: every change makes a new generation, and a timer of an older generation does nothing */
class OnboardingV2Cycle {
    enum class Phase { Stopped, Playing, Holding, Finished }

    var page = 0
        private set
    var phase = Phase.Stopped
        private set
    var generation = 0
        private set
    private var reduceMotion = false

    /** The screen is showing, or came back from background: the current page's own effect, no travel */
    fun start(reduceMotion: Boolean): OnboardingV2Run {
        this.reduceMotion = reduceMotion
        return makeRun(travelFrom = null, isRepeat = false)
    }

    /** Tiếp or a swipe. null past either end, and the running effect goes on. */
    fun goTo(target: Int): OnboardingV2Run? {
        if (target !in 0 until ONBOARDING_V2_PAGE_COUNT || target == page) return null
        val from = page
        page = target
        return makeRun(travelFrom = from, isRepeat = false)
    }

    /** True when the hold starts now; false for a cancelled effect */
    fun effectEnded(generation: Int): Boolean {
        if (generation != this.generation || phase != Phase.Playing) return false
        phase = Phase.Holding
        return true
    }

    /** The repeat, or null for a cancelled hold */
    fun holdEnded(generation: Int): OnboardingV2Run? {
        if (generation != this.generation || phase != Phase.Holding) return null
        return makeRun(travelFrom = null, isRepeat = true)
    }

    /** Leaving the screen or going to background */
    fun stop() {
        generation += 1
        phase = Phase.Stopped
    }

    private fun makeRun(travelFrom: Int?, isRepeat: Boolean): OnboardingV2Run {
        generation += 1
        phase = if (reduceMotion) Phase.Finished else Phase.Playing
        return OnboardingV2Run(page, generation, if (reduceMotion) null else travelFrom, isRepeat, !reduceMotion)
    }
}

internal object OnboardingV2Curve {
    /** CSS `cubic-bezier`: solves x(u) = t by bisection, then returns y(u) */
    fun bezier(x1: Float, y1: Float, x2: Float, y2: Float, t: Float): Float {
        if (t <= 0f) return 0f
        if (t >= 1f) return 1f
        fun point(a: Float, b: Float, u: Float) = 3 * (1 - u) * (1 - u) * u * a + 3 * (1 - u) * u * u * b + u * u * u
        var low = 0f
        var high = 1f
        repeat(20) {
            val mid = (low + high) / 2
            if (point(x1, x2, mid) < t) low = mid else high = mid
        }
        return point(y1, y2, (low + high) / 2)
    }

    fun ease(t: Float) = bezier(0.25f, 0.1f, 0.25f, 1f, t)
    fun easeOut(t: Float) = bezier(0f, 0f, 0.58f, 1f, t)
    fun clamp(t: Float, from: Float, duration: Float) = min(1f, max(0f, (t - from) / duration))
    fun lerp(a: Float, b: Float, k: Float) = a + (b - a) * k
}

/**
 * Each page at time `t`, in seconds. `t` below 0 is the fade of a repeat, from the finished state to the start. From
 * [OnboardingV2Timing.EFFECT] on it is the finished state, which is also what reduced motion shows.
 */
object OnboardingV2Effect {
    data class PhotoSearch(
        /** Scan line position in its frame, 0 top to 1 bottom */
        val scan: Float,
        val resultAlpha: Float,
        val rows: List<Float>,
        val ticks: List<Float>,
    ) {
        companion object {
            val Finished = PhotoSearch(0.62f, 1f, listOf(1f, 1f, 1f), listOf(1f, 1f, 1f))
        }
    }

    data class Chip(val alpha: Float, val offsetX: Float, val scale: Float) {
        companion object {
            val Gone = Chip(0f, 0f, 0.6f)
        }
    }

    data class Overlap(
        val chipBooked: Chip,
        val chipNew: Chip,
        /** The hit cell, 0 low stock to 1 red */
        val red: Float,
        val showsOut: Boolean,
        val shake: Float,
        val warning: Float,
    ) {
        companion object {
            val Finished = Overlap(Chip.Gone, Chip.Gone, 1f, true, 0f, 1f)
        }
    }

    data class Calendar(
        val rows: List<Float>,
        /** "còn thu" fraction of its target */
        val collect: Float,
    ) {
        companion object {
            val Finished = Calendar(listOf(1f, 1f, 1f), 1f)
        }
    }

    private fun fade(t: Float) = min(1f, -t / OnboardingV2Timing.REPEAT_FADE)

    fun photoSearch(t: Float): PhotoSearch {
        if (t >= OnboardingV2Timing.EFFECT) return PhotoSearch.Finished
        if (t < 0f) {
            val k = fade(t)
            return PhotoSearch(0.62f * k, k, listOf(k, k, k), listOf(k, k, k))
        }
        val c = OnboardingV2Curve
        val sweep = c.clamp(t, 0f, 0.7f)
        val line = { u: Float -> c.bezier(0.45f, 0f, 0.55f, 1f, u) }
        val scan = if (sweep < 0.6f) 0.97f * line(sweep / 0.6f) else c.lerp(0.97f, 0.62f, line((sweep - 0.6f) / 0.4f))
        return PhotoSearch(
            scan = scan,
            resultAlpha = c.ease(c.clamp(t, 0.5f, 0.2f)),
            rows = listOf(0.68f, 0.88f, 1.08f).map { c.ease(c.clamp(t, it, 0.25f)) },
            ticks = listOf(0.84f, 1.04f, 1.24f).map { c.bezier(0.2f, 1.6f, 0.4f, 1f, c.clamp(t, it, 0.22f)) },
        )
    }

    fun overlap(t: Float): Overlap {
        if (t >= OnboardingV2Timing.EFFECT) return Overlap.Finished
        if (t < 0f) {
            val k = fade(t)
            return Overlap(Chip.Gone, Chip.Gone, k, k > 0.5f, 0f, k)
        }
        val c = OnboardingV2Curve
        return Overlap(
            chipBooked = chip(c.clamp(t, 0.3f, 0.7f), -90f, 0.4f, 0.85f),
            chipNew = chip(c.clamp(t, 0.5f, 0.5f), 90f, 0.55f, 0.8f),
            red = c.clamp(t, 0.84f, 0.06f),
            showsOut = t >= 0.84f,
            shake = shake(c.clamp(t, 0.84f, 0.26f)),
            warning = c.bezier(0.2f, 1.35f, 0.4f, 1f, c.clamp(t, 1.1f, 0.38f)),
        )
    }

    private fun chip(u: Float, from: Float, inAt: Float, outAt: Float): Chip {
        val c = OnboardingV2Curve
        if (u <= 0f) return Chip(0f, from, 1f)
        if (u < inAt) {
            val k = c.easeOut(u / inAt)
            return Chip(k, from * (1 - k), 1f)
        }
        if (u < outAt) return Chip(1f, 0f, 1f)
        val k = c.easeOut((u - outAt) / (1 - outAt))
        return Chip(1 - k, 0f, 1 - 0.4f * k)
    }

    private val shakeStops = listOf(0f, -3f, 3f, -2f, 2f, 0f)

    private fun shake(u: Float): Float {
        if (u <= 0f || u >= 1f) return 0f
        val position = u * 5
        val index = min(4, position.toInt())
        return OnboardingV2Curve.lerp(shakeStops[index], shakeStops[index + 1], position - index)
    }

    fun calendar(t: Float): Calendar {
        if (t >= OnboardingV2Timing.EFFECT) return Calendar.Finished
        if (t < 0f) {
            val k = fade(t)
            return Calendar(listOf(k, k, k), 1f)
        }
        val c = OnboardingV2Curve
        val k = c.clamp(t, 0.25f, 1.15f)
        return Calendar(listOf(0.2f, 0.45f, 0.7f).map { c.ease(c.clamp(t, it, 0.28f)) }, 1 - (1 - k).pow(3))
    }
}

/** The move between pages, on the same clock as the effect */
object OnboardingV2Travel {
    fun hero(t: Float) = OnboardingV2Curve.bezier(0.3f, 1.1f, 0.35f, 1f, OnboardingV2Curve.clamp(t, 0f, OnboardingV2Timing.TRAVEL))

    /** Cards and text in and out */
    fun fade(t: Float) = OnboardingV2Curve.ease(OnboardingV2Curve.clamp(t, 0f, 0.25f))
    fun slide(t: Float) = OnboardingV2Curve.bezier(0.2f, 0.9f, 0.3f, 1f, OnboardingV2Curve.clamp(t, 0f, 0.35f))

    /** The travel curve overshoots 1, and a corner radius can never go below 0 */
    fun radius(from: Float, to: Float, travel: Float) = max(0f, OnboardingV2Curve.lerp(from, to, travel))
}

data class OnboardingV2Rect(val x: Float, val y: Float, val width: Float, val height: Float) {
    fun lerp(to: OnboardingV2Rect, k: Float) = OnboardingV2Rect(
        OnboardingV2Curve.lerp(x, to.x, k),
        OnboardingV2Curve.lerp(y, to.y, k),
        OnboardingV2Curve.lerp(width, to.width, k),
        OnboardingV2Curve.lerp(height, to.height, k),
    )
}

/**
 * Layout numbers from the mockup, in dp: regular is its 390×844 phone, compact its 320×568 phone. A large system font
 * grows the body text and shrinks the stage; the stage itself is fixed sample art and does not scale.
 */
data class OnboardingV2Metrics(
    val width: Float,
    val height: Float,
    val safeTop: Float,
    val safeBottom: Float,
    val fontScale: Float = 1f,
) {
    val compact = height - safeBottom < 620f

    /** Narrower than the mockup: the page 2 header text steps down so it stays on one line */
    val narrow = !compact && width < 380f
    val footerHeight = if (compact) 48f else 54f
    val footerTop = height - max(safeBottom, 14f) - footerHeight
    val titleSize = if (compact) 24f else 32f
    val titleLine = if (compact) 29f else 38f
    val bodyScale = min(fontScale, 1.3f)
    val bodySize = if (compact) 14f else 16f
    val bodyLine = if (compact) 19f else 23f
    val textInset = if (compact) 20f else 28f
    val textGap = if (compact) 5f else 8f
    val textHeight = titleLine * 2 + textGap + bodyLine * bodyScale * 2
    private val gapAbove = if (compact) 12f else 24f
    private val gapBelow = if (compact) 6f else 12f
    val stageHeight = min(height * (if (compact) 0.55f else 0.65f), footerTop - gapBelow - textHeight - gapAbove).toInt().toFloat()
    val textTop = stageHeight + gapAbove
    val topBarTop = safeTop + if (compact) 4f else 12f
    val cardTop = topBarTop + 44f + if (compact) 0f else 9f

    /** A wide screen (tablet) keeps the cards at phone width */
    val cardInset = max(if (compact) 12f else 20f, (width - 560f) / 2)
    val cardPadding = if (compact) 8f else 12f
    val todayPaddingX = if (compact) 12f else 16f
    val todayPaddingTop = if (compact) 8f else 14f
    val todayHeaderHeight = if (compact) 18f else 33f
    val todayRowHeight = if (compact) 58f else 76f

    /** Where the photo sits on a page. The cards leave this spot free. */
    fun heroRect(page: Int): OnboardingV2Rect = when (page) {
        1 -> {
            val size = if (compact) 40f else 64f
            OnboardingV2Rect(cardInset + cardPadding, cardTop + cardPadding, size, size)
        }
        2 -> {
            val size = if (compact) 40f else 56f
            val rowTop = cardTop + todayPaddingTop + todayHeaderHeight
            OnboardingV2Rect(cardInset + todayPaddingX, rowTop + (todayRowHeight - size) / 2, size, size)
        }
        else -> OnboardingV2Rect(0f, 0f, width, stageHeight)
    }

    fun heroRadius(page: Int): Float = when (page) {
        1 -> if (compact) 10f else 14f
        2 -> if (compact) 9f else 12f
        else -> 0f
    }
}
