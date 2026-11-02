package com.anyrent.pos.domain.settings

import org.json.JSONArray
import org.json.JSONObject
import java.text.NumberFormat
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Currency
import java.util.Locale
import kotlin.math.roundToLong

/**
 * #1459 Gói dịch vụ: renew / upgrade in the app (Google Play through RevenueCat). Pure rules shared with iOS
 * `PlanRenewalLogic` (`.agent/changes/1459-plan-renewal/mobile.md`). The server decides what may be bought
 * (`canRenew`, `canUpgrade`, `purchasablePlanIds` of GET /api/subscriptions/status); the app only follows it.
 */

/** GET /api/subscriptions/status as the plan screens read it. New fields are optional: an older API answers nothing to buy. */
data class PlanRenewalStatus(
    val planId: Int?,
    val planName: String,
    val isExpired: Boolean,
    val isTrial: Boolean,
    val daysRemaining: Int?,
    val currentPeriodEnd: Instant?,
    val billingAmount: Double?,
    val billingCurrency: String?,
    val billingChannel: String,
    val autoRenew: Boolean,
    val billingIssue: Boolean,
    val storeProductId: String?,
    val planTier: String?,
    val canRenew: Boolean,
    val canUpgrade: Boolean,
    val purchasablePlanIds: List<Int>,
    val renewWindowDays: Int,
    val users: Int?,
    val outlets: Int?,
    val products: Int?,
    val hasWeb: Boolean,
)

data class PlanStoreProducts(val semiAnnual: String, val annual: String)

/** A plan of GET /api/plans sold in the apps (it has `storeProductIds`) */
data class InAppPlan(
    val id: Int,
    val name: String,
    val isPopular: Boolean,
    val sortOrder: Int,
    val storeProducts: PlanStoreProducts,
    val users: Int?,
    val outlets: Int?,
    val products: Int?,
    val hasWeb: Boolean,
)

enum class PlanPurchaseKind { RENEW, UPGRADE, BUY }

enum class PlanScreenMode { PURCHASE, AUTO_RENEWING, NOTHING_TO_BUY, STORE_UNAVAILABLE, EXPIRED_OWNER, EXPIRED_STAFF }

sealed interface PlanStatusLine {
    /** "Hết hạn 15/11/2026 · còn 13 ngày" */
    data class DaysLeft(val date: String, val days: Int) : PlanStatusLine
    /** "Hết hạn 15/11/2026 · ngày cuối" */
    data class LastDay(val date: String) : PlanStatusLine
    /** "Dùng đến 02/11/2027" (after a confirmed renewal) */
    data class ValidUntil(val date: String) : PlanStatusLine
}

data class MonthlyPrice(val amount: Double, val approx: Boolean)

object PlanRenewal {
    val ZONE: ZoneId = ZoneId.of("Asia/Ho_Chi_Minh")
    private val DAY: DateTimeFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy")

    /** Renew window when an older API does not say (`renewWindowDays`) */
    const val DEFAULT_WINDOW_DAYS = 7

    const val BASIC_ANNUAL = "anyrent_merchant_annual"
    const val PROFESSIONAL_ANNUAL = "anyrent_professional_annual"

    /** "Dùng thử" for a trial, else the plan's own name ("Basic", "Professional") */
    fun displayPlanName(name: String?, isTrial: Boolean, trialLabel: String): String {
        if (isTrial) return trialLabel
        return name?.trim()?.takeIf { it.isNotEmpty() } ?: "—"
    }

    /** dd/MM/yyyy of the Vietnam day of an instant */
    fun vnDate(instant: Instant): String = DAY.format(instant.atZone(ZONE))

    fun statusLine(daysRemaining: Int?, end: Instant): PlanStatusLine {
        val date = vnDate(end)
        return if (daysRemaining == null || daysRemaining > 0) PlanStatusLine.DaysLeft(date, daysRemaining ?: 0) else PlanStatusLine.LastDay(date)
    }

    /** Store price per month: exact when it divides, else rounded (1.000 ₫, or 0.01 in other currencies) and marked "≈" */
    fun monthly(total: Double, months: Int, currency: String?): MonthlyPrice {
        if (months <= 0) return MonthlyPrice(total, false)
        val vnd = isVnd(currency)
        return if (vnd) {
            val whole = total.roundToLong()
            if (whole % months == 0L) MonthlyPrice((whole / months).toDouble(), false)
            else MonthlyPrice(((whole.toDouble() / months) / 1000.0).roundToLong() * 1000.0, true)
        } else {
            val cents = (total * 100).roundToLong()
            if (cents % months == 0L) MonthlyPrice(cents / months / 100.0, false)
            else MonthlyPrice(((cents.toDouble() / months)).roundToLong() / 100.0, true)
        }
    }

    fun isVnd(currency: String?): Boolean = currency.isNullOrBlank() || currency.equals("VND", ignoreCase = true)

    /** "1.799.000 ₫" for VND; the currency's own format otherwise ("$4.99") */
    fun formatAmount(amount: Double, currency: String?): String {
        if (isVnd(currency)) return groupNumber(amount.roundToLong(), "vi") + " ₫"
        return runCatching {
            NumberFormat.getCurrencyInstance(Locale.US).apply { this.currency = Currency.getInstance(currency!!.uppercase()) }.format(amount)
        }.getOrElse { String.format(Locale.US, "%.2f %s", amount, currency) }
    }

    /** 2000 → "2.000" (vi) / "2,000" (en) */
    fun groupNumber(value: Long, language: String): String =
        NumberFormat.getIntegerInstance(if (language.startsWith("vi")) Locale.forLanguageTag("vi-VN") else Locale.US).format(value)

    fun groupNumber(value: Int, language: String): String = groupNumber(value.toLong(), language)

    /** "ít hơn 10% so với 2 kỳ 6 tháng": the 12-month price against two 6-month periods; none when not cheaper */
    fun savingsPercent(semiAnnual: Double, annual: Double): Int? {
        if (semiAnnual <= 0.0) return null
        val two = semiAnnual * 2
        if (two <= annual) return null
        return Math.round((two - annual) / two * 100.0).toInt().takeIf { it > 0 }
    }

    /** Google Play may answer `id:basePlan`; the part before ":" is the product */
    fun baseProductId(id: String?): String? = id?.substringBefore(':')?.trim()?.takeIf { it.isNotEmpty() }

    /** basic 1, professional 2, other 0 — from the plan's store products */
    fun tierRank(products: PlanStoreProducts?): Int = when (baseProductId(products?.annual)) {
        PROFESSIONAL_ANNUAL -> 2
        BASIC_ANNUAL -> 1
        else -> 0
    }

    /** From the status `planTier` ("basic", "professional") */
    fun tierRank(tier: String?): Int = when (tier?.lowercase()) {
        "professional" -> 2
        "basic" -> 1
        else -> 0
    }

    fun purchaseKind(selectedPlanId: Int, currentPlanId: Int?, selectedRank: Int, currentRank: Int, isTrial: Boolean): PlanPurchaseKind = when {
        selectedPlanId == currentPlanId && !isTrial -> PlanPurchaseKind.RENEW
        selectedRank > currentRank -> PlanPurchaseKind.UPGRADE
        else -> PlanPurchaseKind.BUY
    }

    /** renew "Gia hạn 12 tháng · 1.799.000 ₫", upgrade "Nâng lên Professional · 12 tháng · …", buy "Mua gói Basic · …" */
    fun buttonTitle(
        kind: PlanPurchaseKind,
        planName: String,
        period: String,
        amount: String,
        renewTemplate: String,
        upgradeTemplate: String,
        buyTemplate: String,
    ): String = when (kind) {
        PlanPurchaseKind.RENEW -> String.format(renewTemplate, period, amount)
        PlanPurchaseKind.UPGRADE -> String.format(upgradeTemplate, planName, period, amount)
        PlanPurchaseKind.BUY -> String.format(buyTemplate, planName, period, amount)
    }

    /** End of a period bought now: today's Vietnam day + months, the day clamped to the month (31/01 + 1 → 28/02) */
    fun newPeriodEnd(now: Instant, months: Int): String = DAY.format(now.atZone(ZONE).toLocalDate().plusMonths(months.toLong()))

    /** Days for the Home line "Gói còn N ngày" (owner, renew offered, 0..window days left); null hides it */
    fun homeLineDays(role: String?, status: PlanRenewalStatus?): Int? {
        if (role != "MERCHANT" || status == null || status.isExpired || !status.canRenew) return null
        val days = status.daysRemaining ?: return null
        return days.takeIf { it in 0..status.renewWindowDays }
    }

    fun isPeriodOver(currentPeriodEnd: String?, now: Instant): Boolean {
        val end = parseInstant(currentPeriodEnd) ?: return false
        return end.isBefore(now)
    }

    /** The server has the payment: still active and a later end, or another plan */
    fun confirmed(before: PlanRenewalStatus?, after: PlanRenewalStatus): Boolean {
        if (after.isExpired) return false
        if (before == null) return true
        val laterEnd = before.currentPeriodEnd == null ||
            (after.currentPeriodEnd != null && after.currentPeriodEnd.isAfter(before.currentPeriodEnd))
        return laterEnd || (after.planId != null && after.planId != before.planId) || before.isExpired
    }

    /**
     * 403 codes of a shop whose period ended: SUBSCRIPTION_EXPIRED (what `authenticateRequest` answers today),
     * SUBSCRIPTION_PERIOD_ENDED (the later subscription check), SUBSCRIPTION_CANCELLED (a cancelled period that ended).
     * Not SUBSCRIPTION_PAUSED: that one is the admin's ("contact support").
     */
    val PERIOD_ENDED_CODES = setOf("SUBSCRIPTION_EXPIRED", "SUBSCRIPTION_PERIOD_ENDED", "SUBSCRIPTION_CANCELLED")

    /** An authorised request answered 403 with a period-ended code: the expired screen opens (iOS `SubscriptionGate.opensGate`) */
    fun opensGate(statusCode: Int?, code: String?, sentAuthorization: Boolean): Boolean =
        statusCode == 403 && sentAuthorization && code in PERIOD_ENDED_CODES

    fun screenMode(role: String?, status: PlanRenewalStatus, storeAvailable: Boolean): PlanScreenMode = when {
        status.isExpired -> if (role == "MERCHANT") PlanScreenMode.EXPIRED_OWNER else PlanScreenMode.EXPIRED_STAFF
        role != "MERCHANT" -> PlanScreenMode.NOTHING_TO_BUY
        status.autoRenew -> PlanScreenMode.AUTO_RENEWING
        status.purchasablePlanIds.isNotEmpty() -> if (storeAvailable) PlanScreenMode.PURCHASE else PlanScreenMode.STORE_UNAVAILABLE
        else -> PlanScreenMode.NOTHING_TO_BUY
    }

    fun parseInstant(iso: String?): Instant? = iso?.takeIf { it.isNotBlank() && it != "null" }?.let { runCatching { Instant.parse(it) }.getOrNull() }

    // ─── Parsing ────────────────────────────────────────────────────────────

    /** `data` of GET /api/subscriptions/status */
    fun statusFromJson(data: JSONObject): PlanRenewalStatus {
        val limits = data.optJSONObject("limits")
        val features = data.optJSONArray("features")
        return PlanRenewalStatus(
            planId = data.optInt("planId").takeIf { data.has("planId") && !data.isNull("planId") && it > 0 },
            planName = (if (data.isNull("planName")) "" else data.optString("planName")).trim(),
            isExpired = data.optString("status").equals("EXPIRED", ignoreCase = true),
            isTrial = data.optString("dbStatus").equals("TRIAL", ignoreCase = true),
            daysRemaining = if (data.has("daysRemaining") && !data.isNull("daysRemaining")) data.optInt("daysRemaining") else null,
            currentPeriodEnd = parseInstant(if (data.isNull("currentPeriodEnd")) null else data.optString("currentPeriodEnd")),
            billingAmount = data.optDouble("billingAmount").takeIf { data.has("billingAmount") && !data.isNull("billingAmount") && !it.isNaN() },
            billingCurrency = data.optString("billingCurrency").takeIf { it.isNotBlank() && it != "null" },
            billingChannel = data.optString("billingChannel").takeIf { it.isNotBlank() && it != "null" } ?: "MANUAL",
            autoRenew = data.optBoolean("autoRenew", false),
            billingIssue = data.optBoolean("billingIssue", false),
            storeProductId = baseProductId(if (data.isNull("storeProductId")) null else data.optString("storeProductId")),
            planTier = data.optString("planTier").takeIf { it.isNotBlank() && it != "null" },
            canRenew = data.optBoolean("canRenew", false),
            canUpgrade = data.optBoolean("canUpgrade", false),
            purchasablePlanIds = intList(data.optJSONArray("purchasablePlanIds")),
            renewWindowDays = data.optInt("renewWindowDays", DEFAULT_WINDOW_DAYS).takeIf { it > 0 } ?: DEFAULT_WINDOW_DAYS,
            users = limitOf(limits, "users"),
            outlets = limitOf(limits, "outlets"),
            products = limitOf(limits, "products"),
            hasWeb = hasWebDashboard(features),
        )
    }

    /** GET /api/plans: plans with store products, by `sortOrder` */
    fun inAppPlansFromJson(json: JSONObject): List<InAppPlan> {
        val array = json.optJSONObject("data")?.optJSONArray("plans") ?: json.optJSONArray("plans") ?: JSONArray()
        return (0 until array.length()).mapNotNull { i ->
            val o = array.optJSONObject(i) ?: return@mapNotNull null
            val ids = o.optJSONObject("storeProductIds") ?: return@mapNotNull null
            val semi = ids.optString("semiAnnual").takeIf { it.isNotBlank() } ?: return@mapNotNull null
            val annual = ids.optString("annual").takeIf { it.isNotBlank() } ?: return@mapNotNull null
            val limits = jsonObjectOf(o, "limits")
            InAppPlan(
                id = o.optInt("id"),
                name = o.optString("name").trim(),
                isPopular = o.optBoolean("isPopular", false),
                sortOrder = o.optInt("sortOrder", 0),
                storeProducts = PlanStoreProducts(semi, annual),
                users = limitOf(limits, "users"),
                outlets = limitOf(limits, "outlets"),
                products = limitOf(limits, "products"),
                hasWeb = hasWebDashboard(jsonArrayOf(o, "features")),
            )
        }.sortedWith(compareBy({ it.sortOrder }, { it.id }))
    }

    private fun intList(array: JSONArray?): List<Int> =
        if (array == null) emptyList() else (0 until array.length()).mapNotNull { array.optInt(it, -1).takeIf { v -> v > 0 } }

    /** `limits` / `features` are JSON strings on GET /api/plans, objects on the status answer */
    private fun jsonObjectOf(o: JSONObject, key: String): JSONObject? =
        o.optJSONObject(key) ?: o.optString(key).takeIf { it.startsWith("{") }?.let { runCatching { JSONObject(it) }.getOrNull() }

    private fun jsonArrayOf(o: JSONObject, key: String): JSONArray? =
        o.optJSONArray(key) ?: o.optString(key).takeIf { it.startsWith("[") }?.let { runCatching { JSONArray(it) }.getOrNull() }

    private fun limitOf(limits: JSONObject?, key: String): Int? =
        limits?.takeIf { it.has(key) && !it.isNull(key) }?.optInt(key)

    /** #1171 rule of the web pricing page: web only when the features say so ("Web dashboard access", "All Professional features") */
    fun hasWebDashboard(features: JSONArray?): Boolean {
        if (features == null) return false
        return (0 until features.length()).any { i ->
            val n = features.optString(i).lowercase().replace(Regex("[^a-z0-9]"), "")
            n.contains("webdashboard") || n.contains("allprofessional")
        }
    }
}
