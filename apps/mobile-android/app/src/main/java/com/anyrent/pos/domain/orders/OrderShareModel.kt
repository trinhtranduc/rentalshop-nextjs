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

/** [note]: the item's own note under its price line (#930); the order's general note is [OrderShareModel.orderNote] (#1354) */
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

/**
 * #1345 "Thu khi giao" of the image, fixed by the plan so it reads the same before and after hand-over (iOS
 * `ShareMoneyRule`): the total minus the stages of the plan (void and the "rest" stage left out), or minus the single
 * deposit when the order has no plan. Never below zero, rounded to the currency's smallest unit. It does not add the
 * collateral (its own row) and, unlike the order detail's `HandOverMoney`, does not drop to what is unpaid.
 */
object ShareMoneyRule {
    /** The stages shown and counted: not void, not the "rest"; empty when the order has no plan */
    fun planStages(
        hasPlan: Boolean?,
        stages: List<com.anyrent.pos.domain.deposit.OrderInstallment>?,
    ): List<com.anyrent.pos.domain.deposit.OrderInstallment> =
        if (hasPlan == true) stages.orEmpty().filter { it.status != "VOID" && !it.isRest } else emptyList()

    fun collectOnDelivery(
        total: Double,
        deposit: Double,
        hasPlan: Boolean?,
        stages: List<com.anyrent.pos.domain.deposit.OrderInstallment>?,
        currency: com.anyrent.pos.domain.money.ShopCurrency,
    ): Double {
        val explicit = planStages(hasPlan, stages)
        val taken = if (explicit.isEmpty()) deposit else explicit.sumOf { it.amount }
        return com.anyrent.pos.domain.deposit.DepositPlanMath.roundMoney(maxOf(0.0, total - taken), currency)
    }

    /** "Thu cọc theo giai đoạn": each stage with Đã thu / Chưa thu (never "Trễ", "Hôm nay"); null without stages */
    fun stages(
        hasPlan: Boolean?,
        stages: List<com.anyrent.pos.domain.deposit.OrderInstallment>?,
        currency: com.anyrent.pos.domain.money.ShopCurrency,
        zone: ZoneId,
    ): ShareMoney.Stages? {
        if (planStages(hasPlan, stages).isEmpty()) return null
        val rows = stages.orEmpty().filter { it.status != "VOID" }.mapIndexedNotNull { index, stage ->
            if (stage.isRest) return@mapIndexedNotNull null
            val percent = com.anyrent.pos.domain.deposit.DepositPlanMath.percentText(stage.percent)
            val detail = if (stage.isPaid) {
                ShareText.Res(
                    R.string.deposit_card_paid_detail,
                    listOf(percent, com.anyrent.pos.domain.deposit.DepositReceipt.paidDay(stage.collectedAt, zone)),
                )
            } else {
                ShareText.Res(
                    R.string.deposit_card_due_detail,
                    listOf(percent, com.anyrent.pos.domain.deposit.DepositPlanMath.dayText(stage.dueDateKey)),
                )
            }
            val status = when {
                stage.status == "PARTIAL" -> R.string.share_stage_partial
                stage.isPaid -> R.string.share_stage_paid
                else -> R.string.share_stage_unpaid
            }
            ShareStage(
                ShareText.Plain("${index + 1}. ${stage.label}"), OrderShareModel.money(stage.amount, currency), detail, ShareText.Res(status),
            )
        }
        return ShareMoney.Stages(ShareText.Res(R.string.deposit_card_title), rows)
    }
}

/** #1354 the order's own note under the money part: "GHI CHÚ" and the text (cut to 4 lines by the renderer) */
data class ShareOrderNote(val title: ShareText, val text: String)

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
    /** The money part, top to bottom (#1345): Tạm tính, Giảm giá, Tổng tiền thuê, Cọc, Thu khi giao, Thế chân */
    val money: List<ShareMoney>,
    val note: ShareText?,
    /** #1354 the order's note when the shop turned "Hiện ghi chú đơn trên ảnh chia sẻ" on; null otherwise (and on a draft) */
    val orderNote: ShareOrderNote? = null,
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
            /** #1189: the sum of a day-block order line (null = none); the caller owns the strings */
            blockFormula: (com.anyrent.pos.data.model.OrderItem) -> String? = { null },
            /** #1252: "Khối 3 ngày + 2 ngày thêm" of a day-block order line (null = none) */
            blockSummary: (com.anyrent.pos.data.model.OrderItem) -> String? = { null },
            now: Instant = Instant.now(),
            currency: com.anyrent.pos.domain.money.ShopCurrency = com.anyrent.pos.domain.money.ShopMoney.current,
            /** #1354 the shop's "Hiện ghi chú đơn trên ảnh chia sẻ"; missing = off */
            showOrderNote: Boolean = false,
        ): OrderShareModel {
            val summary = order.summary
            val isRent = summary.orderType.equals("RENT", ignoreCase = true)
            val number = summary.orderNumber.trim().removePrefix("#")
            val entries = mutableListOf<ShareMoney>()
            fun row(label: Int, value: String) {
                entries += ShareMoney.Row(ShareRow(ShareText.Res(label), value))
            }
            if (isRent) {
                // #1345: Tạm tính / Giảm giá, Tổng tiền thuê, Cọc, Thu khi giao, Thế chân (the order detail's order)
                if (order.discountAmount > 0) {
                    row(R.string.share_subtotal, money(OrderDetailLogic.saleSubtotal(order.items), currency))
                    row(R.string.share_discount, minus(order.discountAmount, currency))
                }
                entries += ShareMoney.Total(
                    ShareHighlight(ShareText.Res(R.string.share_rent_total), money(summary.totalAmount, currency), ShareTone.ACCENT),
                )
                val stages = ShareMoneyRule.stages(order.deposit?.hasPlan, order.deposit?.installments, currency, zone)
                when {
                    stages != null -> entries += stages
                    summary.depositAmount > 0 -> row(R.string.share_deposit_paid, money(summary.depositAmount, currency))
                    else -> entries += ShareMoney.Muted(ShareText.Res(R.string.share_deposit_label), ShareText.Res(R.string.share_deposit_none))
                }
                val collect = ShareMoneyRule.collectOnDelivery(
                    summary.totalAmount, summary.depositAmount, order.deposit?.hasPlan, order.deposit?.installments, currency,
                )
                entries += ShareMoney.Collect(ShareText.Res(R.string.share_collect), money(collect, currency))
                collateral(order.collateralDetails, order.securityDeposit, currency)?.let { row(R.string.share_collateral, it) }
            } else {
                row(R.string.share_subtotal, money(OrderDetailLogic.saleSubtotal(order.items), currency))
                if (order.discountAmount > 0) row(R.string.share_discount, minus(order.discountAmount, currency))
                entries += ShareMoney.Total(
                    ShareHighlight(ShareText.Res(R.string.share_total), money(summary.totalAmount, currency), ShareTone.GREEN),
                )
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
                    val price = "${item.quantity} × ${money(item.unitPrice, currency)}"
                    ShareLine(
                        itemName, block?.let { if (item.quantity > 1) "$it · $price" else it } ?: price, money(item.totalPrice, currency),
                        item.note?.trim()?.takeIf { it.isNotEmpty() },
                        formula = if (isRent) blockFormula(item) else null,
                    )
                },
                money = entries,
                note = null,
                // #1354: the order's own note, only while the shop's switch is on
                orderNote = ShareOrderNoteRule.text(summary.notes, enabled = showOrderNote, isDraft = false)
                    ?.let { ShareOrderNote(ShareText.Res(R.string.share_order_note_title), it) },
                qr = qr(printBankQr, bankAccount, number),
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
            /** #1189: the sum of a day-block cart line (null = none) */
            blockFormula: (CartLine) -> String? = { null },
            blockSummary: (CartLine) -> String? = { null },
            currency: com.anyrent.pos.domain.money.ShopCurrency = com.anyrent.pos.domain.money.ShopMoney.current,
        ): OrderShareModel {
            val today = now.atZone(zone)
            val subtotal = lines.sumOf { it.lineTotal }
            val total = (subtotal - discountAmount).coerceAtLeast(0.0)
            val entries = mutableListOf<ShareMoney>()
            if (discountAmount > 0) {
                entries += ShareMoney.Row(ShareRow(ShareText.Res(R.string.share_discount), minus(discountAmount, currency)))
            }
            entries += ShareMoney.Total(
                ShareHighlight(ShareText.Res(R.string.share_draft_estimate), money(total, currency), ShareTone.ORANGE),
            )
            if (!isSale) {
                // #1345: Cọc giữ đồ (or "Cọc: Chưa cọc"), Thu khi giao, Thế chân
                entries += if (deposit > 0) {
                    ShareMoney.Row(ShareRow(ShareText.Res(R.string.share_draft_deposit), money(deposit, currency)))
                } else {
                    ShareMoney.Muted(ShareText.Res(R.string.share_deposit_label), ShareText.Res(R.string.share_deposit_none))
                }
                entries += ShareMoney.Collect(
                    ShareText.Res(R.string.share_collect),
                    money(ShareMoneyRule.collectOnDelivery(total, deposit, null, null, currency), currency),
                )
                collateral(collateralDetails, securityDeposit, currency)?.let {
                    entries += ShareMoney.Row(ShareRow(ShareText.Res(R.string.share_collateral), it))
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
                    val price = "${it.quantity} × ${money(it.unitPrice, currency)}"
                    val block = if (isSale) null else blockSummary(it)
                    ShareLine(it.product.name, block?.let { b -> if (it.quantity > 1) "$b · $price" else b } ?: price, money(it.lineTotal, currency),
                        formula = if (isSale) null else blockFormula(it))
                },
                money = entries,
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

        private fun minus(amount: Double, currency: com.anyrent.pos.domain.money.ShopCurrency): String = "− " + money(amount, currency)

        /** `T4 07/10` (vi) / `Wed 07/10` (en) of a shop civil day */
        @Suppress("UNUSED_PARAMETER")
        fun dayLabel(day: LocalDate, vi: Boolean): String = com.anyrent.pos.domain.DayText.dmy(day) // #888

        private fun collateral(details: String?, amount: Double, currency: com.anyrent.pos.domain.money.ShopCurrency): String? {
            val parts = listOfNotNull(details?.trim()?.takeIf { it.isNotEmpty() }, amount.takeIf { it > 0 }?.let { money(it, currency) })
            return parts.takeIf { it.isNotEmpty() }?.joinToString(" + ")
        }

        private fun outletLine(shop: ShareShop): String? =
            listOfNotNull(shop.outletName?.trim()?.takeIf { it.isNotEmpty() }, shop.outletPhone?.trim()?.takeIf { it.isNotEmpty() })
                .takeIf { it.isNotEmpty() }?.joinToString(" · ")

        private fun itemsTitle(isRent: Boolean, count: Int): ShareText =
            ShareText.Res(if (isRent) R.string.share_items_rent else R.string.share_items_sale, listOf(count))
    }
}
