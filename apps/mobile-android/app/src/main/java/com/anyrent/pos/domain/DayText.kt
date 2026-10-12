package com.anyrent.pos.domain

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/**
 * #888 (owner): the one way the app writes a day: `05/10/26` (dd/mm/yy, no weekday, any language), and a day with a
 * time `05/10/26 14:30`. Instants use the shop zone (Asia/Ho_Chi_Minh) unless told otherwise. iOS `DayFormatter`.
 */
object DayText {
    fun dmy(date: LocalDate): String = "%02d/%02d/%02d".format(date.dayOfMonth, date.monthValue, date.year % 100)

    fun dmy(instant: Instant, zone: ZoneId = ShopTime.zone): String = dmy(instant.atZone(zone).toLocalDate())

    fun dmyTime(instant: Instant, zone: ZoneId = ShopTime.zone): String {
        val local = instant.atZone(zone)
        return dmy(local.toLocalDate()) + " %02d:%02d".format(local.hour, local.minute)
    }

    /** "03/10/26" for one day, "03/10/26–05/10/26" for a range */
    fun range(from: LocalDate, to: LocalDate): String = if (from == to) dmy(from) else "${dmy(from)}–${dmy(to)}"
}
