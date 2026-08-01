package com.anyrent.pos.ui.settings

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
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
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import com.anyrent.pos.BuildConfig
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiParity
import com.anyrent.pos.data.PermissionManager
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.data.model.StaffUser
import com.anyrent.pos.print.ThermalPrinter
import com.anyrent.pos.ui.common.AppCard
import com.anyrent.pos.ui.common.AppFilterChip
import com.anyrent.pos.ui.common.AppInputField
import com.anyrent.pos.ui.common.AppPrimaryButton
import com.anyrent.pos.ui.common.AppSecondaryButton
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import androidx.compose.ui.Modifier
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.ui.Alignment
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.material3.TextButton

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StoreInfoScreen(onBack: () -> Unit) {
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
                message = context.getString(R.string.saved)
            }.onFailure { error = it.message }
        }
    }

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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PrinterNetworkScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("anyrent.printer", 0) }
    var name by remember { mutableStateOf(prefs.getString("printerName", "").orEmpty()) }
    var ip by remember { mutableStateOf(prefs.getString("printerIp", "").orEmpty()) }
    var port by remember { mutableStateOf(prefs.getString("printerPort", "9100").orEmpty()) }
    var paper by remember { mutableStateOf(prefs.getString("paperWidth", "80").orEmpty()) }
    var message by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.printer_config)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
            )
        }
    ) { padding ->
        Column(Modifier.padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text(
                stringResource(R.string.printer_hint),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            AppInputField(
                value = name,
                onValueChange = { name = it },
                label = stringResource(R.string.printer_name),
            )
            AppInputField(
                value = ip,
                onValueChange = { ip = it },
                label = stringResource(R.string.printer_ip),
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
            AppPrimaryButton(
                text = stringResource(R.string.save),
                onClick = {
                    prefs.edit()
                        .putString("printerName", name)
                        .putString("printerIp", ip)
                        .putString("printerPort", port)
                        .putString("paperWidth", paper)
                        .apply()
                    message = "Saved"
                },
            )
            AppSecondaryButton(
                text = stringResource(R.string.test_print),
                onClick = {
                    val config = ThermalPrinter.Config(
                        ip = ip,
                        port = port.toIntOrNull() ?: 9100,
                        paperWidthMm = paper.toIntOrNull() ?: 80,
                        name = name,
                    )
                    scope.launch {
                        val result = withContext(Dispatchers.IO) { ThermalPrinter.testPrint(config) }
                        message = when (result) {
                            is ThermalPrinter.Result.Success -> "Test OK"
                            is ThermalPrinter.Result.Failure -> result.message
                        }
                    }
                },
            )
            message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExportAuthScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    var message by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val base = BuildConfig.API_BASE_URL.trimEnd('/')

    fun download(label: String, path: String) {
        scope.launch {
            val result = withContext(Dispatchers.IO) { ApiParity.downloadExport(path) }
            result.onSuccess { bytes ->
                val file = File(context.cacheDir, "$label.xls")
                file.writeBytes(bytes)
                val uri = FileProvider.getUriForFile(context, "${BuildConfig.APPLICATION_ID}.fileprovider", file)
                val intent = Intent(Intent.ACTION_SEND).apply {
                    type = "application/vnd.ms-excel"
                    putExtra(Intent.EXTRA_STREAM, uri)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                context.startActivity(Intent.createChooser(intent, label))
                message = "Exported $label"
            }.onFailure { error = it.message }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.export_data)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
            )
        }
    ) { padding ->
        Column(Modifier.padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Button(onClick = { download("orders", "/api/orders/export?period=month&format=excel") }, modifier = Modifier.fillMaxWidth()) { Text("Orders") }
            Button(onClick = { download("products", "/api/products/export?period=month&format=excel") }, modifier = Modifier.fillMaxWidth()) { Text("Products") }
            Button(onClick = { download("customers", "/api/customers/export?period=month&format=excel") }, modifier = Modifier.fillMaxWidth()) { Text("Customers") }
            message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UserFormScreen(initial: StaffUser?, onBack: () -> Unit, onSaved: () -> Unit) {
    var firstName by remember { mutableStateOf(initial?.firstName.orEmpty()) }
    var lastName by remember { mutableStateOf(initial?.lastName.orEmpty()) }
    var email by remember { mutableStateOf(initial?.email.orEmpty()) }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var role by remember { mutableStateOf(initial?.role ?: "OUTLET_STAFF") }
    var active by remember { mutableStateOf(initial?.isActive ?: true) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (initial == null) stringResource(R.string.new_user) else stringResource(R.string.edit_user)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
            )
        }
    ) { padding ->
        Column(Modifier.padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
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
                "Role",
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
            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            AppPrimaryButton(
                text = stringResource(R.string.save),
                onClick = {
                    if (firstName.isBlank() || email.isBlank() && initial == null) {
                        error = "Name and email are required"
                        return@AppPrimaryButton
                    }
                    if (initial == null && (password.length < 6 || password != confirmPassword)) {
                        error = if (password.length < 6) "Password must contain at least 6 characters"
                        else "Passwords do not match"
                        return@AppPrimaryButton
                    }
                    scope.launch {
                        val result = withContext(Dispatchers.IO) {
                            if (initial == null) {
                                ApiParity.createUser(firstName, lastName, email, password, role, SessionStore.outletId)
                            } else {
                                ApiParity.updateUser(initial.id, firstName, lastName, role, active, SessionStore.outletId)
                            }
                        }
                        result.onSuccess { onSaved() }.onFailure { error = it.message }
                    }
                },
            )
        }
    }
}
