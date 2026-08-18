package com.anyrent.pos.ui.settings

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.People
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import com.anyrent.pos.BuildConfig
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiParity
import com.anyrent.pos.ui.common.AppAlertError
import com.anyrent.pos.ui.common.AppDateRangePickerSheet
import com.anyrent.pos.ui.common.SectionLabel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.text.SimpleDateFormat
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.Calendar
import java.util.Date
import java.util.Locale

private enum class ExportType { PRODUCTS, ORDERS, CUSTOMERS }
private enum class ExportPeriod(val apiValue: String) {
    ONE_MONTH("1month"),
    THREE_MONTHS("3months"),
    SIX_MONTHS("6months"),
    ONE_YEAR("1year"),
    CUSTOM("custom"),
}
private enum class ExportFormat(val apiValue: String, val extension: String, val mime: String) {
    EXCEL(
        "excel",
        "xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ),
    CSV("csv", "csv", "text/csv"),
}

private enum class OrderStatusFilter(val apiValue: String?) {
    ALL(null),
    RESERVED("RESERVED"),
    PICKUPED("PICKUPED"),
    RETURNED("RETURNED"),
    COMPLETED("COMPLETED"),
    CANCELLED("CANCELLED"),
}

private enum class OrderTypeFilter(val apiValue: String?) {
    ALL(null),
    RENT("RENT"),
    SALE("SALE"),
}

private enum class OrderDateField(val apiValue: String) {
    CREATED_AT("createdAt"),
    PICKUP_PLAN_AT("pickupPlanAt"),
    RETURN_PLAN_AT("returnPlanAt"),
}

/**
 * iOS-parity Export Data screen (Settings → Export).
 * Why rebuilt: Android previously showed three hard-coded buttons with wrong
 * `period=month`; iOS uses selectable type / period / format + nav Export action.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExportAuthScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var selectedType by remember { mutableStateOf<ExportType?>(null) }
    var selectedPeriod by remember { mutableStateOf(ExportPeriod.ONE_MONTH) }
    var selectedFormat by remember { mutableStateOf(ExportFormat.EXCEL) }
    var customStartMillis by remember { mutableStateOf<Long?>(null) }
    var customEndMillis by remember { mutableStateOf<Long?>(null) }
    var orderStatus by remember { mutableStateOf(OrderStatusFilter.ALL) }
    var orderType by remember { mutableStateOf(OrderTypeFilter.ALL) }
    var dateField by remember { mutableStateOf(OrderDateField.CREATED_AT) }

    var exporting by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var success by remember { mutableStateOf<String?>(null) }
    // Same DateRangePicker bottom sheet as cart rental period (not single-day dialogs).
    var showDateRangePicker by remember { mutableStateOf(false) }

    val dateFmt = remember {
        SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())
    }
    val zone = remember { ZoneId.systemDefault() }

    fun formatApiDate(millis: Long): String =
        Instant.ofEpochMilli(millis).atZone(zone).toLocalDate().toString()

    fun runExport() {
        val type = selectedType
        if (type == null) {
            error = context.getString(R.string.select_export_type)
            return
        }
        if (selectedPeriod == ExportPeriod.CUSTOM) {
            val start = customStartMillis
            val end = customEndMillis
            if (start == null || end == null) {
                error = context.getString(R.string.select_custom_dates)
                return
            }
            val startDay = Instant.ofEpochMilli(start).atZone(zone).toLocalDate()
            val endDay = Instant.ofEpochMilli(end).atZone(zone).toLocalDate()
            if (startDay.isAfter(endDay)) {
                error = context.getString(R.string.start_before_end)
                return
            }
            val days = java.time.temporal.ChronoUnit.DAYS.between(startDay, endDay)
            if (days > 365) {
                error = context.getString(R.string.date_range_max_365)
                return
            }
        }

        val path = buildExportPath(
            type = type,
            period = selectedPeriod,
            format = selectedFormat,
            customStartMillis = customStartMillis,
            customEndMillis = customEndMillis,
            orderStatus = orderStatus,
            orderType = orderType,
            dateField = dateField,
            formatApiDate = ::formatApiDate,
        )
        val label = when (type) {
            ExportType.PRODUCTS -> context.getString(R.string.products)
            ExportType.ORDERS -> context.getString(R.string.orders)
            ExportType.CUSTOMERS -> context.getString(R.string.customers)
        }

        exporting = true
        success = null
        error = null
        scope.launch {
            val result = withContext(Dispatchers.IO) { ApiParity.downloadExport(path) }
            exporting = false
            result.onSuccess { bytes ->
                val file = File(context.cacheDir, "$label-export.${selectedFormat.extension}")
                file.writeBytes(bytes)
                val uri = FileProvider.getUriForFile(
                    context,
                    "${BuildConfig.APPLICATION_ID}.fileprovider",
                    file,
                )
                val intent = Intent(Intent.ACTION_SEND).apply {
                    this.type = selectedFormat.mime
                    putExtra(Intent.EXTRA_STREAM, uri)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                context.startActivity(Intent.createChooser(intent, label))
                success = context.getString(R.string.exported_success, label)
            }.onFailure { error = it.message }
        }
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        stringResource(R.string.export_data),
                        fontWeight = FontWeight.Bold,
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
                actions = {
                    TextButton(
                        onClick = { runExport() },
                        enabled = !exporting,
                    ) {
                        Text(
                            if (exporting) {
                                stringResource(R.string.preparing_export)
                            } else {
                                stringResource(R.string.export)
                            },
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(bottom = 24.dp),
        ) {
            SectionLabel(stringResource(R.string.export_type))
            ExportGroupCard {
                ExportSelectRow(
                    icon = Icons.Default.Inventory2,
                    title = stringResource(R.string.products),
                    selected = selectedType == ExportType.PRODUCTS,
                    showDivider = true,
                    onClick = { selectedType = ExportType.PRODUCTS },
                )
                ExportSelectRow(
                    icon = Icons.AutoMirrored.Filled.ReceiptLong,
                    title = stringResource(R.string.orders),
                    selected = selectedType == ExportType.ORDERS,
                    showDivider = true,
                    onClick = { selectedType = ExportType.ORDERS },
                )
                ExportSelectRow(
                    icon = Icons.Default.People,
                    title = stringResource(R.string.customers),
                    selected = selectedType == ExportType.CUSTOMERS,
                    showDivider = false,
                    onClick = { selectedType = ExportType.CUSTOMERS },
                )
            }

            SectionLabel(stringResource(R.string.time_period))
            ExportGroupCard {
                ExportPeriod.entries.forEachIndexed { index, period ->
                    ExportSelectRow(
                        title = stringResource(
                            when (period) {
                                ExportPeriod.ONE_MONTH -> R.string.last_1_month
                                ExportPeriod.THREE_MONTHS -> R.string.last_3_months
                                ExportPeriod.SIX_MONTHS -> R.string.last_6_months
                                ExportPeriod.ONE_YEAR -> R.string.last_1_year
                                ExportPeriod.CUSTOM -> R.string.custom_range
                            },
                        ),
                        selected = selectedPeriod == period,
                        showDivider = index < ExportPeriod.entries.lastIndex,
                        onClick = { selectedPeriod = period },
                    )
                }
            }

            if (selectedPeriod == ExportPeriod.CUSTOM) {
                SectionLabel(stringResource(R.string.date_range))
                ExportGroupCard {
                    ExportValueRow(
                        title = stringResource(R.string.start_date),
                        value = customStartMillis?.let { dateFmt.format(Date(it)) } ?: "—",
                        showDivider = true,
                        onClick = { showDateRangePicker = true },
                    )
                    ExportValueRow(
                        title = stringResource(R.string.end_date),
                        value = customEndMillis?.let { dateFmt.format(Date(it)) } ?: "—",
                        showDivider = false,
                        onClick = { showDateRangePicker = true },
                    )
                }
            }

            SectionLabel(stringResource(R.string.file_format))
            ExportGroupCard {
                ExportSelectRow(
                    title = stringResource(R.string.excel_xlsx),
                    selected = selectedFormat == ExportFormat.EXCEL,
                    showDivider = true,
                    onClick = { selectedFormat = ExportFormat.EXCEL },
                )
                ExportSelectRow(
                    title = stringResource(R.string.csv_csv),
                    selected = selectedFormat == ExportFormat.CSV,
                    showDivider = false,
                    onClick = { selectedFormat = ExportFormat.CSV },
                )
            }

            if (selectedType == ExportType.ORDERS) {
                SectionLabel(stringResource(R.string.order_filters))
                ExportGroupCard {
                    val statusRows = listOf(
                        OrderStatusFilter.ALL to stringResource(R.string.all_statuses),
                        OrderStatusFilter.RESERVED to stringResource(R.string.reserved),
                        OrderStatusFilter.PICKUPED to stringResource(R.string.picked_up),
                        OrderStatusFilter.RETURNED to stringResource(R.string.returned),
                        OrderStatusFilter.COMPLETED to stringResource(R.string.completed),
                        OrderStatusFilter.CANCELLED to stringResource(R.string.cancelled),
                    )
                    statusRows.forEachIndexed { index, (status, title) ->
                        ExportSelectRow(
                            title = title,
                            selected = orderStatus == status,
                            showDivider = true,
                            onClick = { orderStatus = status },
                        )
                    }
                    val typeRows = listOf(
                        OrderTypeFilter.ALL to stringResource(R.string.all_types),
                        OrderTypeFilter.RENT to stringResource(R.string.rent),
                        OrderTypeFilter.SALE to stringResource(R.string.sale),
                    )
                    typeRows.forEach { (type, title) ->
                        ExportSelectRow(
                            title = title,
                            selected = orderType == type,
                            showDivider = true,
                            onClick = { orderType = type },
                        )
                    }
                    val dateRows = listOf(
                        OrderDateField.CREATED_AT to stringResource(R.string.created_date),
                        OrderDateField.PICKUP_PLAN_AT to stringResource(R.string.pickup_date),
                        OrderDateField.RETURN_PLAN_AT to stringResource(R.string.return_date),
                    )
                    dateRows.forEachIndexed { index, (field, title) ->
                        ExportSelectRow(
                            title = title,
                            selected = dateField == field,
                            showDivider = index < dateRows.lastIndex,
                            onClick = { dateField = field },
                        )
                    }
                }
            }

            success?.let {
                Text(
                    it,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    color = MaterialTheme.colorScheme.primary,
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }
    }

    error?.let { message ->
        AppAlertError(
            message = message,
            onDismiss = { error = null },
        )
    }

    if (showDateRangePicker) {
        val zone = ZoneId.systemDefault()
        AppDateRangePickerSheet(
            title = stringResource(R.string.date_range),
            subtitle = stringResource(R.string.custom_range),
            startLabel = stringResource(R.string.start_date),
            endLabel = stringResource(R.string.end_date),
            initialStart = customStartMillis?.let {
                Instant.ofEpochMilli(it).atZone(zone).toLocalDate()
            } ?: LocalDate.now(zone),
            initialEnd = customEndMillis?.let {
                Instant.ofEpochMilli(it).atZone(zone).toLocalDate()
            } ?: LocalDate.now(zone),
            onDismiss = { showDateRangePicker = false },
            onConfirm = { startDate, endDate ->
                customStartMillis = startOfDay(startDate.atStartOfDay(zone).toInstant().toEpochMilli())
                customEndMillis = endOfDay(endDate.atStartOfDay(zone).toInstant().toEpochMilli())
                showDateRangePicker = false
            },
        )
    }
}

private fun buildExportPath(
    type: ExportType,
    period: ExportPeriod,
    format: ExportFormat,
    customStartMillis: Long?,
    customEndMillis: Long?,
    orderStatus: OrderStatusFilter,
    orderType: OrderTypeFilter,
    dateField: OrderDateField,
    formatApiDate: (Long) -> String,
): String {
    val endpoint = when (type) {
        ExportType.PRODUCTS -> "/api/products/export"
        ExportType.ORDERS -> "/api/orders/export"
        ExportType.CUSTOMERS -> "/api/customers/export"
    }
    val params = linkedMapOf(
        "period" to period.apiValue,
        "format" to format.apiValue,
    )
    if (period == ExportPeriod.CUSTOM) {
        // Civil calendar dates only — never full ISO (server "future" check is UTC-based).
        customStartMillis?.let { params["startDate"] = formatApiDate(it) }
        customEndMillis?.let { params["endDate"] = formatApiDate(it) }
    }
    if (type == ExportType.ORDERS) {
        orderStatus.apiValue?.let { params["status"] = it }
        orderType.apiValue?.let { params["orderType"] = it }
        params["dateField"] = dateField.apiValue
    }
    val query = params.entries.joinToString("&") { (k, v) ->
        "$k=${Uri.encode(v)}"
    }
    return "$endpoint?$query"
}

private fun startOfDay(millis: Long): Long {
    val cal = Calendar.getInstance().apply {
        timeInMillis = millis
        set(Calendar.HOUR_OF_DAY, 0)
        set(Calendar.MINUTE, 0)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
    }
    return cal.timeInMillis
}

private fun endOfDay(millis: Long): Long {
    val cal = Calendar.getInstance().apply {
        timeInMillis = millis
        set(Calendar.HOUR_OF_DAY, 23)
        set(Calendar.MINUTE, 59)
        set(Calendar.SECOND, 59)
        set(Calendar.MILLISECOND, 999)
    }
    return cal.timeInMillis
}

@Composable
private fun ExportGroupCard(content: @Composable () -> Unit) {
    Column(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(12.dp)),
    ) {
        content()
    }
}

@Composable
private fun ExportSelectRow(
    title: String,
    selected: Boolean,
    showDivider: Boolean,
    onClick: () -> Unit,
    icon: ImageVector? = null,
) {
    Column {
        Row(
            Modifier
                .fillMaxWidth()
                .clickable(onClick = onClick)
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (icon != null) {
                Icon(
                    icon,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(22.dp),
                )
            }
            Text(
                title,
                modifier = Modifier.weight(1f),
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurface,
            )
            if (selected) {
                Icon(
                    Icons.Default.Check,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(22.dp),
                )
            }
        }
        if (showDivider) {
            HorizontalDivider(
                Modifier.padding(start = if (icon != null) 50.dp else 16.dp),
                color = MaterialTheme.colorScheme.outlineVariant,
            )
        }
    }
}

@Composable
private fun ExportValueRow(
    title: String,
    value: String,
    showDivider: Boolean,
    onClick: () -> Unit,
) {
    Column {
        Row(
            Modifier
                .fillMaxWidth()
                .clickable(onClick = onClick)
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                title,
                modifier = Modifier.weight(1f),
                style = MaterialTheme.typography.bodyLarge,
            )
            Text(
                value,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        if (showDivider) {
            HorizontalDivider(
                Modifier.padding(start = 16.dp),
                color = MaterialTheme.colorScheme.outlineVariant,
            )
        }
    }
}
