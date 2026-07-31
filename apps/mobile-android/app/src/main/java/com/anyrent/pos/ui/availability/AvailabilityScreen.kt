package com.anyrent.pos.ui.availability

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material3.Button
import androidx.compose.material3.DatePickerDefaults
import androidx.compose.material3.DatePicker
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.anyrent.pos.AnyRentApp
import com.anyrent.pos.R
import com.anyrent.pos.domain.availability.ProductAvailability
import com.anyrent.pos.domain.availability.AvailabilityOrder
import com.anyrent.pos.ui.common.AppCard
import com.anyrent.pos.ui.common.formatQuantity
import com.anyrent.pos.ui.common.StatusBadge
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import java.time.Instant
import java.time.ZoneOffset

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AvailabilityScreen(
    onBack: () -> Unit,
    onFindOrder: () -> Unit,
    onScanProduct: () -> Unit,
    onOpenOrder: (Int) -> Unit,
    scannedProductId: Int? = null,
    focusedProductMode: Boolean = false,
) {
    val app = LocalContext.current.applicationContext as AnyRentApp
    val factory = remember {
        AvailabilityViewModel.Factory(app.container.availabilityRepository)
    }
    val viewModel: AvailabilityViewModel = viewModel(factory = factory)
    val state by viewModel.state.collectAsState()
    var showDatePicker by remember { mutableStateOf(false) }

    LaunchedEffect(scannedProductId) {
        scannedProductId?.let(viewModel::selectProductById)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        if (focusedProductMode) {
                            state.selectedProduct?.name ?: stringResource(R.string.availability_check)
                        } else {
                            stringResource(R.string.availability_check)
                        },
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
                actions = {
                    if (!focusedProductMode) {
                    TextButton(onClick = onFindOrder) {
                        Text(stringResource(R.string.find_order))
                    }
                    }
                },
            )
        },
    ) { padding ->
        LazyColumn(
            Modifier.fillMaxSize().padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            if (!focusedProductMode) item {
                OutlinedTextField(
                    value = state.query,
                    onValueChange = viewModel::updateQuery,
                    label = { Text(stringResource(R.string.search_product)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            if (!focusedProductMode) item {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Button(
                        onClick = viewModel::search,
                        enabled = !state.searching,
                        modifier = Modifier.weight(1f),
                    ) {
                        Text(
                            if (state.searching) stringResource(R.string.loading)
                            else stringResource(R.string.search)
                        )
                    }
                    Button(
                        onClick = onScanProduct,
                        enabled = !state.searching,
                        modifier = Modifier.weight(1f),
                    ) {
                        Text(stringResource(R.string.scan_product))
                    }
                }
            }
            if (!focusedProductMode && state.products.isNotEmpty()) {
                items(state.products, key = { "product-${it.id}" }) { product ->
                    Column(
                        Modifier.fillMaxWidth()
                            .clickable { viewModel.selectProduct(product) }
                            .padding(vertical = 8.dp),
                    ) {
                        Text(product.name, fontWeight = FontWeight.SemiBold)
                        Text(
                            listOfNotNull(
                                product.barcode,
                                stringResource(R.string.stock_value, product.stock),
                            ).joinToString(" · "),
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
            }
            state.selectedProduct?.let { product ->
                item {
                    if (!focusedProductMode) {
                        Text(
                            product.name,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }
                item {
                    AppCard(
                        Modifier.fillMaxWidth(),
                        onClick = { showDatePicker = true },
                    ) {
                        Row(
                            Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            Icon(
                                Icons.Default.CalendarMonth,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                            )
                            Column(Modifier.weight(1f)) {
                                Text(
                                    stringResource(R.string.availability_date),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                Text(state.selectedDate.toString(), fontWeight = FontWeight.SemiBold)
                            }
                        }
                    }
                }
                if (!focusedProductMode) item {
                    OutlinedTextField(
                        value = state.quantity.toString(),
                        onValueChange = viewModel::updateQuantity,
                        label = { Text(stringResource(R.string.quantity)) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                if (!focusedProductMode) item {
                    Button(
                        onClick = viewModel::check,
                        enabled = !state.checking,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(
                            if (state.checking) stringResource(R.string.loading)
                            else stringResource(R.string.check_availability)
                        )
                    }
                }
            }
            state.error?.let { message ->
                item { Text(message, color = MaterialTheme.colorScheme.error) }
            }
            state.result?.let { result ->
                item { AvailabilitySummary(result) }
                if (result.orders.isNotEmpty()) {
                    item {
                        Text(
                            stringResource(R.string.related_orders),
                            style = MaterialTheme.typography.titleMedium,
                        )
                    }
                    items(result.orders, key = { "order-${it.id}" }) { order ->
                        AvailabilityOrderCard(order, onClick = { onOpenOrder(order.id) })
                    }
                }
            }
        }
    }

    if (showDatePicker) {
        val pickerState = rememberDatePickerState(
            initialSelectedDateMillis = state.selectedDate
                .atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli(),
        )
        ModalBottomSheet(
            onDismissRequest = { showDatePicker = false },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
            containerColor = Color.White,
        ) {
            Column(
                Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(
                    stringResource(R.string.select_availability_date),
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                )
                DatePicker(
                    state = pickerState,
                    modifier = Modifier.fillMaxWidth().size(width = 600.dp, height = 430.dp),
                    title = null,
                    headline = null,
                    showModeToggle = false,
                    colors = DatePickerDefaults.colors(containerColor = Color.White),
                )
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    TextButton(
                        onClick = { showDatePicker = false },
                        modifier = Modifier.weight(1f),
                    ) { Text(stringResource(R.string.cancel)) }
                    Button(
                        enabled = pickerState.selectedDateMillis != null,
                        modifier = Modifier.weight(2f),
                        onClick = {
                            val selected = pickerState.selectedDateMillis ?: return@Button
                            viewModel.updateDate(
                                Instant.ofEpochMilli(selected).atZone(ZoneOffset.UTC).toLocalDate().toString(),
                            )
                            showDatePicker = false
                            viewModel.check()
                        },
                    ) { Text(stringResource(R.string.confirm), fontWeight = FontWeight.Bold) }
                }
            }
        }
    }
}

@Composable
private fun AvailabilitySummary(result: ProductAvailability) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        AppCard(Modifier.fillMaxWidth()) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .background(
                        if (result.isAvailable) Color(0xFFE7F7EE) else MaterialTheme.colorScheme.errorContainer,
                    )
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                androidx.compose.foundation.layout.Box(
                    Modifier.size(44.dp).background(
                        if (result.isAvailable) Color(0xFF18BF63) else MaterialTheme.colorScheme.error,
                        CircleShape,
                    ),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Default.Check, contentDescription = null, tint = Color.White)
                }
                Text(
                    stringResource(
                        R.string.products_available_on_date,
                        formatQuantity(result.effectivelyAvailable),
                    ),
                    color = if (result.isAvailable) Color(0xFF0E9F50) else MaterialTheme.colorScheme.onErrorContainer,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
        AppCard(Modifier.fillMaxWidth()) {
            Row(
                Modifier.fillMaxWidth().padding(18.dp),
                horizontalArrangement = Arrangement.SpaceAround,
            ) {
                AvailabilityMetric(stringResource(R.string.storage), result.totalStock, Icons.Default.Inventory2)
                AvailabilityMetric(stringResource(R.string.available), result.effectivelyAvailable, Icons.Default.Check, true)
                AvailabilityMetric(stringResource(R.string.renting), result.totalRenting, Icons.Default.Inventory2)
            }
        }
        result.message?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
    }
}

@Composable
private fun AvailabilityMetric(
    label: String,
    value: Int,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    highlighted: Boolean = false,
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(16.dp))
            Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Text(
            formatQuantity(value),
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = if (highlighted) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
        )
    }
}

@Composable
private fun AvailabilityOrderCard(order: AvailabilityOrder, onClick: () -> Unit) {
    AppCard(
        modifier = Modifier.fillMaxWidth(),
        onClick = onClick,
        shape = RoundedCornerShape(10.dp),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(Modifier.weight(1f)) {
                    Text(order.orderNumber, style = MaterialTheme.typography.titleLarge)
                    Text(order.customerName ?: "—", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                StatusBadge(order.status)
            }
            androidx.compose.material3.HorizontalDivider()
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                AvailabilityDateCell(stringResource(R.string.create_date), order.createdAt?.take(10) ?: "N/A")
                AvailabilityDateCell(stringResource(R.string.pickup_date), order.pickupAt?.take(10) ?: "N/A")
                AvailabilityDateCell(stringResource(R.string.return_date), order.returnAt?.take(10) ?: "N/A")
                AvailabilityDateCell(
                    stringResource(R.string.quantity),
                    order.quantity.toString(),
                    highlighted = true,
                )
            }
        }
    }
}

@Composable
private fun AvailabilityDateCell(label: String, value: String, highlighted: Boolean = false) {
    Column {
        Text(
            label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            value,
            fontWeight = FontWeight.SemiBold,
            color = if (highlighted) MaterialTheme.colorScheme.primary
            else MaterialTheme.colorScheme.onSurface,
        )
    }
}
