package com.anyrent.pos.ui.settings

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.ManageAccounts
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Print
import androidx.compose.material.icons.filled.Store
import androidx.compose.material.icons.filled.CardMembership
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Upload
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.PersonOff
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.Button
import androidx.compose.material3.CenterAlignedTopAppBar
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.BuildConfig
import com.anyrent.pos.R
import com.anyrent.pos.domain.bank.BankAccountRules
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
import com.anyrent.pos.ui.common.AppFormSheet
import com.anyrent.pos.ui.common.AppMenuAction
import com.anyrent.pos.ui.common.AppOverflowMenuAnchor
import com.anyrent.pos.ui.common.SectionLabel
import com.anyrent.pos.ui.common.SettingsCardRow
import com.anyrent.pos.config.AppLegalLinks
import com.anyrent.pos.ui.common.AppIcon
import com.anyrent.pos.ui.customers.v2.CustomerAvatar
import com.anyrent.pos.ui.home.v2.SectionBand
import com.anyrent.pos.ui.home.v2.ThinDivider
import com.anyrent.pos.ui.settings.v2.SettingsDetailPage
import com.anyrent.pos.ui.settings.v2.SettingsDetailPill
import com.anyrent.pos.ui.settings.v2.SettingsDetailRow
import com.anyrent.pos.ui.theme.DS
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.MoreVert
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** Temporary: hide plan / renew UI until billing is ready to ship. */
private const val SHOWS_SUBSCRIPTION_RENEWAL = false

@Composable
fun SettingsScreen(
    onOpenUsers: () -> Unit,
    onOpenCustomers: () -> Unit,
    onOpenExport: () -> Unit,
    onOpenPrinter: () -> Unit,
    onOpenAppInfo: () -> Unit,
    onOpenStore: () -> Unit = {},
    onOpenSubscription: () -> Unit = {},
    onOpenNotifications: () -> Unit = {},
    onLoggedOut: () -> Unit,
    onOpenBankAccounts: () -> Unit = {},
) {
    val scope = rememberCoroutineScope()
    var showDeleteConfirmation by remember { mutableStateOf(false) }
    var showLogoutConfirmation by remember { mutableStateOf(false) }
    var isDeleting by remember { mutableStateOf(false) }
    var isLoggingOut by remember { mutableStateOf(false) }

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
                if (SHOWS_SUBSCRIPTION_RENEWAL && SessionStore.role == "MERCHANT") {
                    HorizontalDivider(Modifier.padding(start = 56.dp))
                    SettingsCardRow(
                        Icons.Default.CardMembership,
                        stringResource(R.string.subscription),
                        onOpenSubscription,
                    )
                }
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
                // #622: MERCHANT / OUTLET_ADMIN (as iOS)
                if (BankAccountRules.canManage(SessionStore.role)) {
                    HorizontalDivider(Modifier.padding(start = 56.dp))
                    SettingsCardRow(Icons.Default.AccountBalance, stringResource(R.string.bank_accounts), onOpenBankAccounts)
                }
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
                    onClick = { showLogoutConfirmation = true },
                    trailing = {},
                )
            }
        }
        item { Box(Modifier.height(16.dp)) }
    }

    if (showLogoutConfirmation) {
        AppAlertConfirm(
            title = stringResource(R.string.logout),
            message = stringResource(R.string.logout_confirmation),
            confirmLabel = stringResource(R.string.logout),
            destructive = true,
            confirmLoading = isLoggingOut,
            dismissEnabled = !isLoggingOut,
            onDismiss = { showLogoutConfirmation = false },
            onConfirm = {
                isLoggingOut = true
                scope.launch {
                    withContext(Dispatchers.IO) {
                        PushRegistrar.unregister()
                        ApiClient.get().logout()
                    }
                    SessionStore.clearAuth()
                    isLoggingOut = false
                    showLogoutConfirmation = false
                    onLoggedOut()
                }
            },
        )
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
fun UserManagementScreen(onBack: () -> Unit, v2: Boolean = false) {
    var users by remember { mutableStateOf<List<StaffUser>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var refreshKey by remember { mutableStateOf(0) }
    var showForm by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf<StaffUser?>(null) }
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

    // Same actions in both styles (edit, change password, enable/disable, delete)
    @Composable
    fun userMenuActions(user: StaffUser): List<AppMenuAction> = listOf(
        AppMenuAction(
            label = stringResource(R.string.edit),
            icon = Icons.Outlined.Edit,
            onClick = {
                editing = user
                showForm = true
            },
        ),
        AppMenuAction(
            label = stringResource(R.string.change_password),
            icon = Icons.Default.Key,
            onClick = {
                newPassword = ""
                confirmPassword = ""
                passwordUser = user
            },
        ),
        AppMenuAction(
            label = stringResource(if (user.isActive) R.string.disable_user else R.string.enable_user),
            icon = if (user.isActive) Icons.Default.PersonOff else Icons.Default.Person,
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
            label = stringResource(R.string.delete),
            icon = Icons.Outlined.DeleteOutline,
            onClick = { deleteUser = user },
            destructive = true,
        ),
    )

    // #459: new style when opened from Settings v2 (`newSettings`); same list, menu and dialogs
    if (v2) {
        SettingsDetailPage(
            title = stringResource(R.string.settings_v2_users),
            onBack = onBack,
            actions = {
                IconButton(onClick = {
                    editing = null
                    showForm = true
                }) {
                    AppIcon(Icons.Outlined.Add, contentDescription = stringResource(R.string.new_user), size = DS.Icon.Sm, tint = DS.Colors.Text)
                }
            },
        ) {
            when {
                loading -> LoadingBox()
                error != null -> EmptyOrError(error!!)
                else -> LazyColumn(Modifier.fillMaxSize()) {
                    items(users, key = { it.id }) { user ->
                        var menuExpanded by remember(user.id) { mutableStateOf(false) }
                        UserRowV2(user) {
                            AppOverflowMenuAnchor(
                                contentDescription = stringResource(R.string.more_options),
                                actions = userMenuActions(user),
                                expanded = menuExpanded,
                                onExpandedChange = { menuExpanded = it },
                                icon = Icons.Outlined.MoreVert,
                                iconSize = DS.Icon.Md,
                                iconTint = DS.Colors.TextMuted,
                            )
                        }
                    }
                }
            }
        }
    } else {
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
                        IconButton(onClick = {
                            editing = null
                            showForm = true
                        }) {
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
                                Column(
                                    Modifier.weight(1f),
                                    verticalArrangement = Arrangement.spacedBy(2.dp),
                                ) {
                                    // iOS UserCell: status badge sits on the name row (top-right),
                                    // not as a tall sibling that squeezes email/role.
                                    Row(
                                        Modifier.fillMaxWidth(),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    ) {
                                        Text(
                                            user.displayName,
                                            modifier = Modifier.weight(1f),
                                            style = MaterialTheme.typography.bodyLarge,
                                            fontWeight = FontWeight.Medium,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                        )
                                        UserStatusBadge(isActive = user.isActive)
                                    }
                                    Text(
                                        user.email,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                    Text(
                                        roleDisplayValue(user.role),
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                }
                                Box {
                                    AppOverflowMenuAnchor(
                                        contentDescription = stringResource(R.string.more_options),
                                        actions = userMenuActions(user),
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

    }

    if (showForm) {
        AppFormSheet(
            onDismiss = {
                showForm = false
                editing = null
            },
            fullScreen = true,
        ) {
            UserFormScreen(
                initial = editing,
                v2 = v2,
                onBack = {
                    showForm = false
                    editing = null
                },
                onSaved = {
                    showForm = false
                    editing = null
                    refreshKey++
                },
            )
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

/** v2 user row: initials, name + status pill, "email · role", overflow menu */
@Composable
private fun UserRowV2(user: StaffUser, menu: @Composable () -> Unit) {
    Row(
        Modifier.fillMaxWidth().padding(start = 16.dp, end = 4.dp, top = 12.dp, bottom = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        CustomerAvatar(user.displayName, 44, 15)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(DS.Gap.LineTight)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    user.displayName, fontSize = DS.TextSize.Name, fontWeight = FontWeight.SemiBold,
                    color = if (user.isActive) DS.Colors.Text else DS.Colors.TextMuted,
                    maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false),
                )
                SettingsDetailPill(
                    stringResource(if (user.isActive) R.string.active_badge else R.string.inactive_badge),
                    if (user.isActive) DS.Status.Done else DS.Status.Late,
                )
            }
            Text(
                listOf(user.email, roleDisplayValue(user.role)).filter { it.isNotBlank() }.joinToString(" · "),
                fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted, maxLines = 1, overflow = TextOverflow.Ellipsis,
            )
        }
        menu()
    }
    ThinDivider()
}

@Composable
private fun UserStatusBadge(isActive: Boolean) {
    val background = if (isActive) Color(0xFF23844A) else MaterialTheme.colorScheme.error
    Box(
        modifier = Modifier
            .background(background, RoundedCornerShape(4.dp))
            .padding(horizontal = 6.dp, vertical = 2.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = stringResource(if (isActive) R.string.active_badge else R.string.inactive_badge),
            color = Color.White,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Medium,
            fontSize = 11.sp,
            maxLines = 1,
            softWrap = false,
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

@Composable
fun ExportScreen(onBack: () -> Unit) {
    // Kept for navigation compatibility — UI lives in ExportAuthScreen (iOS parity).
    ExportAuthScreen(onBack = onBack)
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
fun AppInfoScreen(onBack: () -> Unit, v2: Boolean = false) {
    val ctx = LocalContext.current
    fun openUrl(url: String) {
        runCatching {
            ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        }
    }

    // #459: new style when opened from Settings v2 (`newSettings`); same rows and links
    if (v2) {
        SettingsDetailPage(title = stringResource(R.string.app_info), onBack = onBack) {
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(bottom = 24.dp)) {
                SectionBand(stringResource(R.string.app_info))
                SettingsDetailRow(stringResource(R.string.version), BuildConfig.VERSION_NAME)
                SettingsDetailRow(stringResource(R.string.build_number), BuildConfig.VERSION_CODE.toString())
                SectionBand(stringResource(R.string.legal))
                SettingsDetailRow(stringResource(R.string.privacy), chevron = true, onClick = { openUrl(AppLegalLinks.PRIVACY_URL) })
                SettingsDetailRow(stringResource(R.string.terms), chevron = true, onClick = { openUrl(AppLegalLinks.TERMS_URL) })
                SectionBand(stringResource(R.string.developer_contact))
                SettingsDetailRow(
                    stringResource(R.string.email), value = "trinhduc20@gmail.com", chevron = true,
                    onClick = { openUrl("mailto:trinhduc20@gmail.com") },
                )
                SettingsDetailRow(
                    stringResource(R.string.website), value = AppLegalLinks.WEBSITE_HOST, chevron = true,
                    onClick = { openUrl(AppLegalLinks.WEBSITE_URL) },
                )
            }
        }
        return
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Text(
                        stringResource(R.string.app_info),
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
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp)
                .padding(top = 8.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            // APP INFORMATION — Version / Build
            Column {
                SectionLabel(stringResource(R.string.app_info))
                AppCard {
                    AppInfoValueRow(
                        title = stringResource(R.string.version),
                        value = BuildConfig.VERSION_NAME,
                    )
                    HorizontalDivider(
                        Modifier.padding(start = 16.dp),
                        color = MaterialTheme.colorScheme.outlineVariant,
                    )
                    AppInfoValueRow(
                        title = stringResource(R.string.build_number),
                        value = BuildConfig.VERSION_CODE.toString(),
                    )
                }
            }

            // LEGAL — Privacy / Terms
            Column {
                SectionLabel(stringResource(R.string.legal))
                AppCard {
                    AppInfoLinkRow(
                        title = stringResource(R.string.privacy),
                        onClick = { openUrl(AppLegalLinks.PRIVACY_URL) },
                    )
                    HorizontalDivider(
                        Modifier.padding(start = 16.dp),
                        color = MaterialTheme.colorScheme.outlineVariant,
                    )
                    AppInfoLinkRow(
                        title = stringResource(R.string.terms),
                        onClick = { openUrl(AppLegalLinks.TERMS_URL) },
                    )
                }
            }

            // DEVELOPER CONTACT — Email / Website
            Column {
                SectionLabel(stringResource(R.string.developer_contact))
                AppCard {
                    AppInfoLinkRow(
                        title = stringResource(R.string.email),
                        value = "trinhduc20@gmail.com",
                        onClick = { openUrl("mailto:trinhduc20@gmail.com") },
                    )
                    HorizontalDivider(
                        Modifier.padding(start = 16.dp),
                        color = MaterialTheme.colorScheme.outlineVariant,
                    )
                    AppInfoLinkRow(
                        title = stringResource(R.string.website),
                        value = AppLegalLinks.WEBSITE_HOST,
                        onClick = { openUrl(AppLegalLinks.WEBSITE_URL) },
                    )
                }
            }
        }
    }
}

/** iOS value1 cell: title left, secondary value right (non-clickable). */
@Composable
private fun AppInfoValueRow(title: String, value: String) {
    Row(
        Modifier
            .fillMaxWidth()
            .height(52.dp)
            .padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            title,
            modifier = Modifier.weight(1f),
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurface,
        )
        Text(
            value,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

/** iOS disclosure cell: title (+ optional value) + chevron. */
@Composable
private fun AppInfoLinkRow(
    title: String,
    onClick: () -> Unit,
    value: String? = null,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .height(52.dp)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(
            title,
            modifier = Modifier.weight(1f),
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurface,
        )
        if (!value.isNullOrBlank()) {
            Text(
                value,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
            )
        }
        Icon(
            Icons.Default.ChevronRight,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.outline,
            modifier = Modifier.size(20.dp),
        )
    }
}
