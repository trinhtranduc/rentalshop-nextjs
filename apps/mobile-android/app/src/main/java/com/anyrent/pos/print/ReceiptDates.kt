package com.anyrent.pos.print

import com.anyrent.pos.domain.ShopTime
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/** Days and stamps printed on receipts, in the shop zone whatever the phone zone (#602); null when not an instant */
object ReceiptDates {
    fun day(iso: String?, format: DateTimeFormatter, zone: ZoneId = ShopTime.zone): String? =
        iso?.let { runCatching { Instant.parse(it).atZone(zone).toLocalDate().format(format) }.getOrNull() }

    fun dateTime(iso: String?, format: DateTimeFormatter, zone: ZoneId = ShopTime.zone): String? =
        iso?.let { runCatching { Instant.parse(it).atZone(zone).format(format) }.getOrNull() }
}
