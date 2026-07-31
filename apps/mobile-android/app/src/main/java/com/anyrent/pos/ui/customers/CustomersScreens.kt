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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.CartStore
import com.anyrent.pos.data.model.Customer
import com.anyrent.pos.ui.common.EmptyOrError
import com.anyrent.pos.ui.common.LoadingBox
import com.anyrent.pos.ui.common.AppSearchField
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.flow.distinctUntilChanged

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomersScreen(
    pickMode: Boolean = false,
    onPicked: ((Customer) -> Unit)? = null,
    onBack: (() -> Unit)? = null,
    onViewOrders: ((Customer) -> Unit)? = null,
) {
    var query by remember { mutableStateOf("") }
    var page by remember { mutableIntStateOf(1) }
    var hasMore by remember { mutableStateOf(false) }
    var loadingMore by remember { mutableStateOf(false) }
    var customers by remember { mutableStateOf<List<Customer>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var refreshing by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var showForm by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf<Customer?>(null) }
    var actionCustomer by remember { mutableStateOf<Customer?>(null) }
    var deletingCustomer by remember { mutableStateOf<Customer?>(null) }
    val scope = rememberCoroutineScope()
    val customerListState = rememberLazyListState()

    fun refresh(fromPull: Boolean = false) {
        val requestedQuery = query.trim()
        scope.launch {
            if (fromPull) refreshing = true else loading = true
            error = null
            val result = withContext(Dispatchers.IO) {
                ApiClient.get().searchCustomers(page = 1, q = requestedQuery.ifBlank { null })
            }
            if (query.trim() != requestedQuery) return@launch
            loading = false
            refreshing = false
            result.onSuccess { customers = it.items
                hasMore = it.hasMore
                page = 1 }.onFailure { error = it.message }
        }
    }


    fun loadMore() {
        if (!hasMore || loadingMore) return
        val requestedQuery = query.trim()
        scope.launch {
            loadingMore = true
            val next = page + 1
            val result = withContext(Dispatchers.IO) {
                ApiClient.get().searchCustomers(page = next, q = requestedQuery.ifBlank { null })
            }
            loadingMore = false
            if (query.trim() != requestedQuery) return@launch
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

    LaunchedEffect(query) {
        delay(300)
        refresh()
    }

    if (showForm) {
        CustomerFormScreen(
            initial = editing,
            onBack = { showForm = false; editing = null },
            onSaved = {
                showForm = false
                editing = null
                refresh()
            },
        )
        return
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
                value = query,
                onValueChange = { query = it },
                placeholder = stringResource(R.string.search_customers_hint),
                modifier = Modifier.fillMaxWidth(),
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
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
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
                                onClick = {
                                    if (pickMode) {
                                        CartStore.setCustomer(customer)
                                        onPicked?.invoke(customer)
                                    } else {
                                        actionCustomer = customer
                                    }
                                },
                                onMore = if (pickMode) null else ({ actionCustomer = customer }),
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

    actionCustomer?.let { customer ->
        ModalBottomSheet(
            onDismissRequest = { actionCustomer = null },
            containerColor = Color.White,
        ) {
            CustomerAction(
                icon = Icons.Default.ReceiptLong,
                label = stringResource(R.string.view_orders),
                onClick = {
                    actionCustomer = null
                    onViewOrders?.invoke(customer)
                },
            )
            CustomerAction(
                icon = Icons.Default.Edit,
                label = stringResource(R.string.update_customer),
                onClick = {
                    actionCustomer = null
                    editing = customer
                    showForm = true
                },
            )
            CustomerAction(
                icon = Icons.Default.DeleteOutline,
                label = stringResource(R.string.delete_customer),
                color = MaterialTheme.colorScheme.error,
                onClick = {
                    actionCustomer = null
                    deletingCustomer = customer
                },
            )
            TextButton(
                onClick = { actionCustomer = null },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
            ) {
                Text(stringResource(R.string.cancel), fontWeight = FontWeight.SemiBold)
            }
        }
    }

    deletingCustomer?.let { customer ->
        AlertDialog(
            onDismissRequest = { deletingCustomer = null },
            title = { Text(stringResource(R.string.delete_customer)) },
            text = { Text(stringResource(R.string.delete_customer_confirm, customer.displayName)) },
            confirmButton = {
                TextButton(onClick = {
                    deletingCustomer = null
                    scope.launch {
                        withContext(Dispatchers.IO) { ApiClient.get().deleteCustomer(customer.id) }
                            .onSuccess { refresh() }
                            .onFailure { error = it.message }
                    }
                }) {
                    Text(stringResource(R.string.delete), color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { deletingCustomer = null }) {
                    Text(stringResource(R.string.cancel))
                }
            },
        )
    }
}

@Composable
private fun CustomerCard(
    customer: Customer,
    onClick: () -> Unit,
    onMore: (() -> Unit)?,
) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
        ),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(
            Modifier.fillMaxWidth().padding(start = 14.dp, end = 6.dp, top = 12.dp, bottom = 12.dp),
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
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(
                    customer.displayName,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface,
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
                        customer.phone?.takeIf { it.isNotBlank() }
                            ?: customer.email?.takeIf { it.isNotBlank() }
                            ?: "—",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            onMore?.let {
                IconButton(onClick = it, modifier = Modifier.size(48.dp)) {
                    Icon(
                        Icons.Default.MoreHoriz,
                        contentDescription = stringResource(R.string.customer_actions),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

@Composable
private fun CustomerAction(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    color: Color = MaterialTheme.colorScheme.primary,
    onClick: () -> Unit,
) {
    TextButton(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().heightIn(min = 62.dp),
    ) {
        Text(label, style = MaterialTheme.typography.titleLarge, color = color)
    }
    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomerFormScreen(
    initial: Customer?,
    onBack: () -> Unit,
    onSaved: () -> Unit,
) {
    var firstName by remember { mutableStateOf(initial?.firstName.orEmpty()) }
    var lastName by remember { mutableStateOf(initial?.lastName.orEmpty()) }
    var phone by remember { mutableStateOf(initial?.phone.orEmpty()) }
    var email by remember { mutableStateOf(initial?.email.orEmpty()) }
    var address by remember { mutableStateOf(initial?.address.orEmpty()) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (initial == null) stringResource(R.string.new_customer) else stringResource(R.string.edit_customer)) },
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
            OutlinedTextField(value = phone, onValueChange = { phone = it }, label = { Text(stringResource(R.string.phone)) }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text(stringResource(R.string.email)) }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = address, onValueChange = { address = it }, label = { Text(stringResource(R.string.address)) }, modifier = Modifier.fillMaxWidth())
            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            Button(
                onClick = {
                    scope.launch {
                        val result = withContext(Dispatchers.IO) {
                            if (initial == null) {
                                ApiClient.get().createCustomer(firstName, lastName, phone, email, address)
                            } else {
                                ApiClient.get().updateCustomer(initial.id, firstName, lastName, phone, email, address)
                            }
                        }
                        result.onSuccess { onSaved() }.onFailure { error = it.message }
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            ) { Text(stringResource(R.string.save)) }
            if (initial != null) {
                Button(
                    onClick = {
                        scope.launch {
                            withContext(Dispatchers.IO) { ApiClient.get().deleteCustomer(initial.id) }
                            onSaved()
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) { Text(stringResource(R.string.delete)) }
            }
        }
    }
}
