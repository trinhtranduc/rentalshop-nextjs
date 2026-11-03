package com.anyrent.pos.domain.settings

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

/** #1459 plan renewal: the same cases as iOS `PlanRenewalLogicTests` (mobile.md "Pure logic") */
class PlanRenewalTest {
    // vi templates as in values-vi/strings.xml
    private val renewVi = "Gia hạn %1\$s · %2\$s"
    private val upgradeVi = "Nâng lên %1\$s · %2\$s · %3\$s"
    private val buyVi = "Mua gói %1\$s · %2\$s · %3\$s"

    private fun status(
        expired: Boolean = false,
        days: Int? = 20,
        canRenew: Boolean = false,
        autoRenew: Boolean = false,
        purchasable: List<Int> = listOf(3),
        planId: Int = 2,
        end: String = "2026-11-22T03:00:00.000Z",
        trial: Boolean = false,
    ) = PlanRenewal.statusFromJson(
        JSONObject()
            .put("planId", planId).put("planName", "Basic")
            .put("status", if (expired) "EXPIRED" else "ACTIVE").put("dbStatus", if (trial) "TRIAL" else "ACTIVE")
            .put("daysRemaining", days ?: JSONObject.NULL).put("currentPeriodEnd", end)
            .put("autoRenew", autoRenew).put("canRenew", canRenew).put("canUpgrade", true)
            .put("purchasablePlanIds", org.json.JSONArray(purchasable)),
    )

    @Test
    fun displayNameAndTrial() {
        assertEquals("Dùng thử", PlanRenewal.displayPlanName("Trial", isTrial = true, trialLabel = "Dùng thử"))
        assertEquals("Basic", PlanRenewal.displayPlanName("Basic", isTrial = false, trialLabel = "Dùng thử"))
        assertEquals("—", PlanRenewal.displayPlanName("  ", isTrial = false, trialLabel = "Dùng thử"))
    }

    @Test
    fun statusLineDaysLeftAndLastDay() {
        val end = Instant.parse("2026-11-15T16:00:00Z") // 15/11 23:00 VN
        assertEquals(PlanStatusLine.DaysLeft("15/11/2026", 13), PlanRenewal.statusLine(13, end))
        assertEquals(PlanStatusLine.LastDay("15/11/2026"), PlanRenewal.statusLine(0, end))
        // as iOS: "Dùng đến …" once renewed, while the store renews by itself, or without a day count
        assertEquals(PlanStatusLine.ValidUntil("15/11/2026"), PlanRenewal.statusLine(0, end, renewed = true))
        assertEquals(PlanStatusLine.ValidUntil("15/11/2026"), PlanRenewal.statusLine(13, end, autoRenew = true))
        assertEquals(PlanStatusLine.ValidUntil("15/11/2026"), PlanRenewal.statusLine(null, end))
        // 16:59:59Z is still 15/11 in Vietnam, 17:00Z is 16/11
        assertEquals("15/11/2026", PlanRenewal.vnDate(Instant.parse("2026-11-15T16:59:59Z")))
        assertEquals("16/11/2026", PlanRenewal.vnDate(Instant.parse("2026-11-15T17:00:00Z")))
    }

    @Test
    fun monthlyExactAndApprox() {
        val six = PlanRenewal.monthly(999000.0, 6, "VND")
        assertEquals(166500.0, six.amount, 0.0)
        assertFalse(six.approx)
        assertEquals("166.500 ₫", PlanRenewal.formatAmount(six.amount, "VND"))
        val twelve = PlanRenewal.monthly(1799000.0, 12, "VND")
        assertEquals(150000.0, twelve.amount, 0.0)
        assertTrue(twelve.approx)
        assertEquals("150.000 ₫", PlanRenewal.formatAmount(twelve.amount, "VND"))
        assertEquals("1.799.000 ₫", PlanRenewal.formatAmount(1799000.0, "VND"))
        val usd = PlanRenewal.monthly(59.99, 12, "USD")
        assertEquals(5.0, usd.amount, 0.0)
        assertTrue(usd.approx)
    }

    @Test
    fun savings() {
        assertEquals(10, PlanRenewal.savingsPercent(999000.0, 1799000.0))
        assertNull(PlanRenewal.savingsPercent(999000.0, 1998000.0))
        assertNull(PlanRenewal.savingsPercent(0.0, 100.0))
    }

    @Test
    fun purchaseKindAndButtonTitles() {
        assertEquals(PlanPurchaseKind.RENEW, PlanRenewal.purchaseKind(2, 2, selectedRank = 1, currentRank = 1, isTrial = false))
        assertEquals(PlanPurchaseKind.UPGRADE, PlanRenewal.purchaseKind(3, 2, selectedRank = 2, currentRank = 1, isTrial = false))
        // trial: the same plan is a purchase, a higher one an upgrade
        assertEquals(PlanPurchaseKind.BUY, PlanRenewal.purchaseKind(2, 2, selectedRank = 1, currentRank = 1, isTrial = true))
        assertEquals(PlanPurchaseKind.UPGRADE, PlanRenewal.purchaseKind(3, 1, selectedRank = 2, currentRank = 0, isTrial = true))
        // expired Professional choosing Basic
        assertEquals(PlanPurchaseKind.BUY, PlanRenewal.purchaseKind(2, 3, selectedRank = 1, currentRank = 2, isTrial = false))

        assertEquals("Gia hạn 12 tháng · 1.799.000 ₫",
            PlanRenewal.buttonTitle(PlanPurchaseKind.RENEW, "Basic", "12 tháng", "1.799.000 ₫", renewVi, upgradeVi, buyVi))
        assertEquals("Nâng lên Professional · 12 tháng · 2.399.000 ₫",
            PlanRenewal.buttonTitle(PlanPurchaseKind.UPGRADE, "Professional", "12 tháng", "2.399.000 ₫", renewVi, upgradeVi, buyVi))
        assertEquals("Mua gói Basic · 6 tháng · 999.000 ₫",
            PlanRenewal.buttonTitle(PlanPurchaseKind.BUY, "Basic", "6 tháng", "999.000 ₫", renewVi, upgradeVi, buyVi))
    }

    @Test
    fun tierRanksFromStoreProducts() {
        assertEquals(1, PlanRenewal.tierRank(PlanStoreProducts("anyrent_merchant_semi_annual", "anyrent_merchant_annual")))
        assertEquals(2, PlanRenewal.tierRank(PlanStoreProducts("anyrent_professional_semi_annual", "anyrent_professional_annual")))
        assertEquals(0, PlanRenewal.tierRank(null as PlanStoreProducts?))
        assertEquals(1, PlanRenewal.tierRank("basic"))
        assertEquals(2, PlanRenewal.tierRank("professional"))
        assertEquals(0, PlanRenewal.tierRank(null as String?))
        assertEquals("anyrent_merchant_annual", PlanRenewal.baseProductId("anyrent_merchant_annual:annual"))
    }

    @Test
    fun newPeriodEndOnTheVietnamDay() {
        // 30/01 23:59:59 VN + 12 months
        assertEquals("30/01/2027", PlanRenewal.newPeriodEnd(Instant.parse("2026-01-30T16:59:59Z"), 12))
        // 31/01 00:00 VN + 1 month → clamped to 28/02
        assertEquals("28/02/2026", PlanRenewal.newPeriodEnd(Instant.parse("2026-01-30T17:00:00Z"), 1))
        assertEquals("29/02/2028", PlanRenewal.newPeriodEnd(Instant.parse("2028-01-30T17:00:00Z"), 1))
        assertEquals("02/11/2027", PlanRenewal.newPeriodEnd(Instant.parse("2026-11-02T03:00:00Z"), 12))
    }

    @Test
    fun homeLine() {
        assertEquals(5, PlanRenewal.homeLineDays("MERCHANT", status(days = 5, canRenew = true, purchasable = listOf(2, 3))))
        assertEquals(0, PlanRenewal.homeLineDays("MERCHANT", status(days = 0, canRenew = true, purchasable = listOf(2, 3))))
        assertNull(PlanRenewal.homeLineDays("OUTLET_STAFF", status(days = 5, canRenew = true)))
        assertNull(PlanRenewal.homeLineDays("MERCHANT", status(days = 20, canRenew = false)))
        assertNull(PlanRenewal.homeLineDays("MERCHANT", status(days = 8, canRenew = true)))
        assertNull(PlanRenewal.homeLineDays("MERCHANT", status(expired = true, days = null, canRenew = true)))
        assertNull(PlanRenewal.homeLineDays("MERCHANT", null))
    }

    @Test
    fun periodOverAndConfirmed() {
        val now = Instant.parse("2026-11-02T03:00:00Z")
        assertTrue(PlanRenewal.isPeriodOver("2026-11-01T00:00:00.000Z", now))
        assertFalse(PlanRenewal.isPeriodOver("2026-11-22T03:00:00.000Z", now))
        assertFalse(PlanRenewal.isPeriodOver(null, now))

        val before = status(end = "2026-11-08T03:00:00.000Z")
        assertFalse(PlanRenewal.confirmed(before, status(end = "2026-11-08T03:00:00.000Z")))
        assertTrue(PlanRenewal.confirmed(before, status(end = "2027-11-02T03:00:00.000Z")))
        assertTrue(PlanRenewal.confirmed(before, status(end = "2026-11-08T03:00:00.000Z", planId = 3)))
        assertFalse(PlanRenewal.confirmed(before, status(expired = true, end = "2026-11-08T03:00:00.000Z", planId = 3)))
        assertTrue(PlanRenewal.confirmed(null, status()))
    }

    @Test
    fun screenModes() {
        assertEquals(PlanScreenMode.EXPIRED_OWNER, PlanRenewal.screenMode("MERCHANT", status(expired = true), storeAvailable = false))
        assertEquals(PlanScreenMode.EXPIRED_STAFF, PlanRenewal.screenMode("OUTLET_STAFF", status(expired = true), storeAvailable = true))
        assertEquals(PlanScreenMode.AUTO_RENEWING, PlanRenewal.screenMode("MERCHANT", status(autoRenew = true, purchasable = emptyList()), true))
        assertEquals(PlanScreenMode.PURCHASE, PlanRenewal.screenMode("MERCHANT", status(), true))
        assertEquals(PlanScreenMode.STORE_UNAVAILABLE, PlanRenewal.screenMode("MERCHANT", status(), false))
        assertEquals(PlanScreenMode.NOTHING_TO_BUY, PlanRenewal.screenMode("MERCHANT", status(purchasable = emptyList()), true))
    }

    @Test
    fun parsesStatusWithoutNewFields() {
        val old = PlanRenewal.statusFromJson(JSONObject().put("planName", "Basic").put("status", "ACTIVE").put("daysRemaining", 3))
        assertFalse(old.canRenew)
        assertFalse(old.autoRenew)
        assertTrue(old.purchasablePlanIds.isEmpty())
        assertEquals("MANUAL", old.billingChannel)
    }

    @Test
    fun parsesPlansWithStoreProducts() {
        val json = JSONObject("""{"success":true,"data":{"plans":[
            {"id":3,"name":"Professional","isPopular":true,"sortOrder":2,"limits":"{\"users\":4,\"outlets\":1,\"products\":5000}","features":"[\"All Basic features\",\"Web dashboard access\"]","storeProductIds":{"semiAnnual":"anyrent_professional_semi_annual","annual":"anyrent_professional_annual"}},
            {"id":1,"name":"Trial","isPopular":false,"sortOrder":0,"limits":"{}","features":"[]","storeProductIds":null},
            {"id":2,"name":"Basic","isPopular":false,"sortOrder":1,"limits":"{\"users\":2,\"outlets\":1,\"products\":2000}","features":"[\"Mobile app access\"]","storeProductIds":{"semiAnnual":"anyrent_merchant_semi_annual","annual":"anyrent_merchant_annual"}}
        ]}}""")
        val plans = PlanRenewal.inAppPlansFromJson(json)
        assertEquals(listOf(2, 3), plans.map { it.id })
        assertTrue(plans[1].isPopular)
        assertTrue(plans[1].hasWeb)
        assertFalse(plans[0].hasWeb)
        assertEquals(2, plans[0].users)
        assertEquals(5000, plans[1].products)
        assertEquals("2.000", PlanRenewal.groupNumber(2000, "vi"))
        assertEquals("2,000", PlanRenewal.groupNumber(2000, "en"))
    }

    @Test
    fun gateOpensOnEveryPeriodEndedCodeOfAnAuthorisedRequest() {
        for (code in listOf("SUBSCRIPTION_EXPIRED", "SUBSCRIPTION_PERIOD_ENDED", "SUBSCRIPTION_CANCELLED", "SUBSCRIPTION_PAST_DUE")) {
            assertTrue(code, PlanRenewal.opensGate(403, code, sentAuthorization = true))
            assertFalse("no token: $code", PlanRenewal.opensGate(403, code, sentAuthorization = false))
        }
        assertFalse("paused is the admin's", PlanRenewal.opensGate(403, "SUBSCRIPTION_PAUSED", sentAuthorization = true))
        assertFalse(PlanRenewal.opensGate(403, "INSUFFICIENT_PERMISSIONS", sentAuthorization = true))
        assertFalse(PlanRenewal.opensGate(401, "SUBSCRIPTION_EXPIRED", sentAuthorization = true))
        assertFalse(PlanRenewal.opensGate(403, null, sentAuthorization = true))
    }

    @Test
    fun pastDueKeepsTheGateWithoutAPlanToBuy() {
        fun status(json: String) = PlanRenewal.statusFromJson(JSONObject(json))
        val pastDue = status("""{"planId":2,"planName":"Basic","status":"ACTIVE","dbStatus":"PAST_DUE","daysRemaining":10,"billingIssue":true,"purchasablePlanIds":[3]}""")
        assertTrue(pastDue.isPastDue)
        assertTrue(pastDue.isBlocked)
        assertEquals(PlanScreenMode.PAYMENT_ISSUE_OWNER, PlanRenewal.screenMode("MERCHANT", pastDue, storeAvailable = true))
        assertEquals(PlanScreenMode.EXPIRED_STAFF, PlanRenewal.screenMode("OUTLET_STAFF", pastDue, storeAvailable = true))
        // A store billing issue keeps ACTIVE (#1459): not blocked, the plan screen shows the payment line
        val storeIssue = status("""{"planId":2,"planName":"Basic","status":"ACTIVE","dbStatus":"ACTIVE","daysRemaining":10,"billingIssue":true,"purchasablePlanIds":[3]}""")
        assertFalse(storeIssue.isBlocked)
        assertEquals(PlanScreenMode.PURCHASE, PlanRenewal.screenMode("MERCHANT", storeIssue, storeAvailable = true))
        // Expired wins over PAST_DUE
        val ended = status("""{"planId":2,"planName":"Basic","status":"EXPIRED","dbStatus":"PAST_DUE","purchasablePlanIds":[2,3]}""")
        assertFalse(ended.isPastDue)
        assertTrue(ended.isBlocked)
        assertEquals(PlanScreenMode.EXPIRED_OWNER, PlanRenewal.screenMode("MERCHANT", ended, storeAvailable = true))
    }

    // ─── Audit fixes (2026-11-03): A1, A3a, A5, A6, A12 ────────────────────

    @Test
    fun appUserIdPrefixFollowsTheApiHost() {
        assertEquals("merchant_7", PlanRenewal.appUserId(7, "https://api.anyrent.shop"))
        assertEquals("merchant_7", PlanRenewal.appUserId(7, "https://api.anyrent.shop/"))
        assertEquals("dev_merchant_7", PlanRenewal.appUserId(7, "https://dev-api.anyrent.shop"))
        assertEquals("dev_merchant_7", PlanRenewal.appUserId(7, "http://10.0.2.2:3459"))
        assertEquals("dev_merchant_7", PlanRenewal.appUserId(7, ""))
    }

    @Test
    fun storeAccountReadyOnlyForTheExpectedId() {
        assertFalse(PlanRenewal.storeAccountReady(null, "merchant_7"))
        assertFalse(PlanRenewal.storeAccountReady("merchant_7", null))
        assertFalse(PlanRenewal.storeAccountReady("", ""))
        assertFalse(PlanRenewal.storeAccountReady("\$RCAnonymousID:abc", "merchant_7"))
        assertFalse(PlanRenewal.storeAccountReady("dev_merchant_7", "merchant_7"))
        assertTrue(PlanRenewal.storeAccountReady("merchant_7", "merchant_7"))
    }

    @Test
    fun upgradeWhileAutoRenewingAndReenable() {
        // A5: auto-renewing with a higher plan on offer and store products: purchase (upgrade only)
        assertEquals(PlanScreenMode.PURCHASE, PlanRenewal.screenMode("MERCHANT", status(autoRenew = true, purchasable = listOf(3)), true))
        assertEquals(PlanScreenMode.AUTO_RENEWING, PlanRenewal.screenMode("MERCHANT", status(autoRenew = true, purchasable = listOf(3)), false))
        assertEquals(PlanScreenMode.AUTO_RENEWING, PlanRenewal.screenMode("MERCHANT", status(autoRenew = true, purchasable = emptyList()), true))
        // A6: re-enable in the store, nothing to buy
        val reenable = PlanRenewal.statusFromJson(
            JSONObject().put("planId", 3).put("planName", "Professional").put("status", "ACTIVE").put("dbStatus", "ACTIVE")
                .put("daysRemaining", 4).put("currentPeriodEnd", "2026-11-06T03:00:00.000Z").put("autoRenew", false)
                .put("billingChannel", "PLAY_STORE").put("reenableAutoRenew", true).put("purchasablePlanIds", org.json.JSONArray()),
        )
        assertTrue(reenable.reenableAutoRenew)
        assertEquals(PlanScreenMode.REENABLE_ONLY, PlanRenewal.screenMode("MERCHANT", reenable, true))
        // with an upgrade on offer: purchase, the card is shown above it
        assertEquals(PlanScreenMode.PURCHASE, PlanRenewal.screenMode("MERCHANT", reenable.copy(purchasablePlanIds = listOf(4)), true))
        // an older API without the field
        assertFalse(status().reenableAutoRenew)
    }

    @Test
    fun confirmationWaitsAboutAMinute() {
        assertEquals(60_000L, PlanRenewal.CONFIRM_TIMEOUT_MS)
        assertEquals(2_000L, PlanRenewal.CONFIRM_INTERVAL_MS)
    }
}

