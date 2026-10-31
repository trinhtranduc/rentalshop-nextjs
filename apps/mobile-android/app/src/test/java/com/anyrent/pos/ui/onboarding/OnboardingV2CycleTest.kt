package com.anyrent.pos.ui.onboarding

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * #1404 the 3-page onboarding: which page plays, the cycle, cancel on leave, reduced motion, and the effect of each
 * page as a function of time. iOS `OnboardingV2Tests` holds the same numbers.
 */
class OnboardingV2CycleTest {
    private val near = 0.0001f

    @Test
    fun sampleMoneyIsFixedPerLanguageNotTheShopCurrency() {
        val vi = OnboardingV2Sample("vi")
        val en = OnboardingV2Sample("en")
        assertEquals("1.500.000", vi.money(1_500_000f))
        assertEquals("720.000", vi.money(720_000f))
        assertEquals("0", vi.money(0f))
        assertEquals("$150", en.money(150f))
        assertEquals("$0", en.money(0f))
        assertEquals(listOf(1_500_000, 720_000), vi.collectTargets)
        assertEquals(listOf(150, 75), en.collectTargets)
    }

    @Test
    fun openingPlaysPageOneWithoutTravel() {
        val cycle = OnboardingV2Cycle()
        val run = cycle.start(reduceMotion = false)
        assertEquals(0, run.page)
        assertNull(run.travelFrom)
        assertFalse(run.isRepeat)
        assertTrue(run.animated)
        assertEquals(OnboardingV2Cycle.Phase.Playing, cycle.phase)
    }

    @Test
    fun goingToAPagePlaysItWithTravelBothWays() {
        val cycle = OnboardingV2Cycle()
        cycle.start(reduceMotion = false)
        val forward = cycle.goTo(1)!!
        assertEquals(1, forward.page)
        assertEquals(0, forward.travelFrom)
        val back = cycle.goTo(0)!!
        assertEquals(0, back.page)
        assertEquals(1, back.travelFrom)
    }

    @Test
    fun swipingPastEitherEndOrToTheSamePageDoesNothing() {
        val cycle = OnboardingV2Cycle()
        cycle.start(reduceMotion = false)
        val generation = cycle.generation
        assertNull(cycle.goTo(-1))
        assertNull(cycle.goTo(0))
        assertNull(cycle.goTo(3))
        assertEquals(generation, cycle.generation)
        assertEquals(OnboardingV2Cycle.Phase.Playing, cycle.phase)
    }

    @Test
    fun effectHoldsThenRepeatsWithoutTravel() {
        val cycle = OnboardingV2Cycle()
        cycle.start(reduceMotion = false)
        val run = cycle.goTo(2)!!
        assertTrue(cycle.effectEnded(run.generation))
        assertEquals(OnboardingV2Cycle.Phase.Holding, cycle.phase)
        val again = cycle.holdEnded(run.generation)!!
        assertEquals(2, again.page)
        assertNull(again.travelFrom)
        assertTrue(again.isRepeat)
        assertEquals(OnboardingV2Cycle.Phase.Playing, cycle.phase)
    }

    @Test
    fun timingsMatchTheOwnersNumbers() {
        assertEquals(1.5f, OnboardingV2Timing.EFFECT)
        assertEquals(4f, OnboardingV2Timing.HOLD)
        assertTrue(OnboardingV2Timing.TRAVEL < OnboardingV2Timing.EFFECT)
    }

    @Test
    fun swipingMidRunCancelsThePageBeingLeft() {
        val cycle = OnboardingV2Cycle()
        val first = cycle.start(reduceMotion = false)
        val second = cycle.goTo(1)!!
        assertFalse(cycle.effectEnded(first.generation))
        assertEquals(OnboardingV2Cycle.Phase.Playing, cycle.phase)
        assertNull(cycle.holdEnded(first.generation))
        assertEquals(1, cycle.page)
        assertTrue(cycle.effectEnded(second.generation))
    }

    @Test
    fun aFastSwipeRunLeavesOneCycleOnly() {
        val cycle = OnboardingV2Cycle()
        val runs = mutableListOf(cycle.start(reduceMotion = false))
        listOf(1, 2, 1, 0, 1, 2, 1).forEach { runs += cycle.goTo(it)!! }
        val live = runs.filter { it.generation == cycle.generation }
        assertEquals(1, live.size)
        assertEquals(1, live.first().page)
        runs.dropLast(1).forEach { assertFalse(cycle.effectEnded(it.generation)) }
    }

    @Test
    fun stopCancelsEverythingAndStartReplaysTheCurrentPageWithoutTravel() {
        val cycle = OnboardingV2Cycle()
        cycle.start(reduceMotion = false)
        val run = cycle.goTo(1)!!
        cycle.stop()
        assertEquals(OnboardingV2Cycle.Phase.Stopped, cycle.phase)
        assertFalse(cycle.effectEnded(run.generation))
        assertNull(cycle.holdEnded(run.generation))
        val back = cycle.start(reduceMotion = false)
        assertEquals(1, back.page)
        assertNull(back.travelFrom)
    }

    @Test
    fun stopDuringAHoldNeverRepeats() {
        val cycle = OnboardingV2Cycle()
        val run = cycle.start(reduceMotion = false)
        assertTrue(cycle.effectEnded(run.generation))
        cycle.stop()
        assertNull(cycle.holdEnded(run.generation))
    }

    @Test
    fun reducedMotionGivesTheFinishedStateAndNoLoop() {
        val cycle = OnboardingV2Cycle()
        assertFalse(cycle.start(reduceMotion = true).animated)
        assertEquals(OnboardingV2Cycle.Phase.Finished, cycle.phase)
        val next = cycle.goTo(1)!!
        assertFalse(next.animated)
        assertNull(next.travelFrom)
        assertEquals(1, cycle.page)
        assertEquals(OnboardingV2Cycle.Phase.Finished, cycle.phase)
        assertFalse(cycle.effectEnded(next.generation))
        assertNull(cycle.holdEnded(next.generation))
    }

    @Test
    fun turningReduceMotionOnMidRunFinishesAtOnce() {
        val cycle = OnboardingV2Cycle()
        val run = cycle.start(reduceMotion = false)
        assertFalse(cycle.start(reduceMotion = true).animated)
        assertFalse(cycle.effectEnded(run.generation))
        assertEquals(OnboardingV2Cycle.Phase.Finished, cycle.phase)
    }

    @Test
    fun animatorScaleZeroIsReducedMotion() {
        assertTrue(isReducedMotion(animatorScale = 0f))
        assertFalse(isReducedMotion(animatorScale = 1f))
        assertFalse(isReducedMotion(animatorScale = 0.5f))
    }

    @Test
    fun photoSearchStartsEmptyAndFinishesWithThreeTicks() {
        val start = OnboardingV2Effect.photoSearch(0f)
        assertEquals(0f, start.scan)
        assertEquals(0f, start.resultAlpha)
        assertEquals(listOf(0f, 0f, 0f), start.rows)
        assertEquals(listOf(0f, 0f, 0f), start.ticks)
        assertEquals(OnboardingV2Effect.PhotoSearch.Finished, OnboardingV2Effect.photoSearch(1.5f))
        assertEquals(listOf(1f, 1f, 1f), OnboardingV2Effect.PhotoSearch.Finished.rows)
        assertEquals(listOf(1f, 1f, 1f), OnboardingV2Effect.PhotoSearch.Finished.ticks)
        assertEquals(0.62f, OnboardingV2Effect.PhotoSearch.Finished.scan, near)
    }

    @Test
    fun photoSearchShowsTheScanThenRowsOneByOneEachWithATick() {
        assertEquals(0.97f, OnboardingV2Effect.photoSearch(0.42f).scan, near)
        val t = OnboardingV2Effect.photoSearch(0.8f)
        assertTrue(t.rows[0] > 0f)
        assertEquals(0f, t.rows[1])
        assertEquals(0f, t.ticks[0])
        val later = OnboardingV2Effect.photoSearch(1.0f)
        assertTrue(later.ticks[0] > 0f)
        assertTrue(later.rows[1] > 0f)
        assertEquals(0f, later.rows[2])
    }

    @Test
    fun overlapChipsMeetThenTheCellShakesTurnsRedThenTheWarning() {
        val start = OnboardingV2Effect.overlap(0f)
        assertEquals(0f, start.chipBooked.alpha)
        assertEquals(0f, start.red)
        assertFalse(start.showsOut)
        assertEquals(0f, start.warning)
        val met = OnboardingV2Effect.overlap(0.8f)
        assertEquals(1f, met.chipBooked.alpha)
        assertEquals(1f, met.chipNew.alpha)
        assertEquals(0f, met.chipBooked.offsetX)
        assertEquals(0f, met.red)
        val shaking = OnboardingV2Effect.overlap(0.9f)
        assertEquals(1f, shaking.red)
        assertTrue(shaking.showsOut)
        assertNotEquals(0f, shaking.shake)
        assertEquals(0f, shaking.warning)
        assertTrue(OnboardingV2Effect.overlap(1.3f).warning > 0f)
        val end = OnboardingV2Effect.overlap(1.5f)
        assertEquals(OnboardingV2Effect.Overlap.Finished, end)
        assertEquals(0f, end.chipBooked.alpha)
        assertEquals(1f, end.red)
        assertEquals(0f, end.shake)
        assertEquals(1f, end.warning)
    }

    @Test
    fun calendarRowsComeOneByOneAndCollectCountsUpFromZero() {
        val start = OnboardingV2Effect.calendar(0f)
        assertEquals(listOf(0f, 0f, 0f), start.rows)
        assertEquals(0f, start.collect)
        val mid = OnboardingV2Effect.calendar(0.5f)
        assertTrue(mid.rows[0] > mid.rows[1])
        assertEquals(0f, mid.rows[2])
        assertTrue(mid.collect > 0f && mid.collect < 1f)
        assertEquals(OnboardingV2Effect.Calendar.Finished, OnboardingV2Effect.calendar(1.5f))
        assertEquals(1f, OnboardingV2Effect.Calendar.Finished.collect)
    }

    @Test
    fun aRepeatFadesFromTheFinishedStateToTheStart() {
        val fade = -OnboardingV2Timing.REPEAT_FADE
        assertEquals(listOf(1f, 1f, 1f), OnboardingV2Effect.photoSearch(fade).rows)
        assertEquals(0f, OnboardingV2Effect.photoSearch(-0.0001f).rows[0], 0.01f)
        assertEquals(1f, OnboardingV2Effect.overlap(fade).warning)
        assertEquals(1f, OnboardingV2Effect.overlap(fade).red)
        assertEquals(0f, OnboardingV2Effect.overlap(-0.0001f).red, 0.01f)
        assertEquals(1f, OnboardingV2Effect.calendar(-0.1f).collect)
    }

    @Test
    fun photoTravelEndsOnTheTargetAndCardsSettle() {
        assertEquals(0f, OnboardingV2Travel.hero(0f))
        assertEquals(1f, OnboardingV2Travel.hero(OnboardingV2Timing.TRAVEL))
        assertEquals(1f, OnboardingV2Travel.hero(1.5f))
        assertEquals(0f, OnboardingV2Travel.fade(0f))
        assertEquals(1f, OnboardingV2Travel.fade(1f))
    }

    @Test
    fun theTravelOvershootNeverMakesANegativeCorner() {
        // Found on the emulator: the photo returning to page 1 overshot radius 0 and Compose threw
        assertEquals(0f, OnboardingV2Travel.radius(14f, 0f, 1.05f))
        assertEquals(7f, OnboardingV2Travel.radius(14f, 0f, 0.5f), near)
        val overshoot = (1..44).maxOf { OnboardingV2Travel.hero(it / 100f) }
        assertTrue("the curve really overshoots", overshoot > 1f)
    }

    @Test
    fun stageMatchesTheMockupAndLeavesRoomForText() {
        val regular = OnboardingV2Metrics(390f, 844f, 47f, 34f)
        assertFalse(regular.compact)
        assertEquals(548f, regular.stageHeight, 1f)
        val tiny = OnboardingV2Metrics(320f, 568f, 20f, 0f)
        assertTrue(tiny.compact)
        assertEquals(312f, tiny.stageHeight, 1f)
        listOf(
            regular,
            tiny,
            OnboardingV2Metrics(375f, 667f, 20f, 0f),
            OnboardingV2Metrics(360f, 640f, 24f, 48f),
            OnboardingV2Metrics(440f, 956f, 62f, 34f),
        ).forEach {
            assertTrue("${it.width}x${it.height}", it.textTop + it.textHeight <= it.footerTop)
            assertTrue(it.cardTop < it.stageHeight)
        }
    }

    @Test
    fun aLargeFontScaleShrinksTheStageNotTheText() {
        val normal = OnboardingV2Metrics(375f, 667f, 20f, 0f)
        val large = OnboardingV2Metrics(375f, 667f, 20f, 0f, fontScale = 1.5f)
        assertTrue(large.stageHeight < normal.stageHeight)
        assertTrue(large.textTop + large.textHeight <= large.footerTop)
    }

    @Test
    fun photoFillsTheStageOnPageOneAndSitsOnTheCardAfter() {
        val m = OnboardingV2Metrics(390f, 844f, 47f, 34f)
        val full = m.heroRect(0)
        assertEquals(0f, full.x)
        assertEquals(390f, full.width)
        assertEquals(m.stageHeight, full.height)
        assertEquals(64f, m.heroRect(1).width)
        assertEquals(32f, m.heroRect(1).x)
        assertEquals(56f, m.heroRect(2).width)
        assertEquals(36f, m.heroRect(2).x)
        assertNotNull(m)
    }

    @Test
    fun heroLayoutIsTheOwnersCompactSizeOnTinyPhones() {
        val m = OnboardingV2Metrics(320f, 568f, 20f, 0f)
        assertEquals(40f, m.heroRect(1).width)
        assertEquals(40f, m.heroRect(2).width)
        assertEquals(24f, m.titleSize)
        assertEquals(14f, m.bodySize)
    }
}
