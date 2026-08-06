package com.anyrent.pos.ui.settings

import android.app.Activity
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.outlined.Circle
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.anyrent.pos.R
import com.anyrent.pos.billing.PurchaseCancelledException
import com.anyrent.pos.billing.PurchasesManager
import com.anyrent.pos.billing.RenewPackage
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.model.SubscriptionStatus
import com.anyrent.pos.ui.common.LoadingBox
import com.anyrent.pos.ui.common.SectionLabel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SubscriptionScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val activity = context as? Activity
    val scope = rememberCoroutineScope()

    var loading by remember { mutableStateOf(true) }
    var purchasing by remember { mutableStateOf(false) }
    var status by remember { mutableStateOf<SubscriptionStatus?>(null) }
    var statusError by remember { mutableStateOf<String?>(null) }
    var packages by remember { mutableStateOf<List<RenewPackage>>(emptyList()) }
    var packagesError by remember { mutableStateOf<String?>(null) }
    var selectedProductId by remember { mutableStateOf<String?>(null) }

    val annualSavingsPercent = remember(packages) { annualSavingsPercentVsTwoSemiAnnual(packages) }

    fun reload() {
        scope.launch {
            loading = true
            statusError = null
            packagesError = null
            val statusResult = withContext(Dispatchers.IO) {
                ApiClient.get().getSubscriptionStatus()
            }
            statusResult
                .onSuccess { status = it }
                .onFailure { statusError = it.message ?: context.getString(R.string.subscription_status_error) }

            if (PurchasesManager.isConfigured()) {
                val offerings = PurchasesManager.getRenewPackages()
                offerings
                    .onSuccess { list ->
                        packages = list
                        if (selectedProductId == null || list.none { it.productId == selectedProductId }) {
                            selectedProductId = list.firstOrNull()?.productId
                        }
                    }
                    .onFailure {
                        packagesError = it.message ?: context.getString(R.string.subscription_offerings_error)
                        packages = emptyList()
                    }
            } else {
                packagesError = context.getString(R.string.subscription_sdk_not_configured)
                packages = emptyList()
            }
            loading = false
        }
    }

    LaunchedEffect(Unit) { reload() }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Text(
                        stringResource(R.string.subscription),
                        style = MaterialTheme.typography.titleLarge,
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.back),
                        )
                    }
                },
            )
        },
    ) { padding ->
        if (loading && status == null) {
            Box(Modifier.padding(padding).fillMaxSize()) {
                LoadingBox()
            }
            return@Scaffold
        }

        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp)
                .padding(top = 8.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                SectionLabel(stringResource(R.string.subscription_current))
                SubscriptionCard {
                    if (statusError != null && status == null) {
                        Text(
                            statusError!!,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    } else {
                        val s = status
                        StatusRow(
                            stringResource(R.string.subscription_plan),
                            s?.planName ?: "—",
                        )
                        StatusRow(
                            stringResource(R.string.subscription_status_label),
                            s?.status ?: "—",
                            valueColor = statusValueColor(s?.status),
                        )
                        StatusRow(
                            stringResource(R.string.subscription_expires),
                            formatPeriodEnd(s?.currentPeriodEnd)
                                ?: stringResource(R.string.subscription_no_period),
                        )
                        StatusRow(
                            stringResource(R.string.subscription_days_remaining),
                            s?.daysRemaining?.toString() ?: "—",
                        )
                        s?.statusReason?.takeIf { it.isNotBlank() }?.let { reason ->
                            Text(
                                reason,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                SectionLabel(stringResource(R.string.subscription_choose_plan))
                if (packagesError != null && packages.isEmpty()) {
                    SubscriptionCard {
                        Text(
                            packagesErrorFriendlyMessage(packagesError),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                } else {
                    packages.forEach { pkg ->
                        PlanOptionCard(
                            pkg = pkg,
                            selected = pkg.productId == selectedProductId,
                            annualSavingsPercent = annualSavingsPercent,
                            onSelect = { selectedProductId = pkg.productId },
                        )
                    }
                }
            }

            Button(
                onClick = {
                    val productId = selectedProductId ?: return@Button
                    val act = activity
                    if (act == null) {
                        Toast.makeText(
                            context,
                            context.getString(R.string.subscription_purchase_error),
                            Toast.LENGTH_SHORT,
                        ).show()
                        return@Button
                    }
                    scope.launch {
                        purchasing = true
                        val result = PurchasesManager.purchase(act, productId)
                        purchasing = false
                        result
                            .onSuccess {
                                Toast.makeText(
                                    context,
                                    context.getString(R.string.subscription_purchase_success),
                                    Toast.LENGTH_LONG,
                                ).show()
                                reload()
                            }
                            .onFailure { err ->
                                if (err is PurchaseCancelledException) return@onFailure
                                Toast.makeText(
                                    context,
                                    err.message ?: context.getString(R.string.subscription_purchase_error),
                                    Toast.LENGTH_LONG,
                                ).show()
                            }
                    }
                },
                enabled = !purchasing && !loading && selectedProductId != null && packages.isNotEmpty(),
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 52.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                ),
            ) {
                Text(
                    if (purchasing) {
                        stringResource(R.string.subscription_processing)
                    } else {
                        stringResource(R.string.subscription_renew)
                    },
                    fontWeight = FontWeight.SemiBold,
                )
            }

            TextButton(
                onClick = {
                    scope.launch {
                        purchasing = true
                        val result = PurchasesManager.restore()
                        purchasing = false
                        result
                            .onSuccess { info ->
                                val msg = if (PurchasesManager.hasMerchantEntitlement(info)) {
                                    context.getString(R.string.subscription_restore_success)
                                } else {
                                    context.getString(R.string.subscription_restore_none)
                                }
                                Toast.makeText(context, msg, Toast.LENGTH_LONG).show()
                                reload()
                            }
                            .onFailure { err ->
                                Toast.makeText(
                                    context,
                                    err.message ?: context.getString(R.string.subscription_purchase_error),
                                    Toast.LENGTH_LONG,
                                ).show()
                            }
                    }
                },
                enabled = !purchasing && PurchasesManager.isConfigured(),
                modifier = Modifier.align(Alignment.CenterHorizontally),
            ) {
                Text(
                    stringResource(R.string.subscription_restore),
                    color = MaterialTheme.colorScheme.primary,
                )
            }
        }
    }
}

@Composable
private fun SubscriptionCard(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Column(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(
                width = 1.dp,
                color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.6f),
                shape = RoundedCornerShape(12.dp),
            )
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        content()
    }
}

@Composable
private fun PlanOptionCard(
    pkg: RenewPackage,
    selected: Boolean,
    annualSavingsPercent: Int?,
    onSelect: () -> Unit,
) {
    val borderColor = if (selected) {
        MaterialTheme.colorScheme.primary
    } else {
        MaterialTheme.colorScheme.outlineVariant
    }
    val borderWidth = if (selected) 2.dp else 1.dp

    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(borderWidth, borderColor, RoundedCornerShape(12.dp))
            .clickable(onClick = onSelect)
            .padding(horizontal = 14.dp, vertical = 14.dp)
            .heightIn(min = 72.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                localizedPlanTitle(pkg),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Medium,
                color = if (selected) {
                    MaterialTheme.colorScheme.primary
                } else {
                    MaterialTheme.colorScheme.onSurface
                },
            )
            Text(
                pkg.priceLabel,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.primary,
            )
            if (pkg.productId == PurchasesManager.PRODUCT_ANNUAL && annualSavingsPercent != null) {
                Text(
                    stringResource(
                        R.string.subscription_save_vs_semi_annual,
                        annualSavingsPercent,
                    ),
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
        }
        Icon(
            imageVector = if (selected) Icons.Filled.CheckCircle else Icons.Outlined.Circle,
            contentDescription = null,
            tint = if (selected) {
                MaterialTheme.colorScheme.primary
            } else {
                MaterialTheme.colorScheme.onSurfaceVariant
            },
        )
    }
}

@Composable
private fun StatusRow(
    label: String,
    value: String,
    valueColor: Color = MaterialTheme.colorScheme.onSurface,
) {
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium,
            color = valueColor,
        )
    }
}

@Composable
private fun localizedPlanTitle(pkg: RenewPackage): String = when (pkg.productId) {
    PurchasesManager.PRODUCT_SEMI_ANNUAL -> stringResource(R.string.subscription_plan_6_months)
    PurchasesManager.PRODUCT_ANNUAL -> stringResource(R.string.subscription_plan_12_months)
    else -> pkg.title
}

@Composable
private fun statusValueColor(status: String?): Color {
    if (status?.uppercase()?.contains("ACTIVE") == true) {
        return Color(0xFF2E7D32)
    }
    return MaterialTheme.colorScheme.onSurface
}

private fun formatPeriodEnd(iso: String?): String? {
    if (iso.isNullOrBlank()) return null
    return runCatching {
        val instant = Instant.parse(iso)
        DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM)
            .withZone(ZoneId.systemDefault())
            .format(instant)
    }.getOrElse { iso }
}

@Composable
private fun packagesErrorFriendlyMessage(raw: String?): String {
    if (raw.isNullOrBlank()) return stringResource(R.string.subscription_no_plans)
    val lower = raw.lowercase()
    return if (
        "offerings" in lower ||
        "app store connect" in lower ||
        "storekit" in lower ||
        "configuration" in lower
    ) {
        stringResource(R.string.subscription_plans_store_pending)
    } else {
        raw
    }
}

private fun annualSavingsPercentVsTwoSemiAnnual(packages: List<RenewPackage>): Int? {
    val semi = packages.find { it.productId == PurchasesManager.PRODUCT_SEMI_ANNUAL } ?: return null
    val annual = packages.find { it.productId == PurchasesManager.PRODUCT_ANNUAL } ?: return null
    if (semi.priceAmount <= 0.0) return null
    val twoSemi = semi.priceAmount * 2.0
    if (twoSemi <= annual.priceAmount) return null
    return kotlin.math.round((twoSemi - annual.priceAmount) / twoSemi * 100.0).toInt()
}
