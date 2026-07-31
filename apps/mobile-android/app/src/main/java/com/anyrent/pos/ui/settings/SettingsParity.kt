package com.anyrent.pos.ui.settings

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.core.content.FileProvider
import com.anyrent.pos.BuildConfig
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiParity
import com.anyrent.pos.data.PermissionManager
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.data.model.StaffUser
import com.anyrent.pos.print.ThermalPrinter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import androidx.compose.ui.Modifier

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StoreInfoScreen(onBack: () -> Unit) {
    val canEdit = PermissionManager.canManageStore()
    var name by remember { mutableStateOf(SessionStore.outletName ?: SessionStore.merchantName.orEmpty()) }
    var address by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var message by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.store_info)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
            )
        }
    ) { padding ->
        Column(Modifier.padding(padding).padding(16.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("${SessionStore.userName} · ${roleDisplayValue(SessionStore.role)}")
            Text("Merchant: ${SessionStore.merchantName ?: SessionStore.merchantId}")
            OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text(stringResource(R.string.store_name)) }, enabled = canEdit, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = address, onValueChange = { address = it }, label = { Text(stringResource(R.string.address)) }, enabled = canEdit, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = phone, onValueChange = { phone = it }, label = { Text(stringResource(R.string.phone)) }, enabled = canEdit, modifier = Modifier.fillMaxWidth())
            if (canEdit) {
                Button(
                    onClick = {
                        val outletId = SessionStore.outletId
                        if (outletId == null) { error = "No outlet"; return@Button }
                        scope.launch {
                            val result = withContext(Dispatchers.IO) {
                                ApiParity.updateOutlet(outletId, name, address, phone)
                            }
                            result.onSuccess {
                                SessionStore.outletName = name
                                message = "Saved"
                            }.onFailure { error = it.message }
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) { Text(stringResource(R.string.save)) }
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
        Column(Modifier.padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(stringResource(R.string.printer_hint))
            OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text(stringResource(R.string.printer_name)) }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = ip, onValueChange = { ip = it }, label = { Text(stringResource(R.string.printer_ip)) }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = port, onValueChange = { port = it }, label = { Text(stringResource(R.string.printer_port)) }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = paper, onValueChange = { paper = it }, label = { Text(stringResource(R.string.paper_width)) }, modifier = Modifier.fillMaxWidth())
            Button(
                onClick = {
                    prefs.edit()
                        .putString("printerName", name)
                        .putString("printerIp", ip)
                        .putString("printerPort", port)
                        .putString("paperWidth", paper)
                        .apply()
                    message = "Saved"
                },
                modifier = Modifier.fillMaxWidth(),
            ) { Text(stringResource(R.string.save)) }
            Button(
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
                modifier = Modifier.fillMaxWidth(),
            ) { Text(stringResource(R.string.test_print)) }
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
        Column(Modifier.padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlinedTextField(value = firstName, onValueChange = { firstName = it }, label = { Text(stringResource(R.string.first_name)) }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = lastName, onValueChange = { lastName = it }, label = { Text(stringResource(R.string.last_name)) }, modifier = Modifier.fillMaxWidth())
            if (initial == null) {
                OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text(stringResource(R.string.email)) }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text(stringResource(R.string.password)) },
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )
                OutlinedTextField(
                    value = confirmPassword,
                    onValueChange = { confirmPassword = it },
                    label = { Text(stringResource(R.string.confirm_password)) },
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )
            }
            Text("Role", style = MaterialTheme.typography.titleMedium)
            androidx.compose.foundation.layout.Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                listOf("OUTLET_ADMIN", "OUTLET_STAFF").forEach { roleKey ->
                    FilterChip(
                        selected = role == roleKey,
                        onClick = { role = roleKey },
                        label = { Text(roleDisplayValue(roleKey)) },
                        modifier = Modifier.weight(1f),
                    )
                }
            }
            androidx.compose.foundation.layout.Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(stringResource(R.string.active))
                Switch(checked = active, onCheckedChange = { active = it })
            }
            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            Button(
                onClick = {
                    if (firstName.isBlank() || email.isBlank() && initial == null) {
                        error = "Name and email are required"
                        return@Button
                    }
                    if (initial == null && (password.length < 6 || password != confirmPassword)) {
                        error = if (password.length < 6) "Password must contain at least 6 characters"
                        else "Passwords do not match"
                        return@Button
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
                modifier = Modifier.fillMaxWidth(),
            ) { Text(stringResource(R.string.save)) }
        }
    }
}
