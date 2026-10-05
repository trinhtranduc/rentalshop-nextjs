package com.anyrent.pos.ui.settings.v2

import android.content.Intent
import android.provider.Settings
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.ApiParity
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.domain.error.ApiErrorMessages
import com.anyrent.pos.domain.error.AppError
import com.anyrent.pos.domain.settings.PasswordProblem
import com.anyrent.pos.domain.settings.SettingsGroup
import com.anyrent.pos.domain.settings.SettingsItem
import com.anyrent.pos.domain.settings.SettingsPlan
import com.anyrent.pos.domain.settings.SettingsRows
import com.anyrent.pos.print.ThermalPrinter
import com.anyrent.pos.push.PushRegistrar
import com.anyrent.pos.ui.common.AppAlertConfirm
import com.anyrent.pos.ui.common.AppAlertError
import com.anyrent.pos.ui.home.v2.SectionBand
import com.anyrent.pos.ui.home.v2.ThinDivider
import com.anyrent.pos.ui.home.v2.V2Colors
import com.anyrent.pos.ui.settings.roleDisplayValue
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.Locale

/** Redesigned settings tab (#374, board Cai-dat), shown when `newSettings` is on: links to the existing screens */
@Composable
fun SettingsV2Screen(
    onOpenStore: () -> Unit,
    onOpenPrinter: () -> Unit,
    onOpenCustomers: () -> Unit,
    onOpenUsers: () -> Unit,
    onOpenExport: () -> Unit,
    onOpenAppInfo: () -> Unit,
    onLoggedOut: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var plan by remember { mutableStateOf<SettingsPlan?>(null) }
    var confirmLogout by remember { mutableStateOf(false) }
    var confirmDelete by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var showPassword by remember { mutableStateOf(false) }
    var passwordError by remember { mutableStateOf<String?>(null) }
    var passwordDone by remember { mutableStateOf(false) }
    val role = SessionStore.role

    LaunchedEffect(role) {
        if (role == "ADMIN") return@LaunchedEffect
        plan = withContext(Dispatchers.IO) {
            runCatching { SettingsRows.planFromJson(ApiClient.get().authedGet("/api/subscriptions/status").optJSONObject("data") ?: JSONObject()) }
                .getOrNull()
        }
    }

    val prefs = remember { context.getSharedPreferences("anyrent.printer", 0) }
    val sections = SettingsRows.sections(role, hasPlan = plan != null)

    // #388: totals next to Khách hàng / Người dùng, only for the rows this role sees; a failed call shows nothing
    var counts by remember { mutableStateOf<Map<SettingsItem, Int>>(emptyMap()) }
    LaunchedEffect(role) {
        val visible = sections.flatMap { it.items }
        counts = withContext(Dispatchers.IO) {
            visible.mapNotNull { item ->
                val path = SettingsRows.countPath(item) ?: return@mapNotNull null
                runCatching { SettingsRows.listTotal(ApiClient.get().authedGet(path)) }.getOrNull()?.let { item to it }
            }.toMap()
        }
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

    LazyColumn(Modifier.fillMaxSize().background(DS.Colors.Surface)) {
        item(key = "title") {
            Text(
                stringResource(R.string.settings_v2_title), fontSize = DS.TextSize.Title, fontWeight = FontWeight.Bold, color = DS.Colors.Text,
                modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 12.dp),
            )
        }
        item(key = "profile") {
            Spacer(Modifier.fillMaxWidth().height(8.dp).background(DS.Colors.Background))
            val name = SessionStore.userName?.takeIf { it.isNotBlank() } ?: SessionStore.email.orEmpty()
            val subtitle = listOfNotNull(roleDisplayValue(role).takeIf { it.isNotBlank() }, SessionStore.merchantName?.takeIf { it.isNotBlank() })
                .joinToString(" · ")
            Row(
                Modifier.fillMaxWidth().heightIn(min = 72.dp).padding(horizontal = 16.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Box(Modifier.size(48.dp).clip(CircleShape).background(DS.Colors.Primary), contentAlignment = Alignment.Center) {
                    Text(SettingsRows.initials(SessionStore.userName.orEmpty()), color = Color.White, fontSize = DS.TextSize.Body, fontWeight = FontWeight.Bold)
                }
                Column(Modifier.weight(1f)) {
                    Text(name, fontSize = DS.TextSize.Name, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text)
                    if (subtitle.isNotBlank()) Text(subtitle, fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
                }
            }
        }
        sections.forEach { section ->
            item(key = "band-${section.group}") {
                SectionBand(
                    stringResource(
                        when (section.group) {
                            SettingsGroup.STORE -> R.string.settings_v2_group_store
                            SettingsGroup.MANAGEMENT -> R.string.settings_v2_group_management
                            SettingsGroup.ACCOUNT -> R.string.settings_v2_group_account
                        },
                    ),
                )
            }
            items(section.items, key = { it.name }) { item ->
                val value = when (item) {
                    SettingsItem.RECEIPT_NOTE -> prefs.getString("printerNote", ThermalPrinter.DEFAULT_PRINTER_NOTE).orEmpty()
                        .ifBlank { ThermalPrinter.DEFAULT_PRINTER_NOTE }.replace('\n', ' ')
                    SettingsItem.PRINTER -> prefs.getString("printerIp", "").orEmpty().ifBlank { stringResource(R.string.settings_v2_printer_none) }
                    SettingsItem.CUSTOMERS, SettingsItem.USERS -> counts[item]?.toString()
                    SettingsItem.PLAN -> plan?.let { planText(it) }
                    SettingsItem.LANGUAGE -> Locale.getDefault().let { it.getDisplayLanguage(it).replaceFirstChar { c -> c.titlecase(it) } }
                    else -> null
                }
                SettingRow(title = itemTitle(item), value = value, chevron = item != SettingsItem.PLAN) {
                    when (item) {
                        SettingsItem.STORE_INFO -> onOpenStore()
                        SettingsItem.RECEIPT_NOTE, SettingsItem.PRINTER -> onOpenPrinter()
                        SettingsItem.CUSTOMERS -> onOpenCustomers()
                        SettingsItem.USERS -> onOpenUsers()
                        SettingsItem.EXPORT -> onOpenExport()
                        SettingsItem.PLAN -> Unit
                        SettingsItem.LANGUAGE -> runCatching {
                            context.startActivity(Intent(Settings.ACTION_LOCALE_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                        }
                        SettingsItem.PASSWORD -> showPassword = true
                        SettingsItem.APP_INFO -> onOpenAppInfo()
                        SettingsItem.DELETE_ACCOUNT -> confirmDelete = true
                    }
                }
            }
        }
        item(key = "logout") {
            Spacer(Modifier.fillMaxWidth().height(8.dp).background(DS.Colors.Background))
            Text(
                stringResource(R.string.logout), color = V2Colors.Danger, fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold,
                modifier = Modifier.fillMaxWidth().clickable { confirmLogout = true }.heightIn(min = 48.dp).padding(horizontal = 16.dp, vertical = 14.dp),
            )
            Spacer(Modifier.height(24.dp))
        }
    }

    if (confirmLogout) {
        AppAlertConfirm(
            title = stringResource(R.string.logout),
            message = stringResource(R.string.logout_confirmation),
            confirmLabel = stringResource(R.string.logout),
            destructive = true,
            confirmLoading = busy,
            dismissEnabled = !busy,
            onDismiss = { confirmLogout = false },
            onConfirm = {
                busy = true
                signOut()
            },
        )
    }
    if (confirmDelete) {
        // Same as the current settings screen
        AppAlertConfirm(
            title = stringResource(R.string.delete_account),
            message = stringResource(R.string.delete_account_confirmation),
            confirmLabel = stringResource(R.string.delete),
            destructive = true,
            confirmLoading = busy,
            dismissEnabled = !busy,
            onDismiss = { confirmDelete = false },
            onConfirm = {
                busy = true
                scope.launch {
                    val deleted = withContext(Dispatchers.IO) { ApiParity.deleteAccount().isSuccess }
                    busy = false
                    if (deleted) {
                        SessionStore.clearAuth()
                        onLoggedOut()
                    }
                }
            },
        )
    }
    if (showPassword) {
        PasswordDialog(
            busy = busy,
            onDismiss = { showPassword = false },
            onSubmit = { current, new ->
                busy = true
                scope.launch {
                    val result = withContext(Dispatchers.IO) {
                        runCatching {
                            val body = JSONObject().put("currentPassword", current).put("newPassword", new).toString()
                                .toRequestBody("application/json; charset=utf-8".toMediaType())
                            ApiClient.get().authedPost("/api/auth/change-password", body)
                        }
                    }
                    busy = false
                    result.onSuccess {
                        showPassword = false
                        passwordDone = true
                    }.onFailure { passwordError = ApiErrorMessages.resolve(context, AppError.from(it).code, it.message.orEmpty()) }
                }
            },
        )
    }
    passwordError?.let { message ->
        AppAlertError(message = message.ifBlank { stringResource(R.string.calendar_v2_error) }, onDismiss = { passwordError = null })
    }
    if (passwordDone) {
        // The API revokes every token of the account: sign in again with the new password
        AppAlertConfirm(
            title = stringResource(R.string.change_password),
            message = stringResource(R.string.settings_v2_password_done),
            confirmLabel = stringResource(R.string.ok),
            dismissEnabled = false,
            onDismiss = {},
            onConfirm = {
                passwordDone = false
                signOut()
            },
        )
    }
}

@Composable
private fun planText(plan: SettingsPlan): String {
    val name = if (plan.isTrial) stringResource(R.string.settings_v2_plan_trial) else plan.name
    return when {
        plan.isExpired -> "$name · ${stringResource(R.string.settings_v2_plan_expired)}"
        plan.daysRemaining != null -> "$name · ${stringResource(R.string.settings_v2_plan_days_left, plan.daysRemaining)}"
        else -> name
    }
}

@Composable
private fun itemTitle(item: SettingsItem): String = stringResource(
    when (item) {
        SettingsItem.STORE_INFO -> R.string.store_info
        SettingsItem.RECEIPT_NOTE -> R.string.settings_v2_receipt_note
        SettingsItem.PRINTER -> R.string.settings_v2_printer
        SettingsItem.CUSTOMERS -> R.string.customers
        SettingsItem.USERS -> R.string.settings_v2_users
        SettingsItem.EXPORT -> R.string.export_data
        SettingsItem.PLAN -> R.string.settings_v2_plan
        SettingsItem.LANGUAGE -> R.string.settings_v2_language
        SettingsItem.PASSWORD -> R.string.change_password
        SettingsItem.APP_INFO -> R.string.app_info
        SettingsItem.DELETE_ACCOUNT -> R.string.delete_account
    },
)

@Composable
private fun SettingRow(title: String, value: String?, chevron: Boolean, onClick: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .then(if (chevron) Modifier.clickable(onClick = onClick) else Modifier)
            .heightIn(min = 52.dp)
            .padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(title, fontSize = DS.TextSize.Body, color = DS.Colors.Text)
        Spacer(Modifier.weight(1f))
        if (!value.isNullOrBlank()) {
            Text(value, fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.widthIn(max = 200.dp))
        }
        if (chevron) {
            Icon(Icons.AutoMirrored.Outlined.KeyboardArrowRight, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(DS.Icon.Sm))
        }
    }
    ThinDivider()
}

@Composable
private fun PasswordDialog(busy: Boolean, onDismiss: () -> Unit, onSubmit: (String, String) -> Unit) {
    var current by remember { mutableStateOf("") }
    var new by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }
    var problem by remember { mutableStateOf<PasswordProblem?>(null) }
    AppAlertConfirm(
        title = stringResource(R.string.change_password),
        message = problem?.let {
            stringResource(
                when (it) {
                    PasswordProblem.MISSING_CURRENT -> R.string.settings_v2_password_missing_current
                    PasswordProblem.TOO_SHORT -> R.string.settings_v2_password_too_short
                    PasswordProblem.MISMATCH -> R.string.settings_v2_password_mismatch
                },
            )
        }.orEmpty(),
        confirmLabel = stringResource(R.string.save),
        confirmLoading = busy,
        dismissEnabled = !busy,
        onDismiss = onDismiss,
        onConfirm = {
            problem = SettingsRows.validatePassword(current, new, confirm)
            if (problem == null) onSubmit(current, new)
        },
    ) {
        listOf(
            Triple(R.string.settings_v2_password_current, current) { v: String -> current = v },
            Triple(R.string.settings_v2_password_new, new) { v: String -> new = v },
            Triple(R.string.settings_v2_password_confirm, confirm) { v: String -> confirm = v },
        ).forEach { (label, value, onChange) ->
            OutlinedTextField(
                value = value,
                onValueChange = onChange,
                label = { Text(stringResource(label)) },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
            )
        }
    }
}
