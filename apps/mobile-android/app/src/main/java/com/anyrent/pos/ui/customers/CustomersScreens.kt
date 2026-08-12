package com.anyrent.pos.ui.customers

import androidx.compose.foundation.clickable
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.CartStore
import com.anyrent.pos.data.model.Customer
import com.anyrent.pos.ui.common.AppAlertConfirm
import com.anyrent.pos.ui.common.AppAlertError
import com.anyrent.pos.ui.common.AppCard
import com.anyrent.pos.ui.common.AppFormSheet
import com.anyrent.pos.ui.common.AppInputField
import com.anyrent.pos.ui.common.AppMenuAction
import com.anyrent.pos.ui.common.AppOverflowMenuAnchor
import com.anyrent.pos.ui.common.AppPrimaryButton
import com.anyrent.pos.ui.common.AppSecondaryButton
import com.anyrent.pos.ui.common.EmptyOrError
import com.anyrent.pos.ui.common.LoadingBox
import com.anyrent.pos.ui.common.AppSearchField
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomersScreen(
    pickMode: Boolean = false,
    onPicked: ((Customer) -> Unit)? = null,
    onBack: (() -> Unit)? = null,
    onViewOrders: ((Customer) -> Unit)? = null,
) {
    var draftQuery by remember { mutableStateOf("") }
    var appliedQuery by remember { mutableStateOf("") }
    var page by remember { mutableIntStateOf(1) }
    var hasMore by remember { mutableStateOf(false) }
    var loadingMore by remember { mutableStateOf(false) }
    var customers by remember { mutableStateOf<List<Customer>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var refreshing by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var showForm by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf<Customer?>(null) }
    var deletingCustomer by remember { mutableStateOf<Customer?>(null) }
    var actionError by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val customerListState = rememberLazyListState()

    fun refresh(fromPull: Boolean = false) {
        val requestedQuery = appliedQuery.trim()
        scope.launch {
            if (fromPull) refreshing = true else loading = true
            error = null
            val result = withContext(Dispatchers.IO) {
                ApiClient.get().searchCustomers(page = 1, q = requestedQuery.ifBlank { null })
            }
            if (appliedQuery.trim() != requestedQuery) return@launch
            loading = false
            refreshing = false
            result.onSuccess { customers = it.items
                hasMore = it.hasMore
                page = 1 }.onFailure { error = it.message }
        }
    }


    fun loadMore() {
        if (!hasMore || loadingMore) return
        val requestedQuery = appliedQuery.trim()
        scope.launch {
            loadingMore = true
            val next = page + 1
            val result = withContext(Dispatchers.IO) {
                ApiClient.get().searchCustomers(page = next, q = requestedQuery.ifBlank { null })
            }
            loadingMore = false
            if (appliedQuery.trim() != requestedQuery) return@launch
            result.onSuccess {
                customers = customers + it.items
                page = next
                hasMore = it.hasMore
            }
        }
    }

    LaunchedEffect(customerListState, hasMore, loadingMore) {
        snapshotFlow {
            val info = customerListState.layoutInfo
            val lastVisible = info.visibleItemsInfo.lastOrNull()?.index ?: -1
            lastVisible >= info.totalItemsCount - 3
        }.distinctUntilChanged().collect { nearEnd ->
            if (nearEnd && hasMore && !loadingMore) loadMore()
        }
    }

    // Initial load only — search runs when the user presses the keyboard Search key.
    LaunchedEffect(Unit) {
        refresh()
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        stringResource(R.string.customers),
                        fontWeight = FontWeight.Bold,
                    )
                },
                navigationIcon = {
                    if (onBack != null) {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                        }
                    }
                },
                colors = androidx.compose.material3.TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .background(MaterialTheme.colorScheme.background)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            AppSearchField(
                value = draftQuery,
                onValueChange = { draftQuery = it },
                placeholder = stringResource(R.string.search_customers_hint),
                modifier = Modifier.fillMaxWidth(),
                onSearch = {
                    appliedQuery = draftQuery.trim()
                    refresh()
                },
                onClear = {
                    draftQuery = ""
                    appliedQuery = ""
                    refresh()
                },
            )
            OutlinedButton(
                onClick = { editing = null; showForm = true },
                modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp),
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(
                    1.dp,
                    MaterialTheme.colorScheme.primary.copy(alpha = 0.32f),
                ),
                colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(
                    containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.06f),
                    contentColor = MaterialTheme.colorScheme.primary,
                ),
            ) {
                Box(
                    Modifier
                        .size(26.dp)
                        .background(
                            MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                            CircleShape,
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Default.Add,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp),
                    )
                }
                Text(
                    stringResource(R.string.add_new_customer),
                    modifier = Modifier.padding(start = 10.dp),
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Bold,
                )
            }
            PullToRefreshBox(
                isRefreshing = refreshing,
                onRefresh = { refresh(fromPull = true) },
                modifier = Modifier.fillMaxWidth().weight(1f),
            ) {
                when {
                    loading -> LoadingBox()
                    error != null -> EmptyOrError(error!!)
                    customers.isEmpty() -> EmptyOrError(stringResource(R.string.empty_customers))
                    else -> LazyColumn(
                        state = customerListState,
                        contentPadding = PaddingValues(top = 4.dp, bottom = 20.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        items(customers, key = { it.id }) { customer ->
                            CustomerCard(
                                customer = customer,
                                pickMode = pickMode,
                                onClick = {
                                    if (pickMode) {
                                        CartStore.setCustomer(customer)
                                        onPicked?.invoke(customer)
                                    }
                                },
                                onViewOrders = {
                                    onViewOrders?.invoke(customer)
                                },
                                onUpdate = {
                                    editing = customer
                                    showForm = true
                                },
                                onDelete = {
                                    deletingCustomer = customer
                                },
                            )
                        }
                        if (loadingMore) {
                            item {
                                androidx.compose.foundation.layout.Box(
                                    Modifier.fillMaxWidth().padding(12.dp),
                                    contentAlignment = androidx.compose.ui.Alignment.Center,
                                ) {
                                    CircularProgressIndicator(Modifier.size(24.dp), strokeWidth = 2.dp)
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
        ) {
            CustomerFormScreen(
                initial = editing,
                onBack = {
                    showForm = false
                    editing = null
                },
                onSaved = {
                    showForm = false
                    editing = null
                    refresh()
                },
            )
        }
    }

    deletingCustomer?.let { customer ->
        AppAlertConfirm(
            title = stringResource(R.string.delete_customer),
            message = stringResource(R.string.delete_customer_confirm, customer.displayName),
            confirmLabel = stringResource(R.string.delete),
            destructive = true,
            onDismiss = { deletingCustomer = null },
            onConfirm = {
                deletingCustomer = null
                scope.launch {
                    withContext(Dispatchers.IO) { ApiClient.get().deleteCustomer(customer.id) }
                        .onSuccess { refresh() }
                        .onFailure { actionError = it.message }
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
private fun CustomerCard(
    customer: Customer,
    pickMode: Boolean,
    onClick: () -> Unit,
    onViewOrders: () -> Unit,
    onUpdate: () -> Unit,
    onDelete: () -> Unit,
) {
    var menuExpanded by remember { mutableStateOf(false) }
    val phoneOrEmail = customer.phone?.takeIf { it.isNotBlank() && !it.equals("null", ignoreCase = true) }
        ?: customer.email?.takeIf { it.isNotBlank() && !it.equals("null", ignoreCase = true) }
        ?: "—"

    // Actions always available — manage + pick share this list UI. Hiding ⋮ when
    // pickMode=true made Settings→Customers look identical to PickCustomer but
    // with an empty trailing edge (see screenshot). Row tap still selects in pickMode;
    // IconButton consumes its own clicks so the menu stays usable.
    val overflowActions = listOf(
        AppMenuAction(
            label = stringResource(R.string.view_orders),
            icon = Icons.AutoMirrored.Filled.ReceiptLong,
            onClick = onViewOrders,
        ),
        AppMenuAction(
            label = stringResource(R.string.update_customer),
            icon = Icons.Outlined.Edit,
            onClick = onUpdate,
        ),
        AppMenuAction(
            label = stringResource(R.string.delete_customer),
            icon = Icons.Outlined.DeleteOutline,
            onClick = onDelete,
            destructive = true,
        ),
    )

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .then(if (pickMode) Modifier.clickable(onClick = onClick) else Modifier),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
        ),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(start = 14.dp, end = 6.dp, top = 10.dp, bottom = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Box(
                Modifier
                    .size(46.dp)
                    .background(
                        MaterialTheme.colorScheme.primary.copy(alpha = 0.09f),
                        CircleShape,
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Default.Person,
                    contentDescription = null,
                    modifier = Modifier.size(25.dp),
                    tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.72f),
                )
            }
            Column(
                Modifier
                    .weight(1f)
                    .padding(end = 4.dp),
                verticalArrangement = Arrangement.spacedBy(3.dp),
            ) {
                Text(
                    customer.displayName,
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Icon(
                        Icons.Default.Phone,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        phoneOrEmail,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
            AppOverflowMenuAnchor(
                contentDescription = stringResource(R.string.customer_actions),
                actions = overflowActions,
                expanded = menuExpanded,
                onExpandedChange = { menuExpanded = it },
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomerFormScreen(
    initial: Customer?,
    onBack: () -> Unit,
    onSaved: () -> Unit,
) {
    val context = LocalContext.current
    // Treat JSON/"null" placeholders as empty so edit fields stay blank.
    fun cleanField(value: String?): String =
        value?.trim()?.takeIf { it.isNotEmpty() && !it.equals("null", ignoreCase = true) }.orEmpty()

    var firstName by remember { mutableStateOf(cleanField(initial?.firstName)) }
    var lastName by remember { mutableStateOf(cleanField(initial?.lastName)) }
    var phone by remember { mutableStateOf(cleanField(initial?.phone)) }
    var email by remember { mutableStateOf(cleanField(initial?.email)) }
    var address by remember { mutableStateOf(cleanField(initial?.address)) }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    var submitted by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    fun saveCustomer() {
        submitted = true
        if (firstName.isBlank()) {
            error = context.getString(R.string.invalid_customer_input)
            return
        }
        loading = true
        error = null
        scope.launch {
            val result = withContext(Dispatchers.IO) {
                if (initial == null) {
                    ApiClient.get().createCustomer(firstName, lastName, phone, email, address)
                } else {
                    ApiClient.get().updateCustomer(initial.id, firstName, lastName, phone, email, address)
                }
            }
            loading = false
            result.onSuccess { onSaved() }.onFailure { error = it.message }
        }
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.surface,
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        topBar = {
            TopAppBar(
                // Sheet is not under the status bar — default TopAppBar insets push the title down.
                windowInsets = WindowInsets(0, 0, 0, 0),
                title = {
                    Text(
                        if (initial == null) stringResource(R.string.new_customer)
                        else stringResource(R.string.edit_customer),
                        style = MaterialTheme.typography.titleLarge,
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.Close, contentDescription = stringResource(R.string.close))
                    }
                },
                colors = androidx.compose.material3.TopAppBarDefaults.topAppBarColors(
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
                    else if (initial == null) stringResource(R.string.add_customer)
                    else stringResource(R.string.save),
                    onClick = ::saveCustomer,
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
                    CustomerField(
                        value = firstName,
                        onValueChange = { firstName = it },
                        label = stringResource(R.string.first_name_required),
                        isError = submitted && firstName.isBlank(),
                    )
                    CustomerField(
                        value = lastName,
                        onValueChange = { lastName = it },
                        label = stringResource(R.string.last_name),
                    )
                    CustomerField(
                        value = phone,
                        onValueChange = { phone = it },
                        label = stringResource(R.string.phone),
                        keyboardType = KeyboardType.Phone,
                    )
                    CustomerField(
                        value = email,
                        onValueChange = { email = it },
                        label = stringResource(R.string.email),
                        keyboardType = KeyboardType.Email,
                    )
                    CustomerField(
                        value = address,
                        onValueChange = { address = it },
                        label = stringResource(R.string.address),
                        singleLine = false,
                        minLines = 2,
                    )
                }
            }

            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }

            if (initial != null) {
                AppSecondaryButton(
                    text = stringResource(R.string.delete),
                    onClick = {
                        scope.launch {
                            loading = true
                            val result = withContext(Dispatchers.IO) {
                                ApiClient.get().deleteCustomer(initial.id)
                            }
                            loading = false
                            result.onSuccess { onSaved() }.onFailure { error = it.message }
                        }
                    },
                    enabled = !loading,
                )
            }
        }
    }
}

@Composable
private fun CustomerField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    keyboardType: KeyboardType = KeyboardType.Text,
    isError: Boolean = false,
    singleLine: Boolean = true,
    minLines: Int = 1,
) {
    AppInputField(
        value = value,
        onValueChange = onValueChange,
        label = label,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        isError = isError,
        singleLine = singleLine,
        minLines = minLines,
    )
}
