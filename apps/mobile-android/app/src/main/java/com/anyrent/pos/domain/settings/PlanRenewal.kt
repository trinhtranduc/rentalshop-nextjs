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
    /**
     * Stored PAST_DUE while the period runs: the API answers 403 SUBSCRIPTION_PAST_DUE everywhere (Lemon / Stripe, or a
     * store row from before #1459; store billing issues no longer set it)
     */
    val isPastDue: Boolean = false,
    /**
     * A6: a store plan on this device's store with auto-renew off: buying the same product would fail as already owned on
     * Google Play, so the screen offers "Bật lại tự gia hạn" (the Play subscriptions page) instead. Missing (older API) = false.
     */
    val reenableAutoRenew: Boolean = false,
    /**
     * A13: the store's next charge (store expiration). Access runs to `currentPeriodEnd` = this + the days the shop had
     * left when the store plan started. Null while nothing auto-renews, or from an older API.
     */
    val storeRenewsAt: Instant? = null,
) {
    /** The rest of the API refuses this shop: the plan gate stays up (iOS `PlanStatus.isBlocked`) */
    val isBlocked: Boolean get() = isExpired || isPastDue
}

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

enum class PlanScreenMode {
    PURCHASE, AUTO_RENEWING, NOTHING_TO_BUY, STORE_UNAVAILABLE, EXPIRED_OWNER, EXPIRED_STAFF,
    /** PAST_DUE: the owner fixes the payment where the plan is billed (Quản lý / huỷ gói), nothing to buy here */
    PAYMENT_ISSUE_OWNER,
    /** A6: auto-renew is off on this store and nothing can be bought: only "Bật lại tự gia hạn" */
    REENABLE_ONLY,
}

/** #1464 the line of the slow state (iOS `PlanRenewalLogic.slowMessage`) */
enum class PlanSlowMessage {
    /** "Chưa nhận được xác nhận." */
    NOT_CONFIRMED,
    /** "Tài khoản Google Play này đang có gói. Kỳ mới bắt đầu từ lần gia hạn tới." */
    STORE_HAS_PLAN,
}

/** #1464 bottom links: "Quản lý / huỷ gói · Khôi phục" or "Khôi phục giao dịch" (iOS `PlanRenewalLogic.FooterLinks`) */
enum class PlanFooterLinks { MANAGE_AND_RESTORE, RESTORE_ONLY }

sealed interface PlanStatusLine {
    /** "Hết hạn 15/11/2026 · còn 13 ngày" */
    data class DaysLeft(val date: String, val days: Int) : PlanStatusLine
    /** "Hết hạn 15/11/2026 · ngày cuối" */
    data class LastDay(val date: String) : PlanStatusLine
    /** "Dùng đến 02/11/2027" (after a confirmed renewal) */
    data class ValidUntil(val date: String) : PlanStatusLine
}

data class MonthlyPrice(val amount: Double, val approx: Boolean)

/** A13 the words under the buy button (iOS `PlanRenewalLogic.disclosure`); dates are dd/MM/yyyy Vietnam days */
sealed interface PlanDisclosure {
    /** "Kỳ mới tính từ hôm nay, dùng đến <end>. Tự gia hạn mỗi … đến khi huỷ." (nothing left, or no credit) */
    data class StartsToday(val end: String) : PlanDisclosure
    /** "Hạn mới tính tiếp từ <from>, dùng đến <end>. Tự gia hạn mỗi …, lần trừ tiền tới ngày <charge>, đến khi huỷ." */
    data class Continues(val from: String, val end: String, val charge: String) : PlanDisclosure
    /** An upgrade in the store that bills the plan, with a credit: "Kỳ mới tính từ hôm nay, dùng đến <end>. …, lần trừ tiền tới ngày <charge>, …" */
    data class WithCredit(val end: String, val charge: String) : PlanDisclosure
}

object PlanRenewal {
    val ZONE: ZoneId = ZoneId.of("Asia/Ho_Chi_Minh")
    private val DAY: DateTimeFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy")

    /** Renew window when an older API does not say (`renewWindowDays`) */
    const val DEFAULT_WINDOW_DAYS = 7

    /** A12: after the store took the payment, the status is read every 2 s for about a minute (then the slow state) */
    const val CONFIRM_INTERVAL_MS = 2_000L
    const val CONFIRM_TIMEOUT_MS = 60_000L

    /** A3a: the production API host; any other API (dev-api, a local API) uses `dev_merchant_<id>` */
    private const val PRODUCTION_API_HOST = "api.anyrent.shop"

    /**
     * A3a: RevenueCat app user id. `merchant_<id>` only on the production API, else `dev_merchant_<id>`, so a sandbox
     * purchase from a dev build never reaches a production shop with the same number.
     */
    fun appUserId(merchantId: Int, apiBaseUrl: String): String {
        val host = runCatching { java.net.URI(apiBaseUrl.trim()).host }.getOrNull()?.lowercase()
        return if (host == PRODUCTION_API_HOST) "merchant_$merchantId" else "dev_merchant_$merchantId"
    }

    /** A1: purchases and restores run only while RevenueCat is logged in as this shop */
    fun storeAccountReady(current: String?, expected: String?): Boolean =
        !expected.isNullOrBlank() && current == expected

    const val BASIC_ANNUAL = "anyrent_merchant_annual"
    const val PROFESSIONAL_ANNUAL = "anyrent_professional_annual"

    /** "Dùng thử" for a trial, else the plan's own name ("Basic", "Professional") */
    fun displayPlanName(name: String?, isTrial: Boolean, trialLabel: String): String {
        if (isTrial) return trialLabel
        return name?.trim()?.takeIf { it.isNotEmpty() } ?: "—"
    }

    /** dd/MM/yyyy of the Vietnam day of an instant */
    fun vnDate(instant: Instant): String = DAY.format(instant.atZone(ZONE))

    /** As iOS `PlanRenewalLogic.statusLine`: "Dùng đến …" once renewed or while the store renews by itself */
    fun statusLine(daysRemaining: Int?, end: Instant, renewed: Boolean = false, autoRenew: Boolean = false): PlanStatusLine {
        val date = vnDate(end)
        if (renewed || autoRenew || daysRemaining == null) return PlanStatusLine.ValidUntil(date)
        return if (daysRemaining > 0) PlanStatusLine.DaysLeft(date, daysRemaining) else PlanStatusLine.LastDay(date)
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

    /** A13: the store charges again on today + months (Vietnam calendar, the day clamped), at this time of day */
    fun chargeInstant(now: Instant, months: Int): Instant = now.atZone(ZONE).plusMonths(months.toLong()).toInstant()

    /**
     * A13 "Gia hạn sớm không mất ngày": the days left continue after the new store period (server rule in
     * apps/api/lib/plan-renewal.ts `storeCreditForPurchase`).
     * - nothing left (expired, no end): starts today;
     * - days left and a new store subscription (trial, manual, the other store): continues from the old end, the store
     *   charges on today + months;
     * - an upgrade in the store that bills the plan (it prorates its own days): only the credit carries
     *   (`currentPeriodEnd − storeRenewsAt`); none known → starts today.
     */
    fun disclosure(now: Instant, months: Int, status: PlanRenewalStatus?, deviceStore: String = "PLAY_STORE"): PlanDisclosure {
        val charge = chargeInstant(now, months)
        val end = status?.currentPeriodEnd
        if (status == null || status.isExpired || end == null || !end.isAfter(now)) return PlanDisclosure.StartsToday(vnDate(charge))
        val sameStore = status.billingChannel == deviceStore && status.storeProductId != null
        if (sameStore) {
            val credit = status.storeRenewsAt?.let { maxOf(0L, end.toEpochMilli() - it.toEpochMilli()) } ?: 0L
            val withCredit = charge.plusMillis(credit)
            return if (vnDate(withCredit) == vnDate(charge)) PlanDisclosure.StartsToday(vnDate(charge))
            else PlanDisclosure.WithCredit(vnDate(withCredit), vnDate(charge))
        }
        val left = end.toEpochMilli() - now.toEpochMilli()
        return PlanDisclosure.Continues(vnDate(end), vnDate(charge.plusMillis(left)), vnDate(charge))
    }

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
     * #1464: the store kept the plan this account already has and starts the bought one at the next renewal: the purchase
     * answers with `merchant_subscription` still on another product. Nothing active or no product known → false.
     */
    fun storeKeptCurrentPlan(boughtProductId: String, entitlementActive: Boolean, entitlementProductId: String?): Boolean {
        if (!entitlementActive) return false
        val active = baseProductId(entitlementProductId) ?: return false
        val bought = baseProductId(boughtProductId) ?: return false
        return active != bought
    }

    fun slowMessage(storeKeptPlan: Boolean): PlanSlowMessage =
        if (storeKeptPlan) PlanSlowMessage.STORE_HAS_PLAN else PlanSlowMessage.NOT_CONFIRMED

    /**
     * #1464: "Quản lý / huỷ gói" only for a plan this device's store bills, auto-renew on or off; a trial, MANUAL, LEMON or
     * the other store has nothing to manage on the Play subscriptions page
     */
    fun footerLinks(status: PlanRenewalStatus, deviceStore: String = "PLAY_STORE"): PlanFooterLinks =
        if (status.billingChannel.equals(deviceStore, ignoreCase = true)) PlanFooterLinks.MANAGE_AND_RESTORE else PlanFooterLinks.RESTORE_ONLY

    /**
     * 403 codes of a shop whose period ended: SUBSCRIPTION_EXPIRED (what `authenticateRequest` answers today),
     * SUBSCRIPTION_PERIOD_ENDED (the later subscription check), SUBSCRIPTION_CANCELLED (a cancelled period that ended),
     * SUBSCRIPTION_PAST_DUE (a payment problem the API blocks on: the owner reaches Quản lý / huỷ gói).
     * Not SUBSCRIPTION_PAUSED: that one is the admin's ("contact support").
     */
    val PERIOD_ENDED_CODES = setOf("SUBSCRIPTION_EXPIRED", "SUBSCRIPTION_PERIOD_ENDED", "SUBSCRIPTION_CANCELLED", "SUBSCRIPTION_PAST_DUE")

    /** An authorised request answered 403 with a period-ended code: the expired screen opens (iOS `SubscriptionGate.opensGate`) */
    fun opensGate(statusCode: Int?, code: String?, sentAuthorization: Boolean): Boolean =
        statusCode == 403 && sentAuthorization && code in PERIOD_ENDED_CODES

    fun screenMode(role: String?, status: PlanRenewalStatus, storeAvailable: Boolean): PlanScreenMode = when {
        status.isPastDue -> if (role == "MERCHANT") PlanScreenMode.PAYMENT_ISSUE_OWNER else PlanScreenMode.EXPIRED_STAFF
        status.isExpired -> if (role == "MERCHANT") PlanScreenMode.EXPIRED_OWNER else PlanScreenMode.EXPIRED_STAFF
        role != "MERCHANT" -> PlanScreenMode.NOTHING_TO_BUY
        // A5: the upgrade while auto-renewing (the server lists it only for this device's store)
        status.autoRenew -> if (status.purchasablePlanIds.isNotEmpty() && storeAvailable) PlanScreenMode.PURCHASE else PlanScreenMode.AUTO_RENEWING
        status.reenableAutoRenew && status.purchasablePlanIds.isEmpty() -> PlanScreenMode.REENABLE_ONLY
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
            isPastDue = data.optString("dbStatus").equals("PAST_DUE", ignoreCase = true) &&
                !data.optString("status").equals("EXPIRED", ignoreCase = true),
            reenableAutoRenew = data.optBoolean("reenableAutoRenew", false),
            storeRenewsAt = parseInstant(if (data.isNull("storeRenewsAt")) null else data.optString("storeRenewsAt")),
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
