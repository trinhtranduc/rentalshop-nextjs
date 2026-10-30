package com.anyrent.pos.domain.deposit

import com.anyrent.pos.domain.money.ShopCurrency
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

/**
 * "Thu cọc theo giai đoạn" (#1199), iOS `DepositPlan.swift`: the shop setting "Cách thu cọc", the stages of an order
 * and the pure money rules the screens share. The API owns the money (`effectivePlan`); this file only previews the
 * stages of a new order (same rounding) and reads what the API sends. Every new field is optional, so an older API or
 * an order without a plan decodes as before.
 */

/**
 * Header every request carries so the API sends the stages of an order and accepts `paymentPlan` (#1199), and sends
 * BLOCK options and checks BLOCK prices (#1189). Old builds never send it and keep getting the answers they decode
 * today. One token per feature this build understands; the value is comma separated. `branch-listing` (#1346): this
 * app has the "Hiện ở chi nhánh" tick, so the API does not list a product again when this app puts it on an order.
 */
object ClientCapabilities {
    const val HEADER_NAME = "X-Client-Capabilities"
    val TOKENS: List<String> = listOf("installments", "block-pricing", "branch-listing")
    val headerValue: String get() = TOKENS.joinToString(",")
}

enum class DepositMode(val raw: String) {
    ONE_TIME("ONE_TIME"),
    STAGED("STAGED"),
    ;

    companion object {
        /** A missing or unknown value is "Thu cọc 1 lần", as for every shop before #1199 */
        fun from(raw: String?): DepositMode = if (raw?.trim().equals("STAGED", ignoreCase = true)) STAGED else ONE_TIME
    }
}

/** When a stage falls due: the day of the order, N days before the pickup day, or N days after the order day */
data class DepositDueRule(val kind: String, val days: Int? = null) {
    fun toJson(): JSONObject = JSONObject().put("kind", kind).apply { if (days != null) put("days", days) }

    companion object {
        const val ON_CREATE = "ON_CREATE"
        const val BEFORE_PICKUP = "BEFORE_PICKUP"
        const val AFTER_CREATE = "AFTER_CREATE"

        val onCreate = DepositDueRule(ON_CREATE)
        fun beforePickup(days: Int) = DepositDueRule(BEFORE_PICKUP, days)
        fun afterCreate(days: Int) = DepositDueRule(AFTER_CREATE, days)

        fun fromJson(o: JSONObject?): DepositDueRule {
            val kind = o?.optString("kind")?.takeIf { it.isNotBlank() } ?: ON_CREATE
            val days = if (o != null && o.has("days") && !o.isNull("days")) o.optInt("days") else null
            return DepositDueRule(kind, days)
        }
    }
}

/** One stage of a template: a percentage of the order total and its due rule (the last stage "rest" is automatic) */
data class DepositStageTemplate(
    val label: String,
    val value: Double,
    val dueRule: DepositDueRule,
    val type: String = "PERCENT",
) {
    fun toJson(): JSONObject = JSONObject()
        .put("label", label).put("type", "PERCENT").put("value", value).put("dueRule", dueRule.toJson())

    companion object {
        fun fromJson(o: JSONObject): DepositStageTemplate = DepositStageTemplate(
            label = o.optString("label"),
            value = o.optDouble("value", 0.0).takeIf { !it.isNaN() } ?: 0.0,
            dueRule = DepositDueRule.fromJson(o.optJSONObject("dueRule")),
            type = o.optString("type").ifBlank { "PERCENT" },
        )
    }
}

data class DepositTemplate(
    val id: String,
    val name: String,
    val isDefault: Boolean = false,
    val items: List<DepositStageTemplate>,
) {
    fun toJson(): JSONObject = JSONObject().put("id", id).put("name", name)
        .put("items", JSONArray(items.map { it.toJson() }))
        .apply { if (isDefault) put("isDefault", true) }

    companion object {
        fun fromJson(o: JSONObject): DepositTemplate = DepositTemplate(
            id = o.optString("id"),
            name = o.optString("name"),
            isDefault = o.optBoolean("isDefault", false),
            items = o.optJSONArray("items").objects().map(DepositStageTemplate::fromJson),
        )
    }
}

/** GET / PUT /api/settings/deposit */
data class DepositSettings(
    val depositMode: DepositMode = DepositMode.ONE_TIME,
    val cancellationPolicy: String = "",
    val templates: List<DepositTemplate> = emptyList(),
    /** The built-in template of the API, used while a STAGED shop has none of its own */
    val defaultTemplate: DepositTemplate? = null,
) {
    /** The template a new order starts from: the shop default, else its first, else the API's built-in one */
    val startTemplate: DepositTemplate? get() = templates.firstOrNull { it.isDefault } ?: templates.firstOrNull() ?: defaultTemplate

    /** The choices of "Thu cọc theo giai đoạn" in the cart: the shop's templates, or the built-in one while it has none */
    val choices: List<DepositTemplate> get() = templates.ifEmpty { listOfNotNull(defaultTemplate) }

    companion object {
        fun fromJson(json: JSONObject): DepositSettings {
            val o = json.optJSONObject("data") ?: json
            return DepositSettings(
                depositMode = DepositMode.from(o.optString("depositMode").takeIf { o.has("depositMode") && !o.isNull("depositMode") }),
                cancellationPolicy = o.optString("cancellationPolicy").takeIf { o.has("cancellationPolicy") && !o.isNull("cancellationPolicy") }.orEmpty(),
                templates = o.optJSONArray("templates").objects().map(DepositTemplate::fromJson),
                defaultTemplate = o.optJSONObject("defaultTemplate")?.let(DepositTemplate::fromJson),
            )
        }

        /** Body of PUT /api/settings/deposit: only the keys given are sent */
        fun saveBody(mode: DepositMode? = null, cancellationPolicy: String? = null, templates: List<DepositTemplate>? = null): JSONObject =
            JSONObject().apply {
                if (mode != null) put("depositMode", mode.raw)
                if (cancellationPolicy != null) put("cancellationPolicy", cancellationPolicy)
                if (templates != null) put("templates", JSONArray(templates.map { it.toJson() }))
            }
    }
}

private fun JSONArray?.objects(): List<JSONObject> =
    if (this == null) emptyList() else (0 until length()).mapNotNull { optJSONObject(it) }

private fun JSONObject.double(key: String): Double? =
    if (!has(key) || isNull(key)) null else (opt(key) as? Number)?.toDouble()

private fun JSONObject.text(key: String): String? =
    if (!has(key) || isNull(key)) null else optString(key).takeIf { it.isNotEmpty() }

/** `installments[]` of an order response (only for a client that sends `installments`) */
data class OrderInstallment(
    val key: String,
    val label: String,
    val percent: Double,
    val amount: Double,
    val plannedAmount: Double = amount,
    val remaining: Double = amount,
    val dueDateKey: String? = null,
    /** PAID, PARTIAL, DUE_TODAY, OVERDUE, UPCOMING or VOID */
    val status: String = "UPCOMING",
    val collectedAt: String? = null,
    val paidAmount: Double = 0.0,
) {
    val isRest: Boolean get() = key == REST
    val isPaid: Boolean get() = status == "PAID" || status == "PARTIAL" || paidAmount > 0

    companion object {
        const val REST = "rest"

        fun fromJson(o: JSONObject): OrderInstallment? {
            val key = o.text("key") ?: return null
            val amount = o.double("amount") ?: 0.0
            val paid = o.double("paidAmount") ?: 0.0
            return OrderInstallment(
                key = key,
                label = o.text("label") ?: key,
                percent = o.double("percent") ?: 0.0,
                amount = amount,
                plannedAmount = o.double("plannedAmount") ?: amount,
                remaining = o.double("remaining") ?: if (paid > 0) 0.0 else amount,
                dueDateKey = o.text("dueDateKey"),
                status = o.text("status") ?: "UPCOMING",
                collectedAt = o.text("collectedAt"),
                paidAmount = paid,
            )
        }

        fun listFrom(array: JSONArray?): List<OrderInstallment>? =
            if (array == null) null else array.objects().mapNotNull(::fromJson)
    }
}

/** `installmentSummary` of an order response */
data class InstallmentSummary(
    val planned: Double,
    val collected: Double,
    val remaining: Double,
    /** Share of the order total already collected, 2 decimals */
    val percentCollected: Double,
) {
    companion object {
        fun fromJson(o: JSONObject?): InstallmentSummary? = o?.let {
            InstallmentSummary(
                planned = it.double("planned") ?: 0.0,
                collected = it.double("collected") ?: 0.0,
                remaining = it.double("remaining") ?: 0.0,
                percentCollected = it.double("percentCollected") ?: 0.0,
            )
        }
    }
}

/** The deposit part of an order: what the API sent, all of it optional (iOS `OrderDetail` fields) */
data class DepositPlanInfo(
    val installments: List<OrderInstallment>? = null,
    val summary: InstallmentSummary? = null,
    val policy: String? = null,
    val hasPlan: Boolean? = null,
    /** What the shop kept when it cancelled (null = refunded everything / not cancelled) */
    val cancelKeptAmount: Double? = null,
) {
    companion object {
        fun fromJson(o: JSONObject): DepositPlanInfo = DepositPlanInfo(
            installments = OrderInstallment.listFrom(o.optJSONArray("installments")),
            summary = InstallmentSummary.fromJson(o.optJSONObject("installmentSummary")),
            policy = o.text("depositPlanPolicy"),
            hasPlan = if (o.has("hasDepositPlan") && !o.isNull("hasDepositPlan")) o.optBoolean("hasDepositPlan") else null,
            cancelKeptAmount = o.double("cancelKeptAmount"),
        )
    }
}

/** One stage to collect, from `installmentsDue*` of outlet-operations */
data class InstallmentReminderRow(
    val orderId: Int,
    val orderNumber: String,
    val customerName: String?,
    val key: String,
    val label: String,
    val amount: Double,
    val remaining: Double,
    val dueDateKey: String?,
    val lateDays: Int,
) {
    companion object {
        fun fromJson(o: JSONObject): InstallmentReminderRow? {
            if (!o.has("orderId") || o.isNull("orderId")) return null
            val amount = o.double("amount") ?: 0.0
            return InstallmentReminderRow(
                orderId = o.optInt("orderId"),
                orderNumber = o.text("orderNumber").orEmpty(),
                customerName = o.text("customerName"),
                key = o.text("key").orEmpty(),
                label = o.text("label").orEmpty(),
                amount = amount,
                remaining = o.double("remaining") ?: amount,
                dueDateKey = o.text("dueDateKey"),
                lateDays = o.double("lateDays")?.toInt() ?: 0,
            )
        }

        fun listFrom(group: JSONObject?): List<InstallmentReminderRow> =
            group?.optJSONArray("orders").objects().mapNotNull(::fromJson)
    }
}

/** "Cần thu hôm nay" (due today and late) and "Sắp đến hạn" (tomorrow) */
data class InstallmentReminders(val due: List<InstallmentReminderRow>, val tomorrow: List<InstallmentReminderRow>) {
    val isEmpty: Boolean get() = due.isEmpty() && tomorrow.isEmpty()

    companion object {
        /** null when the API sends none of the three groups (an older API, or a shop without stages) */
        fun fromJson(data: JSONObject): InstallmentReminders? {
            val keys = listOf("installmentsDue", "installmentsOverdue", "installmentsDueTomorrow")
            if (keys.none { data.has(it) && !data.isNull(it) }) return null
            return InstallmentReminders(
                due = InstallmentReminderRow.listFrom(data.optJSONObject("installmentsDue")) +
                    InstallmentReminderRow.listFrom(data.optJSONObject("installmentsOverdue")),
                tomorrow = InstallmentReminderRow.listFrom(data.optJSONObject("installmentsDueTomorrow")),
            )
        }
    }
}

/** The overview's own figures for deposit stages: unpaid stages by due day (`futureInstallments`). Never part of `futureIncome`. */
data class FutureInstallmentGroup(val dueDateKey: String, val amount: Double, val count: Int) {
    companion object {
        fun listFrom(array: JSONArray?): List<FutureInstallmentGroup>? =
            if (array == null) null else array.objects().map {
                FutureInstallmentGroup(it.text("dueDateKey").orEmpty(), it.double("amount") ?: 0.0, it.double("count")?.toInt() ?: 0)
            }
    }
}

/** Money and roles of an order that has stages. The server checks every one of these again. */
object DepositPlanLogic {
    /** An order shows the stage card only when the API sent a plan (`hasDepositPlan`) and stages */
    fun hasPlan(info: DepositPlanInfo?): Boolean = info?.hasPlan == true && !info.installments.isNullOrEmpty()

    /** MERCHANT and OUTLET_ADMIN edit the plan; the API also answers 403 to staff */
    fun canEditPlan(role: String?): Boolean = role == "MERCHANT" || role == "OUTLET_ADMIN"

    /** Only the shop owner voids a stage collected by mistake */
    fun canVoid(role: String?): Boolean = role == "MERCHANT"

    /** Shop owner and outlet admin may keep part of the money when cancelling; staff refund everything */
    fun canKeepOnCancel(role: String?): Boolean = role == "MERCHANT" || role == "OUTLET_ADMIN"

    /** Only the shop owner changes "Cách thu cọc" (the API answers 403 to every other role) */
    fun canEditSettings(role: String?): Boolean = role == "MERCHANT"

    /** Staff take cash or bank transfer only */
    fun collectMethods(staffLike: Boolean): List<String> = if (staffLike) listOf("CASH", "TRANSFER") else listOf("CASH", "TRANSFER", "CHECK")

    /** A stage can be collected while the order is reserved and the stage is not collected yet */
    fun canCollect(stage: OrderInstallment, status: String): Boolean =
        status.equals("RESERVED", true) && !stage.isPaid && stage.status != "VOID" && stage.amount > 0

    /** The first explicit stage that can still be collected (the "Thu giai đoạn N" button) */
    fun nextToCollect(stages: List<OrderInstallment>, status: String): OrderInstallment? =
        stages.firstOrNull { !it.isRest && canCollect(it, status) }

    /** Explicit stages nobody collected: the API blocks the hand-over until they are (INSTALLMENT_UNPAID_AT_PICKUP) */
    fun unpaidBeforePickup(stages: List<OrderInstallment>): List<OrderInstallment> =
        stages.filter { !it.isRest && it.amount > 0 && it.paidAmount <= 0 && it.status != "VOID" }

    /** "Thu giai đoạn 2" for `i2`: the 1-based place of the stage */
    fun stageNumber(stages: List<OrderInstallment>, key: String): Int? =
        stages.indexOfFirst { it.key == key }.takeIf { it >= 0 }?.plus(1)

    /**
     * #1222: the list badge only for a rental waiting for pick-up whose order has a deposit plan (`hasDepositPlan` and
     * `installmentSummary.percentCollected`, which the list API sends to a build that declares `installments`).
     * A one-time deposit order has no badge, whatever mode the shop is in now. Same rule as iOS
     * `DepositPlanLogic.listBadgePercent`.
     */
    fun listBadgePercent(orderType: String, status: String, hasPlan: Boolean?, apiPercent: Double?): Double? {
        if (hasPlan != true || !orderType.equals("RENT", true) || !status.equals("RESERVED", true)) return null
        if (apiPercent == null || !(apiPercent > 0)) return null
        return min(100.0, kotlin.math.floor(apiPercent + 0.5))
    }

    /** The list badge value "30" for "Đã thu 30%": null without a plan */
    fun badgePercent(percentCollected: Double?): String? = percentCollected?.let { DepositPlanMath.percentText(it) }

    /**
     * The kept amount of the cancel sheet: [collected] is what the customer paid; the default keeps nothing
     * ("Khách đã trả / Tiệm giữ lại / Hoàn cho khách"). The owner edits either number; the other follows.
     */
    data class CancelAmounts(val collected: Double, val kept: Double) {
        val refund: Double get() = max(0.0, collected - kept)
        val isValid: Boolean get() = kept >= 0 && kept <= collected

        companion object {
            fun keeping(kept: Double, collected: Double) = CancelAmounts(collected, min(max(0.0, kept), collected))
            fun refunding(refund: Double, collected: Double) = keeping(collected - min(max(0.0, refund), collected), collected)
        }
    }

    /** Extra keys of PUT /api/orders/{id} that cancels: `cancelKeptAmount` only when the shop keeps some money */
    fun cancelBody(kept: Double, note: String?): JSONObject = JSONObject().put("status", "CANCELLED").apply {
        if (kept > 0) put("cancelKeptAmount", kept)
        note?.trim()?.takeIf { it.isNotEmpty() }?.let { put("cancelNote", it) }
    }
}

/** One stage of the cart while the order is not created: the template item, edited for this order */
data class DepositStageDraft(
    val label: String,
    val percent: Double,
    val dueRule: DepositDueRule,
    /** `YYYY-MM-DD`; wins over the rule (the owner picked a day) */
    val dueDateKey: String? = null,
    /** A fixed amount that replaces the percentage (owner edit) */
    val amountOverride: Double? = null,
) {
    companion object {
        fun from(item: DepositStageTemplate) = DepositStageDraft(item.label, item.value, item.dueRule)
    }
}

/** A stage with its amount and day, for the cart list */
data class DepositStagePreview(
    val key: String,
    val label: String,
    val percent: Double,
    val amount: Double,
    val dueDateKey: String,
    val isRest: Boolean,
)

object DepositPlanMath {
    /** Digits after the point of the currency's smallest unit: VND 0, USD 2 */
    fun minorDigits(currency: ShopCurrency): Int = if (currency == ShopCurrency.USD) 2 else 0

    private fun roundHalfAway(x: Double): Double = if (x < 0) -floor(-x + 0.5) else floor(x + 0.5)

    /** Round to the smallest unit of the currency (VND 1, USD 0.01), as `roundMoney` of the API */
    fun roundMoney(amount: Double, currency: ShopCurrency): Double {
        val factor = 10.0.pow(minorDigits(currency))
        return roundHalfAway((amount + Math.ulp(1.0)) * factor) / factor
    }

    /** `percent` of `total` in the smallest unit (12.000.000 × 30% = 3.600.000) */
    fun percentOf(total: Double, percent: Double, currency: ShopCurrency): Double {
        val factor = 10.0.pow(minorDigits(currency))
        val totalMinor = roundHalfAway(total * factor)
        return roundHalfAway(totalMinor * percent / 100) / factor
    }

    /** `30` for 30, `33.33` for 33.33 */
    fun percentText(value: Double): String {
        val rounded = roundHalfAway(value * 100) / 100
        if (rounded == roundHalfAway(rounded)) return rounded.toLong().toString()
        return java.math.BigDecimal(rounded.toString()).stripTrailingZeros().toPlainString()
    }

    /** `YYYY-MM-DD` plus [days] (negative goes back), civil days with no time zone */
    fun addDays(key: String, days: Int): String =
        runCatching { LocalDate.parse(key).plusDays(days.toLong()).toString() }.getOrDefault(key)

    /** The day a stage falls due; [createdKey] / [pickupKey] are civil days of the shop */
    fun dueKey(draft: DepositStageDraft, createdKey: String, pickupKey: String): String {
        draft.dueDateKey?.takeIf { it.length == 10 }?.let { return it }
        return when (draft.dueRule.kind) {
            DepositDueRule.BEFORE_PICKUP -> addDays(pickupKey, -(draft.dueRule.days ?: 0))
            DepositDueRule.AFTER_CREATE -> addDays(createdKey, draft.dueRule.days ?: 0)
            else -> createdKey
        }
    }

    /**
     * Stages with amounts: each explicit stage is its percentage of the total (or its fixed amount); the last stage
     * "rest" is always total − the others, so the stages add up to the total. Golden: 12.000.000 with 30% / 40% →
     * 3.600.000 / 4.800.000 / 3.600.000.
     */
    fun stages(
        drafts: List<DepositStageDraft>,
        total: Double,
        createdKey: String,
        pickupKey: String,
        currency: ShopCurrency,
        restLabel: String,
    ): List<DepositStagePreview> {
        val result = mutableListOf<DepositStagePreview>()
        var explicit = 0.0
        drafts.forEachIndexed { index, draft ->
            val amount = draft.amountOverride?.let { roundMoney(it, currency) } ?: percentOf(total, draft.percent, currency)
            explicit += amount
            result += DepositStagePreview(
                key = "i${index + 1}", label = draft.label,
                // #1245: the template's own % until the owner edits the amount; then the % of the order, 1 decimal
                percent = if (draft.amountOverride == null || total <= 0) draft.percent else roundHalfAway(amount / total * 1000) / 10,
                amount = amount, dueDateKey = dueKey(draft, createdKey, pickupKey), isRest = false,
            )
        }
        val rest = max(0.0, roundMoney(total - explicit, currency))
        result += DepositStagePreview(
            key = OrderInstallment.REST, label = restLabel,
            percent = if (total > 0) roundHalfAway(rest / total * 10000) / 100 else 0.0,
            amount = rest, dueDateKey = pickupKey, isRest = true,
        )
        return result
    }

    /** The explicit stages add up to more than the order total: the API answers 400 INSTALLMENT_EXCEEDS_TOTAL */
    fun exceedsTotal(stages: List<DepositStagePreview>, total: Double): Boolean =
        stages.filter { !it.isRest }.sumOf { it.amount } > total + 0.000001

    /** `10/11` for `2026-11-10` */
    fun dayText(key: String?): String {
        if (key == null || key.length != 10) return ""
        val parts = key.split("-")
        return if (parts.size == 3) "${parts[2]}/${parts[1]}" else key
    }

    /** Whole days between a due day and today (both `YYYY-MM-DD`); 0 when not late or unreadable */
    fun lateDays(dueKey: String?, todayKey: String): Int {
        if (dueKey == null || dueKey.length != 10) return 0
        return runCatching { max(0L, java.time.temporal.ChronoUnit.DAYS.between(LocalDate.parse(dueKey), LocalDate.parse(todayKey))).toInt() }
            .getOrDefault(0)
    }
}

/** `paymentPlan` of POST /api/orders: the stages of the order and, optionally, "Thu giai đoạn 1 ngay" */
object PaymentPlanRequest {
    fun item(draft: DepositStageDraft): JSONObject = JSONObject()
        .put("label", draft.label).put("type", "PERCENT").put("value", draft.percent).apply {
            if (draft.dueDateKey == null) put("dueRule", draft.dueRule.toJson()) else put("dueDateKey", draft.dueDateKey)
            draft.amountOverride?.let { put("amountOverride", it) }
        }

    /**
     * Staff send no stages (`templateId` / `items` left out): the API takes the shop's default template for them.
     * [collectFirst] is `method` and `reference` of "Thu ngay giai đoạn 1", or null.
     */
    fun body(drafts: List<DepositStageDraft>, templateId: String?, canEditStages: Boolean, collectFirst: Pair<String, String>?): JSONObject =
        JSONObject().apply {
            if (canEditStages) {
                templateId?.let { put("templateId", it) }
                put("items", JSONArray(drafts.map(::item)))
            }
            collectFirst?.let { (method, reference) -> put("collectFirstNow", JSONObject().put("method", method).put("reference", reference)) }
        }
}

/** Body of POST /api/orders/{id}/installments/{key}/collect */
object CollectInstallmentRequest {
    fun body(amount: Double, method: String, reference: String, collectedOn: String? = null, note: String? = null): JSONObject =
        JSONObject().put("amount", amount).put("method", method).put("reference", reference).apply {
            collectedOn?.let { put("collectedOn", it) }
            note?.takeIf { it.isNotBlank() }?.let { put("note", it) }
        }
}
