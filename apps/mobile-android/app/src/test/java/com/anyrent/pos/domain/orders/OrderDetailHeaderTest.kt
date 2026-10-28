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

    /** #891 (owner): order detail shows "Người tạo: <name>"; no line when the name is empty (iOS creatorName) */
    @Test
    fun creatorName() {
        assertEquals("Merchant 1", OrderDetailHeader.creatorName(order("RESERVED").copy(createdByName = " Merchant 1 ")))
        assertEquals(null, OrderDetailHeader.creatorName(order("RESERVED").copy(createdByName = "  ")))
        assertEquals(null, OrderDetailHeader.creatorName(order("RESERVED").copy(createdByName = null)))
    }

    /** #891 (owner): the detail header hides the "lấy sau N ngày" countdown; other notes stay (iOS headerSummary) */
    @Test
    fun handOverCountdownIsHidden() {
        assertEquals(null, OrderDetailHeader.shownDue(OrderDetailHeader.Due.HandOverIn(2)))
        assertEquals(OrderDetailHeader.Due.HandOverToday, OrderDetailHeader.shownDue(OrderDetailHeader.Due.HandOverToday))
        // #891 (owner): no "trả sau N ngày" countdown either; late states stay
        assertEquals(null, OrderDetailHeader.shownDue(OrderDetailHeader.Due.ReturnIn(3)))
        // #893 (owner): no overdue text or banner in the detail; Việc cần làm shows lateness
        assertEquals(null, OrderDetailHeader.shownDue(OrderDetailHeader.Due.PastPickup(2)))
        assertEquals(false, OrderDetailHeader.showsLateBanner)
        assertEquals(OrderDetailHeader.Due.ReturnToday, OrderDetailHeader.shownDue(OrderDetailHeader.Due.ReturnToday))
    }

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
        assertEquals("14/09/26 14:33", OrderDetailHeader.saleDay(sale, zone = vn))
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
                Step(StepTitle.BOOKED, "14/09/26 14:33", done = true, accent = false),
                Step(StepTitle.HANDED_OVER, "01/10/26 01:00", done = true, accent = true),
                Step(StepTitle.RETURN, "07/10/26", done = false, accent = false),
            ),
            steps,
        )
    }

    @Test
    fun reservedStepsArePendingWithPlannedDays() {
        val steps = OrderDetailHeader.steps(order("RESERVED"), zone = vn)
        assertEquals(listOf(StepTitle.BOOKED, StepTitle.HAND_OVER, StepTitle.RETURN), steps.map { it.title })
        assertEquals(listOf("14/09/26 14:33", "01/10/26", "07/10/26"), steps.map { it.day })
        assertEquals(listOf(true, false, false), steps.map { it.done })
    }

    @Test
    fun returnedStepShowsActualReturnDay() {
        val steps = OrderDetailHeader.steps(
            order("RETURNED", pickedUpAt = "2026-10-01T02:00:00.000Z", returnedAt = "2026-10-05T09:00:00.000Z"),
            zone = vn,
        )
        assertEquals(Step(StepTitle.RETURNED, "05/10/26", done = true, accent = true), steps[2])
    }

    @Test
    fun stepDaysAreDayMonthYearInAnyLocale() {
        // #888: dd/mm/yy, no weekday
        val en = listOf("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
        assertEquals("01/10/26", OrderDetailHeader.steps(order("RESERVED"), en, vn)[1].day)
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
