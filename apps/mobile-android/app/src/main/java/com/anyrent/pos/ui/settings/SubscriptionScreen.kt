package com.anyrent.pos.ui.settings

import android.app.Activity
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.billing.PurchaseCancelledException
import com.anyrent.pos.billing.PurchasesManager
import com.anyrent.pos.billing.RenewPackage
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.PlanRenewalStore
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.domain.settings.InAppPlan
import com.anyrent.pos.domain.settings.PlanRenewal
import com.anyrent.pos.domain.settings.PlanRenewalStatus
import com.anyrent.pos.domain.settings.PlanScreenMode
import com.anyrent.pos.domain.settings.PlanStatusLine
import com.anyrent.pos.push.PushRegistrar
import com.anyrent.pos.ui.common.LoadingBox
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.Instant
import java.util.Locale

/** Colours of the approved calm design (mockup "Thiết kế đơn giản", Android): grey page, white cards, colour only on choices */
private object PlanColors {
    val Page = Color(0xFFF6F6F7)
    val Card = Color.White
    val CardBorder = Color(0xFFE7E8EC)
    val RowLine = Color(0xFFEEF0F3)
    val Text = Color(0xFF1C1C1E)
    val Text2 = Color(0xFF44474E)
    val Muted = Color(0xFF666A73)
    val Primary = Color(0xFF2454F4)
    val PrimaryBusy = Color(0xFF6F8BF7)
    val PillBg = Color(0xFFE6ECFE)
}

private const val TERMS_URL = "https://www.anyrent.shop/terms"
private const val PRIVACY_URL = "https://www.anyrent.shop/privacy"

/** Poll GET /api/subscriptions/status every 2 s for 20 s after the store says paid (mobile.md "Flow") */
private const val CONFIRM_POLLS = 10
private const val CONFIRM_INTERVAL_MS = 2_000L

private enum class ConfirmPhase { IDLE, CONFIRMING, SLOW }

/**
 * #1459 Gói dịch vụ (owner) and the expired screen (every role).
 * - [expiredGate]: shown in place of the app while the plan has ended: no back, "Đăng xuất"; the owner pays here, others
 *   ask the owner and try again. [onActive] runs once the plan is active again (with the "Đã gia hạn đến …" text when paid).
 * - Otherwise the screen from Cài đặt (MERCHANT only).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SubscriptionScreen(
    onBack: () -> Unit,
    expiredGate: Boolean = false,
    onActive: (notice: String?) -> Unit = {},
    onLoggedOut: () -> Unit = {},
) {
    val context = LocalContext.current
    val activity = context as? Activity
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    val role = SessionStore.role
    val language = remember { Locale.getDefault().language }

    var loading by remember { mutableStateOf(true) }
    var status by remember { mutableStateOf<PlanRenewalStatus?>(null) }
    var plans by remember { mutableStateOf<List<InAppPlan>>(emptyList()) }
    var packages by remember { mutableStateOf<Map<String, RenewPackage>>(emptyMap()) }
    var selectedPlanId by remember { mutableStateOf<Int?>(null) }
    var selectedMonths by remember { mutableStateOf(12) }
    var phase by remember { mutableStateOf(ConfirmPhase.IDLE) }
    var busy by remember { mutableStateOf(false) }
    var confirmBase by remember { mutableStateOf<PlanRenewalStatus?>(null) }
    /** After a confirmed renewal the card says "Dùng đến …" (mockup "Trả xong · đã gia hạn") */
    var renewed by remember { mutableStateOf(false) }

    val storeAvailable = PurchasesManager.isConfigured() && packages.isNotEmpty()
    val renewedUntilTemplate = stringResource(R.string.plan_renewed_until)
    val restoredText = stringResource(R.string.plan_restored)
    val nothingToRestoreText = stringResource(R.string.plan_nothing_to_restore)
    val loadErrorText = stringResource(R.string.plan_load_error)

    fun pickDefaults(s: PlanRenewalStatus, list: List<InAppPlan>) {
        val buyable = list.filter { it.id in s.purchasablePlanIds }
        if (selectedPlanId == null || buyable.none { it.id == selectedPlanId }) {
            // The plan in use when it can be renewed, else the first one that can be bought (the upgrade)
            selectedPlanId = buyable.firstOrNull { it.id == s.planId }?.id ?: buyable.firstOrNull()?.id
        }
    }

    fun reload() {
        scope.launch {
            loading = true
            val s = withContext(Dispatchers.IO) { ApiClient.get().subscriptionRenewalStatus().getOrNull() }
            if (s != null) {
                status = s
                PlanRenewalStore.store(s)
                if (expiredGate && !s.isBlocked) {
                    loading = false
                    onActive(null)
                    return@launch
                }
            }
            if (role == "MERCHANT" && s != null) {
                plans = withContext(Dispatchers.IO) { ApiClient.get().inAppPlans().getOrNull() }.orEmpty()
                if (PurchasesManager.isConfigured()) {
                    packages = PurchasesManager.getRenewPackages().getOrNull().orEmpty().associateBy { it.productId }
                }
                pickDefaults(s, plans)
            }
            loading = false
        }
    }

    fun done(after: PlanRenewalStatus) {
        PlanRenewalStore.store(after)
        status = after
        phase = ConfirmPhase.IDLE
        renewed = true
        val text = String.format(renewedUntilTemplate, after.currentPeriodEnd?.let(PlanRenewal::vnDate) ?: "")
        if (expiredGate) {
            onActive(text)
        } else {
            scope.launch { snackbar.showSnackbar(text) }
            pickDefaults(after, plans)
        }
    }

    /** The store took the money: wait for the server (webhook) to move the period or the plan */
    fun confirm(before: PlanRenewalStatus?) {
        confirmBase = before
        phase = ConfirmPhase.CONFIRMING
        scope.launch {
            repeat(CONFIRM_POLLS) {
                delay(CONFIRM_INTERVAL_MS)
                val after = withContext(Dispatchers.IO) { ApiClient.get().subscriptionRenewalStatus().getOrNull() }
                if (after != null && PlanRenewal.confirmed(before, after)) {
                    done(after)
                    return@launch
                }
            }
            phase = ConfirmPhase.SLOW
        }
    }

    fun buy(productId: String) {
        val act = activity ?: return
        if (busy || phase == ConfirmPhase.CONFIRMING) return
        val before = status
        scope.launch {
            busy = true
            val result = PurchasesManager.purchase(act, productId)
            busy = false
            result
                .onSuccess { confirm(before) }
                .onFailure { err ->
                    if (err is PurchaseCancelledException) return@onFailure
                    snackbar.showSnackbar(err.message ?: loadErrorText)
                }
        }
    }

    fun restore() {
        if (busy || !PurchasesManager.isConfigured()) return
        val before = status
        scope.launch {
            busy = true
            val result = PurchasesManager.restore()
            busy = false
            result
                .onSuccess { info ->
                    if (PurchasesManager.hasMerchantEntitlement(info)) {
                        snackbar.showSnackbar(restoredText)
                        confirm(before)
                    } else {
                        snackbar.showSnackbar(nothingToRestoreText)
                    }
                }
                .onFailure { err -> snackbar.showSnackbar(err.message ?: loadErrorText) }
        }
    }

    fun open(url: String) {
        runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
    }

    fun signOut() {
        scope.launch {
            withContext(Dispatchers.IO) {
                PushRegistrar.unregister()
                ApiClient.get().logout()
            }
            SessionStore.clearAuth()
            onLoggedOut()
        }
    }

    LaunchedEffect(Unit) { reload() }

    Scaffold(
        containerColor = PlanColors.Page,
        snackbarHost = { SnackbarHost(snackbar) },
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text(stringResource(R.string.plan_title), fontSize = 20.sp, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    if (!expiredGate) {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.back))
                        }
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Color.White),
            )
        },
    ) { padding ->
        val s = status
        if (loading && s == null) {
            Box(Modifier.padding(padding).fillMaxSize()) { LoadingBox() }
            return@Scaffold
        }
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp)
                .padding(top = 4.dp, bottom = 24.dp)
                .widthIn(max = 640.dp),
        ) {
            if (s == null) {
                // Could not read the plan: say so, keep Thử lại (and Đăng xuất on the expired screen)
                Text(loadErrorText, fontSize = 14.sp, color = PlanColors.Text2, modifier = Modifier.padding(top = 16.dp, start = 4.dp, end = 4.dp))
                PrimaryButton(stringResource(R.string.plan_retry), Modifier.testTag("plan.retry")) { reload() }
                if (expiredGate) LogoutLink { signOut() }
                return@Column
            }
            val mode = PlanRenewal.screenMode(role, s, storeAvailable)
            val trialLabel = stringResource(R.string.plan_trial)
            val planName = PlanRenewal.displayPlanName(s.planName, s.isTrial, trialLabel)

            // Status first (mockup): plan, days left; on the expired screen the black title and the end day
            Card(Modifier.padding(top = 10.dp).testTag("plan.status")) {
                if (s.isPastDue) {
                    // A payment problem the API blocks on (PAST_DUE): the plan runs, the charge failed
                    PlanRow {
                        Text(stringResource(R.string.plan_payment_issue_title), fontSize = 17.sp, fontWeight = FontWeight.SemiBold, color = PlanColors.Text)
                        s.currentPeriodEnd?.let { end ->
                            Text(planName + " · " + statusText(PlanRenewal.statusLine(s.daysRemaining, end)), fontSize = 14.sp, color = PlanColors.Muted)
                        }
                        Text(stringResource(R.string.plan_billing_issue), fontSize = 14.sp, color = PlanColors.Text2)
                    }
                } else if (s.isExpired) {
                    PlanRow {
                        Text(stringResource(R.string.plan_expired_title), fontSize = 17.sp, fontWeight = FontWeight.SemiBold, color = PlanColors.Text)
                        Text(
                            stringResource(R.string.plan_expired_line, planName, s.currentPeriodEnd?.let(PlanRenewal::vnDate) ?: "—"),
                            fontSize = 14.sp, color = PlanColors.Muted,
                        )
                        if (s.billingIssue) {
                            Text(stringResource(R.string.plan_billing_issue), fontSize = 14.sp, color = PlanColors.Text2)
                        }
                    }
                } else {
                    PlanRow {
                        Row {
                            Text(planName, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = PlanColors.Text)
                            Text(" · " + stringResource(if (s.isTrial) R.string.plan_trial else R.string.plan_current), fontSize = 16.sp, color = PlanColors.Muted)
                        }
                        s.currentPeriodEnd?.let { end ->
                            val line = PlanRenewal.statusLine(s.daysRemaining, end, renewed = renewed, autoRenew = s.autoRenew)
                            Text(statusText(line), fontSize = 14.sp, color = PlanColors.Muted)
                        }
                        if (s.billingIssue) {
                            Text(stringResource(R.string.plan_billing_issue), fontSize = 14.sp, color = PlanColors.Text2)
                        }
                    }
                    if (mode == PlanScreenMode.AUTO_RENEWING || mode == PlanScreenMode.NOTHING_TO_BUY) {
                        RowDivider()
                        PlanRow {
                            Text(
                                stringResource(R.string.plan_includes, includesText(s.hasWeb, s.users, s.outlets, s.products, language, withOutlets = true)),
                                fontSize = 14.sp, color = PlanColors.Text2,
                            )
                        }
                    }
                }
            }

            when (mode) {
                PlanScreenMode.PAYMENT_ISSUE_OWNER -> {
                    PrimaryButton(stringResource(R.string.plan_retry), Modifier.testTag("plan.retry"), enabled = !loading) { reload() }
                    ManageRestoreLinks(
                        onManage = { open(PurchasesManager.manageUrl(context.packageName, s.storeProductId)) },
                        onRestore = { restore() },
                        restoreEnabled = false,
                    )
                    LegalLinks(onTerms = { open(TERMS_URL) }, onPrivacy = { open(PRIVACY_URL) })
                    if (expiredGate) LogoutLink { signOut() }
                }
                PlanScreenMode.EXPIRED_STAFF -> {
                    Text(
                        stringResource(R.string.plan_expired_ask_owner), fontSize = 14.sp, color = PlanColors.Text2,
                        modifier = Modifier.padding(top = 16.dp, start = 4.dp, end = 4.dp).testTag("plan.askOwner"),
                    )
                    PrimaryButton(stringResource(R.string.plan_retry), Modifier.testTag("plan.retry"), enabled = !loading) { reload() }
                    LogoutLink { signOut() }
                }
                PlanScreenMode.AUTO_RENEWING -> {
                    SectionHeader(stringResource(R.string.plan_section_auto_renew))
                    Card {
                        val endText = s.currentPeriodEnd?.let(PlanRenewal::vnDate) ?: "—"
                        val amount = autoRenewAmount(s, packages)
                        PlanRow {
                            Text(
                                if (amount != null) stringResource(R.string.plan_auto_renew_on, endText, amount)
                                else stringResource(R.string.plan_auto_renew_on_date, endText),
                                fontSize = 16.sp, color = PlanColors.Text,
                                modifier = Modifier.testTag("plan.autoRenew"),
                            )
                        }
                        RowDivider()
                        LinkRow(stringResource(R.string.plan_manage), Modifier.testTag("plan.manage")) {
                            open(PurchasesManager.manageUrl(context.packageName, s.storeProductId))
                        }
                        RowDivider()
                        LinkRow(stringResource(R.string.plan_restore), Modifier.testTag("plan.restore"), enabled = PurchasesManager.isConfigured()) { restore() }
                    }
                    LegalLinks(onTerms = { open(TERMS_URL) }, onPrivacy = { open(PRIVACY_URL) })
                }
                PlanScreenMode.NOTHING_TO_BUY -> {
                    Text(
                        stringResource(R.string.plan_renew_later, s.renewWindowDays), fontSize = 14.sp, color = PlanColors.Text2,
                        modifier = Modifier.padding(top = 16.dp, start = 4.dp, end = 4.dp).testTag("plan.renewLater"),
                    )
                    ManageRestoreLinks(
                        onManage = { open(PurchasesManager.manageUrl(context.packageName, s.storeProductId)) },
                        onRestore = { restore() },
                        restoreEnabled = PurchasesManager.isConfigured(),
                    )
                    LegalLinks(onTerms = { open(TERMS_URL) }, onPrivacy = { open(PRIVACY_URL) })
                }
                PlanScreenMode.STORE_UNAVAILABLE, PlanScreenMode.PURCHASE, PlanScreenMode.EXPIRED_OWNER -> {
                    val shown = plans.filter { it.id in s.purchasablePlanIds || it.id == s.planId }
                    if (storeAvailable && s.purchasablePlanIds.isNotEmpty() && shown.isNotEmpty()) {
                        SectionHeader(stringResource(R.string.plan_section_plan))
                        Card {
                            shown.forEachIndexed { index, plan ->
                                if (index > 0) RowDivider()
                                val buyable = plan.id in s.purchasablePlanIds
                                PlanChoiceRow(
                                    plan = plan,
                                    selected = plan.id == selectedPlanId,
                                    enabled = buyable && phase != ConfirmPhase.CONFIRMING,
                                    subtitle = if (buyable) includesText(plan.hasWeb, plan.users, null, plan.products, language, withOutlets = false)
                                    else stringResource(R.string.plan_current_renew_later, s.renewWindowDays),
                                    onSelect = { selectedPlanId = plan.id },
                                )
                            }
                        }
                        val selected = shown.firstOrNull { it.id == selectedPlanId }
                        val semi = selected?.let { packages[it.storeProducts.semiAnnual] }
                        val annual = selected?.let { packages[it.storeProducts.annual] }
                        if (selected != null && (semi != null || annual != null)) {
                            val months = when {
                                selectedMonths == 12 && annual == null -> 6
                                selectedMonths == 6 && semi == null -> 12
                                else -> selectedMonths
                            }
                            SectionHeader(stringResource(R.string.plan_section_period))
                            Card {
                                val savings = if (semi != null && annual != null) PlanRenewal.savingsPercent(semi.priceAmount, annual.priceAmount) else null
                                listOfNotNull(semi?.let { 6 to it }, annual?.let { 12 to it }).forEachIndexed { index, (m, pkg) ->
                                    if (index > 0) RowDivider()
                                    PeriodRow(
                                        months = m,
                                        pkg = pkg,
                                        savings = if (m == 12) savings else null,
                                        selected = months == m,
                                        enabled = phase != ConfirmPhase.CONFIRMING,
                                        onSelect = { selectedMonths = m },
                                    )
                                }
                            }
                            val pkg = (if (months == 6) semi else annual)!!
                            val kind = PlanRenewal.purchaseKind(
                                selected.id, s.planId, PlanRenewal.tierRank(selected.storeProducts), PlanRenewal.tierRank(s.planTier), s.isTrial,
                            )
                            val amountText = amountLabel(pkg)
                            val periodText = stringResource(if (months == 6) R.string.plan_months6 else R.string.plan_months12)
                            val title = PlanRenewal.buttonTitle(
                                kind, selected.name, periodText, amountText,
                                stringResource(R.string.plan_button_renew), stringResource(R.string.plan_button_upgrade), stringResource(R.string.plan_button_buy),
                            )
                            if (phase == ConfirmPhase.SLOW) {
                                Text(
                                    stringResource(R.string.plan_not_confirmed), fontSize = 14.sp, color = PlanColors.Text2,
                                    modifier = Modifier.padding(top = 16.dp, start = 4.dp, end = 4.dp).testTag("plan.notConfirmed"),
                                )
                                PrimaryButton(stringResource(R.string.plan_retry), Modifier.testTag("plan.retry")) { confirm(confirmBase) }
                            } else {
                                PrimaryButton(
                                    if (phase == ConfirmPhase.CONFIRMING) stringResource(R.string.plan_confirming) else title,
                                    Modifier.testTag("plan.buy"),
                                    busy = phase == ConfirmPhase.CONFIRMING || busy,
                                    enabled = phase == ConfirmPhase.IDLE && !busy,
                                ) { buy(pkg.productId) }
                            }
                            // Apple / Google: the renewal terms right under the button, normal contrast
                            Text(
                                stringResource(R.string.plan_disclosure, PlanRenewal.newPeriodEnd(Instant.now(), months), months, amountText),
                                fontSize = 14.sp, lineHeight = 19.sp, color = PlanColors.Text2,
                                modifier = Modifier.padding(top = 8.dp, start = 4.dp, end = 4.dp).testTag("plan.disclosure"),
                            )
                        } else {
                            UnavailableBlock(loading) { reload() }
                        }
                    } else {
                        UnavailableBlock(loading) { reload() }
                    }
                    ManageRestoreLinks(
                        onManage = { open(PurchasesManager.manageUrl(context.packageName, s.storeProductId)) },
                        onRestore = { restore() },
                        restoreEnabled = PurchasesManager.isConfigured() && phase != ConfirmPhase.CONFIRMING,
                    )
                    LegalLinks(onTerms = { open(TERMS_URL) }, onPrivacy = { open(PRIVACY_URL) })
                    if (mode == PlanScreenMode.EXPIRED_OWNER) LogoutLink { signOut() }
                }
            }
        }
    }
}

@Composable
private fun statusText(line: PlanStatusLine): String = when (line) {
    is PlanStatusLine.DaysLeft -> stringResource(R.string.plan_expires_days_left, line.date, line.days)
    is PlanStatusLine.LastDay -> stringResource(R.string.plan_expires_last_day, line.date)
    is PlanStatusLine.ValidUntil -> stringResource(R.string.plan_valid_until, line.date)
}

/** "app điện thoại · 2 người dùng · 1 chi nhánh · 2.000 sản phẩm" (outlets only on the "Gồm:" line) */
@Composable
private fun includesText(hasWeb: Boolean, users: Int?, outlets: Int?, products: Int?, language: String, withOutlets: Boolean): String {
    val parts = mutableListOf(stringResource(if (hasWeb) R.string.plan_feature_phone_web else R.string.plan_feature_phone))
    users?.takeIf { it > 0 }?.let { parts += stringResource(R.string.plan_feature_users, it) }
    if (withOutlets) outlets?.takeIf { it > 0 }?.let { parts += stringResource(R.string.plan_feature_outlets, it) }
    products?.takeIf { it > 0 }?.let { parts += stringResource(R.string.plan_feature_products, PlanRenewal.groupNumber(it, language)) }
    return parts.joinToString(" · ")
}

/** VND as "1.799.000 ₫"; other currencies as the store writes them */
private fun amountLabel(pkg: RenewPackage): String =
    if (PlanRenewal.isVnd(pkg.currencyCode)) PlanRenewal.formatAmount(pkg.priceAmount, "VND") else pkg.priceLabel

private fun autoRenewAmount(s: PlanRenewalStatus, packages: Map<String, RenewPackage>): String? {
    s.storeProductId?.let { packages[it] }?.let { return amountLabel(it) }
    val amount = s.billingAmount?.takeIf { it > 0 } ?: return null
    return PlanRenewal.formatAmount(amount, s.billingCurrency)
}

@Composable
private fun Card(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Column(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(PlanColors.Card)
            .border(1.dp, PlanColors.CardBorder, RoundedCornerShape(12.dp)),
    ) { content() }
}

@Composable
private fun PlanRow(content: @Composable () -> Unit) {
    Column(
        Modifier.fillMaxWidth().heightIn(min = 44.dp).padding(horizontal = 16.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) { content() }
}

@Composable
private fun RowDivider() {
    HorizontalDivider(color = PlanColors.RowLine)
}

@Composable
private fun SectionHeader(text: String) {
    Text(
        text.uppercase(),
        fontSize = 12.sp,
        fontWeight = FontWeight.Medium,
        letterSpacing = 0.6.sp,
        color = PlanColors.Muted,
        modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 14.dp, bottom = 6.dp),
    )
}

@Composable
private fun Radio(selected: Boolean, enabled: Boolean) {
    val ring = if (selected) PlanColors.Primary else PlanColors.Muted.copy(alpha = if (enabled) 1f else 0.4f)
    Box(Modifier.size(20.dp).border(2.dp, ring, CircleShape), contentAlignment = Alignment.Center) {
        if (selected) Box(Modifier.size(10.dp).clip(CircleShape).background(PlanColors.Primary))
    }
}

@Composable
private fun PlanChoiceRow(plan: InAppPlan, selected: Boolean, enabled: Boolean, subtitle: String, onSelect: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .clickable(enabled = enabled, onClick = onSelect)
            .heightIn(min = 52.dp)
            .padding(horizontal = 16.dp, vertical = 10.dp)
            .testTag("plan.row.${plan.id}"),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Radio(selected, enabled)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(plan.name, fontSize = 16.sp, color = if (enabled) PlanColors.Text else PlanColors.Muted)
                if (plan.isPopular) {
                    Spacer(Modifier.size(6.dp))
                    Text(
                        stringResource(R.string.plan_popular),
                        fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = PlanColors.Primary,
                        modifier = Modifier.clip(RoundedCornerShape(99.dp)).background(PlanColors.PillBg).padding(horizontal = 8.dp, vertical = 1.dp),
                    )
                }
            }
            Text(subtitle, fontSize = 13.sp, color = PlanColors.Muted)
        }
    }
}

@Composable
private fun PeriodRow(months: Int, pkg: RenewPackage, savings: Int?, selected: Boolean, enabled: Boolean, onSelect: () -> Unit) {
    val monthly = PlanRenewal.monthly(pkg.priceAmount, months, pkg.currencyCode)
    val monthlyText = PlanRenewal.formatAmount(monthly.amount, pkg.currencyCode)
    val perMonth = stringResource(if (monthly.approx) R.string.plan_per_month_approx else R.string.plan_per_month, monthlyText)
    val sub = if (savings != null) perMonth + " · " + stringResource(R.string.plan_savings, savings) else perMonth
    Row(
        Modifier
            .fillMaxWidth()
            .clickable(enabled = enabled, onClick = onSelect)
            .heightIn(min = 52.dp)
            .padding(horizontal = 16.dp, vertical = 10.dp)
            .testTag("plan.period.$months"),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Radio(selected, enabled)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(stringResource(if (months == 6) R.string.plan_months6 else R.string.plan_months12), fontSize = 16.sp, color = PlanColors.Text)
            Text(sub, fontSize = 13.sp, color = PlanColors.Muted)
        }
        // The billed amount is the most prominent price (Apple "Billing amount", Google Play policy)
        Text(amountLabel(pkg), fontSize = 16.sp, fontWeight = FontWeight.Bold, color = PlanColors.Text)
    }
}

@Composable
private fun PrimaryButton(text: String, modifier: Modifier = Modifier, busy: Boolean = false, enabled: Boolean = true, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.fillMaxWidth().padding(top = 12.dp).heightIn(min = 52.dp),
        shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = PlanColors.Primary,
            disabledContainerColor = if (busy) PlanColors.PrimaryBusy else PlanColors.Primary.copy(alpha = 0.5f),
            disabledContentColor = Color.White,
        ),
    ) {
        if (busy) {
            CircularProgressIndicator(Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
            Spacer(Modifier.size(10.dp))
        }
        Text(text, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center)
    }
}

/** No RevenueCat key, or the store gave no products: say so, keep Thử lại (#1459, Android builds have no key today) */
@Composable
private fun UnavailableBlock(loading: Boolean, onRetry: () -> Unit) {
    Text(
        stringResource(R.string.plan_store_unavailable),
        fontSize = 14.sp, color = PlanColors.Text2,
        modifier = Modifier.padding(top = 16.dp, start = 4.dp, end = 4.dp).testTag("plan.storeUnavailable"),
    )
    PrimaryButton(stringResource(R.string.plan_retry), Modifier.testTag("plan.retry"), enabled = !loading) { onRetry() }
}

@Composable
private fun LinkRow(text: String, modifier: Modifier = Modifier, enabled: Boolean = true, onClick: () -> Unit) {
    Text(
        text,
        fontSize = 16.sp,
        color = if (enabled) PlanColors.Primary else PlanColors.Muted,
        modifier = modifier.fillMaxWidth().clickable(enabled = enabled, onClick = onClick).heightIn(min = 48.dp).padding(horizontal = 16.dp, vertical = 13.dp),
    )
}

@Composable
private fun ManageRestoreLinks(onManage: () -> Unit, onRestore: () -> Unit, restoreEnabled: Boolean) {
    Row(
        Modifier.fillMaxWidth().padding(top = 8.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            stringResource(R.string.plan_manage), fontSize = 14.sp, fontWeight = FontWeight.Medium, color = PlanColors.Primary,
            modifier = Modifier.clickable(onClick = onManage).padding(horizontal = 4.dp, vertical = 12.dp).testTag("plan.manage"),
        )
        Text(" · ", fontSize = 14.sp, color = PlanColors.Muted)
        Text(
            stringResource(R.string.plan_restore), fontSize = 14.sp, fontWeight = FontWeight.Medium,
            color = if (restoreEnabled) PlanColors.Primary else PlanColors.Muted,
            modifier = Modifier.clickable(enabled = restoreEnabled, onClick = onRestore).padding(horizontal = 4.dp, vertical = 12.dp).testTag("plan.restore"),
        )
    }
}

@Composable
private fun LegalLinks(onTerms: () -> Unit, onPrivacy: () -> Unit) {
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            stringResource(R.string.plan_terms), fontSize = 13.sp, color = PlanColors.Primary,
            modifier = Modifier.clickable(onClick = onTerms).padding(horizontal = 4.dp, vertical = 8.dp).testTag("plan.terms"),
        )
        Text(" · ", fontSize = 13.sp, color = PlanColors.Muted)
        Text(
            stringResource(R.string.plan_privacy), fontSize = 13.sp, color = PlanColors.Primary,
            modifier = Modifier.clickable(onClick = onPrivacy).padding(horizontal = 4.dp, vertical = 8.dp).testTag("plan.privacy"),
        )
    }
}

@Composable
private fun LogoutLink(onClick: () -> Unit) {
    Text(
        stringResource(R.string.plan_logout),
        fontSize = 14.sp, fontWeight = FontWeight.Medium, color = PlanColors.Text2, textAlign = TextAlign.Center,
        modifier = Modifier.fillMaxWidth().padding(top = 16.dp).clickable(onClick = onClick).padding(vertical = 12.dp).testTag("plan.logout"),
    )
}
