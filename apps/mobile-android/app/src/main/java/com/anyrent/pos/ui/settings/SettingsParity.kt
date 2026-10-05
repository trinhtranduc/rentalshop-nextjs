package com.anyrent.pos.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.background
import com.anyrent.pos.BuildConfig
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiParity
import com.anyrent.pos.data.PermissionManager
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.data.model.StaffUser
import com.anyrent.pos.print.ThermalPrinter
import com.anyrent.pos.ui.common.AppAlertError
import com.anyrent.pos.ui.common.AppCard
import com.anyrent.pos.ui.common.AppFilterChip
import com.anyrent.pos.ui.common.AppInputField
import com.anyrent.pos.ui.common.AppPrimaryButton
import com.anyrent.pos.ui.common.AppSecondaryButton
import com.anyrent.pos.ui.home.v2.SectionBand
import com.anyrent.pos.ui.home.v2.V2Colors
import com.anyrent.pos.ui.home.v2.V2Segmented
import com.anyrent.pos.ui.settings.v2.SettingsDetailField
import com.anyrent.pos.ui.settings.v2.SettingsDetailNote
import com.anyrent.pos.ui.settings.v2.SettingsDetailPage
import com.anyrent.pos.ui.settings.v2.SettingsDetailPrimaryButton
import com.anyrent.pos.ui.settings.v2.SettingsDetailSecondaryButton
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StoreInfoScreen(onBack: () -> Unit, v2: Boolean = false) {
    val context = LocalContext.current
    val canEdit = PermissionManager.canManageStore()
    var name by remember { mutableStateOf(SessionStore.outletName ?: SessionStore.merchantName.orEmpty()) }
    var address by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var loadingInitial by remember { mutableStateOf(true) }
    var submitted by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        val outletId = SessionStore.outletId
        if (outletId == null) {
            loadingInitial = false
            return@LaunchedEffect
        }
        val result = withContext(Dispatchers.IO) { ApiParity.getOutlet(outletId) }
        result.onSuccess { outlet ->
            name = outlet.name
            address = outlet.address.orEmpty()
            phone = outlet.phone.orEmpty()
            SessionStore.outletName = outlet.name
            SessionStore.outletAddress = outlet.address
            SessionStore.outletPhone = outlet.phone
        }
        loadingInitial = false
    }

    fun saveStore() {
        submitted = true
        message = null
        if (name.isBlank()) {
            error = context.getString(R.string.invalid_store_input)
            return
        }
        val outletId = SessionStore.outletId
        if (outletId == null) {
            error = context.getString(R.string.no_outlet_assigned)
            return
        }
        loading = true
        error = null
        scope.launch {
            val result = withContext(Dispatchers.IO) {
                ApiParity.updateOutlet(outletId, name, address, phone)
            }
            loading = false
            result.onSuccess {
                SessionStore.outletName = name
                SessionStore.outletAddress = address.takeIf { it.isNotBlank() }
                SessionStore.outletPhone = phone.takeIf { it.isNotBlank() }
                message = context.getString(R.string.saved)
            }.onFailure { error = it.message }
        }
    }

    // #459: new style when opened from Settings v2 (`newSettings`); same fields, permission and save
    if (v2) {
        SettingsDetailPage(
            title = stringResource(R.string.store_info),
            onBack = onBack,
            bottomBar = if (canEdit) {
                {
                    SettingsDetailPrimaryButton(
                        text = stringResource(R.string.save),
                        onClick = ::saveStore,
                        enabled = !loadingInitial,
                        loading = loading,
                    )
                }
            } else {
                null
            },
        ) {
            Column(Modifier.fillMaxSize().imePadding().verticalScroll(rememberScrollState())) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(DS.Gap.LineTight)) {
                    Text(SessionStore.userName ?: "—", fontSize = DS.TextSize.Name, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text)
                    Text(roleDisplayValue(SessionStore.role), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
                    Text(
                        stringResource(R.string.merchant_label, SessionStore.merchantName ?: SessionStore.merchantId?.toString() ?: "—"),
                        fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted,
                    )
                }
                SectionBand(stringResource(R.string.store_info))
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    if (loadingInitial) {
                        SettingsDetailNote(stringResource(R.string.loading))
                    } else {
                        SettingsDetailField(
                            label = stringResource(R.string.store_name_required),
                            value = name,
                            onValueChange = { if (canEdit) name = it },
                            isError = submitted && name.isBlank(),
                        )
                        SettingsDetailField(
                            label = stringResource(R.string.address),
                            value = address,
                            onValueChange = { if (canEdit) address = it },
                            singleLine = false,
                            minLines = 2,
                        )
                        SettingsDetailField(
                            label = stringResource(R.string.phone),
                            value = phone,
                            onValueChange = { if (canEdit) phone = it },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        )
                    }
                    if (!canEdit) SettingsDetailNote(stringResource(R.string.no_permission_manage_store), V2Colors.Danger)
                    message?.let { SettingsDetailNote(it, DS.Colors.Primary) }
                    error?.let { SettingsDetailNote(it, V2Colors.Danger) }
                }
            }
        }
    } else {
        Scaffold(
            containerColor = MaterialTheme.colorScheme.background,
            topBar = {
                TopAppBar(
                    title = {
                        Text(
                            stringResource(R.string.store_info),
                            style = MaterialTheme.typography.titleLarge,
                        )
                    },
                    navigationIcon = {
                        IconButton(onClick = onBack) {
                            Icon(Icons.Default.Close, contentDescription = stringResource(R.string.close))
                        }
                    },
                )
            },
            bottomBar = {
                if (canEdit) {
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .background(MaterialTheme.colorScheme.surface)
                            .navigationBarsPadding()
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                    ) {
                        AppPrimaryButton(
                            text = if (loading) stringResource(R.string.loading)
                            else stringResource(R.string.save),
                            onClick = ::saveStore,
                            enabled = !loading && !loadingInitial,
                        )
                    }
                }
            },
        ) { padding ->
            Column(
                Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .imePadding()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                AppCard(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                ) {
                    Column(
                        Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Text(
                            SessionStore.userName ?: "—",
                            style = MaterialTheme.typography.titleMedium,
                        )
                        Text(
                            roleDisplayValue(SessionStore.role),
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            style = MaterialTheme.typography.bodyMedium,
                        )
                        Text(
                            stringResource(
                                R.string.merchant_label,
                                SessionStore.merchantName ?: SessionStore.merchantId?.toString() ?: "—",
                            ),
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    }
                }

                AppCard(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                ) {
                    Column(
                        Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        if (loadingInitial) {
                            Text(
                                stringResource(R.string.loading),
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        } else {
                            AppInputField(
                                value = name,
                                onValueChange = { if (canEdit) name = it },
                                label = stringResource(R.string.store_name_required),
                                isError = submitted && name.isBlank(),
                            )
                            AppInputField(
                                value = address,
                                onValueChange = { if (canEdit) address = it },
                                label = stringResource(R.string.address),
                                singleLine = false,
                                minLines = 2,
                            )
                            AppInputField(
                                value = phone,
                                onValueChange = { if (canEdit) phone = it },
                                label = stringResource(R.string.phone),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                            )
                        }
                    }
                }

                if (!canEdit) {
                    Text(
                        stringResource(R.string.no_permission_manage_store),
                        color = MaterialTheme.colorScheme.error,
                    )
                }
                message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
                error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PrinterNetworkScreen(onBack: () -> Unit, v2: Boolean = false) {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("anyrent.printer", 0) }
    var name by remember { mutableStateOf(prefs.getString("printerName", "").orEmpty()) }
    var ip by remember { mutableStateOf(prefs.getString("printerIp", "").orEmpty()) }
    var port by remember { mutableStateOf(prefs.getString("printerPort", "9100").orEmpty()) }
    var paper by remember { mutableStateOf(prefs.getString("paperWidth", "80").orEmpty()) }
    var note by remember {
        mutableStateOf(
            prefs.getString("printerNote", ThermalPrinter.DEFAULT_PRINTER_NOTE)
                .orEmpty()
                .ifBlank { ThermalPrinter.DEFAULT_PRINTER_NOTE },
        )
    }
    var message by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun persist() {
        prefs.edit()
            .putString("printerName", name)
            .putString("printerIp", ip)
            .putString("printerPort", port)
            .putString("paperWidth", paper)
            .putString("printerNote", note)
            .apply()
    }

    fun testPrint() {
        persist()
        val config = ThermalPrinter.Config(
            ip = ip,
            port = port.toIntOrNull() ?: 9100,
            paperWidthMm = paper.toIntOrNull() ?: 80,
            name = name,
            note = note,
        )
        scope.launch {
            val result = withContext(Dispatchers.IO) { ThermalPrinter.testPrint(config) }
            message = when (result) {
                is ThermalPrinter.Result.Success -> context.getString(R.string.test_print_ok)
                is ThermalPrinter.Result.Failure -> result.message
            }
        }
    }

    fun save() {
        persist()
        message = context.getString(R.string.saved)
    }

    // #459: new style when opened from Settings v2 (`newSettings`); same fields, test print and save
    if (v2) {
        SettingsDetailPage(
            title = stringResource(R.string.printer_config),
            onBack = onBack,
            bottomBar = {
                SettingsDetailSecondaryButton(text = stringResource(R.string.test_print), onClick = ::testPrint)
                SettingsDetailPrimaryButton(text = stringResource(R.string.save), onClick = ::save)
            },
        ) {
            Column(
                Modifier.fillMaxSize().imePadding().verticalScroll(rememberScrollState()).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                SettingsDetailNote(stringResource(R.string.printer_hint))
                SettingsDetailField(label = stringResource(R.string.printer_name), value = name, onValueChange = { name = it })
                SettingsDetailField(
                    label = stringResource(R.string.printer_ip), value = ip, onValueChange = { ip = it },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                )
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    SettingsDetailField(
                        label = stringResource(R.string.printer_port), value = port, onValueChange = { port = it.filter(Char::isDigit) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.weight(1f),
                    )
                    SettingsDetailField(
                        label = stringResource(R.string.paper_width), value = paper, onValueChange = { paper = it.filter(Char::isDigit) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.weight(1f),
                    )
                }
                SettingsDetailField(
                    label = stringResource(R.string.printer_note), value = note, onValueChange = { note = it },
                    singleLine = false, minLines = 4,
                )
                message?.let { SettingsDetailNote(it, DS.Colors.Primary) }
            }
        }
    } else {
        Scaffold(
            containerColor = MaterialTheme.colorScheme.background,
            topBar = {
                TopAppBar(
                    title = {
                        Text(
                            stringResource(R.string.printer_config),
                            style = MaterialTheme.typography.titleLarge,
                        )
                    },
                    navigationIcon = {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surface,
                    ),
                )
            },
            bottomBar = {
                Column(
                    Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surface)
                        .navigationBarsPadding()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    AppSecondaryButton(
                        text = stringResource(R.string.test_print),
                        onClick = ::testPrint,
                    )
                    AppPrimaryButton(
                        text = stringResource(R.string.save),
                        onClick = ::save,
                    )
                }
            },
        ) { padding ->
            Column(
                Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .imePadding()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Text(
                    stringResource(R.string.printer_hint),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                AppCard(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                ) {
                    Column(
                        Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        AppInputField(
                            value = name,
                            onValueChange = { name = it },
                            label = stringResource(R.string.printer_name),
                        )
                        AppInputField(
                            value = ip,
                            onValueChange = { ip = it },
                            label = stringResource(R.string.printer_ip),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        )
                        AppInputField(
                            value = port,
                            onValueChange = { port = it.filter(Char::isDigit) },
                            label = stringResource(R.string.printer_port),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        )
                        AppInputField(
                            value = paper,
                            onValueChange = { paper = it.filter(Char::isDigit) },
                            label = stringResource(R.string.paper_width),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        )
                        AppInputField(
                            value = note,
                            onValueChange = { note = it },
                            label = stringResource(R.string.printer_note),
                            singleLine = false,
                            minLines = 4,
                        )
                    }
                }
                message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UserFormScreen(initial: StaffUser?, onBack: () -> Unit, onSaved: () -> Unit, v2: Boolean = false) {
    var firstName by remember { mutableStateOf(initial?.firstName.orEmpty()) }
    var lastName by remember { mutableStateOf(initial?.lastName.orEmpty()) }
    var email by remember { mutableStateOf(initial?.email.orEmpty()) }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var role by remember { mutableStateOf(initial?.role ?: "OUTLET_STAFF") }
    var active by remember { mutableStateOf(initial?.isActive ?: true) }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    fun saveUser() {
        if (firstName.isBlank() || (initial == null && email.isBlank())) {
            error = "Name and email are required"
            return
        }
        if (initial == null && (password.length < 6 || password != confirmPassword)) {
            error = if (password.length < 6) "Password must contain at least 6 characters"
            else "Passwords do not match"
            return
        }
        loading = true
        error = null
        scope.launch {
            val result = withContext(Dispatchers.IO) {
                if (initial == null) {
                    ApiParity.createUser(firstName, lastName, email, password, role, SessionStore.outletId)
                } else {
                    ApiParity.updateUser(initial.id, firstName, lastName, role, active, SessionStore.outletId)
                }
            }
            loading = false
            result.onSuccess { onSaved() }.onFailure { error = it.message }
        }
    }

    // #459: new style when opened from the v2 user list; same fields, roles, validation and save
    if (v2) {
        SettingsDetailPage(
            title = stringResource(if (initial == null) R.string.new_user else R.string.edit_user),
            onBack = onBack,
            bottomBar = {
                SettingsDetailPrimaryButton(
                    text = stringResource(if (initial == null) R.string.add_user else R.string.save),
                    onClick = ::saveUser,
                    loading = loading,
                )
            },
        ) {
            Column(
                Modifier.fillMaxSize().imePadding().verticalScroll(rememberScrollState()).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                SettingsDetailField(label = stringResource(R.string.first_name), value = firstName, onValueChange = { firstName = it })
                SettingsDetailField(label = stringResource(R.string.last_name), value = lastName, onValueChange = { lastName = it })
                if (initial == null) {
                    SettingsDetailField(
                        label = stringResource(R.string.email), value = email, onValueChange = { email = it },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    )
                    SettingsDetailField(
                        label = stringResource(R.string.password), value = password, onValueChange = { password = it },
                        visualTransformation = PasswordVisualTransformation(),
                    )
                    SettingsDetailField(
                        label = stringResource(R.string.confirm_password), value = confirmPassword, onValueChange = { confirmPassword = it },
                        visualTransformation = PasswordVisualTransformation(),
                    )
                }
                val roles = listOf("OUTLET_ADMIN", "OUTLET_STAFF")
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(stringResource(R.string.role), fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text)
                    V2Segmented(
                        titles = roles.map { roleDisplayValue(it) },
                        selected = roles.indexOf(role).coerceAtLeast(0),
                        onSelect = { role = roles[it] },
                        fill = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                if (initial != null) {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Text(stringResource(R.string.active), fontSize = DS.TextSize.Body, color = DS.Colors.Text, modifier = Modifier.weight(1f))
                        Switch(checked = active, onCheckedChange = { active = it })
                    }
                }
            }
        }
    } else {
        Scaffold(
            containerColor = MaterialTheme.colorScheme.surface,
            contentWindowInsets = WindowInsets(0, 0, 0, 0),
            topBar = {
                TopAppBar(
                    // Full-screen dialog draws under the status bar — keep default insets.
                    windowInsets = TopAppBarDefaults.windowInsets,
                    title = {
                        Text(
                            if (initial == null) stringResource(R.string.new_user)
                            else stringResource(R.string.edit_user),
                            style = MaterialTheme.typography.titleLarge,
                        )
                    },
                    navigationIcon = {
                        IconButton(onClick = onBack) {
                            Icon(Icons.Default.Close, contentDescription = stringResource(R.string.close))
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surface,
                    ),
                )
            },
            bottomBar = {
                Column(
                    Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surface)
                        .navigationBarsPadding()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                ) {
                    AppPrimaryButton(
                        text = if (loading) stringResource(R.string.loading)
                        else if (initial == null) stringResource(R.string.add_user)
                        else stringResource(R.string.save),
                        onClick = ::saveUser,
                        enabled = !loading,
                    )
                }
            },
        ) { padding ->
            Column(
                Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .imePadding()
                    .verticalScroll(rememberScrollState())
                    .background(MaterialTheme.colorScheme.background)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                AppCard(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                ) {
                    Column(
                        Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        AppInputField(
                            value = firstName,
                            onValueChange = { firstName = it },
                            label = stringResource(R.string.first_name),
                        )
                        AppInputField(
                            value = lastName,
                            onValueChange = { lastName = it },
                            label = stringResource(R.string.last_name),
                        )
                        if (initial == null) {
                            AppInputField(
                                value = email,
                                onValueChange = { email = it },
                                label = stringResource(R.string.email),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                            )
                            AppInputField(
                                value = password,
                                onValueChange = { password = it },
                                label = stringResource(R.string.password),
                                visualTransformation = PasswordVisualTransformation(),
                            )
                            AppInputField(
                                value = confirmPassword,
                                onValueChange = { confirmPassword = it },
                                label = stringResource(R.string.confirm_password),
                                visualTransformation = PasswordVisualTransformation(),
                            )
                        }
                        Text(
                            stringResource(R.string.role),
                            style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium),
                        )
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            listOf("OUTLET_ADMIN", "OUTLET_STAFF").forEach { roleKey ->
                                AppFilterChip(
                                    label = roleDisplayValue(roleKey),
                                    selected = role == roleKey,
                                    onClick = { role = roleKey },
                                    modifier = Modifier.weight(1f),
                                )
                            }
                        }
                        if (initial != null) {
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    stringResource(R.string.active),
                                    style = MaterialTheme.typography.bodyLarge,
                                )
                                Switch(checked = active, onCheckedChange = { active = it })
                            }
                        }
                    }
                }
            }
        }
    }

    error?.let { message ->
        AppAlertError(
            message = message,
            onDismiss = { error = null },
        )
    }
}
