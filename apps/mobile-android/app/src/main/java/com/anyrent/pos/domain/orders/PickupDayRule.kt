package com.anyrent.pos.domain.orders

import com.anyrent.pos.domain.ShopTime
import java.time.Instant
import java.time.LocalDate

/**
 * #1685 (API #1684): a new rental cannot be picked up on a day before today. The days are Vietnam civil days
 * ([ShopTime], never the phone's zone), so today stays allowed after any hour and 00:30 Vietnam is still today.
 * Editing an existing order and a sale (no pickup day) have no minimum.
 */
object PickupDayRule {
    /** First day a calendar may offer for the pickup: today for a new rental, null (no minimum) when editing */
    fun minPickupDay(editing: Boolean, today: LocalDate = ShopTime.today()): LocalDate? =
        if (editing) null else today

    /** True when [pickup] is a day before [today] */
    fun isPast(pickup: LocalDate, today: LocalDate = ShopTime.today()): Boolean = pickup.isBefore(today)

    /** The same rule for an instant (e.g. `pickupPlanAt`), read as a Vietnam day */
    fun isPast(pickupAt: Instant, now: Instant = Instant.now()): Boolean =
        isPast(ShopTime.today(pickupAt), ShopTime.today(now))

    /**
     * A cart that must ask for its days again: a new rental whose chosen pickup day is before today (a draft kept
     * overnight, a booking request of a day that passed). A sale, an edit, or a cart without chosen days is fine.
     */
    fun mustAskDaysAgain(isSale: Boolean, editing: Boolean, datesChosen: Boolean, pickup: LocalDate, today: LocalDate = ShopTime.today()): Boolean =
        !isSale && !editing && datesChosen && isPast(pickup, today)
}
