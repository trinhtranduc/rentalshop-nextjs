package com.anyrent.pos.domain.orders

import com.anyrent.pos.R
import com.anyrent.pos.data.model.CartLine
import com.anyrent.pos.data.model.Customer
import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.domain.ShopTime
import com.anyrent.pos.domain.bank.OutletBankAccount
import com.anyrent.pos.domain.bank.VietQr
import com.anyrent.pos.domain.products.CartV2Logic
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/** A label of the share image: a string resource (app language) or text from the data */
sealed interface ShareText {
    data class Res(val id: Int, val args: List<Any> = emptyList()) : ShareText
    data class Plural(val id: Int, val count: Int) : ShareText
    data class Plain(val text: String) : ShareText
}

/** Colours of the status pill and the highlighted total (spec #640) */
enum class ShareTone { ACCENT, GREEN, ORANGE, RED }

data class ShareShop(
    /** Merchant name, the big line and the initials */
    val name: String,
    val outletName: String?,
    val outletPhone: String?,
    val address: String?,
)

data class ShareDayStrip(val pickup: String, val returnDay: String, val days: Int)

data class ShareLine(val name: String, val quantity: String, val total: String)

data class ShareRow(val label: ShareText, val value: String)

data class ShareHighlight(val label: ShareText, val value: String, val tone: ShareTone)

data class ShareQr(
    val payload: String,
    val bankName: String,
    val accountNumber: String,
    val holder: String,
    /** "DH<orderNumber>" */
    val content: String,
)

/**
 * #640 share image of an order or a cart draft (spec behaviors 1–9), without drawing: what [OrderShareRenderer]
 * paints. Labels are string ids so the image follows the app language; days and money are already formatted.
 */
data class OrderShareModel(
    val initials: String,
    val shopName: String,
    /** "<outlet name> · <outlet phone>", null when both are missing */
    val outletLine: String?,
    val kind: ShareText,
    val title: ShareText,
    val pill: ShareText,
    val pillTone: ShareTone,
    val customerName: ShareText,
    val customerPhone: String?,
    val dayStrip: ShareDayStrip?,
    val itemsTitle: ShareText,
    val lines: List<ShareLine>,
    val rows: List<ShareRow>,
    val highlight: ShareHighlight,
    val note: ShareText?,
    val qr: ShareQr?,
    val thanks: ShareText,
    val address: String?,
    val fileName: String,
) {
    val isDraft: Boolean get() = note != null

    companion object {
        /**
         * The image of an order. [bankAccount] is the bill's account (`BankAccountRules.pick`) or null; the QR shows
         * only when [printBankQr] (the "QR chuyển khoản trên hoá đơn" switch) is on and the account has a VietQR.
         */
        fun from(
            order: OrderDetail,
            shop: ShareShop,
            vi: Boolean,
            printBankQr: Boolean = false,
            bankAccount: OutletBankAccount? = null,
            zone: ZoneId = ShopTime.zone,
        ): OrderShareModel {
            val summary = order.summary
            val isRent = summary.orderType.equals("RENT", ignoreCase = true)
            val status = summary.status.uppercase().let { if (it == "PICKED_UP") "PICKUPED" else it }
            val number = summary.orderNumber.trim().removePrefix("#")
            val payments = order.payments.map { BalancePayment(it.amount, it.status, it.notes) }
            val due = if (isRent) {
                rentDue(status, summary.totalAmount, summary.depositAmount, payments)
            } else {
                OrderDetailLogic.balance(
                    summary.orderType, summary.status, summary.totalAmount, summary.depositAmount,
                    order.securityDeposit, order.lateFee, order.damageFee, payments,
                ).amountDue
            }

            val rows = mutableListOf<ShareRow>()
            val highlight: ShareHighlight
            if (isRent) {
                rows += ShareRow(ShareText.Res(R.string.share_rent_total), money(summary.totalAmount))
                if (summary.depositAmount > 0) {
                    rows += ShareRow(ShareText.Res(R.string.share_deposit_paid), minus(summary.depositAmount))
                }
                collateral(order.collateralDetails, order.securityDeposit)?.let {
                    rows += ShareRow(ShareText.Res(R.string.share_collateral), it)
                }
                highlight = ShareHighlight(ShareText.Res(R.string.share_amount_due), money(due), ShareTone.ACCENT)
            } else {
                rows += ShareRow(ShareText.Res(R.string.share_subtotal), money(summary.totalAmount + order.discountAmount))
                if (order.discountAmount > 0) {
                    rows += ShareRow(ShareText.Res(R.string.share_discount), minus(order.discountAmount))
                }
                highlight = ShareHighlight(ShareText.Res(R.string.share_total), money(summary.totalAmount), ShareTone.GREEN)
            }

            val strip = if (isRent) {
                val from = OrderPlanDays.dayOf(summary.pickupPlanAt, zone)
                val to = OrderPlanDays.dayOf(summary.returnPlanAt, zone)
                if (from != null && to != null) {
                    ShareDayStrip(dayLabel(from, vi), dayLabel(to, vi), CartV2Logic.rentalDays(from, to))
                } else {
                    null
                }
            } else {
                null
            }

            val name = (order.customer?.displayName ?: summary.customerName)?.trim()?.takeIf { it.isNotEmpty() }
            val phone = (summary.customerPhone ?: order.customer?.phone)?.trim()?.takeIf { it.isNotEmpty() }
            val (pill, tone) = pill(status)
            return OrderShareModel(
                initials = initials(shop.name),
                shopName = shop.name,
                outletLine = outletLine(shop),
                kind = ShareText.Res(if (isRent) R.string.share_kind_rent else R.string.share_kind_sale),
                title = ShareText.Plain("#$number"),
                pill = pill,
                pillTone = tone,
                customerName = name?.let { ShareText.Plain(it) } ?: ShareText.Res(R.string.share_walk_in),
                customerPhone = phone,
                dayStrip = strip,
                itemsTitle = itemsTitle(isRent, order.items.size),
                lines = order.items.map { item ->
                    val itemName = item.productName?.takeIf { it.isNotBlank() && !it.equals("null", true) } ?: "—"
                    ShareLine(itemName, "${item.quantity} × ${money(item.unitPrice)}", money(item.totalPrice))
                },
                rows = rows,
                highlight = highlight,
                note = null,
                qr = qr(printBankQr, bankAccount, due, number),
                thanks = ShareText.Res(R.string.share_thanks, listOf(shop.name)),
                address = shop.address?.trim()?.takeIf { it.isNotEmpty() },
                fileName = "Order_${number.replace(Regex("[^A-Za-z0-9_-]"), "_").ifBlank { "order" }}.jpg",
            )
        }

        /** The image of the cart before it is an order: no order number, no QR */
        fun fromDraft(
            lines: List<CartLine>,
            customer: Customer?,
            isSale: Boolean,
            pickup: LocalDate?,
            returnDate: LocalDate?,
            discountAmount: Double,
            deposit: Double,
            securityDeposit: Double,
            collateralDetails: String?,
            shop: ShareShop,
            vi: Boolean,
            now: Instant = Instant.now(),
            zone: ZoneId = ShopTime.zone,
        ): OrderShareModel {
            val today = now.atZone(zone)
            val subtotal = lines.sumOf { it.lineTotal }
            val total = (subtotal - discountAmount).coerceAtLeast(0.0)
            val rows = mutableListOf<ShareRow>()
            if (discountAmount > 0) rows += ShareRow(ShareText.Res(R.string.share_discount), minus(discountAmount))
            if (!isSale) {
                if (deposit > 0) rows += ShareRow(ShareText.Res(R.string.share_draft_deposit), money(deposit))
                collateral(collateralDetails, securityDeposit)?.let {
                    rows += ShareRow(ShareText.Res(R.string.share_collateral), it)
                }
            }
            val strip = if (!isSale && pickup != null && returnDate != null) {
                ShareDayStrip(dayLabel(pickup, vi), dayLabel(returnDate, vi), CartV2Logic.rentalDays(pickup, returnDate))
            } else {
                null
            }
            val kind = ShareText.Res(if (isSale) R.string.share_kind_sale else R.string.share_kind_rent)
            return OrderShareModel(
                initials = initials(shop.name),
                shopName = shop.name,
                outletLine = outletLine(shop),
                kind = ShareText.Res(R.string.share_kind_draft, listOf(kind, dayLabel(today.toLocalDate(), vi))),
                title = ShareText.Res(R.string.share_draft_title),
                pill = ShareText.Res(R.string.share_status_draft),
                pillTone = ShareTone.ORANGE,
                customerName = customer?.displayName?.trim()?.takeIf { it.isNotEmpty() }?.let { ShareText.Plain(it) }
                    ?: ShareText.Res(R.string.share_walk_in),
                customerPhone = customer?.phone?.trim()?.takeIf { it.isNotEmpty() },
                dayStrip = strip,
                itemsTitle = itemsTitle(!isSale, lines.size),
                lines = lines.map { ShareLine(it.product.name, "${it.quantity} × ${money(it.unitPrice)}", money(it.lineTotal)) },
                rows = rows,
                highlight = ShareHighlight(ShareText.Res(R.string.share_draft_estimate), money(total), ShareTone.ORANGE),
                note = ShareText.Res(R.string.share_draft_note),
                qr = null,
                thanks = ShareText.Res(R.string.share_thanks, listOf(shop.name)),
                address = shop.address?.trim()?.takeIf { it.isNotEmpty() },
                fileName = "Draft_${DateTimeFormatter.ofPattern("yyyyMMdd-HHmm").format(today)}.jpg",
            )
        }

        /**
         * "Còn phải trả" of a rental (owner, 2026-10-07): the rent money still owed = total − deposit paid − rent
         * payments made at pickup, never below 0. Collateral money is NOT in it (it has its own row). Nothing is
         * owed on a returned or cancelled order. The VietQR amount is the same figure.
         */
        fun rentDue(status: String, totalAmount: Double, depositAmount: Double, payments: List<BalancePayment>): Double {
            val st = status.uppercase()
            if (st == "RETURNED" || st == "CANCELLED") return 0.0
            val paid = payments.filter { it.status == "COMPLETED" && it.notes == "PICKUP" }.sumOf { it.amount }
            return (totalAmount - depositAmount - paid).coerceAtLeast(0.0)
        }

        /** Pill text and colour by kind and status (spec 1) */
        fun pill(status: String): Pair<ShareText, ShareTone> = when (status.uppercase()) {
            "CANCELLED" -> ShareText.Res(R.string.share_status_cancelled) to ShareTone.RED
            "PICKUPED", "PICKED_UP" -> ShareText.Res(R.string.share_status_pickuped) to ShareTone.ACCENT
            "RETURNED" -> ShareText.Res(R.string.share_status_returned) to ShareTone.GREEN
            "COMPLETED" -> ShareText.Res(R.string.share_status_completed) to ShareTone.GREEN
            // RESERVED (an older sale still RESERVED is not paid yet either)
            else -> ShareText.Res(R.string.share_status_reserved) to ShareTone.ACCENT
        }

        /**
         * The QR card: the bill's switch on, an account, and a VietQR for it (the bill's string with the amount due
         * when > 0 and the content `DH<number>`).
         */
        fun qr(printBankQr: Boolean, account: OutletBankAccount?, amountDue: Double, orderNumber: String): ShareQr? {
            if (!printBankQr || account == null) return null
            val content = "DH$orderNumber"
            val payload = VietQr.payload(account, amountDue, content) ?: return null
            return ShareQr(payload, account.bankName, account.accountNumber.trim(), account.accountHolderName.uppercase(), content)
        }

        /** First letters of the first two words: "Lan Anh Bridal" → "LA" */
        fun initials(name: String): String =
            name.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }.take(2)
                .mapNotNull { word -> word.firstOrNull { it.isLetterOrDigit() } }
                .joinToString("") { it.uppercase() }
                .ifEmpty { "A" }

        /** `1.150.000đ`: dot thousands, no decimals, every language (spec 6) */
        fun money(amount: Double): String {
            val rounded = Math.round(amount)
            val digits = kotlin.math.abs(rounded).toString().reversed().chunked(3).joinToString(".").reversed()
            return (if (rounded < 0) "− " else "") + digits + "đ"
        }

        private fun minus(amount: Double): String = "− " + money(amount)

        /** `T4 07/10` (vi) / `Wed 07/10` (en) of a shop civil day */
        fun dayLabel(day: LocalDate, vi: Boolean): String {
            val weekday = if (vi) {
                if (day.dayOfWeek == DayOfWeek.SUNDAY) "CN" else "T${day.dayOfWeek.value + 1}"
            } else {
                day.dayOfWeek.getDisplayName(java.time.format.TextStyle.SHORT, java.util.Locale.ENGLISH)
            }
            return "%s %02d/%02d".format(weekday, day.dayOfMonth, day.monthValue)
        }

        private fun collateral(details: String?, money: Double): String? {
            val parts = listOfNotNull(details?.trim()?.takeIf { it.isNotEmpty() }, money.takeIf { it > 0 }?.let { money(it) })
            return parts.takeIf { it.isNotEmpty() }?.joinToString(" + ")
        }

        private fun outletLine(shop: ShareShop): String? =
            listOfNotNull(shop.outletName?.trim()?.takeIf { it.isNotEmpty() }, shop.outletPhone?.trim()?.takeIf { it.isNotEmpty() })
                .takeIf { it.isNotEmpty() }?.joinToString(" · ")

        private fun itemsTitle(isRent: Boolean, count: Int): ShareText =
            ShareText.Res(if (isRent) R.string.share_items_rent else R.string.share_items_sale, listOf(count))
    }
}
