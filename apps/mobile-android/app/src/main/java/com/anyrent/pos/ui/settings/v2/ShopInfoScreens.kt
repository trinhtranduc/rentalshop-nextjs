package com.anyrent.pos.ui.settings.v2

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.ApiParity
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.domain.error.ApiErrorMessages
import com.anyrent.pos.domain.error.AppError
import com.anyrent.pos.domain.money.ShopCurrency
import com.anyrent.pos.domain.money.ShopMoney
import com.anyrent.pos.domain.settings.BranchFormValues
import com.anyrent.pos.domain.settings.BranchRow
import com.anyrent.pos.domain.settings.ShopFormValues
import com.anyrent.pos.domain.settings.ShopInfoLogic
import com.anyrent.pos.ui.common.AppAlertConfirm
import com.anyrent.pos.ui.common.AppAlertError
import com.anyrent.pos.ui.home.v2.SectionBand
import com.anyrent.pos.ui.home.v2.ThinDivider
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** The pages of the owner's "Thông tin cửa hàng" (#1313) */
private sealed class ShopPage {
    object Hub : ShopPage()
    object Shop : ShopPage()
    data class Branch(val outlet: ApiParity.OutletInfo) : ShopPage()
}

/**
 * #1313 "Thông tin cửa hàng" for the shop owner (mockup "Sửa thông tin shop"): CỬA HÀNG (name, phone · MST, address, Sửa, and the
 * Tiền tệ row) and CHI NHÁNH (tap a branch to edit its name, address, phone). iOS: `ShopInfoViewController`.
 */
@Composable
internal fun ShopAndBranchesScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var page by remember { mutableStateOf<ShopPage>(ShopPage.Hub) }
    var shop by remember { mutableStateOf<ApiParity.MerchantInfo?>(null) }
    var branches by remember { mutableStateOf<List<ApiParity.OutletInfo>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var loadError by remember { mutableStateOf<String?>(null) }
    var reload by remember { mutableIntStateOf(0) }

    LaunchedEffect(reload) {
        loading = true
        val profile = withContext(Dispatchers.IO) { ApiParity.getMerchantInfo() }
        val list = withContext(Dispatchers.IO) { ApiParity.getBranches() }
        profile.onSuccess { shop = it; SessionStore.merchantName = it.name }
        list.onSuccess { branches = it }
        loadError = (profile.exceptionOrNull() ?: list.exceptionOrNull())?.let { failure ->
            val id = ApiErrorMessages.stringId(AppError.from(failure).code)
            if (id != 0) context.getString(id) else failure.message
        }
        loading = false
    }

    BackHandler(enabled = page != ShopPage.Hub) { page = ShopPage.Hub }

    when (val current = page) {
        ShopPage.Hub -> ShopHub(
            shop = shop, branches = branches, loading = loading,
            onBack = onBack,
            onEditShop = { page = ShopPage.Shop },
            onOpenBranch = { page = ShopPage.Branch(it) },
        )
        ShopPage.Shop -> {
            val saved = shop
            var form by remember(saved) {
                mutableStateOf(
                    StoreForm(
                        name = saved?.name.orEmpty(), phone = saved?.phone.orEmpty(), taxId = saved?.taxId.orEmpty(),
                        address = saved?.address.orEmpty(), city = saved?.city.orEmpty(), state = saved?.state.orEmpty(),
                        country = saved?.country.orEmpty(), zipCode = saved?.zipCode.orEmpty(), description = saved?.description.orEmpty(),
                    ),
                )
            }
            var saving by remember { mutableStateOf(false) }
            var submitted by remember { mutableStateOf(false) }
            var error by remember { mutableStateOf<String?>(null) }
            StoreInfoV2Page(
                kind = StoreFormKind.SHOP,
                title = stringResource(R.string.shopinfo_title_shop),
                subtitle = null,
                form = form,
                onChange = { form = it },
                canEdit = true,
                loadingInitial = false,
                saving = saving,
                nameError = submitted && form.name.isBlank(),
                message = null,
                error = error,
                onBack = { page = ShopPage.Hub },
                onSave = {
                    submitted = true
                    val values = ShopFormValues(
                        form.name, form.phone, form.taxId, form.address, form.state, form.city, form.country, form.zipCode, form.description,
                    )
                    if (ShopInfoLogic.problem(values) == null && !saving) {
                        saving = true
                        error = null
                        scope.launch {
                            val result = withContext(Dispatchers.IO) { ApiParity.updateMerchantInfo(ShopInfoLogic.shopPayload(values)) }
                            saving = false
                            result.onSuccess {
                                reload++
                                page = ShopPage.Hub
                            }.onFailure { failure ->
                                val id = ApiErrorMessages.stringId(AppError.from(failure).code)
                                error = if (id != 0) context.getString(id) else failure.message
                            }
                        }
                    }
                },
            )
        }
        is ShopPage.Branch -> BranchForm(
            outlet = current.outlet,
            editable = ShopInfoLogic.canEditBranch(SessionStore.role, current.outlet.id, SessionStore.outletId),
            subtitle = shop?.name?.takeIf { it.isNotBlank() }?.let { stringResource(R.string.shopinfo_belongs_to, it) },
            title = stringResource(R.string.shopinfo_title_branch),
            onBack = { page = ShopPage.Hub },
            onSaved = {
                reload++
                page = ShopPage.Hub
            },
        )
    }
}

/** The branch form: the owner picks a branch from the list, the branch manager opens their own, staff only view */
@Composable
private fun BranchForm(
    outlet: ApiParity.OutletInfo,
    editable: Boolean,
    subtitle: String?,
    title: String,
    onBack: () -> Unit,
    onSaved: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var form by remember(outlet) { mutableStateOf(StoreForm(name = outlet.name, phone = outlet.phone.orEmpty(), address = outlet.address.orEmpty())) }
    var saving by remember { mutableStateOf(false) }
    var submitted by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val values = BranchFormValues(form.name, form.phone, form.address)
    val problem = ShopInfoLogic.problem(values)
    StoreInfoV2Page(
        kind = StoreFormKind.BRANCH,
        title = title,
        subtitle = subtitle,
        form = form,
        onChange = { if (editable) form = it },
        canEdit = editable,
        loadingInitial = false,
        saving = saving,
        nameError = submitted && problem == ShopInfoLogic.Problem.NAME_REQUIRED,
        addressError = submitted && problem == ShopInfoLogic.Problem.ADDRESS_REQUIRED,
        message = null,
        error = error,
        onBack = onBack,
        onSave = {
            submitted = true
            if (problem == ShopInfoLogic.Problem.ADDRESS_REQUIRED) {
                error = context.getString(R.string.shopinfo_address_required)
            } else if (problem == null && !saving) {
                saving = true
                error = null
                scope.launch {
                    val result = withContext(Dispatchers.IO) { ApiParity.updateBranch(outlet.id, ShopInfoLogic.branchPayload(values)) }
                    saving = false
                    result.onSuccess {
                        if (outlet.id == SessionStore.outletId) {
                            SessionStore.outletName = values.name.trim()
                            SessionStore.outletAddress = values.address.trim().takeIf { it.isNotEmpty() }
                            SessionStore.outletPhone = values.phone.trim().takeIf { it.isNotEmpty() }
                        }
                        onSaved()
                    }.onFailure { failure ->
                        val id = ApiErrorMessages.stringId(AppError.from(failure).code)
                        error = if (id != 0) context.getString(id) else failure.message
                    }
                }
            }
        },
    )
}

/**
 * #1313 the own branch for everyone but the owner: the branch manager edits it, staff only view it. The Settings row is
 * "Thông tin chi nhánh". iOS: `ShopInfoRouter` → `EditStoreViewController` (kind branch).
 */
@Composable
internal fun OwnBranchScreen(editable: Boolean, onBack: () -> Unit) {
    var outlet by remember { mutableStateOf<ApiParity.OutletInfo?>(null) }
    var loading by remember { mutableStateOf(true) }
    var shopName by remember { mutableStateOf(SessionStore.merchantName.orEmpty()) }
    LaunchedEffect(Unit) {
        SessionStore.outletId?.let { id ->
            withContext(Dispatchers.IO) { ApiParity.getOutlet(id) }.onSuccess { outlet = it }
        }
        loading = false
    }
    val own = outlet
    val subtitle = when {
        !editable -> stringResource(R.string.shopinfo_view_only)
        shopName.isNotBlank() -> stringResource(R.string.shopinfo_your_branch, shopName)
        else -> null
    }
    if (own == null) {
        StoreInfoV2Page(
            kind = StoreFormKind.BRANCH, title = stringResource(R.string.shopinfo_branch_info), subtitle = subtitle,
            form = StoreForm(), onChange = {}, canEdit = false, loadingInitial = loading, saving = false, nameError = false,
            message = null, error = null, onBack = onBack, onSave = {},
        )
    } else {
        BranchForm(
            outlet = own, editable = editable, subtitle = subtitle, title = stringResource(R.string.shopinfo_branch_info),
            onBack = onBack, onSaved = onBack,
        )
    }
}

@Composable
private fun ShopHub(
    shop: ApiParity.MerchantInfo?,
    branches: List<ApiParity.OutletInfo>,
    loading: Boolean,
    onBack: () -> Unit,
    onEditShop: () -> Unit,
    onOpenBranch: (ApiParity.OutletInfo) -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    // #1145 "Tiền tệ" (moved here from the Settings list, #1313): a choice, then a confirm, then PUT /api/settings/currency
    val currency by SessionStore.currencyFlow.collectAsState()
    var currencyChoice by remember { mutableStateOf(false) }
    var currencyTarget by remember { mutableStateOf<ShopCurrency?>(null) }
    var currencySaving by remember { mutableStateOf(false) }
    var currencyError by remember { mutableStateOf<String?>(null) }
    val currencyFailedText = stringResource(R.string.settings_v2_currency_failed)

    fun saveCurrency(target: ShopCurrency) {
        if (currencySaving) return
        currencySaving = true
        scope.launch {
            val result = withContext(Dispatchers.IO) { ApiClient.get().setCurrency(target) }
            currencySaving = false
            currencyTarget = null
            result.onFailure { failure ->
                val id = ApiErrorMessages.stringId(AppError.from(failure).code)
                currencyError = if (id != 0) context.getString(id) else currencyFailedText
            }
        }
    }

    val rows = ShopInfoLogic.branchRows(
        branches.map { BranchRow(it.id, it.name, it.isActive, it.isDefault) },
    ).mapNotNull { row -> branches.firstOrNull { it.id == row.id } }

    SettingsDetailPage(title = stringResource(R.string.store_info), onBack = onBack) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
            SectionBand(stringResource(R.string.settings_v2_group_store))
            Row(
                Modifier.fillMaxWidth().heightIn(min = 64.dp).padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(shop?.name.orEmpty(), fontSize = DS.TextSize.Body, fontWeight = FontWeight.Bold, color = DS.Colors.Text)
                    val summary = ShopInfoLogic.shopSummary(shop?.phone, shop?.taxId, stringResource(R.string.shopinfo_tax_id_short))
                    if (summary.isNotEmpty()) Text(summary, fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
                    val address = ShopInfoLogic.addressLine(shop?.address, shop?.state, shop?.city)
                    if (address.isNotEmpty()) Text(address, fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
                }
                TextButton(onClick = onEditShop, enabled = shop != null) {
                    Text(stringResource(R.string.edit), fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = DS.Colors.Primary)
                }
            }
            ThinDivider()
            SettingRow(title = stringResource(R.string.settings_v2_currency), value = currency.code, chevron = true) { currencyChoice = true }
            SectionBand(stringResource(R.string.shopinfo_branches, rows.size)) {
                Text(stringResource(R.string.shopinfo_tap_to_edit), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
            }
            if (loading && rows.isEmpty()) {
                Text(stringResource(R.string.loading), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted, modifier = Modifier.padding(16.dp))
            }
            rows.forEach { outlet ->
                Row(
                    Modifier.fillMaxWidth().clickable { onOpenBranch(outlet) }.heightIn(min = 64.dp).padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text(outlet.name, fontSize = DS.TextSize.Body, fontWeight = FontWeight.Bold, color = DS.Colors.Text)
                            if (outlet.isDefault == true) {
                                Text(stringResource(R.string.shopinfo_main), fontSize = DS.TextSize.Secondary, color = DS.Colors.Primary)
                            }
                        }
                        outlet.address?.let { Text(it, fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted) }
                        outlet.phone?.let { Text(it, fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted) }
                    }
                    Icon(Icons.AutoMirrored.Outlined.KeyboardArrowRight, contentDescription = null, tint = Color(0xFF94A3B8))
                }
                ThinDivider()
            }
            Text(
                stringResource(R.string.shopinfo_web_hint), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted,
                modifier = Modifier.padding(16.dp),
            )
        }
    }

    if (currencyChoice) {
        CurrencyChoiceDialog(
            current = currency,
            onDismiss = { currencyChoice = false },
            onPick = { picked ->
                currencyChoice = false
                if (picked != currency) currencyTarget = picked
            },
        )
    }
    currencyTarget?.let { target ->
        AppAlertConfirm(
            title = stringResource(R.string.settings_v2_currency_confirm_title, target.code),
            message = stringResource(R.string.settings_v2_currency_confirm_message, target.code, ShopMoney.example(currency, target)),
            confirmLabel = stringResource(R.string.settings_v2_currency_confirm_button, target.code),
            confirmLoading = currencySaving,
            dismissEnabled = !currencySaving,
            onDismiss = { currencyTarget = null },
            onConfirm = { saveCurrency(target) },
        )
    }
    currencyError?.let { message -> AppAlertError(message = message, onDismiss = { currencyError = null }) }
}
