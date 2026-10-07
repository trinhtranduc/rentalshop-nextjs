package com.anyrent.pos.ui.settings.v2

import android.content.Context
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.anyrent.pos.R
import com.anyrent.pos.data.repository.BankAccountRepository
import com.anyrent.pos.data.repository.BankOutlet
import com.anyrent.pos.domain.bank.BankAccountProblem
import com.anyrent.pos.domain.bank.BankAccountRules
import com.anyrent.pos.domain.bank.OutletBankAccount
import com.anyrent.pos.domain.bank.VietQr
import com.anyrent.pos.domain.error.ApiErrorMessages
import com.anyrent.pos.domain.error.AppError
import com.anyrent.pos.ui.common.AppAlertConfirm
import com.anyrent.pos.ui.common.AppAlertError
import com.anyrent.pos.ui.common.AppFormSheet
import com.anyrent.pos.ui.common.AppIcon
import com.anyrent.pos.ui.common.AppSearchField
import com.anyrent.pos.ui.home.v2.SectionBand
import com.anyrent.pos.ui.home.v2.ThinDivider
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** API message for a failure: a known error code reads as its string, anything else as the API text */
private fun errorText(context: Context, failure: Throwable): String {
    val error = AppError.from(failure)
    val id = ApiErrorMessages.stringId(error.code)
    return if (id != 0) context.getString(id) else error.message
}

/** Form target: a new account or the one being edited */
private sealed interface BankForm {
    data object New : BankForm
    data class Edit(val account: OutletBankAccount) : BankForm
}

/**
 * #622 Settings → Tài khoản ngân hàng (MERCHANT / OUTLET_ADMIN), iOS `BankAccountViewController` (v2 look):
 * the outlet's active accounts (default first), + to add, a row to edit or delete. A MERCHANT login has no outlet
 * of its own: the default outlet is used and an outlet row appears when the shop has several.
 */
@Composable
fun BankAccountsScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var outlets by remember { mutableStateOf<List<BankOutlet>>(emptyList()) }
    var outletId by remember { mutableStateOf<Int?>(null) }
    var accounts by remember { mutableStateOf<List<OutletBankAccount>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var form by remember { mutableStateOf<BankForm?>(null) }
    var choosingOutlet by remember { mutableStateOf(false) }

    fun load() {
        val outlet = outletId ?: run { loading = false; return }
        loading = true
        scope.launch {
            val result = withContext(Dispatchers.IO) { runCatching { BankAccountRepository.list(outlet) } }
            result.onSuccess { accounts = it }.onFailure { error = errorText(context, it) }
            loading = false
        }
    }

    LaunchedEffect(Unit) {
        val result = withContext(Dispatchers.IO) { runCatching { BankAccountRepository.outlets() } }
        result.onSuccess { list ->
            outlets = list
            outletId = list.firstOrNull()?.id
        }.onFailure { error = errorText(context, it) }
        load()
    }

    form?.let { current ->
        val outlet = outletId ?: return@let
        BankAccountFormPage(
            outletId = outlet,
            editing = (current as? BankForm.Edit)?.account,
            onClose = { form = null },
            onSaved = {
                form = null
                load()
            },
        )
        return
    }

    SettingsDetailPage(
        title = stringResource(R.string.bank_accounts),
        onBack = onBack,
        actions = {
            IconButton(onClick = { if (outletId != null) form = BankForm.New }) {
                AppIcon(Icons.Outlined.Add, contentDescription = stringResource(R.string.bank_account_add), size = DS.Icon.Sm, tint = DS.Colors.Text)
            }
        },
    ) {
        LazyColumn(Modifier.fillMaxSize()) {
            if (outlets.size > 1) {
                item(key = "outlet") {
                    SettingsDetailRow(
                        title = stringResource(R.string.bank_account_outlet),
                        value = outlets.firstOrNull { it.id == outletId }?.name,
                        chevron = true,
                        onClick = { choosingOutlet = true },
                    )
                }
            }
            items(accounts, key = { it.id }) { account ->
                BankAccountRow(account) { form = BankForm.Edit(account) }
            }
            if (!loading && accounts.isEmpty()) {
                item(key = "empty") {
                    Text(
                        stringResource(R.string.bank_accounts_empty), fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted,
                        textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(horizontal = 32.dp, vertical = 48.dp),
                    )
                }
            }
        }
    }

    if (choosingOutlet) {
        AppFormSheet(onDismiss = { choosingOutlet = false }) {
            Column(Modifier.padding(bottom = 24.dp)) {
                SectionBand(stringResource(R.string.bank_account_outlet))
                outlets.forEach { outlet ->
                    SettingsDetailRow(title = outlet.name, selected = outlet.id == outletId, onClick = {
                        choosingOutlet = false
                        if (outlet.id != outletId) {
                            outletId = outlet.id
                            accounts = emptyList()
                            load()
                        }
                    })
                }
            }
        }
    }
    error?.let { AppAlertError(message = it, onDismiss = { error = null }) }
}

/** Bank name (+ "Mặc định" pill), "number · holder", branch, chevron */
@Composable
private fun BankAccountRow(account: OutletBankAccount, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).heightIn(min = 64.dp).padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(account.bankName, fontSize = DS.TextSize.Body, fontWeight = FontWeight.Bold, color = DS.Colors.Text, modifier = Modifier.weight(1f, fill = false))
                if (account.isDefault) SettingsDetailPill(stringResource(R.string.bank_account_default), DS.Status.Done)
            }
            Text("${account.accountNumber} · ${account.accountHolderName}", fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
            account.branch?.let { Text(it, fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted) }
        }
        Icon(Icons.AutoMirrored.Outlined.KeyboardArrowRight, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(DS.Icon.Sm))
    }
    ThinDivider()
}

/** Add / edit: bank (picker), number, holder, branch, default switch; Lưu (+ Xóa when editing). iOS `BankAccountFormViewController`. */
@Composable
private fun BankAccountFormPage(outletId: Int, editing: OutletBankAccount?, onClose: () -> Unit, onSaved: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var bankName by remember { mutableStateOf(editing?.bankName.orEmpty()) }
    var number by remember { mutableStateOf(editing?.accountNumber.orEmpty()) }
    var holder by remember { mutableStateOf(editing?.accountHolderName.orEmpty()) }
    var branch by remember { mutableStateOf(editing?.branch.orEmpty()) }
    var isDefault by remember { mutableStateOf(editing?.isDefault ?: false) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var picking by remember { mutableStateOf(false) }
    var confirmDelete by remember { mutableStateOf(false) }
    BackHandler(onBack = onClose)

    fun save() {
        when (BankAccountRules.validate(bankName, number, holder)) {
            BankAccountProblem.NO_BANK -> { error = context.getString(R.string.bank_account_need_bank); return }
            BankAccountProblem.NO_NUMBER -> { error = context.getString(R.string.bank_account_need_number); return }
            BankAccountProblem.NO_HOLDER -> { error = context.getString(R.string.bank_account_need_holder); return }
            null -> Unit
        }
        val body = BankAccountRules.body(bankName, number, holder, branch, isDefault)
        busy = true
        scope.launch {
            val result = withContext(Dispatchers.IO) {
                runCatching {
                    if (editing == null) BankAccountRepository.create(outletId, body)
                    else BankAccountRepository.update(outletId, editing.id, body)
                }
            }
            busy = false
            result.onSuccess { onSaved() }.onFailure { error = errorText(context, it) }
        }
    }

    fun delete() {
        val account = editing ?: return
        busy = true
        scope.launch {
            val result = withContext(Dispatchers.IO) { runCatching { BankAccountRepository.delete(outletId, account.id) } }
            busy = false
            confirmDelete = false
            result.onSuccess { onSaved() }.onFailure { error = errorText(context, it) }
        }
    }

    SettingsDetailPage(
        title = stringResource(if (editing == null) R.string.bank_account_add else R.string.bank_account_edit),
        onBack = onClose,
        bottomBar = {
            SettingsDetailPrimaryButton(text = stringResource(R.string.save), onClick = ::save, loading = busy)
            if (editing != null) SettingsDetailSecondaryButton(text = stringResource(R.string.delete), onClick = { confirmDelete = true }, enabled = !busy)
        },
    ) {
        Column(
            Modifier.fillMaxSize().imePadding().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            val bankLabel = stringResource(R.string.bank_account_bank)
            Box(Modifier.fillMaxWidth()) {
                SettingsDetailField(
                    label = bankLabel,
                    value = bankName.ifBlank { stringResource(R.string.bank_account_select_bank) },
                    onValueChange = {},
                    enabled = false,
                )
                // The disabled field does not take taps; this layer opens the picker
                Box(Modifier.matchParentSize().clickable { picking = true }.semantics { contentDescription = bankLabel })
            }
            SettingsDetailField(
                label = stringResource(R.string.bank_account_number), value = number, onValueChange = { number = it.filter(Char::isDigit) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            )
            SettingsDetailField(
                label = stringResource(R.string.bank_account_holder), value = holder, onValueChange = { holder = it },
                keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Characters),
            )
            SettingsDetailField(label = stringResource(R.string.bank_account_branch), value = branch, onValueChange = { branch = it })
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    stringResource(R.string.bank_account_set_default), fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold,
                    color = DS.Colors.Text, modifier = Modifier.weight(1f),
                )
                Switch(
                    checked = isDefault, onCheckedChange = { isDefault = it },
                    colors = SwitchDefaults.colors(checkedThumbColor = Color.White, checkedTrackColor = Color(0xFF34C759), checkedBorderColor = Color(0xFF34C759)),
                )
            }
        }
    }

    if (picking) {
        BankPickerSheet(selected = bankName, onDismiss = { picking = false }) {
            bankName = it
            picking = false
        }
    }
    if (confirmDelete && editing != null) {
        AppAlertConfirm(
            title = stringResource(R.string.bank_account_delete_title),
            message = stringResource(R.string.bank_account_delete_message, editing.bankName),
            confirmLabel = stringResource(R.string.delete),
            destructive = true,
            confirmLoading = busy,
            dismissEnabled = !busy,
            onDismiss = { confirmDelete = false },
            onConfirm = ::delete,
        )
    }
    error?.let { AppAlertError(message = it, onDismiss = { error = null }) }
}

/** Searchable bank list (names with a VietQR BIN, as the iOS picker) */
@Composable
private fun BankPickerSheet(selected: String, onDismiss: () -> Unit, onPick: (String) -> Unit) {
    var query by remember { mutableStateOf("") }
    val banks = VietQr.bankNames.filter { it.contains(query.trim(), ignoreCase = true) }
    AppFormSheet(onDismiss = onDismiss, fullScreen = true) {
        SettingsDetailPage(title = stringResource(R.string.bank_account_select_bank), onBack = onDismiss) {
            AppSearchField(
                value = query, onValueChange = { query = it }, placeholder = stringResource(R.string.bank_account_search),
                modifier = Modifier.fillMaxWidth().padding(16.dp), leadingIconSize = DS.Icon.Sm,
            )
            LazyColumn(Modifier.fillMaxSize()) {
                items(banks, key = { it }) { name ->
                    SettingsDetailRow(title = name, value = VietQr.binByBankName[name], selected = name == selected, onClick = { onPick(name) })
                }
            }
        }
    }
}
