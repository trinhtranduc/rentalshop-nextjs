package com.anyrent.pos.domain.orders

import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.domain.orders.OrderDetailHeader.Due
import com.anyrent.pos.domain.orders.OrderDetailHeader.Note
import com.anyrent.pos.domain.orders.OrderDetailHeader.Step
import com.anyrent.pos.domain.orders.OrderDetailHeader.StepTitle
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant
import java.time.ZoneId

/** #643 calmer order detail header: note, steps, sale day, walk-in customer (mockup header-truoc-sau.png) */
class OrderDetailHeaderTest {
    private val vn = ZoneId.of("Asia/Ho_Chi_Minh")

    /** Mockup order: booked Mon 14/09, hand over Thu 01/10, return Wed 07/10 (Vietnam days, stored UTC) */
    private fun order(
        status: String,
        type: String = "RENT",
        pickedUpAt: String? = null,
        returnedAt: String? = null,
        name: String? = "Jessica Lopez",
        phone: String? = "+1-555-1011",
    ) = OrderSummary(
        id = 18, orderNumber = "123456", orderType = type, status = status, totalAmount = 100.0,
        depositAmount = 0.0, customerName = name, customerPhone = phone,
        // 00:30 VN on 01/10 is still 30/09 in UTC: the label must follow the Vietnam day
        pickupPlanAt = "2026-09-30T17:30:00.000Z", returnPlanAt = "2026-10-06T17:30:00.000Z",
        createdAt = "2026-09-14T07:33:00.000Z", notes = null,
        pickedUpAt = pickedUpAt, returnedAt = returnedAt,
    )

    /** 2026-10-05 10:00 in Vietnam */
    private val oct5 = Instant.parse("2026-10-05T03:00:00Z")

    @Test
    fun pickedUpNoteCountsRentalDaysAndDaysToReturn() {
        assertEquals(Note(7, Due.ReturnIn(2)), OrderDetailHeader.note(order("PICKUPED"), oct5, vn))
    }

    @Test
    fun pickedUpReturnTodayAndLateKeepsOnlyTheDayCount() {
        val oct7 = Instant.parse("2026-10-07T01:00:00Z")
        assertEquals(Due.ReturnToday, OrderDetailHeader.note(order("PICKUPED"), oct7, vn).due)
        // Late return: the red banner says it, the note is only "7 ngày" (no "trễ")
        val oct9 = Instant.parse("2026-10-08T17:10:00Z")
        assertEquals(Note(7, null), OrderDetailHeader.note(order("PICKED_UP"), oct9, vn))
    }

    @Test
    fun reservedNoteFollowsHandOverDay() {
        val sep28 = Instant.parse("2026-09-28T03:00:00Z")
        assertEquals(Note(7, Due.HandOverIn(3)), OrderDetailHeader.note(order("RESERVED"), sep28, vn))
        val oct1 = Instant.parse("2026-10-01T03:00:00Z")
        assertEquals(Due.HandOverToday, OrderDetailHeader.note(order("RESERVED"), oct1, vn).due)
        // "quá ngày lấy 4 ngày", never "trễ"
        assertEquals(Due.PastPickup(4), OrderDetailHeader.note(order("RESERVED"), oct5, vn).due)
        // 00:10 VN on 02/10 is 01/10 in UTC: already one Vietnam day past pickup
        val oct2 = Instant.parse("2026-10-01T17:10:00Z")
        assertEquals(Due.PastPickup(1), OrderDetailHeader.note(order("RESERVED"), oct2, vn).due)
    }

    @Test
    fun returnedAndCancelledNotes() {
        assertEquals(Note(7, Due.Returned), OrderDetailHeader.note(order("RETURNED"), oct5, vn))
        assertEquals(Note(7, null), OrderDetailHeader.note(order("CANCELLED"), oct5, vn))
    }

    @Test
    fun saleHasNoNoteAndNoSteps() {
        val sale = order("COMPLETED", type = "SALE")
        assertTrue(OrderDetailHeader.note(sale, oct5, vn).isEmpty)
        assertTrue(OrderDetailHeader.steps(sale, zone = vn).isEmpty())
        assertEquals("T2 14/09", OrderDetailHeader.saleDay(sale, zone = vn))
    }

    @Test
    fun cancelledRentHasNoSteps() {
        assertTrue(OrderDetailHeader.steps(order("CANCELLED"), zone = vn).isEmpty())
    }

    @Test
    fun pickedUpStepsMatchTheMockup() {
        val steps = OrderDetailHeader.steps(order("PICKUPED", pickedUpAt = "2026-09-30T18:00:00.000Z"), zone = vn)
        assertEquals(
            listOf(
                Step(StepTitle.BOOKED, "T2 14/09", done = true, accent = false),
                Step(StepTitle.HANDED_OVER, "T5 01/10", done = true, accent = true),
                Step(StepTitle.RETURN, "T4 07/10", done = false, accent = false),
            ),
            steps,
        )
    }

    @Test
    fun reservedStepsArePendingWithPlannedDays() {
        val steps = OrderDetailHeader.steps(order("RESERVED"), zone = vn)
        assertEquals(listOf(StepTitle.BOOKED, StepTitle.HAND_OVER, StepTitle.RETURN), steps.map { it.title })
        assertEquals(listOf("T2 14/09", "T5 01/10", "T4 07/10"), steps.map { it.day })
        assertEquals(listOf(true, false, false), steps.map { it.done })
    }

    @Test
    fun returnedStepShowsActualReturnDay() {
        val steps = OrderDetailHeader.steps(
            order("RETURNED", pickedUpAt = "2026-10-01T02:00:00.000Z", returnedAt = "2026-10-05T09:00:00.000Z"),
            zone = vn,
        )
        assertEquals(Step(StepTitle.RETURNED, "T2 05/10", done = true, accent = true), steps[2])
    }

    @Test
    fun weekdaysComeFromTheLocale() {
        val en = listOf("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
        assertEquals("Thu 01/10", OrderDetailHeader.steps(order("RESERVED"), en, vn)[1].day)
    }

    @Test
    fun missingDayIsADash() {
        assertEquals("—", OrderDetailHeader.dayLabel(null, zone = vn))
        assertEquals("—", OrderDetailHeader.dayLabel("not a date", zone = vn))
    }

    @Test
    fun walkInCustomerHasNoNameAndNoCallButton() {
        assertNull(OrderDetailHeader.customerName("  "))
        assertNull(OrderDetailHeader.customerName(null))
        assertNull(OrderDetailHeader.dialNumber(null))
        assertNull(OrderDetailHeader.dialNumber(" "))
        assertEquals("Jessica Lopez", OrderDetailHeader.customerName(" Jessica Lopez "))
        assertEquals("0901234567", OrderDetailHeader.dialNumber("0901 234 567"))
    }
}
