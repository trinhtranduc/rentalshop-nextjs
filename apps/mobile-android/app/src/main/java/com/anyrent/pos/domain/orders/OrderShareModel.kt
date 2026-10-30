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

/** [days] only on a draft; an order shows a light arrow instead (#930) */
data class ShareDayStrip(val pickup: String, val returnDay: String, val days: Int?)

/** [note]: the item's own note under its price line (#930); the order's general note is never on the image */
/** [formula] (#1189): the sum of a day-block line, "120.000 (3 ngày) + 2 × 20.000 = 160.000", under its price line */
data class ShareLine(val name: String, val quantity: String, val total: String, val note: String? = null, val formula: String? = null)

data class ShareRow(val label: ShareText, val value: String)

/** #1345: one stage of the deposit block: name, amount, "20% đơn · 05/10" and "Đã thu" / "Chưa thu" */
data class ShareStage(val title: ShareText, val amount: String, val detail: ShareText, val status: ShareText)

/** #1345: the money part of the image, top to bottom */
sealed interface ShareMoney {
    data class Row(val row: ShareRow) : ShareMoney

    /** A grey row whose value is a label too: "Cọc: Chưa cọc" */
    data class Muted(val label: ShareText, val value: ShareText) : ShareMoney
    data class Total(val highlight: ShareHighlight) : ShareMoney
    data class Stages(val title: ShareText, val stages: List<ShareStage>) : ShareMoney
    data class Collect(val label: ShareText, val value: String) : ShareMoney
}

/** #1345: what the customer pays at hand-over, from the plan (not built yet) */
object ShareMoneyRule {
    fun collectOnDelivery(
        total: Double,
        deposit: Double,
        hasPlan: Boolean?,
        stages: List<com.anyrent.pos.domain.deposit.OrderInstallment>?,
        currency: com.anyrent.pos.domain.money.ShopCurrency,
    ): Double = -1.0
}

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
    /** "Chưa chốt" on a draft only (#930: no status on an order) */
    val pill: ShareText?,
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
    /** #1252: "Thu cọc theo giai đoạn" under the rows of a rental that has stages; null otherwise */
    val plan: com.anyrent.pos.domain.deposit.DepositReceiptBlock? = null,
    /** #1345: the money part in order (not built yet) */
    val money: List<ShareMoney> = emptyList(),
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
            /** #1189: the sum of a day-block order line (null = none); the caller owns the strings */
            blockFormula: (com.anyrent.pos.data.model.OrderItem) -> String? = { null },
            /** #1252: "Khối 3 ngày + 2 ngày thêm" of a day-block order line (null = none) */
            blockSummary: (com.anyrent.pos.data.model.OrderItem) -> String? = { null },
            now: Instant = Instant.now(),
            currency: com.anyrent.pos.domain.money.ShopCurrency = com.anyrent.pos.domain.money.ShopMoney.current,
        ): OrderShareModel {
            val summary = order.summary
            val isRent = summary.orderType.equals("RENT", ignoreCase = true)
            val number = summary.orderNumber.trim().removePrefix("#")
            val plan = com.anyrent.pos.domain.deposit.DepositReceipt.block(
                isRent, order.deposit?.hasPlan, order.deposit?.installments, order.deposit?.summary,
                now.atZone(zone).toLocalDate().toString(), zone,
            )

            val rows = mutableListOf<ShareRow>()
            val highlight: ShareHighlight
            if (isRent) {
                // #930: no "Còn phải trả" (it changes with the status); the rent total is the highlight
                if (order.discountAmount > 0) {
                    rows += ShareRow(ShareText.Res(R.string.share_discount), minus(order.discountAmount))
                }
                // #1252: with stages the block lists what was collected, so the single "Đã cọc" row goes
                if (summary.depositAmount > 0 && plan == null) {
                    rows += ShareRow(ShareText.Res(R.string.share_deposit_paid), money(summary.depositAmount))
                }
                collateral(order.collateralDetails, order.securityDeposit)?.let {
                    rows += ShareRow(ShareText.Res(R.string.share_collateral), it)
                }
                highlight = ShareHighlight(ShareText.Res(R.string.share_rent_total), money(summary.totalAmount), ShareTone.ACCENT)
            } else {
                rows += ShareRow(ShareText.Res(R.string.share_subtotal), money(OrderDetailLogic.saleSubtotal(order.items)))
                if (order.discountAmount > 0) {
                    rows += ShareRow(ShareText.Res(R.string.share_discount), minus(order.discountAmount))
                }
                highlight = ShareHighlight(ShareText.Res(R.string.share_total), money(summary.totalAmount), ShareTone.GREEN)
            }

            val strip = if (isRent) {
                val from = OrderPlanDays.dayOf(summary.pickupPlanAt, zone)
                val to = OrderPlanDays.dayOf(summary.returnPlanAt, zone)
                if (from != null && to != null) {
                    ShareDayStrip(dayLabel(from, vi), dayLabel(to, vi), null)
                } else {
                    null
                }
            } else {
                null
            }

            // #930: "Đơn thuê · tạo 05/10/26 14:30" (shop time)
            val kindText = ShareText.Res(if (isRent) R.string.share_kind_rent else R.string.share_kind_sale)
            val created = OrderDetailHeader.dayTimeLabel(summary.createdAt, zone).takeIf { it != "—" }
            val kind = created?.let { ShareText.Res(R.string.share_kind_created, listOf(kindText, it)) } ?: kindText

            val name = (order.customer?.displayName ?: summary.customerName)?.trim()?.takeIf { it.isNotEmpty() }
            val phone = (summary.customerPhone ?: order.customer?.phone)?.trim()?.takeIf { it.isNotEmpty() }
            return OrderShareModel(
                initials = initials(shop.name),
                shopName = shop.name,
                outletLine = outletLine(shop),
                kind = kind,
                title = ShareText.Plain("#$number"),
                pill = null,
                pillTone = ShareTone.ACCENT,
                customerName = name?.let { ShareText.Plain(it) } ?: ShareText.Res(R.string.share_walk_in),
                customerPhone = phone,
                dayStrip = strip,
                itemsTitle = itemsTitle(isRent, order.items.size),
                lines = order.items.map { item ->
                    val itemName = item.productName?.takeIf { it.isNotBlank() && !it.equals("null", true) } ?: "—"
                    // #1252: a day-block line says which block it is, as the order detail does
                    val block = if (isRent) blockSummary(item) else null
                    val price = "${item.quantity} × ${money(item.unitPrice)}"
                    ShareLine(
                        itemName, block?.let { if (item.quantity > 1) "$it · $price" else it } ?: price, money(item.totalPrice),
                        item.note?.trim()?.takeIf { it.isNotEmpty() },
                        formula = if (isRent) blockFormula(item) else null,
                    )
                },
                rows = rows,
                highlight = highlight,
                note = null,
                qr = qr(printBankQr, bankAccount, number),
                thanks = ShareText.Res(R.string.share_thanks, listOf(shop.name)),
                address = shop.address?.trim()?.takeIf { it.isNotEmpty() },
                fileName = "Order_${number.replace(Regex("[^A-Za-z0-9_-]"), "_").ifBlank { "order" }}.jpg",
                plan = plan,
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
            /** #1189: the sum of a day-block cart line (null = none) */
            blockFormula: (CartLine) -> String? = { null },
            blockSummary: (CartLine) -> String? = { null },
            currency: com.anyrent.pos.domain.money.ShopCurrency = com.anyrent.pos.domain.money.ShopMoney.current,
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
                lines = lines.map {
                    val price = "${it.quantity} × ${money(it.unitPrice)}"
                    val block = if (isSale) null else blockSummary(it)
                    ShareLine(it.product.name, block?.let { b -> if (it.quantity > 1) "$b · $price" else b } ?: price, money(it.lineTotal),
                        formula = if (isSale) null else blockFormula(it))
                },
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
         * The QR card: the bill's switch on, an account, and a VietQR for it (the bill's string with the content
         * `DH<number>`; #930: no amount, the customer types it).
         */
        fun qr(printBankQr: Boolean, account: OutletBankAccount?, orderNumber: String): ShareQr? {
            if (!printBankQr || account == null) return null
            val content = "DH$orderNumber"
            val payload = VietQr.payload(account, 0.0, content) ?: return null
            return ShareQr(payload, account.bankName, account.accountNumber.trim(), account.accountHolderName.uppercase(), content)
        }

        /** First letters of the first two words: "Lan Anh Bridal" → "LA" */
        fun initials(name: String): String =
            name.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }.take(2)
                .mapNotNull { word -> word.firstOrNull { it.isLetterOrDigit() } }
                .joinToString("") { it.uppercase() }
                .ifEmpty { "A" }

        /** `1.150.000đ`: dot thousands, no decimals, every language (spec 6); `$1,150,000` in a USD shop (#1145) */
        fun money(
            amount: Double,
            currency: com.anyrent.pos.domain.money.ShopCurrency = com.anyrent.pos.domain.money.ShopMoney.current,
        ): String = com.anyrent.pos.domain.money.ShopMoney.withUnit(amount, currency).replaceFirst("−", "− ")

        private fun minus(amount: Double): String = "− " + money(amount)

        /** `T4 07/10` (vi) / `Wed 07/10` (en) of a shop civil day */
        @Suppress("UNUSED_PARAMETER")
        fun dayLabel(day: LocalDate, vi: Boolean): String = com.anyrent.pos.domain.DayText.dmy(day) // #888

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
