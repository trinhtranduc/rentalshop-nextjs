package com.anyrent.pos.ui.orders.v2

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.KeyboardArrowDown
import androidx.compose.material.icons.outlined.Phone
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.ProvideTextStyle
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.style.LineHeightStyle
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.anyrent.pos.AnyRentApp
import com.anyrent.pos.R
import com.anyrent.pos.domain.orders.TodayWorkRow
import com.anyrent.pos.ui.common.AppDateRangePickerSheet
import com.anyrent.pos.ui.common.AppFormSheet
import com.anyrent.pos.ui.common.AppIcons
import com.anyrent.pos.ui.common.LoadingBox
import com.anyrent.pos.ui.common.formatDayShort
import com.anyrent.pos.ui.common.formatMoneyVnd
import com.anyrent.pos.ui.home.BarcodeMode
import com.anyrent.pos.ui.home.CameraBarcodeScreen
import com.anyrent.pos.ui.navigation.MainTabRouter
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.flow.distinctUntilChanged
import java.time.Instant
import java.time.ZoneId

/** Board colours not in `DS` */
private object BoardColors {
    val Track = Color(0xFFF1F5F9)
    val ChipBorder = Color(0xFFE2E8F0)
    val Outline = Color(0xFFCBD5E1)
    val Items = Color(0xFF334155)
    val Chevron = Color(0xFF94A3B8)
    val LateBand = Color(0xFFFEF2F2)
    val Band = Color(0xFFF8FAFC)
    val Badge = Color(0xFFB91C1C)
    val SelectedFill = Color(0xFFEFF6FF)
    val SelectedText = Color(0xFF1E40AF)
}

private val BoardLineHeight = LineHeightStyle(LineHeightStyle.Alignment.Center, LineHeightStyle.Trim.None)

private val ChipStatuses = listOf(null, "RESERVED", "PICKUPED", "RETURNED", "CANCELLED")

/**
 * Redesigned orders tab (#371), shown when the `newOrders` feature is on. Boards (#401): Main ("Việc cần làm"),
 * VL-tat-ca ("Tất cả đơn"), VL-ban ("Đơn bán", via the header button), VL-tim (search), Loc (filter sheet).
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun OrdersHomeScreen(onOpenOrder: (Int) -> Unit) {
    val app = LocalContext.current.applicationContext as AnyRentApp
    val viewModel: OrdersHomeViewModel = viewModel(
        factory = remember { OrdersHomeViewModel.Factory(app.container.todayWorkRepository) },
    )
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current
    val focus = LocalFocusManager.current
    var showFilter by remember { mutableStateOf(false) }
    var showScan by remember { mutableStateOf(false) }
    var searchMode by rememberSaveable { mutableStateOf(false) }
    var rentSegment by rememberSaveable { mutableStateOf(OrdersSegment.TODAY) }
    val listState = rememberLazyListState()
    val texts = boardTexts()

    LaunchedEffect(Unit) { viewModel.onShown() }
    // After create-order success: MainTabRouter switches to this tab and asks for a reload
    LaunchedEffect(Unit) { MainTabRouter.refreshOrders.collect { viewModel.reload(keepRows = true) } }
    LaunchedEffect(state.segment, state.isSearching, state.filter) { listState.scrollToItem(0) }
    // Next page when the last rows show
    LaunchedEffect(listState) {
        snapshotFlow {
            val info = listState.layoutInfo
            (info.visibleItemsInfo.lastOrNull()?.index ?: 0) >= info.totalItemsCount - 5
        }.distinctUntilChanged().collect { nearEnd -> if (nearEnd) viewModel.loadMore() }
    }

    val call: (String) -> Unit = { phone ->
        context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone")))
    }
    val saleMode = state.segment == OrdersSegment.SALE
    val cancelSearch = {
        viewModel.onQueryChange("")
        focus.clearFocus()
        searchMode = false
    }

    // Board text: no Material letter spacing, a line about 1.33× the font size
    ProvideTextStyle(LocalTextStyle.current.copy(letterSpacing = 0.sp, lineHeight = 1.33.em, lineHeightStyle = BoardLineHeight)) {
    Column(Modifier.fillMaxSize().background(DS.Colors.Surface)) {
        Column(
            Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = if (searchMode) 10.dp else 12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            if (!searchMode) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        stringResource(if (saleMode) R.string.orders_v2_title_sale else R.string.orders_v2_title_rent),
                        fontSize = DS.TextSize.Title,
                        fontWeight = FontWeight.Bold,
                        color = DS.Colors.Text,
                        modifier = Modifier.weight(1f),
                    )
                    OutlinedPill(
                        text = stringResource(if (saleMode) R.string.orders_v2_title_rent else R.string.orders_v2_title_sale),
                        onClick = {
                            if (saleMode) {
                                viewModel.select(if (state.todayAvailable) rentSegment else OrdersSegment.RENT)
                            } else {
                                rentSegment = state.segment
                                viewModel.select(OrdersSegment.SALE)
                            }
                        },
                    )
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SearchBox(
                    query = state.query,
                    active = searchMode,
                    onQueryChange = viewModel::onQueryChange,
                    onFocus = { searchMode = true },
                    onClear = { viewModel.onQueryChange("") },
                    onScan = { showScan = true },
                    modifier = Modifier.weight(1f),
                )
                if (searchMode) {
                    Box(
                        Modifier.height(44.dp).clickable { cancelSearch() }.padding(horizontal = 4.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            stringResource(R.string.orders_v2_search_cancel),
                            fontSize = DS.TextSize.Body,
                            fontWeight = FontWeight.Medium,
                            color = DS.Colors.Primary,
                        )
                    }
                }
            }
            if (!searchMode && !saleMode && state.todayAvailable) {
                SegmentBar(
                    todaySelected = state.segment == OrdersSegment.TODAY,
                    badge = state.todayBadge,
                    onToday = { viewModel.select(OrdersSegment.TODAY) },
                    onAll = { viewModel.select(OrdersSegment.RENT) },
                )
            }
        }
        HorizontalDivider(color = DS.Colors.Border)

        if (!searchMode && state.segment == OrdersSegment.RENT) {
            ListControls(state, onStatus = viewModel::selectStatus, onSort = { showFilter = true })
        }
        if (searchMode && state.isSearching && state.total != null) {
            Text(
                (state.total ?: 0).let { pluralStringResource(R.plurals.orders_v2_search_summary, it, it, state.query.trim()) },
                fontSize = DS.TextSize.Secondary,
                color = DS.Colors.TextMuted,
                modifier = Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 10.dp, bottom = 6.dp),
            )
            HorizontalDivider(color = DS.Colors.Divider)
        }

        PullToRefreshBox(
            isRefreshing = state.refreshing,
            onRefresh = { viewModel.reload(fromPull = true) },
            modifier = Modifier.fillMaxWidth().weight(1f),
        ) {
            when {
                state.loading -> LoadingBox()
                state.error != null -> StateMessage(
                    message = state.error.orEmpty().ifBlank { stringResource(R.string.something_went_wrong) },
                    onRetry = { viewModel.reload() },
                )
                state.sections.isEmpty() -> StateMessage(
                    message = stringResource(
                        if (state.isSearching || state.segment != OrdersSegment.TODAY) R.string.empty_orders
                        else R.string.nothing_to_do_today,
                    ),
                )
                else -> LazyColumn(
                    state = listState,
                    contentPadding = PaddingValues(bottom = DS.Spacing.lg),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    state.sections.forEach { section ->
                        if (section.kind != SectionKind.PLAIN && !state.isSearching) {
                            stickyHeader(key = "header-${section.key}") { SectionBand(section) }
                        }
                        items(section.rows, key = { "${section.key}-${it.key}" }) { row ->
                            when (row) {
                                is OrdersRow.Work -> WorkRow(
                                    row.row,
                                    row.kind,
                                    isLate = section.kind == SectionKind.LATE,
                                    texts = texts,
                                    onClick = { onOpenOrder(row.orderId) },
                                    onCall = call,
                                )
                                is OrdersRow.Order -> OrderRow(
                                    row,
                                    context = when {
                                        state.isSearching -> RowContext.SEARCH
                                        section.kind == SectionKind.DAY -> RowContext.SALE
                                        else -> RowContext.LIST
                                    },
                                    texts = texts,
                                    onClick = { onOpenOrder(row.orderId) },
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    if (showFilter) {
        FilterSheet(
            initial = state.filter,
            count = viewModel::count,
            onApply = {
                viewModel.applyFilter(it)
                showFilter = false
            },
            onDismiss = { showFilter = false },
        )
    }
    if (showScan) {
        AppFormSheet(onDismiss = { showScan = false }) {
            CameraBarcodeScreen(
                mode = BarcodeMode.CODE,
                onBack = { showScan = false },
                onCode = { code ->
                    showScan = false
                    // A scanned code becomes the search (rent and sale, every status)
                    searchMode = true
                    viewModel.onQueryChange(code.trim())
                },
                embeddedInSheet = true,
            )
        }
    }
    }
}

@Composable
private fun boardTexts() = OrdersBoardTexts(
    // Unformatted plural forms ("%1$d days" / "%1$d day"), formatted by OrdersBoardLogic.span
    days = pluralStringResource(R.plurals.orders_v2_when_days, 2),
    oneDay = pluralStringResource(R.plurals.orders_v2_when_days, 1),
    handOverDue = stringResource(R.string.orders_v2_when_hand_over_due),
    returnDue = stringResource(R.string.orders_v2_when_return_due),
    createdToday = stringResource(R.string.orders_v2_when_created_today),
    created = stringResource(R.string.orders_v2_when_created),
    due = stringResource(R.string.orders_v2_when_due),
    cancelled = stringResource(R.string.orders_v2_when_cancelled),
    returns = stringResource(R.string.orders_v2_when_returns),
    sold = stringResource(R.string.orders_v2_when_sold),
)

@Composable
private fun OutlinedPill(text: String, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(10.dp),
        color = DS.Colors.Surface,
        border = BorderStroke(1.dp, BoardColors.ChipBorder),
        modifier = Modifier.height(40.dp),
    ) {
        Box(Modifier.padding(horizontal = 12.dp), contentAlignment = Alignment.Center) {
            Text(text, fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text)
        }
    }
}

/** Grey field with the scan button (board Main); blue outline and a clear button while searching (VL-tim) */
@Composable
private fun SearchBox(
    query: String,
    active: Boolean,
    onQueryChange: (String) -> Unit,
    onFocus: () -> Unit,
    onClear: () -> Unit,
    onScan: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val placeholder = stringResource(R.string.orders_v2_search_placeholder)
    val shape = RoundedCornerShape(12.dp)
    Row(
        modifier
            .height(44.dp)
            .clip(shape)
            .background(if (active) DS.Colors.Surface else BoardColors.Track)
            .then(if (active) Modifier.border(2.dp, DS.Colors.Primary, shape) else Modifier)
            .padding(start = 12.dp, end = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Outlined.Search, contentDescription = null, tint = DS.Colors.TextMuted, modifier = Modifier.size(DS.Icon.Sm))
        Spacer(Modifier.size(8.dp))
        Box(Modifier.weight(1f)) {
            if (query.isEmpty()) {
                Text(placeholder, color = DS.Colors.TextMuted, fontSize = DS.TextSize.Body, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            BasicTextField(
                value = query,
                onValueChange = onQueryChange,
                singleLine = true,
                textStyle = TextStyle(fontSize = if (active) DS.TextSize.Input else DS.TextSize.Body, color = DS.Colors.Text),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = KeyboardActions(onSearch = {}),
                modifier = Modifier
                    .fillMaxWidth()
                    .onFocusChanged { if (it.isFocused) onFocus() }
                    .semantics { contentDescription = placeholder },
            )
        }
        if (active) {
            if (query.isNotEmpty()) {
                val label = stringResource(R.string.orders_v2_search_clear)
                Box(
                    Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(BoardColors.ChipBorder)
                        .clickable(onClick = onClear)
                        .semantics { contentDescription = label; role = Role.Button },
                    contentAlignment = Alignment.Center,
                ) { Icon(Icons.Outlined.Close, contentDescription = null, tint = DS.Colors.Text, modifier = Modifier.size(14.dp)) }
            }
        } else {
            val label = stringResource(R.string.camera_scan)
            Box(
                Modifier
                    .size(40.dp)
                    .clickable(onClick = onScan)
                    .semantics { contentDescription = label; role = Role.Button },
                contentAlignment = Alignment.Center,
            ) { Icon(AppIcons.Barcode, contentDescription = null, tint = DS.Colors.Text, modifier = Modifier.size(DS.Icon.Sm)) }
        }
    }
}

/** Two pill segments (board Main): "Việc cần làm" with its red badge, "Tất cả đơn" */
@Composable
private fun SegmentBar(todaySelected: Boolean, badge: Int, onToday: () -> Unit, onAll: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(BoardColors.Track).padding(4.dp),
    ) {
        SegmentPill(stringResource(R.string.orders_to_do), todaySelected, badge.takeIf { it > 0 }, onToday, Modifier.weight(1f))
        SegmentPill(stringResource(R.string.orders_all), !todaySelected, null, onAll, Modifier.weight(1f))
    }
}

@Composable
private fun SegmentPill(text: String, selected: Boolean, badge: Int?, onClick: () -> Unit, modifier: Modifier) {
    val shape = RoundedCornerShape(9.dp)
    Row(
        modifier
            .height(40.dp)
            .then(if (selected) Modifier.shadow(1.dp, shape) else Modifier)
            .clip(shape)
            .background(if (selected) DS.Colors.Surface else Color.Transparent)
            .clickable(onClick = onClick)
            .semantics { role = Role.Tab; this.selected = selected },
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text,
            fontSize = DS.TextSize.Body,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
            color = if (selected) DS.Colors.Text else DS.Colors.TextMuted,
            maxLines = 1,
        )
        if (badge != null) {
            Spacer(Modifier.size(6.dp))
            Box(
                Modifier
                    .heightIn(min = 20.dp)
                    .widthIn(min = 22.dp)
                    .background(BoardColors.Badge, RoundedCornerShape(999.dp))
                    .padding(horizontal = 6.dp),
                contentAlignment = Alignment.Center,
            ) { Text("$badge", fontSize = DS.TextSize.Pill, fontWeight = FontWeight.Bold, color = Color.White) }
        }
    }
}

/** Status chips, sort selector and order count of "Tất cả đơn" (board VL-tat-ca) */
@Composable
private fun ListControls(state: OrdersHomeState, onStatus: (String?) -> Unit, onSort: () -> Unit) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.padding(top = 10.dp),
    ) {
        items(ChipStatuses) { status ->
            Chip(
                text = stringResource(chipLabel(status)),
                selected = state.filter.status == status,
                height = 36,
                fontSize = DS.TextSize.Secondary,
                onClick = { onStatus(status) },
            )
        }
    }
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(
            Modifier.defaultMinSize(minHeight = 36.dp).clickable(onClick = onSort),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(stringResource(sortLabel(state.filter.sort)), fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.SemiBold, color = DS.Colors.Primary)
            Spacer(Modifier.size(4.dp))
            Icon(Icons.Outlined.KeyboardArrowDown, contentDescription = null, tint = DS.Colors.Primary, modifier = Modifier.size(14.dp))
        }
        Spacer(Modifier.weight(1f))
        state.total?.let {
            Text(pluralStringResource(R.plurals.orders_v2_count, it, it), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
        }
    }
    HorizontalDivider(color = DS.Colors.Divider)
}

private fun chipLabel(status: String?): Int = when (status) {
    "RESERVED" -> R.string.orders_v2_status_reserved
    "PICKUPED" -> R.string.orders_v2_status_renting
    "RETURNED" -> R.string.orders_v2_status_returned
    "CANCELLED" -> R.string.orders_v2_status_cancelled
    else -> R.string.orders_v2_status_all
}

private fun sortLabel(sort: OrdersSort): Int = when (sort) {
    OrdersSort.NEAREST_TASK -> R.string.orders_v2_sort_nearest
    OrdersSort.CREATED -> R.string.orders_v2_sort_created
    OrdersSort.PICKUP -> R.string.orders_v2_sort_pickup
    OrdersSort.RETURN -> R.string.orders_v2_sort_return
}

@Composable
private fun Chip(text: String, selected: Boolean, height: Int, fontSize: TextUnit, onClick: () -> Unit, icon: ImageVector? = null) {
    val shape = RoundedCornerShape(999.dp)
    Row(
        Modifier
            .height(height.dp)
            .clip(shape)
            .background(if (selected) DS.Colors.Text else DS.Colors.Surface)
            .then(if (selected) Modifier else Modifier.border(1.dp, BoardColors.ChipBorder, shape))
            .clickable(onClick = onClick)
            .semantics { this.selected = selected; role = Role.Button }
            .padding(horizontal = if (height > 36) 14.dp else 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icon != null) {
            Icon(icon, contentDescription = null, tint = if (selected) Color.White else DS.Colors.Text, modifier = Modifier.size(16.dp))
            Spacer(Modifier.size(6.dp))
        }
        Text(
            text,
            fontSize = fontSize,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
            color = if (selected) Color.White else DS.Colors.Text,
            maxLines = 1,
        )
    }
}

/** Band over a group: "TRỄ HẠN · 3" on pink, others on light grey, with "giao N · trả M" or "N đơn · X" */
@Composable
private fun SectionBand(section: OrdersSection) {
    val now = Instant.now()
    val zone = ZoneId.systemDefault()
    val late = section.kind == SectionKind.LATE
    val title = when (section.kind) {
        SectionKind.LATE -> "${stringResource(R.string.orders_section_late)} · ${section.rows.size}"
        SectionKind.TODAY -> "${stringResource(R.string.orders_section_today)} · ${formatDayShort(now, zone)}"
        SectionKind.TOMORROW -> "${stringResource(R.string.orders_section_tomorrow)} · ${formatDayShort(now.plusSeconds(86_400), zone)}"
        else -> {
            val day = section.day
            val word = day?.let { OrdersBoardLogic.dayWord(it, now, zone) } ?: DayWord.NONE
            val label = section.dayLabel.orEmpty()
            when (word) {
                DayWord.TODAY -> "${stringResource(R.string.orders_section_today)} · $label"
                DayWord.YESTERDAY -> "${stringResource(R.string.orders_v2_yesterday)} · $label"
                else -> label
            }
        }
    }
    val summary = when (section.kind) {
        SectionKind.LATE, SectionKind.TODAY, SectionKind.TOMORROW -> {
            val (handOver, takeBack) = OrdersBoardLogic.bandCounts(section.rows)
            stringResource(R.string.orders_v2_band_work, handOver, takeBack)
        }
        else -> {
            val (count, amount) = OrdersBoardLogic.saleDaySummary(section.rows)
            "${pluralStringResource(R.plurals.orders_v2_count, count, count)} · ${formatMoneyVnd(amount)}"
        }
    }
    Column(Modifier.fillMaxWidth().background(if (late) BoardColors.LateBand else BoardColors.Band)) {
        Row(
            Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 10.dp, bottom = 6.dp),
            verticalAlignment = Alignment.Bottom,
        ) {
            Text(
                title.uppercase(),
                fontSize = DS.TextSize.Secondary,
                fontWeight = FontWeight.Bold,
                color = if (late) DS.Status.Late.text else BoardColors.Items,
                modifier = Modifier.weight(1f),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(summary, fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted, maxLines = 1)
        }
        HorizontalDivider(color = DS.Colors.Divider)
    }
}

private enum class RowContext { LIST, SALE, SEARCH }

@Composable
private fun WorkRow(
    work: TodayWorkRow,
    kind: WorkKind,
    isLate: Boolean,
    texts: OrdersBoardTexts,
    onClick: () -> Unit,
    onCall: (String) -> Unit,
) {
    val handOver = kind == WorkKind.HAND_OVER
    val pills = buildList {
        if (handOver && !work.isReadyToDeliver) add(stringResource(R.string.orders_v2_not_prepared) to DS.Status.Waiting)
        if (work.lateDays > 0) add(pluralStringResource(R.plurals.orders_late_days, work.lateDays, work.lateDays) to DS.Status.Late)
    }
    val pay = when (val line = OrdersBoardLogic.payLine(work.amountDue, work.refundDue)) {
        is PayLine.Refund -> stringResource(R.string.orders_v2_pay_refund, formatMoneyVnd(line.amount)) to DS.Status.Return.text
        is PayLine.Due -> stringResource(R.string.orders_v2_pay_due, formatMoneyVnd(line.amount)) to DS.Status.Waiting.text
        // #458: fully paid → the total only
        null -> null
    }
    val phone = work.customerPhone?.filterNot { it.isWhitespace() }.orEmpty()
    BoardRow(
        tag = stringResource(if (handOver) R.string.orders_v2_tag_hand_over else R.string.orders_v2_tag_take_back) to
            (if (handOver) DS.Status.HandOver else DS.Status.Return),
        name = work.customerName,
        items = work.productNames,
        line = "#${OrdersBoardLogic.shortNumber(work.orderNumber)} · " +
            OrdersBoardLogic.workWhen(work, kind, isLate, texts = texts),
        pills = pills,
        total = formatMoneyVnd(work.totalAmount),
        struck = false,
        pay = pay,
        // Board Main: the call button only on TRỄ HẠN rows
        phone = phone.takeIf { isLate && it.isNotEmpty() },
        onClick = onClick,
        onCall = onCall,
    )
}

/**
 * The Orders tab row for lists outside the tab (overview drill-downs, #458): search context, so a sale reads
 * "Bán · Hoàn thành" and the date line follows the status.
 */
@Composable
internal fun OrderBoardRow(row: OrdersRow.Order, onClick: () -> Unit) {
    OrderRow(row, RowContext.SEARCH, boardTexts(), onClick)
}

@Composable
private fun OrderRow(row: OrdersRow.Order, context: RowContext, texts: OrdersBoardTexts, onClick: () -> Unit) {
    val order = row.order
    val tagKind = OrdersBoardLogic.statusTag(order.status)
    val (tagRes, colors) = when (tagKind) {
        RowTag.RESERVED -> R.string.orders_v2_status_reserved to DS.Status.HandOver
        RowTag.RENTING -> R.string.orders_v2_status_renting to DS.Status.Return
        RowTag.RETURNED -> R.string.orders_v2_status_returned to DS.Status.Done
        RowTag.COMPLETED -> R.string.orders_v2_status_completed to DS.Status.Done
        else -> R.string.orders_v2_status_cancelled to DS.Status.Cancelled
    }
    val isSale = !order.orderType.equals("RENT", ignoreCase = true)
    val tagText = stringResource(tagRes).let {
        if (context == RowContext.SEARCH && isSale) stringResource(R.string.orders_v2_tag_sale, it) else it
    }
    val number = "#${OrdersBoardLogic.shortNumber(order.orderNumber)}"
    val line = when (context) {
        RowContext.SALE -> number
        RowContext.SEARCH -> "$number · ${OrdersBoardLogic.searchWhen(order, row.lateDays, texts = texts)}"
        RowContext.LIST -> "$number · ${OrdersBoardLogic.listWhen(order, row.lateDays, texts = texts)}"
    }
    BoardRow(
        tag = tagText to colors,
        name = order.customerName,
        items = order.itemsSummary,
        line = line,
        pills = if (row.lateDays > 0) listOf(pluralStringResource(R.plurals.orders_late_days, row.lateDays, row.lateDays) to DS.Status.Late) else emptyList(),
        total = formatMoneyVnd(order.totalAmount),
        struck = tagKind == RowTag.CANCELLED,
        // Balances of the list API (#389); nothing on an older API, a cancelled order or when fully paid (#458)
        pay = when (val pay = OrdersBoardLogic.listPayLine(order)) {
            is PayLine.Refund -> stringResource(R.string.orders_v2_pay_refund, formatMoneyVnd(pay.amount)) to DS.Status.Return.text
            is PayLine.Due -> stringResource(R.string.orders_v2_pay_due, formatMoneyVnd(pay.amount)) to DS.Status.Waiting.text
            null -> null
        },
        phone = null,
        onClick = onClick,
        onCall = {},
    )
}

/** Flat row (boards Main / VL-tat-ca / VL-ban / VL-tim): no card, a thin divider under it */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun BoardRow(
    tag: Pair<String, DS.Pill>,
    name: String?,
    items: String,
    line: String,
    pills: List<Pair<String, DS.Pill>>,
    total: String,
    struck: Boolean,
    pay: Pair<String, Color>?,
    phone: String?,
    onClick: () -> Unit,
    onCall: (String) -> Unit,
) {
    Column(Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = DS.Gap.RowHorizontal, vertical = DS.Gap.OrderRowVertical),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(DS.Gap.Line)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Tag(tag.first, tag.second, bold = true)
                    Spacer(Modifier.size(6.dp))
                    Text(
                        name?.takeIf { it.isNotBlank() } ?: "N/A",
                        fontSize = DS.TextSize.Name,
                        fontWeight = FontWeight.Bold,
                        color = DS.Colors.Text,
                        // #424: a long name wraps to a second line (tag stays centred) instead of being cut
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                if (items.isNotBlank()) {
                    Text(items, fontSize = DS.TextSize.Body, color = BoardColors.Items, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
                Text(line, fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
                if (pills.isNotEmpty()) {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 2.dp)) {
                        pills.forEach { (text, colors) -> Tag(text, colors, bold = false) }
                    }
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    total,
                    fontSize = DS.TextSize.Name,
                    fontWeight = FontWeight.Bold,
                    color = if (struck) DS.Colors.TextMuted else DS.Colors.Text,
                    textDecoration = if (struck) TextDecoration.LineThrough else null,
                    maxLines = 1,
                )
                if (pay != null) {
                    Text(pay.first, fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Bold, color = pay.second, maxLines = 1)
                }
            }
            if (phone != null) {
                val label = stringResource(R.string.call_customer)
                Box(
                    Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .border(1.dp, BoardColors.Outline, RoundedCornerShape(10.dp))
                        .clickable { onCall(phone) }
                        .semantics { contentDescription = label; role = Role.Button },
                    contentAlignment = Alignment.Center,
                ) { Icon(Icons.Outlined.Phone, contentDescription = null, tint = DS.Colors.Text, modifier = Modifier.size(DS.Icon.Sm)) }
            }
            Icon(
                Icons.AutoMirrored.Outlined.KeyboardArrowRight,
                contentDescription = null,
                tint = BoardColors.Chevron,
                modifier = Modifier.size(DS.Icon.Sm),
            )
        }
        HorizontalDivider(color = DS.Colors.Divider)
    }
}

@Composable
private fun Tag(text: String, colors: DS.Pill, bold: Boolean) {
    Box(
        Modifier
            .background(colors.fill, RoundedCornerShape(DS.Radius.chip))
            .padding(horizontal = 6.dp, vertical = 2.dp),
    ) {
        Text(text, color = colors.text, fontSize = DS.TextSize.Pill, fontWeight = if (bold) FontWeight.Bold else FontWeight.SemiBold, maxLines = 1)
    }
}

@Composable
private fun StateMessage(message: String, onRetry: (() -> Unit)? = null) {
    Column(
        Modifier.fillMaxSize().padding(DS.Spacing.xl),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(message, fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted)
        if (onRetry != null) {
            TextButton(onClick = onRetry, modifier = Modifier.height(DS.TouchTarget)) {
                Text(stringResource(R.string.retry), fontWeight = FontWeight.Bold, color = DS.Colors.Primary)
            }
        }
    }
}

/** "Lọc & sắp xếp" (board Loc): sort, date range and "Xem N đơn" */
@OptIn(ExperimentalLayoutApi::class, ExperimentalMaterial3Api::class)
@Composable
private fun FilterSheet(
    initial: RentOrdersFilter,
    count: suspend (RentOrdersFilter) -> Int?,
    onApply: (RentOrdersFilter) -> Unit,
    onDismiss: () -> Unit,
) {
    var filter by remember { mutableStateOf(initial) }
    var total by remember { mutableStateOf<Int?>(null) }
    var pickDates by remember { mutableStateOf(false) }
    // A new choice cancels the previous count request
    LaunchedEffect(filter) {
        total = null
        total = count(filter)
    }
    // Board Loc: content-height sheet, radius 24, a 40×5 handle
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = DS.Colors.Surface,
        scrimColor = Color(0x730F172A),
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
        dragHandle = {
            Box(Modifier.padding(top = 8.dp).size(width = 40.dp, height = 5.dp).background(BoardColors.Outline, RoundedCornerShape(999.dp)))
        },
    ) {
        Column(
            Modifier.fillMaxWidth().navigationBarsPadding().padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 28.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    stringResource(R.string.orders_v2_filter_title),
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = DS.Colors.Text,
                    modifier = Modifier.weight(1f),
                )
                TextButton(onClick = { filter = RentOrdersFilter(status = filter.status) }) {
                    Text(stringResource(R.string.reset), fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = DS.Colors.Primary)
                }
            }
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                SheetLabel(stringResource(R.string.orders_v2_filter_sort))
                Spacer(Modifier.height(0.dp))
                OrdersSort.entries.chunked(2).forEach { line ->
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        line.forEach { sort ->
                            SortOption(stringResource(sortLabel(sort)), filter.sort == sort, Modifier.weight(1f)) {
                                filter = filter.copy(sort = sort)
                            }
                        }
                        if (line.size < 2) Spacer(Modifier.weight(1f))
                    }
                }
                Text(stringResource(R.string.orders_v2_sort_nearest_hint), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
            }
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                SheetLabel(stringResource(R.string.orders_v2_filter_range))
                Spacer(Modifier.height(0.dp))
                Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(BoardColors.Track).padding(4.dp)) {
                    DateBasis.entries.forEach { basis ->
                        val selected = filter.basis == basis
                        val shape = RoundedCornerShape(9.dp)
                        Box(
                            Modifier
                                .weight(1f)
                                .height(36.dp)
                                .then(if (selected) Modifier.shadow(1.dp, shape) else Modifier)
                                .clip(shape)
                                .background(if (selected) DS.Colors.Surface else Color.Transparent)
                                .clickable { filter = filter.copy(basis = basis) }
                                .semantics { this.selected = selected; role = Role.RadioButton },
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                stringResource(
                                    when (basis) {
                                        DateBasis.CREATED -> R.string.orders_v2_basis_created
                                        DateBasis.PICKUP_PLAN -> R.string.orders_v2_basis_pickup
                                        DateBasis.RETURN_PLAN -> R.string.orders_v2_basis_return
                                    },
                                ),
                                fontSize = DS.TextSize.Secondary,
                                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                                color = if (selected) DS.Colors.Text else DS.Colors.TextMuted,
                            )
                        }
                    }
                }
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(
                        DateRangeChoice.Any to R.string.orders_v2_range_any,
                        DateRangeChoice.Today to R.string.orders_v2_range_today,
                        DateRangeChoice.Next7Days to R.string.orders_v2_range_next7,
                        DateRangeChoice.ThisMonth to R.string.orders_v2_range_month,
                    ).forEach { (range, label) ->
                        Chip(stringResource(label), filter.range == range, height = 40, fontSize = DS.TextSize.Body, onClick = { filter = filter.copy(range = range) })
                    }
                    val custom = filter.range as? DateRangeChoice.Custom
                    Chip(
                        text = custom?.let { "%02d/%02d – %02d/%02d".format(it.from.dayOfMonth, it.from.monthValue, it.to.dayOfMonth, it.to.monthValue) }
                            ?: stringResource(R.string.select_date),
                        selected = custom != null,
                        height = 40,
                        fontSize = DS.TextSize.Body,
                        icon = Icons.Outlined.CalendarMonth,
                        onClick = { pickDates = true },
                    )
                }
            }
            Surface(
                onClick = { onApply(filter) },
                shape = RoundedCornerShape(14.dp),
                color = DS.Colors.Primary,
                modifier = Modifier.fillMaxWidth().height(52.dp),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        total?.let { pluralStringResource(R.plurals.orders_v2_filter_show_count, it, it) } ?: stringResource(R.string.orders_v2_filter_show),
                        fontSize = DS.TextSize.Input,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White,
                    )
                }
            }
        }
    }
    if (pickDates) {
        val custom = filter.range as? DateRangeChoice.Custom
        AppDateRangePickerSheet(
            title = stringResource(R.string.select_date),
            subtitle = "",
            startLabel = stringResource(R.string.orders_v2_range_from),
            endLabel = stringResource(R.string.orders_v2_range_to),
            initialStart = custom?.from,
            initialEnd = custom?.to,
            onDismiss = { pickDates = false },
            onConfirm = { from, to ->
                filter = filter.copy(range = DateRangeChoice.Custom(from, to))
                pickDates = false
            },
        )
    }
}

@Composable
private fun SheetLabel(text: String) {
    Text(text, fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Bold, letterSpacing = 0.5.sp, color = DS.Colors.TextMuted)
}

@Composable
private fun SortOption(text: String, selected: Boolean, modifier: Modifier, onClick: () -> Unit) {
    val shape = RoundedCornerShape(12.dp)
    Box(
        modifier
            .height(44.dp)
            .clip(shape)
            .background(if (selected) BoardColors.SelectedFill else DS.Colors.Surface)
            .border(if (selected) 2.dp else 1.dp, if (selected) DS.Colors.Primary else BoardColors.Outline, shape)
            .clickable(onClick = onClick)
            .semantics { this.selected = selected; role = Role.RadioButton },
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text,
            fontSize = DS.TextSize.Body,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
            color = if (selected) BoardColors.SelectedText else DS.Colors.Text,
            maxLines = 1,
        )
    }
}
