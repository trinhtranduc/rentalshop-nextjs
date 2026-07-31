package com.anyrent.pos.ui.settings

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.anyrent.pos.BuildConfig
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.PermissionManager
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.data.model.StaffUser
import com.anyrent.pos.push.PushRegistrar
import com.anyrent.pos.ui.common.EmptyOrError
import com.anyrent.pos.ui.common.LoadingBox
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun SettingsScreen(
    onOpenUsers: () -> Unit,
    onOpenCustomers: () -> Unit,
    onOpenExport: () -> Unit,
    onOpenPrinter: () -> Unit,
    onOpenAppInfo: () -> Unit,
    onOpenStore: () -> Unit = {},
    onLoggedOut: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(SessionStore.userName ?: "—", style = MaterialTheme.typography.headlineSmall)
        Text(SessionStore.role ?: "")
        Text(SessionStore.outletName ?: SessionStore.merchantName ?: "")
        HorizontalDivider()
        SettingsRow(stringResource(R.string.store_info), onOpenStore)
        if (PermissionManager.canManageUsers()) {
            SettingsRow(stringResource(R.string.user_management), onOpenUsers)
        }
        SettingsRow(stringResource(R.string.customers), onOpenCustomers)
        SettingsRow(stringResource(R.string.printer_config), onOpenPrinter)
        if (PermissionManager.canExport()) {
            SettingsRow(stringResource(R.string.export_data), onOpenExport)
        }
        SettingsRow(stringResource(R.string.app_info), onOpenAppInfo)
        Button(
            onClick = {
                scope.launch {
                    withContext(Dispatchers.IO) {
                        PushRegistrar.unregister()
                        ApiClient.get().logout()
                    }
                    SessionStore.clearAuth()
                    onLoggedOut()
                }
            },
            modifier = Modifier.fillMaxWidth(),
        ) { Text(stringResource(R.string.logout)) }
    }
}

@Composable
private fun SettingsRow(title: String, onClick: () -> Unit = {}) {
    Text(
        title,
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 14.dp),
        style = MaterialTheme.typography.bodyLarge,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UserManagementScreen(onBack: () -> Unit, onCreateUser: () -> Unit = {}, onEditUser: (com.anyrent.pos.data.model.StaffUser) -> Unit = {}) {
    var users by remember { mutableStateOf<List<StaffUser>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        scope.launch {
            val result = withContext(Dispatchers.IO) { ApiClient.get().listUsers() }
            loading = false
            result.onSuccess { users = it.items }.onFailure { error = it.message }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.user_management)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
            )
        }
    ) { padding ->
        when {
            loading -> LoadingBox()
            error != null -> EmptyOrError(error!!)
            else -> {
            androidx.compose.material3.FloatingActionButton(onClick = onCreateUser, modifier = Modifier.padding(padding).padding(16.dp)) {
                Text("+")
            }
            LazyColumn(
                modifier = Modifier.padding(padding).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(users, key = { it.id }) { user ->
                    Column(Modifier.fillMaxWidth().padding(8.dp).clickable { onEditUser(user) }) {
                        Text(user.displayName, style = MaterialTheme.typography.titleMedium)
                        Text("${user.email} · ${user.role} · ${if (user.isActive) "active" else "inactive"}")
                    }
                }
            }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExportScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val base = BuildConfig.API_BASE_URL.trimEnd('/')
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
        Column(
            Modifier.padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(stringResource(R.string.export_hint))
            listOf(
                "Orders" to "$base/api/orders/export?period=month&format=excel",
                "Products" to "$base/api/products/export?period=month&format=excel",
                "Customers" to "$base/api/customers/export?period=month&format=excel",
            ).forEach { (label, url) ->
                Button(
                    onClick = {
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) { Text(label) }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PrinterConfigScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("anyrent.printer", 0) }
    var name by remember { mutableStateOf(prefs.getString("printerName", "").orEmpty()) }
    var paperWidth by remember { mutableStateOf(prefs.getString("paperWidth", "80").orEmpty()) }
    var saved by remember { mutableStateOf(false) }

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
        Column(
            Modifier.padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(stringResource(R.string.printer_hint))
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text(stringResource(R.string.printer_name)) },
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = paperWidth,
                onValueChange = { paperWidth = it },
                label = { Text(stringResource(R.string.paper_width)) },
                modifier = Modifier.fillMaxWidth(),
            )
            Button(
                onClick = {
                    prefs.edit()
                        .putString("printerName", name)
                        .putString("paperWidth", paperWidth)
                        .apply()
                    saved = true
                },
                modifier = Modifier.fillMaxWidth(),
            ) { Text(stringResource(R.string.save)) }
            if (saved) Text(stringResource(R.string.saved), color = MaterialTheme.colorScheme.primary)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppInfoScreen(onBack: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.app_info)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
            )
        }
    ) { padding ->
        Column(
            Modifier.padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(stringResource(R.string.app_name), style = MaterialTheme.typography.headlineSmall)
            Text("Version ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})")
            Text("API: ${BuildConfig.API_BASE_URL}")
            Text("Package: ${BuildConfig.APPLICATION_ID}")
            val ctx = LocalContext.current
            Button(onClick = { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://anyrent.shop/privacy"))) }) { Text(stringResource(R.string.privacy)) }
            Button(onClick = { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://anyrent.shop/terms"))) }) { Text(stringResource(R.string.terms)) }
        }
    }
}
