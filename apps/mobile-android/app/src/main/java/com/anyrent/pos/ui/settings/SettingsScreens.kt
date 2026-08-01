package com.anyrent.pos.ui.settings

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.ManageAccounts
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Print
import androidx.compose.material.icons.filled.Store
import androidx.compose.material.icons.filled.Upload
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.PersonOff
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material.icons.outlined.Edit
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.anyrent.pos.BuildConfig
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.ApiParity
import com.anyrent.pos.data.PermissionManager
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.data.model.StaffUser
import com.anyrent.pos.push.PushRegistrar
import com.anyrent.pos.ui.common.AppAlertConfirm
import com.anyrent.pos.ui.common.AppAlertError
import com.anyrent.pos.ui.common.EmptyOrError
import com.anyrent.pos.ui.common.LoadingBox
import com.anyrent.pos.ui.common.AppCard
import com.anyrent.pos.ui.common.AppMenuAction
import com.anyrent.pos.ui.common.AppOverflowMenuAnchor
import com.anyrent.pos.ui.common.SectionLabel
import com.anyrent.pos.ui.common.SettingsCardRow
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
    onOpenNotifications: () -> Unit = {},
    onLoggedOut: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var showDeleteConfirmation by remember { mutableStateOf(false) }
    var isDeleting by remember { mutableStateOf(false) }

    LazyColumn(
        Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        item {
            Row(
                Modifier.padding(top = 32.dp, bottom = 22.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Icon(
                    Icons.Default.AccountCircle,
                    contentDescription = null,
                    modifier = Modifier.size(64.dp),
                    tint = MaterialTheme.colorScheme.onSurface,
                )
                Column {
                    Text(
                        SessionStore.userName ?: "—",
                        style = MaterialTheme.typography.headlineSmall,
                    )
                    Text(
                        roleDisplayValue(SessionStore.role),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodyLarge,
                    )
                }
            }
        }
        item {
            SectionLabel(stringResource(R.string.account))
            AppCard {
                SettingsCardRow(Icons.Default.Store, stringResource(R.string.store_info), onOpenStore)
                if (PermissionManager.canManageUsers()) {
                    HorizontalDivider(Modifier.padding(start = 56.dp))
                    SettingsCardRow(Icons.Default.ManageAccounts, stringResource(R.string.user_management), onOpenUsers)
                }
                HorizontalDivider(Modifier.padding(start = 56.dp))
                SettingsCardRow(Icons.Default.Groups, stringResource(R.string.customers), onOpenCustomers)
                HorizontalDivider(Modifier.padding(start = 56.dp))
                SettingsCardRow(Icons.Default.Notifications, stringResource(R.string.notifications), onOpenNotifications)
            }
        }
        item {
            SectionLabel(stringResource(R.string.tools))
            AppCard {
                SettingsCardRow(Icons.Default.Print, stringResource(R.string.printer_config), onOpenPrinter)
                if (PermissionManager.canExport()) {
                    HorizontalDivider(Modifier.padding(start = 56.dp))
                    SettingsCardRow(Icons.Default.Upload, stringResource(R.string.export_data), onOpenExport)
                }
            }
        }
        item {
            SectionLabel(stringResource(R.string.about))
            AppCard {
                SettingsCardRow(Icons.Default.Info, stringResource(R.string.app_info), onOpenAppInfo)
                HorizontalDivider(Modifier.padding(start = 56.dp))
                SettingsCardRow(
                    Icons.Outlined.DeleteOutline,
                    stringResource(R.string.delete_account),
                    onClick = { showDeleteConfirmation = true },
                )
            }
        }
        item {
            AppCard {
                SettingsCardRow(
                    Icons.AutoMirrored.Filled.Logout,
                    stringResource(R.string.logout),
                    tint = Color(0xFFE83F48),
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
                    trailing = {},
                )
            }
        }
        item { Box(Modifier.height(16.dp)) }
    }

    if (showDeleteConfirmation) {
        AppAlertConfirm(
            title = stringResource(R.string.delete_account),
            message = stringResource(R.string.delete_account_confirmation),
            confirmLabel = stringResource(R.string.delete),
            destructive = true,
            confirmLoading = isDeleting,
            dismissEnabled = !isDeleting,
            onDismiss = { showDeleteConfirmation = false },
            onConfirm = {
                isDeleting = true
                scope.launch {
                    val deleted = withContext(Dispatchers.IO) { ApiParity.deleteAccount().isSuccess }
                    isDeleting = false
                    if (deleted) {
                        SessionStore.clearAuth()
                        onLoggedOut()
                    }
                }
            },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UserManagementScreen(onBack: () -> Unit, onCreateUser: () -> Unit = {}, onEditUser: (com.anyrent.pos.data.model.StaffUser) -> Unit = {}) {
    var users by remember { mutableStateOf<List<StaffUser>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var refreshKey by remember { mutableStateOf(0) }
    var passwordUser by remember { mutableStateOf<StaffUser?>(null) }
    var deleteUser by remember { mutableStateOf<StaffUser?>(null) }
    var newPassword by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var actionLoading by remember { mutableStateOf(false) }
    var actionError by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(refreshKey) {
        scope.launch {
            loading = true
            error = null
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
                actions = {
                    IconButton(onClick = onCreateUser) {
                        Icon(Icons.Default.Add, contentDescription = stringResource(R.string.new_user))
                    }
                },
            )
        }
    ) { padding ->
        when {
            loading -> LoadingBox()
            error != null -> EmptyOrError(error!!)
            else -> {
            LazyColumn(
                modifier = Modifier.padding(padding).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(users, key = { it.id }) { user ->
                    var menuExpanded by remember(user.id) { mutableStateOf(false) }
                    AppCard(
                        Modifier.fillMaxWidth(),
                    ) {
                        Row(
                            Modifier.fillMaxWidth().padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            Icon(
                                Icons.Default.AccountCircle,
                                contentDescription = null,
                                modifier = Modifier.size(44.dp),
                                tint = MaterialTheme.colorScheme.outline,
                            )
                            Column(Modifier.weight(1f)) {
                                Text(
                                    user.displayName,
                                    style = MaterialTheme.typography.bodyLarge,
                                    fontWeight = FontWeight.Medium,
                                )
                                Text(
                                    user.email,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                Text(
                                    roleDisplayValue(user.role),
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            Text(
                                stringResource(if (user.isActive) R.string.active else R.string.inactive),
                                color = if (user.isActive) Color(0xFF23844A)
                                else MaterialTheme.colorScheme.error,
                                style = MaterialTheme.typography.labelMedium,
                            )
                            Box {
                                val editLabel = stringResource(R.string.edit)
                                val changePasswordLabel = stringResource(R.string.change_password)
                                val toggleLabel = stringResource(
                                    if (user.isActive) R.string.disable_user
                                    else R.string.enable_user,
                                )
                                val deleteLabel = stringResource(R.string.delete)
                                AppOverflowMenuAnchor(
                                    contentDescription = stringResource(R.string.more_options),
                                    actions = listOf(
                                        AppMenuAction(
                                            label = editLabel,
                                            icon = Icons.Outlined.Edit,
                                            onClick = { onEditUser(user) },
                                        ),
                                        AppMenuAction(
                                            label = changePasswordLabel,
                                            icon = Icons.Default.Key,
                                            onClick = {
                                                newPassword = ""
                                                confirmPassword = ""
                                                passwordUser = user
                                            },
                                        ),
                                        AppMenuAction(
                                            label = toggleLabel,
                                            icon = if (user.isActive) {
                                                Icons.Default.PersonOff
                                            } else {
                                                Icons.Default.Person
                                            },
                                            onClick = {
                                                scope.launch {
                                                    val result = withContext(Dispatchers.IO) {
                                                        ApiParity.updateUser(
                                                            user.id,
                                                            user.firstName.orEmpty(),
                                                            user.lastName.orEmpty(),
                                                            user.role,
                                                            !user.isActive,
                                                            SessionStore.outletId,
                                                        )
                                                    }
                                                    result.onSuccess { refreshKey++ }
                                                        .onFailure { error = it.message }
                                                }
                                            },
                                        ),
                                        AppMenuAction(
                                            label = deleteLabel,
                                            icon = Icons.Outlined.DeleteOutline,
                                            onClick = { deleteUser = user },
                                            destructive = true,
                                        ),
                                    ),
                                    expanded = menuExpanded,
                                    onExpandedChange = { menuExpanded = it },
                                )
                            }
                        }
                    }
                }
            }
            }
        }
    }

    passwordUser?.let { user ->
        AppAlertConfirm(
            title = stringResource(R.string.change_password),
            message = stringResource(R.string.change_password_for, user.displayName),
            confirmLabel = stringResource(R.string.change_password),
            confirmEnabled = !actionLoading && newPassword.length >= 6 && newPassword == confirmPassword,
            confirmLoading = actionLoading,
            dismissEnabled = !actionLoading,
            onDismiss = {
                passwordUser = null
                newPassword = ""
                confirmPassword = ""
            },
            onConfirm = {
                actionLoading = true
                scope.launch {
                    val result = withContext(Dispatchers.IO) {
                        ApiParity.changeUserPassword(user.id, newPassword)
                    }
                    actionLoading = false
                    result.onSuccess {
                        passwordUser = null
                        newPassword = ""
                        confirmPassword = ""
                    }.onFailure { actionError = it.message }
                }
            },
        ) {
            OutlinedTextField(
                value = newPassword,
                onValueChange = { newPassword = it },
                label = { Text(stringResource(R.string.new_password)) },
                visualTransformation = PasswordVisualTransformation(),
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = confirmPassword,
                onValueChange = { confirmPassword = it },
                label = { Text(stringResource(R.string.confirm_password)) },
                visualTransformation = PasswordVisualTransformation(),
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            if (newPassword.isNotEmpty() && newPassword.length < 6) {
                Text(stringResource(R.string.password_min_six), color = MaterialTheme.colorScheme.error)
            } else if (confirmPassword.isNotEmpty() && newPassword != confirmPassword) {
                Text(stringResource(R.string.passwords_do_not_match), color = MaterialTheme.colorScheme.error)
            }
        }
    }

    deleteUser?.let { user ->
        AppAlertConfirm(
            title = stringResource(R.string.delete_user),
            message = stringResource(R.string.delete_user_confirmation, user.displayName),
            confirmLabel = stringResource(R.string.delete),
            destructive = true,
            confirmLoading = actionLoading,
            dismissEnabled = !actionLoading,
            onDismiss = { deleteUser = null },
            onConfirm = {
                actionLoading = true
                scope.launch {
                    val result = withContext(Dispatchers.IO) {
                        ApiParity.deleteUser(user.id)
                    }
                    actionLoading = false
                    result.onSuccess {
                        deleteUser = null
                        refreshKey++
                    }.onFailure { actionError = it.message }
                }
            },
        )
    }

    actionError?.let { message ->
        AppAlertError(
            message = message,
            onDismiss = { actionError = null },
        )
    }
}

@Composable
internal fun roleDisplayValue(role: String?): String = when (role?.uppercase()) {
    "MERCHANT", "MERCHANT_ADMIN", "OWNER" -> stringResource(R.string.role_merchant)
    "OUTLET_ADMIN" -> stringResource(R.string.role_outlet_admin)
    "OUTLET_STAFF", "STAFF" -> stringResource(R.string.role_outlet_staff)
    else -> role
        ?.lowercase()
        ?.split("_")
        ?.joinToString(" ") { part -> part.replaceFirstChar(Char::uppercase) }
        .orEmpty()
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
