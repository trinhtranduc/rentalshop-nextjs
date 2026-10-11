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
import androidx.compose.material3.SwitchDefaults
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
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
import com.anyrent.pos.data.UserFormRoles
import com.anyrent.pos.data.repository.SessionStoreAppConfigCache
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
import com.anyrent.pos.ui.settings.v2.StoreForm
import com.anyrent.pos.ui.settings.v2.StoreInfoV2Page
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import androidx.compose.foundation.border
import androidx.compose.foundation.selection.selectable
import androidx.compose.ui.semantics.Role
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.outlined.Circle
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.foundation.layout.heightIn
import androidx.compose.ui.unit.sp
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.clickable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.outlined.Storefront
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.HorizontalDivider
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.Box

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StoreInfoScreen(onBack: () -> Unit, v2: Boolean = false) {
    val context = LocalContext.current
    val canEdit = PermissionManager.canManageStore()
    var name by remember { mutableStateOf(SessionStore.outletName ?: SessionStore.merchantName.orEmpty()) }
    var address by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    // #484: the other outlet fields of the v2 store form (iOS EditStoreViewController)
    var city by remember { mutableStateOf("") }
    var state by remember { mutableStateOf("") }
    var country by remember { mutableStateOf("") }
    var zipCode by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
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
            city = outlet.city.orEmpty()
            state = outlet.state.orEmpty()
            country = outlet.country.orEmpty()
            zipCode = outlet.zipCode.orEmpty()
            description = outlet.description.orEmpty()
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
                ApiParity.updateOutlet(
                    outletId, name, address, phone,
                    city = city.trim(), state = state.trim(), country = country.trim(),
                    zipCode = zipCode.trim(), description = description.trim(),
                )
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

    // #459 / #484: v2 form style when opened from Settings v2 (`newSettings`, board CH-sua); same permission and save
    if (v2) {
        StoreInfoV2Page(
            form = StoreForm(name, phone, address, city, state, country, zipCode, description),
            onChange = { form ->
                if (canEdit) {
                    name = form.name
                    phone = form.phone
                    address = form.address
                    city = form.city
                    state = form.state
                    country = form.country
                    zipCode = form.zipCode
                    description = form.description
                }
            },
            canEdit = canEdit,
            loadingInitial = loadingInitial,
            saving = loading,
            nameError = submitted && name.isBlank(),
            message = message,
            error = error,
            onBack = onBack,
            onSave = ::saveStore,
        )
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
    // #622: saved as soon as it changes, like iOS
    var printBankQr by remember { mutableStateOf(prefs.getBoolean(ThermalPrinter.KEY_PRINT_BANK_QR, false)) }
    fun setPrintBankQr(value: Boolean) {
        printBankQr = value
        prefs.edit().putBoolean(ThermalPrinter.KEY_PRINT_BANK_QR, value).apply()
    }

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
                PrintBankQrRow(checked = printBankQr, onChange = ::setPrintBankQr)
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
                        PrintBankQrRow(checked = printBankQr, onChange = ::setPrintBankQr)
                    }
                }
                message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
            }
        }
    }
}

/** "In QR chuyển khoản trên bill" + hint, switch on the right (#622) */
@Composable
private fun PrintBankQrRow(checked: Boolean, onChange: (Boolean) -> Unit) {
    val title = stringResource(R.string.printer_bank_qr_title)
    Row(
        Modifier.fillMaxWidth().semantics(mergeDescendants = true) {},
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(title, fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text)
            Text(stringResource(R.string.printer_bank_qr_hint), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
        }
        Switch(
            checked = checked,
            onCheckedChange = onChange,
            modifier = Modifier.semantics { contentDescription = title },
            colors = SwitchDefaults.colors(
                checkedThumbColor = Color.White,
                checkedTrackColor = Color(0xFF34C759),
                checkedBorderColor = Color(0xFF34C759),
            ),
        )
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
    // #684: a new user has no role until one is picked in the sheet; editing keeps the user's role
    var role by remember { mutableStateOf<String?>(initial?.role) }
    var rolePicker by remember { mutableStateOf(false) }
    val roleRequired = stringResource(R.string.role_required)
    // #682: Nhân viên kho is offered once the API allows it (cached app config), or when the user already has it
    val roleChoices = remember(initial?.role) {
        UserFormRoles.choices(SessionStoreAppConfigCache.read()?.inventoryRole ?: false, initial?.role)
    }
    var active by remember { mutableStateOf(initial?.isActive ?: true) }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    if (rolePicker) {
        RolePickerSheet(roles = roleChoices, selected = role, onDismiss = { rolePicker = false }, onPick = { role = it; rolePicker = false; error = null })
    }

    fun saveUser() {
        if (firstName.isBlank() || (initial == null && email.isBlank())) {
            error = "Name and email are required"
            return
        }
        val pickedRole = role
        if (!UserFormRoles.isComplete(pickedRole)) {
            error = roleRequired
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
                    ApiParity.createUser(firstName, lastName, email, password, pickedRole!!, SessionStore.outletId)
                } else {
                    ApiParity.updateUser(initial.id, firstName, lastName, pickedRole!!, active, SessionStore.outletId)
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
                RoleField(role = role, onClick = { rolePicker = true })
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
                        RoleField(role = role, onClick = { rolePicker = true })
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

/** #684: the role row of the user form: the picked role, or "Chọn quyền" until one is picked; opens [RolePickerSheet] */
@Composable
internal fun RoleField(role: String?, onClick: () -> Unit) {
    val hint = stringResource(R.string.role_select)
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(stringResource(R.string.role), fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text)
        Row(
            Modifier.fillMaxWidth().heightIn(min = 48.dp).clip(RoundedCornerShape(12.dp))
                .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(12.dp))
                .clickable(onClickLabel = hint, role = Role.Button, onClick = onClick)
                .padding(horizontal = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                role?.let { roleDisplayValue(it) } ?: hint,
                fontSize = DS.TextSize.Body,
                color = if (role == null) DS.Colors.TextMuted else DS.Colors.Text,
                modifier = Modifier.weight(1f),
            )
            Icon(Icons.AutoMirrored.Outlined.KeyboardArrowRight, contentDescription = null, tint = DS.Colors.TextMuted)
        }
    }
}

/**
 * #684 (canvas N3, iOS `RolePickerSheet`): "Chọn quyền" like the order ⋯ action sheet — title + ✕, one row per role
 * the caller may give (icon box, role name, what it can do), the current role with a blue icon and ✓
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun RolePickerSheet(roles: List<String>, selected: String?, onDismiss: () -> Unit, onPick: (String) -> Unit) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
        containerColor = DS.Colors.Surface,
    ) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 20.dp).padding(bottom = 24.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 6.dp)) {
                Text(stringResource(R.string.role_select), fontSize = 20.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text,
                    modifier = Modifier.weight(1f))
                val closeLabel = stringResource(R.string.close)
                Box(
                    Modifier.size(36.dp).clip(CircleShape).background(Color(0xFFF1F5F9)).clickable(onClickLabel = closeLabel, onClick = onDismiss),
                    contentAlignment = Alignment.Center,
                ) { Icon(Icons.Outlined.Close, contentDescription = closeLabel, tint = Color(0xFF475569), modifier = Modifier.size(18.dp)) }
            }
            roles.forEach { key ->
                val on = key == selected
                Row(
                    Modifier.fillMaxWidth().heightIn(min = 64.dp)
                        .selectable(selected = on, role = Role.RadioButton, onClick = { onPick(key) })
                        .padding(horizontal = 4.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    Box(
                        Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(if (on) Color(0xFFEFF4FF) else Color(0xFFF1F5F9)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(roleIcon(key), contentDescription = null, tint = if (on) DS.Colors.Primary else DS.Colors.Text, modifier = Modifier.size(20.dp))
                    }
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(roleDisplayValue(key) ?: key, fontSize = 16.sp, fontWeight = FontWeight.Medium,
                            color = if (on) DS.Colors.Primary else DS.Colors.Text)
                        roleHelp(key)?.let { Text(it, fontSize = DS.TextSize.Secondary, color = Color(0xFF475569)) }
                    }
                    if (on) Icon(Icons.Filled.Check, contentDescription = null, tint = DS.Colors.Primary, modifier = Modifier.size(22.dp))
                }
                HorizontalDivider(color = Color(0xFFF1F5F9))
            }
        }
    }
}

private fun roleIcon(role: String): androidx.compose.ui.graphics.vector.ImageVector = when (role) {
    "OUTLET_ADMIN" -> Icons.Outlined.Storefront
    "OUTLET_INVENTORY" -> Icons.Outlined.Inventory2
    else -> Icons.Outlined.Person
}

@Composable
private fun roleHelp(role: String): String? = when (role) {
    "OUTLET_ADMIN" -> stringResource(R.string.role_help_outlet_admin)
    "OUTLET_STAFF" -> stringResource(R.string.role_help_outlet_staff)
    "OUTLET_INVENTORY" -> stringResource(R.string.role_help_outlet_inventory)
    else -> null
}
