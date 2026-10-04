package com.anyrent.pos.ui.customers.v2

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Call
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.anyrent.pos.R
import com.anyrent.pos.data.CustomersV2Api
import com.anyrent.pos.data.PermissionManager
import com.anyrent.pos.data.UserRole
import com.anyrent.pos.data.model.Customer
import com.anyrent.pos.domain.customers.CustomerOrderRow
import com.anyrent.pos.domain.customers.CustomerOrders
import com.anyrent.pos.domain.customers.CustomerRow
import com.anyrent.pos.domain.customers.CustomerRules
import com.anyrent.pos.ui.common.AppAlertError
import com.anyrent.pos.ui.common.AppFormSheet
import com.anyrent.pos.ui.common.AppIcon
import com.anyrent.pos.ui.common.OrderStatusStyle
import com.anyrent.pos.ui.common.formatDayShort
import com.anyrent.pos.ui.common.formatMoneyVnd
import com.anyrent.pos.ui.customers.CustomerFormScreen
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.ZoneId

private val AvatarText = Color(0xFF1E40AF)
private val AvatarFill = Color(0xFFDBEAFE)
private val FieldBorder = Color(0xFFCBD5E1)
private val SearchFill = Color(0xFFF1F5F9)
private val Chevron = Color(0xFF94A3B8)

/** The row last opened from a list, so the detail header shows at once (the detail reloads it anyway) */
object CustomersV2Selection {
    var row: CustomerRow? = null
}

// ------------------------------------------------------------------ Picker (board KH-chon)

/** Sheet content of the new cart's customer picker (#387). [onPicked] gets the model the cart uses. */
@Composable
fun CustomerPickerSheet(onPicked: (Customer) -> Unit, onClose: () -> Unit) {
    var newCustomer by remember { mutableStateOf<String?>(null) }
    val prefill = newCustomer
    if (prefill != null) {
        NewCustomerContent(
            pickMode = true,
            prefill = prefill,
            onBack = { newCustomer = null },
            onDone = { onPicked(it.toCustomer()) },
        )
        return
    }
    // A fresh list each time the sheet opens (a customer added elsewhere shows up)
    val key = remember { "customers-picker-" + System.nanoTime() }
    CustomersListContent(
        pickMode = true,
        vm = viewModel(key = key, factory = CustomersListViewModel.Factory()),
        onClose = onClose,
        onNew = { typed -> newCustomer = typed },
        onOpen = { onPicked(it.toCustomer()) },
    )
}

// ------------------------------------------------------------------ List (board KH-ds)

/** Settings → Khách hàng when `newCustomers` is on */
@Composable
fun CustomersListV2Screen(onBack: () -> Unit, onOpen: (CustomerRow) -> Unit) {
    var newCustomer by remember { mutableStateOf<String?>(null) }
    val vm: CustomersListViewModel = viewModel(factory = CustomersListViewModel.Factory())
    Box(Modifier.fillMaxSize().background(DS.Colors.Surface).statusBarsPadding()) {
        CustomersListContent(pickMode = false, onClose = onBack, onNew = { newCustomer = it }, onOpen = onOpen, vm = vm)
    }
    newCustomer?.let { prefill ->
        AppFormSheet(onDismiss = { newCustomer = null }) {
            NewCustomerContent(
                pickMode = false,
                prefill = prefill,
                onBack = { newCustomer = null },
                onDone = { row ->
                    newCustomer = null
                    vm.reload()
                    onOpen(row)
                },
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CustomersListContent(
    pickMode: Boolean,
    onClose: () -> Unit,
    onNew: (String) -> Unit,
    onOpen: (CustomerRow) -> Unit,
    vm: CustomersListViewModel,
) {
    val state by vm.state.collectAsState()
    var draft by remember { mutableStateOf(state.query) }
    val listState = rememberLazyListState()
    val canAdd = pickMode || PermissionManager.role != UserRole.UNKNOWN

    LaunchedEffect(listState, state.rows.size) {
        snapshotFlow { listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0 }
            .distinctUntilChanged()
            .collect { last -> if (last >= listState.layoutInfo.totalItemsCount - 3) vm.loadMore() }
    }

    Column(Modifier.fillMaxSize().background(DS.Colors.Surface)) {
        // Header
        Row(
            Modifier.fillMaxWidth().padding(start = 8.dp, end = 8.dp, top = 8.dp).heightIn(min = 48.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (pickMode) {
                Text(
                    stringResource(R.string.customers_v2_pick_title), fontSize = 20.sp, fontWeight = FontWeight.Bold,
                    color = DS.Colors.Text, modifier = Modifier.padding(start = 8.dp).weight(1f).semantics { heading() },
                )
                TextButton(onClick = onClose, modifier = Modifier.heightIn(min = DS.TouchTarget)) {
                    Text(stringResource(R.string.customers_v2_close), fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = DS.Colors.TextMuted)
                }
            } else {
                IconButton(onClick = onClose) {
                    AppIcon(Icons.AutoMirrored.Outlined.KeyboardArrowLeft, contentDescription = stringResource(R.string.back), size = DS.Icon.Lg, tint = DS.Colors.Text)
                }
                Text(
                    buildAnnotatedString {
                        append(stringResource(R.string.customers_v2_title))
                        if (!state.loading || state.total > 0) {
                            withStyle(SpanStyle(fontSize = 15.sp, fontWeight = FontWeight.Medium, color = DS.Colors.TextMuted)) {
                                append(" · ${state.total}")
                            }
                        }
                    },
                    fontSize = 20.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text,
                    modifier = Modifier.weight(1f).semantics { heading() },
                )
                if (canAdd) {
                    IconButton(onClick = { onNew("") }) {
                        AppIcon(Icons.Outlined.Add, contentDescription = stringResource(R.string.customers_v2_add), size = DS.Icon.Sm, tint = DS.Colors.Text)
                    }
                }
            }
        }
        // Search
        SearchBox(
            value = draft,
            onValueChange = {
                draft = it
                vm.setQuery(it)
            },
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
        )
        if (!pickMode) HorizontalDivider(color = DS.Colors.Border)

        PullToRefreshBox(
            isRefreshing = state.refreshing,
            onRefresh = { vm.reload(fromPull = true) },
            modifier = Modifier.fillMaxWidth().weight(1f),
        ) {
            LazyColumn(state = listState, modifier = Modifier.fillMaxSize()) {
                if (pickMode) {
                    item(key = "new") { NewCustomerRow(onClick = { onNew(draft.trim()) }) }
                    if (state.query.isEmpty() && state.rows.isNotEmpty()) {
                        item(key = "recent") {
                            Text(
                                stringResource(R.string.customers_v2_recent), fontSize = 13.sp, fontWeight = FontWeight.Bold,
                                color = DS.Colors.TextMuted, letterSpacing = 0.5.sp,
                                modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 4.dp).semantics { heading() },
                            )
                        }
                    }
                }
                when {
                    state.loading && state.rows.isEmpty() -> item(key = "loading") {
                        Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(Modifier.size(28.dp), strokeWidth = 2.dp)
                        }
                    }
                    state.error != null && state.rows.isEmpty() -> item(key = "error") { Message(state.error!!) }
                    state.rows.isEmpty() -> item(key = "empty") {
                        Message(stringResource(if (state.query.isEmpty()) R.string.customers_v2_empty else R.string.customers_v2_no_match))
                    }
                    else -> items(state.rows, key = { it.id }) { row ->
                        CustomerRowItem(row, showsChevron = !pickMode, onClick = {
                            CustomersV2Selection.row = row
                            onOpen(row)
                        })
                    }
                }
            }
        }
    }
}

@Composable
private fun SearchBox(value: String, onValueChange: (String) -> Unit, modifier: Modifier = Modifier) {
    val label = stringResource(R.string.customers_v2_search)
    Row(
        modifier.fillMaxWidth().height(48.dp).clip(RoundedCornerShape(12.dp)).background(SearchFill).padding(horizontal = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        AppIcon(Icons.Outlined.Search, contentDescription = null, size = DS.Icon.Sm, tint = DS.Colors.TextMuted)
        Box(Modifier.weight(1f)) {
            if (value.isEmpty()) Text(stringResource(R.string.customers_v2_search_placeholder), fontSize = 16.sp, color = DS.Colors.TextMuted)
            androidx.compose.foundation.text.BasicTextField(
                value = value,
                onValueChange = onValueChange,
                singleLine = true,
                textStyle = androidx.compose.ui.text.TextStyle(fontSize = 16.sp, color = DS.Colors.Text),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                modifier = Modifier.fillMaxWidth().semantics { contentDescription = label },
            )
        }
    }
}

@Composable
private fun NewCustomerRow(onClick: () -> Unit) {
    Column(Modifier.fillMaxWidth()) {
        Row(
            Modifier.fillMaxWidth().clickable(onClick = onClick).semantics { role = Role.Button }
                .heightIn(min = 60.dp).padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Box(
                Modifier.size(44.dp).drawBehind {
                    drawCircle(
                        color = DS.Colors.Primary, radius = size.minDimension / 2 - 1.dp.toPx(),
                        style = Stroke(width = 1.5.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 7f))),
                    )
                },
                contentAlignment = Alignment.Center,
            ) {
                AppIcon(Icons.Outlined.Add, contentDescription = null, size = DS.Icon.Sm, tint = DS.Colors.Primary)
            }
            Text(stringResource(R.string.customers_v2_new), fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = DS.Colors.Primary)
        }
        Box(Modifier.fillMaxWidth().height(8.dp).background(DS.Colors.Background))
    }
}

@Composable
fun CustomerAvatar(name: String, size: Int, fontSize: Int) {
    Box(Modifier.size(size.dp).clip(CircleShape).background(AvatarFill), contentAlignment = Alignment.Center) {
        Text(CustomerRules.initials(name), fontSize = fontSize.sp, fontWeight = FontWeight.Bold, color = AvatarText)
    }
}

@Composable
private fun TierPill(tier: String?) {
    if (tier == null) return
    Text(
        tier, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = DS.Status.Waiting.text, maxLines = 1,
        modifier = Modifier.clip(RoundedCornerShape(DS.Radius.pill)).background(DS.Status.Waiting.fill).padding(horizontal = 8.dp, vertical = 2.dp),
    )
}

@Composable
private fun CustomerRowItem(row: CustomerRow, showsChevron: Boolean, onClick: () -> Unit) {
    val subtitle = CustomerRules.subtitle(row.phone, pluralStringResource(R.plurals.customers_v2_orders, row.orderCount, row.orderCount))
    Column(Modifier.fillMaxWidth()) {
        Row(
            Modifier.fillMaxWidth().clickable(onClick = onClick)
                .semantics(mergeDescendants = true) { role = Role.Button }
                .heightIn(min = 64.dp).padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            CustomerAvatar(row.name, 44, 15)
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(row.name, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text, maxLines = 1,
                        overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false))
                    TierPill(row.tier)
                }
                Text(subtitle, fontSize = 13.sp, color = DS.Colors.TextMuted, maxLines = 1)
            }
            if (showsChevron) AppIcon(Icons.AutoMirrored.Outlined.KeyboardArrowRight, contentDescription = null, size = 16.dp, tint = Chevron)
        }
        HorizontalDivider(color = DS.Colors.Divider)
    }
}

@Composable
private fun Message(text: String) {
    Text(text, fontSize = 15.sp, color = DS.Colors.TextMuted, textAlign = TextAlign.Center,
        modifier = Modifier.fillMaxWidth().padding(horizontal = 32.dp, vertical = 48.dp))
}

// ------------------------------------------------------------------ New customer (board KH-moi)

/**
 * Phone and full name required, note optional. The phone is looked up first; a customer that already has it is
 * offered ("Chọn khách này") instead of a duplicate.
 */
@Composable
fun NewCustomerContent(
    pickMode: Boolean,
    prefill: String,
    onBack: () -> Unit,
    onDone: (CustomerRow) -> Unit,
) {
    val digitsOnly = prefill.isNotEmpty() && prefill.filterNot { it.isWhitespace() }.all { it.isDigit() }
    var phone by remember { mutableStateOf(if (digitsOnly) prefill else "") }
    var name by remember { mutableStateOf(if (digitsOnly) "" else prefill) }
    var note by remember { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }
    var existing by remember { mutableStateOf<CustomerRow?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var problem by remember { mutableStateOf<CustomerRules.FormProblem?>(null) }
    val scope = rememberCoroutineScope()
    val flow = remember { NewCustomerFlow() }
    val needPhone = stringResource(R.string.customers_v2_need_phone)
    val needName = stringResource(R.string.customers_v2_need_name)

    fun save() {
        problem = CustomerRules.validate(name, phone)
        if (problem != null) return
        saving = true
        scope.launch {
            when (val outcome = flow.submit(name, phone, note)) {
                is NewCustomerFlow.Outcome.Created -> onDone(outcome.row)
                is NewCustomerFlow.Outcome.Existing -> existing = outcome.row
                is NewCustomerFlow.Outcome.Failed -> error = outcome.message
            }
            saving = false
        }
    }

    Column(Modifier.fillMaxSize().background(DS.Colors.Surface).imePadding()) {
        Row(Modifier.fillMaxWidth().padding(start = 8.dp, end = 8.dp, top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) {
                AppIcon(Icons.AutoMirrored.Outlined.KeyboardArrowLeft, contentDescription = stringResource(R.string.back), size = DS.Icon.Lg, tint = DS.Colors.Text)
            }
            Text(stringResource(R.string.customers_v2_new_title), fontSize = 20.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text,
                modifier = Modifier.semantics { heading() })
        }
        Column(
            Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            FormField(
                label = stringResource(R.string.customers_v2_phone), value = phone,
                onValueChange = { phone = it; existing = null; if (problem == CustomerRules.FormProblem.MISSING_PHONE) problem = null },
                keyboardType = KeyboardType.Phone,
                error = needPhone.takeIf { problem == CustomerRules.FormProblem.MISSING_PHONE },
            )
            FormField(
                label = stringResource(R.string.customers_v2_name), value = name,
                onValueChange = { name = it; if (problem == CustomerRules.FormProblem.MISSING_NAME) problem = null },
                capitalization = KeyboardCapitalization.Words,
                error = needName.takeIf { problem == CustomerRules.FormProblem.MISSING_NAME },
            )
            FormField(
                label = stringResource(R.string.customers_v2_note), optional = stringResource(R.string.customers_v2_optional),
                value = note, onValueChange = { note = it },
                placeholder = stringResource(R.string.customers_v2_note_placeholder),
                imeAction = ImeAction.Done,
            )
            Text(stringResource(R.string.customers_v2_hint), fontSize = 13.sp, color = DS.Colors.TextMuted)
            existing?.let { row ->
                Column(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(DS.Radius.card)).background(DS.Status.Waiting.fill).padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Text(stringResource(R.string.customers_v2_duplicate), fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = DS.Status.Waiting.text)
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        CustomerAvatar(row.name, 44, 15)
                        Column(Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text(row.name, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text)
                                TierPill(row.tier)
                            }
                            Text(
                                CustomerRules.subtitle(row.phone, pluralStringResource(R.plurals.customers_v2_orders, row.orderCount, row.orderCount)),
                                fontSize = 13.sp, color = DS.Colors.TextMuted,
                            )
                        }
                    }
                    OutlinedButton(
                        onClick = { onDone(row) },
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.outlinedButtonColors(containerColor = DS.Colors.Surface, contentColor = DS.Colors.Text),
                        border = BorderStroke(1.dp, FieldBorder),
                    ) {
                        Text(stringResource(if (pickMode) R.string.customers_v2_use_existing else R.string.customers_v2_open_existing),
                            fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
        Box(Modifier.fillMaxWidth().navigationBarsPadding().padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 16.dp)) {
            PrimaryButton(
                text = stringResource(if (pickMode) R.string.customers_v2_save_and_pick else R.string.save),
                enabled = !saving, loading = saving, onClick = ::save,
            )
        }
    }
    error?.let { AppAlertError(message = it, onDismiss = { error = null }) }
}

@Composable
private fun FormField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    optional: String? = null,
    placeholder: String? = null,
    keyboardType: KeyboardType = KeyboardType.Text,
    capitalization: KeyboardCapitalization = KeyboardCapitalization.None,
    imeAction: ImeAction = ImeAction.Next,
    error: String? = null,
) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(
            buildAnnotatedString {
                append(label)
                optional?.let { withStyle(SpanStyle(fontWeight = FontWeight.Normal, color = DS.Colors.TextMuted)) { append(" $it") } }
            },
            fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text,
        )
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            singleLine = true,
            isError = error != null,
            placeholder = placeholder?.let { { Text(it, fontSize = 16.sp, color = DS.Colors.TextMuted) } },
            supportingText = error?.let { { Text(it) } },
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType, capitalization = capitalization, imeAction = imeAction),
            keyboardActions = KeyboardActions.Default,
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = FieldBorder, focusedBorderColor = DS.Colors.Primary),
            textStyle = androidx.compose.ui.text.TextStyle(fontSize = 16.sp, color = DS.Colors.Text),
            modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp).semantics { contentDescription = label },
        )
    }
}

@Composable
private fun PrimaryButton(text: String, enabled: Boolean = true, loading: Boolean = false, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = Modifier.fillMaxWidth().height(52.dp),
        shape = RoundedCornerShape(14.dp),
        colors = ButtonDefaults.buttonColors(containerColor = DS.Colors.Primary, contentColor = Color.White),
    ) {
        if (loading) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = Color.White)
        else Text(text, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
    }
}

// ------------------------------------------------------------------ Detail (board KH-chi-tiet)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomerDetailV2Screen(
    customerId: Int,
    onBack: () -> Unit,
    onOpenOrder: (Int) -> Unit,
    onCreateOrder: (Customer) -> Unit,
) {
    val context = LocalContext.current
    val initial = remember(customerId) { CustomersV2Selection.row?.takeIf { it.id == customerId } }
    var row by remember { mutableStateOf(initial) }
    var orders by remember { mutableStateOf<CustomerOrders?>(null) }
    var renting by remember { mutableStateOf<Int?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var reloadKey by remember { mutableIntStateOf(0) }
    var editing by remember { mutableStateOf(false) }
    val canEdit = PermissionManager.role != UserRole.UNKNOWN

    LaunchedEffect(customerId, reloadKey) {
        loading = true
        val rentingCall = async(Dispatchers.IO) { CustomersV2Api.rentingCount(customerId).getOrNull() }
        withContext(Dispatchers.IO) { CustomersV2Api.orders(customerId, CustomerRules.PAGE_SIZE) }
            .onSuccess { answer ->
                orders = answer
                error = null
                val current = row
                row = CustomerRow(
                    id = customerId,
                    firstName = answer.firstName ?: current?.firstName.orEmpty(),
                    lastName = answer.lastName ?: current?.lastName.takeIf { answer.firstName == null },
                    phone = answer.phone ?: current?.phone,
                    email = current?.email,
                    address = current?.address,
                    orderCount = answer.totalOrders,
                    tier = answer.tier,
                )
            }
            .onFailure { error = it.message }
        renting = rentingCall.await()
        loading = false
    }

    val shown = row
    val name = shown?.name ?: ""
    val phone = shown?.phone?.takeIf { it.isNotBlank() }
    Column(Modifier.fillMaxSize().background(DS.Colors.Background)) {
        Column(Modifier.fillMaxWidth().background(DS.Colors.Surface).statusBarsPadding().padding(start = 8.dp, end = 8.dp, top = 8.dp, bottom = 16.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) {
                    AppIcon(Icons.AutoMirrored.Outlined.KeyboardArrowLeft, contentDescription = stringResource(R.string.back), size = DS.Icon.Lg, tint = DS.Colors.Text)
                }
                Spacer(Modifier.weight(1f))
                if (canEdit && shown != null) {
                    TextButton(onClick = { editing = true }, modifier = Modifier.heightIn(min = DS.TouchTarget)) {
                        Text(stringResource(R.string.customers_v2_edit), fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = DS.Colors.Primary)
                    }
                }
            }
            Row(Modifier.fillMaxWidth().padding(start = 8.dp, end = 8.dp, top = 4.dp), verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                CustomerAvatar(name, 56, 18)
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(name, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text, modifier = Modifier.weight(1f, fill = false))
                        TierPill(shown?.tier)
                    }
                    phone?.let { Text(it, fontSize = 14.sp, color = DS.Colors.TextMuted) }
                }
                if (CustomerRules.phoneDigits(phone).isNotEmpty()) {
                    val callLabel = stringResource(R.string.customers_v2_call)
                    IconButton(
                        onClick = {
                            runCatching { context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + CustomerRules.phoneDigits(phone)))) }
                        },
                        modifier = Modifier.size(DS.TouchTarget).clip(CircleShape).background(AvatarFill).semantics { contentDescription = callLabel },
                    ) {
                        AppIcon(Icons.Outlined.Call, contentDescription = null, size = DS.Icon.Sm, tint = DS.Colors.Primary)
                    }
                }
            }
            val tiles = CustomerRules.tiles(
                titles = Triple(stringResource(R.string.customers_v2_tile_orders), stringResource(R.string.customers_v2_tile_spent), stringResource(R.string.customers_v2_tile_renting)),
                totalOrders = orders?.totalOrders ?: shown?.orderCount ?: 0,
                totalAmount = orders?.totalAmount,
                renting = renting,
                money = ::formatMoneyVnd,
            )
            Row(Modifier.fillMaxWidth().padding(start = 8.dp, end = 8.dp, top = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                tiles.forEach { tile ->
                    Column(
                        Modifier.weight(1f).border(1.dp, Color(0xFFEEF0F3), RoundedCornerShape(DS.Radius.card)).padding(10.dp)
                            .semantics(mergeDescendants = true) {},
                        verticalArrangement = Arrangement.spacedBy(2.dp),
                    ) {
                        Text(tile.title, fontSize = 12.sp, color = DS.Colors.TextMuted, maxLines = 1)
                        Text(tile.value, fontSize = 17.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text, maxLines = 1,
                            overflow = TextOverflow.Ellipsis)
                    }
                }
            }
        }
        Text(
            stringResource(R.string.customers_v2_recent_orders).uppercase(), fontSize = 13.sp, fontWeight = FontWeight.Bold,
            color = DS.Colors.TextMuted, letterSpacing = 0.5.sp,
            modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 6.dp).semantics { heading() },
        )
        LazyColumn(Modifier.weight(1f).fillMaxWidth().background(DS.Colors.Surface)) {
            val list = orders?.orders.orEmpty()
            when {
                loading && list.isEmpty() -> item {
                    Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(Modifier.size(24.dp), strokeWidth = 2.dp)
                    }
                }
                error != null && list.isEmpty() -> item { Message(error!!) }
                list.isEmpty() -> item { Message(stringResource(R.string.customers_v2_no_orders)) }
                else -> items(list, key = { it.id }) { order -> OrderRowItem(order, onClick = { onOpenOrder(order.id) }) }
            }
        }
        Column(Modifier.fillMaxWidth().background(DS.Colors.Surface)) {
            HorizontalDivider(color = DS.Colors.Border)
            Box(Modifier.fillMaxWidth().navigationBarsPadding().padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 16.dp)) {
                PrimaryButton(
                    text = stringResource(R.string.customers_v2_create_order),
                    enabled = shown != null,
                    onClick = { shown?.let { onCreateOrder(it.toCustomer()) } },
                )
            }
        }
    }

    if (editing && shown != null) {
        AppFormSheet(onDismiss = { editing = false }) {
            CustomerFormScreen(
                initial = shown.toCustomer(),
                onBack = { editing = false },
                onSaved = {
                    editing = false
                    reloadKey += 1
                },
                // #387: OUTLET_STAFF never sees delete
                allowDelete = PermissionManager.canDeleteCustomers(),
            )
        }
    }
}

@Composable
private fun OrderRowItem(order: CustomerOrderRow, onClick: () -> Unit) {
    val items = pluralStringResource(R.plurals.customers_v2_items, order.itemCount, order.itemCount)
    val dates = CustomerRules.orderDates(order, ZoneId.systemDefault()) { formatDayShort(it) }
    Column(Modifier.fillMaxWidth()) {
        Row(
            Modifier.fillMaxWidth().clickable(onClick = onClick).semantics(mergeDescendants = true) { role = Role.Button }
                .heightIn(min = 64.dp).padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(CustomerRules.orderTitle(order, items), fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text,
                    maxLines = 1, overflow = TextOverflow.Ellipsis)
                if (dates.isNotEmpty()) Text(dates, fontSize = 13.sp, color = DS.Colors.TextMuted)
            }
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                StatusPill(order.status)
                Text(formatMoneyVnd(order.totalAmount), fontSize = 14.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text)
            }
        }
        HorizontalDivider(color = DS.Colors.Divider)
    }
}

/** Board pill colors: reserved blue, out purple, done green, cancelled grey */
@Composable
private fun StatusPill(status: String) {
    val colors = when (status.uppercase()) {
        "RESERVED" -> DS.Status.HandOver
        "PICKUPED", "PICKED_UP" -> DS.Status.Return
        "RETURNED", "COMPLETED" -> DS.Status.Done
        else -> DS.Status.Cancelled
    }
    val label = OrderStatusStyle.labelRes(status)?.let { stringResource(it) } ?: status
    Text(
        label, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = colors.text, maxLines = 1,
        modifier = Modifier.clip(RoundedCornerShape(DS.Radius.pill)).background(colors.fill).padding(horizontal = 9.dp, vertical = 3.dp),
    )
}
