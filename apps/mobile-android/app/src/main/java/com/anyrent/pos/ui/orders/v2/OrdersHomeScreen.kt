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
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.style.LineHeightStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.anyrent.pos.AnyRentApp
import com.anyrent.pos.R
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.domain.ShopTime
import com.anyrent.pos.domain.orders.OrderRowDates
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
import com.anyrent.pos.ui.navigation.OrdersChanged
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.flow.distinctUntilChanged
import java.time.Instant
import kotlinx.coroutines.flow.drop

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
fun OrdersHomeScreen(onOpenOrder: (Int) -> Unit, onOpenBookings: () -> Unit = {}) {
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
    val texts = orderRowTexts()

    LaunchedEffect(Unit) { viewModel.onShown() }
    // After create-order success: MainTabRouter switches to this tab and asks for a reload
    LaunchedEffect(Unit) { MainTabRouter.refreshOrders.collect { viewModel.reload(keepRows = true) } }
    // #674: an order changed while this tab is on screen: quiet refresh
    LaunchedEffect(Unit) { OrdersChanged.version.drop(1).collect { viewModel.refreshIfNeeded() } }
    // Top of the list when the list changes meaning; not when the screen comes back from a detail (#674)
    val listKey = "${state.segment}|${state.isSearching}|${state.filter.hashCode()}"
    var scrolledKey by rememberSaveable { mutableStateOf(listKey) }
    LaunchedEffect(listKey) {
        if (listKey != scrolledKey) {
            scrolledKey = listKey
            listState.scrollToItem(0)
        }
    }
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
                    // #1124 "Đặt online" with the count of requests waiting (hidden unless the shop takes them)
                    com.anyrent.pos.ui.booking.BookingChip(onClick = onOpenBookings)
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
                                    // #888 "Tất cả đơn": Lấy · Trả with the sorted date marked
                                    rentSortedBy = state.filter.sortDate.takeIf { !state.isSearching && state.segment == OrdersSegment.RENT },
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

/** #496 the date line templates of an order row, in the app language */
@Composable
internal fun orderRowTexts() = OrderRowDates.Texts(
    weekdays = stringResource(R.string.order_row_weekdays).split(',').map { it.trim() },
    created = stringResource(R.string.order_row_created),
    handOver = stringResource(R.string.order_row_hand_over),
    handOverReturn = stringResource(R.string.order_row_hand_over_return),
    returns = stringResource(R.string.order_row_returns),
    returnDue = stringResource(R.string.order_row_return_due),
    returned = stringResource(R.string.order_row_returned),
    sold = stringResource(R.string.order_row_sold),
    cancelled = stringResource(R.string.order_row_cancelled),
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
            // #888: always says how the list is sorted: "Xếp theo ngày lấy · mới nhất trước ▾"
            Text(sortBarText(state.filter), fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.SemiBold, color = DS.Colors.Primary)
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

/** #888 "Ngày lấy", "Ngày trả", "Ngày tạo" (iOS `sortDateTitle`) */
internal fun sortDateLabel(date: SortDate): Int = when (date) {
    SortDate.PICKUP -> R.string.orders_v2_sort_date_pickup
    SortDate.RETURN -> R.string.orders_v2_sort_date_return
    SortDate.CREATED -> R.string.orders_v2_sort_date_created
}

/** #888, #1056: "Mới nhất trước" (desc) / "Cũ nhất trước" (asc) for every date; English pickup/return "Latest first" / "Earliest first" (iOS `directionTitle`) */
internal fun directionLabel(date: SortDate, direction: SortDirection): Int = when {
    date == SortDate.CREATED && direction == SortDirection.NEAREST_FIRST -> R.string.orders_v2_direction_newest
    date == SortDate.CREATED -> R.string.orders_v2_direction_oldest
    direction == SortDirection.NEAREST_FIRST -> R.string.orders_v2_direction_nearest
    else -> R.string.orders_v2_direction_farthest
}

/** #888 "Xếp theo ngày lấy · mới nhất trước" */
@Composable
internal fun sortBarText(filter: RentOrdersFilter): String = stringResource(
    R.string.orders_v2_sort_bar,
    stringResource(sortDateLabel(filter.sortDate)).lowercase(),
    stringResource(directionLabel(filter.sortDate, filter.direction)).lowercase(),
)

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
    val zone = ShopTime.zone
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
            val collect = OrdersBoardLogic.collectCount(section.rows)
            // #1231: " · thu N" only when the band has deposit stages
            stringResource(R.string.orders_v2_band_work, handOver, takeBack) +
                if (collect > 0) stringResource(R.string.orders_v2_band_collect, collect) else ""
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

private enum class RowContext { LIST, SALE, SEARCH, PRODUCT }

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun WorkRow(
    work: TodayWorkRow,
    kind: WorkKind,
    isLate: Boolean,
    texts: OrderRowDates.Texts,
    onClick: () -> Unit,
    onCall: (String) -> Unit,
) {
    // #893 (owner, lean row): line 1 name + the light task tag; line 2 the task's date chip, "Trễ N ngày",
    // "Chưa soạn đồ" (wrap only when they do not fit), right "còn thu N" (bold) or the total
    val handOver = kind == WorkKind.HAND_OVER
    val tagColors = when (kind) {
        WorkKind.HAND_OVER -> DS.Status.HandOver
        WorkKind.TAKE_BACK -> DS.Status.Return
        WorkKind.COLLECT -> DS.Status.Waiting
    }
    val tagText = stringResource(
        when (kind) {
            WorkKind.HAND_OVER -> R.string.orders_v2_tag_hand_over
            WorkKind.TAKE_BACK -> R.string.orders_v2_tag_take_back
            WorkKind.COLLECT -> R.string.orders_v2_tag_collect
        },
    )
    val (pickupLabel, returnLabel) = chipLabels()
    val notPrepared = stringResource(R.string.orders_v2_not_prepared)
    val due = OrdersBoardLogic.workDue(work)
    val phone = OrdersBoardLogic.workCallPhone(work, isLate)
    Column(Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = DS.Gap.RowHorizontal, vertical = DS.Gap.OrderRowPadding),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(DS.Gap.OrderRowLine)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        work.customerName?.takeIf { it.isNotBlank() } ?: "N/A",
                        fontSize = DS.TextSize.Name, fontWeight = FontWeight.Medium, color = DS.Colors.Text,
                        maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f),
                    )
                    Tag(tagText, tagColors, RowTagStyle.STATUS)
                }
                Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.weight(1f),
                    ) {
                        OrdersBoardLogic.workChips(work, kind).forEach { chip ->
                            // #1008 (owner): the date chip shows its icon then the date
                            val (text, warning) = when (chip.kind) {
                                OrdersBoardLogic.WorkChipKind.PICKUP -> {
                                    DateChip(OrderRowDates.ChipKind.PICKUP, chip.date.orEmpty(), "$pickupLabel ${chip.date}", DS.TextSize.Secondary, FontWeight.Medium)
                                    return@forEach
                                }
                                OrdersBoardLogic.WorkChipKind.RETURN -> {
                                    DateChip(OrderRowDates.ChipKind.RETURN, chip.date.orEmpty(), "$returnLabel ${chip.date}", DS.TextSize.Secondary, FontWeight.Medium)
                                    return@forEach
                                }
                                // #1032 (owner): icon + coloured text, no box
                                OrdersBoardLogic.WorkChipKind.LATE -> pluralStringResource(R.plurals.orders_late_days, chip.days, chip.days) to RowWarning.LATE
                                OrdersBoardLogic.WorkChipKind.NOT_PREPARED -> notPrepared to RowWarning.NOT_PREPARED
                                // #1231: a deposit stage reads "Cọc 2 · #0053" in plain text
                                OrdersBoardLogic.WorkChipKind.STAGE -> {
                                    Text(
                                        stringResource(R.string.overview_installments_row, chip.label.orEmpty(), chip.code.orEmpty()),
                                        fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Medium, color = DS.Colors.Text,
                                    )
                                    return@forEach
                                }
                            }
                            RowWarningText(text, warning)
                        }
                    }
                    // Owner: the total (bold) always; "còn thu N" smaller under it when something is due
                    Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(
                            formatMoneyVnd(work.totalAmount), fontSize = DS.TextSize.Name, fontWeight = RowMoneyText.totalWeight,
                            color = DS.Colors.Text, maxLines = 1,
                        )
                        due?.let {
                            Text(
                                stringResource(R.string.orders_v2_pay_due, formatMoneyVnd(it)),
                                fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Medium, color = DS.Status.Waiting.text, maxLines = 1,
                            )
                        }
                    }
                }
            }
            if (phone != null) {
                IconButton(onClick = { onCall(phone) }) { Icon(Icons.Outlined.Phone, contentDescription = stringResource(R.string.call_customer)) }
            }
        }
        HorizontalDivider(color = DS.Colors.Divider)
    }
}

/**
 * The Orders tab row for lists outside the tab (overview drill-downs, #458): search context, so a sale reads
 * "Bán · Hoàn thành" and the date line follows the status.
 */
@Composable
internal fun OrderBoardRow(row: OrdersRow.Order, onClick: () -> Unit) {
    OrderRow(row, RowContext.SEARCH, orderRowTexts(), onClick = onClick)
}

/** The Orders tab "Tất cả" row (list context) for the orders by product / customer screens (#482) */
@Composable
internal fun OrderListRow(row: OrdersRow.Order, sortedBy: SortDate? = null, onClick: () -> Unit) {
    // #1025: a product's orders bold the date they are sorted by; the rest of the list row is unchanged
    OrderRow(row, RowContext.LIST, orderRowTexts(), boldDate = sortedBy, saleSortedBy = sortedBy, onClick = onClick)
}

/** #891 (owner): product detail → its orders: the order row plus "× qty" of this product; no pay line, no late chip */
@Composable
internal fun ProductOrderRow(order: OrderSummary, qty: Int, onClick: () -> Unit) {
    OrderRow(OrdersRow.Order(order, 0), RowContext.PRODUCT, orderRowTexts(), qty = qty, onClick = onClick)
}

/** #891 (owner): customer detail → its orders: the order row with the item names as line 1 (iOS configure(customerOrder:)) */
@Composable
internal fun CustomerOrderListRow(row: com.anyrent.pos.domain.customers.CustomerOrderRow, onClick: () -> Unit) {
    val isRent = row.orderType.equals("RENT", ignoreCase = true)
    val texts = orderRowTexts()
    val lines = OrderRowDates.lines(
        OrderRowDates.Input(
            code = OrdersBoardLogic.shortNumber(row.orderNumber), orderType = row.orderType, status = row.status,
            createdAt = row.createdAt, pickupPlanAt = row.pickupPlanAt, returnPlanAt = row.returnPlanAt, updatedAt = row.createdAt,
        ),
        texts,
    )
    BoardRow(
        tag = stringResource(OrderStatusTag.labelRes(row.status)) to OrderStatusTag.colors(row.status),
        name = com.anyrent.pos.domain.customers.CustomerRules.itemsTitle(row)
            ?: pluralStringResource(R.plurals.customers_v2_items, row.itemCount, row.itemCount),
        lines = lines,
        chips = if (isRent) {
            chipLabels().let { (p, r) -> OrderRowDates.chips(row.pickupPlanAt, row.returnPlanAt, false, false, p, r) }
        } else {
            // #1026 (owner): "Bán dd/mm/yy" → "↗ dd/mm/yy"
            OrderRowDates.saleChip(row.orderType, row.status, row.createdAt, saleChipLabel())?.let { listOf(it) }
        },
        pills = emptyList(),
        total = formatMoneyVnd(row.totalAmount),
        struck = row.status.equals("CANCELLED", ignoreCase = true),
        pay = null,
        phone = null,
        onClick = onClick,
        onCall = {},
    )
}

/**
 * #496 a "Chưa lấy đồ" row (board DT-chua-lay): the list row, with "Quá x ngày · nên gọi khách" when the pickup day
 * has passed ([overdueDays] > 0) and "còn thu N" in amber under the total when something is due.
 */
@Composable
internal fun NotPickedUpOrderRow(order: OrderSummary, overdueDays: Int, onClick: () -> Unit) {
    val due = order.amountDue?.takeIf { it > 0 }
    BoardRow(
        tag = stringResource(OrderStatusTag.labelRes(order.status)) to OrderStatusTag.colors(order.status),
        name = order.customerName,
        lines = OrderRowDates.lines(OrdersBoardLogic.rowDates(order, 0), orderRowTexts()),
        chips = chipLabels().let { (p, r) -> OrdersBoardLogic.dateChips(order, null, p, r) },
        pills = if (overdueDays > 0) {
            listOf(pluralStringResource(R.plurals.not_picked_up_overdue_days, overdueDays, overdueDays) to RowWarning.LATE)
        } else {
            emptyList()
        },
        total = formatMoneyVnd(order.totalAmount),
        struck = false,
        pay = due?.let { stringResource(R.string.orders_v2_pay_due, formatMoneyVnd(it)) to DueAmber },
        phone = null,
        onClick = onClick,
        onCall = {},
    )
}

/** #496 "còn thu" of a "Chưa lấy đồ" row */
private val DueAmber = Color(0xFFB45309)

@Composable
private fun OrderRow(
    row: OrdersRow.Order,
    context: RowContext,
    texts: OrderRowDates.Texts,
    rentSortedBy: SortDate? = null,
    /** #891 / #1025: the date shown bold; Tất cả đơn bolds its sort date, a product's orders theirs */
    boldDate: SortDate? = rentSortedBy,
    /** #1041: a product's sorted list; a sale row shows the day it is sorted by (other lists: the created day) */
    saleSortedBy: SortDate? = null,
    qty: Int? = null,
    onClick: () -> Unit,
) {
    val order = row.order
    val tagKind = OrdersBoardLogic.statusTag(order.status)
    // #482: same tag as the order detail header
    // #891: the same badge as the order detail header
    val badge = OrderStatusTag.badge(order.status)
    val tagRes = badge.labelRes
    val colors = badge.colors
    val isSale = !order.orderType.equals("RENT", ignoreCase = true)
    val tagText = stringResource(tagRes).let {
        if (context == RowContext.SEARCH && isSale) stringResource(R.string.orders_v2_tag_sale, it) else it
    }
    // #1199/#1222: "Đã thu 30%" on an order that has a deposit plan
    val collectedBadge = com.anyrent.pos.domain.deposit.DepositPlanLogic.listBadgePercent(
        order.orderType, order.status, order.hasDepositPlan, order.installmentPercentCollected,
    )?.let { stringResource(R.string.deposit_badge_collected, com.anyrent.pos.domain.deposit.DepositPlanMath.percentText(it)) }
    BoardRow(
        tag = tagText to colors,
        extraTag = collectedBadge?.let { it to DS.Status.Done },
        name = order.customerName,
        // #496: no product line; #891 (option C): a rent order shows the Lấy / Trả chips in place of the task line
        lines = OrderRowDates.lines(OrdersBoardLogic.rowDates(order, row.lateDays), texts),
        // #1026 (owner): a sale shows "↗ dd/mm/yy" in place of "Bán dd/mm/yy"
        chips = if (isSale) {
            OrdersBoardLogic.saleChip(order, saleSortedBy, saleChipLabel())?.let { listOf(it) }
        } else {
            chipLabels().let { (p, r) -> OrdersBoardLogic.dateChips(order, boldDate, p, r) }
        },
        metaBold = OrdersBoardLogic.metaIsBold(boldDate),
        qty = qty,
        // #888 (owner): no "Trễ N ngày" chip on Tất cả đơn; Việc cần làm and the detail keep it
        pills = if (row.lateDays > 0 && rentSortedBy == null && context != RowContext.PRODUCT) listOf(pluralStringResource(R.plurals.orders_late_days, row.lateDays, row.lateDays) to RowWarning.LATE) else emptyList(),
        total = formatMoneyVnd(order.totalAmount),
        struck = tagKind == RowTag.CANCELLED,
        // Balances of the list API (#389); nothing on an older API, a cancelled order or when fully paid (#458)
        // #891 (owner): no pay line on Tất cả đơn rows
        pay = when (val pay = OrdersBoardLogic.rowPayLine(order, rentList = rentSortedBy != null || context == RowContext.PRODUCT)) {
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
    /** #1199: a second pill next to the status ("Đã thu 30%") */
    extraTag: Pair<String, DS.Pill>? = null,
    name: String?,
    lines: OrderRowDates.Lines,
    /** #891 (option C): the Lấy / Trả chips in place of the task line (rent orders) */
    chips: List<OrderRowDates.DateChip>? = null,
    /** #891: sorted by created date, "tạo …" is bold dark text */
    metaBold: Boolean = false,
    /** #891: product detail → its orders: "× qty" of the product before the total */
    qty: Int? = null,
    /** #1032: "Trễ N ngày" / "Quá N ngày": soft warnings (icon + text, no box) */
    pills: List<Pair<String, RowWarning>>,
    /** Null hides the money (staff with "hide financial data") */
    total: String?,
    struck: Boolean,
    pay: Pair<String, Color>?,
    phone: String?,
    onClick: () -> Unit,
    onCall: (String) -> Unit,
) {
    // #888 (owner, mockup v5): line 1 name (one line, full width) + status badge right; line 2 "#code · tạo …";
    // line 3 dates / task + total right; line 4 notes + pay line right. 8dp between lines, 16dp top/bottom.
    Column(Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = DS.Gap.RowHorizontal, vertical = DS.Gap.OrderRowPadding),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(DS.Gap.OrderRowLine)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        name?.takeIf { it.isNotBlank() } ?: "N/A",
                        fontSize = DS.TextSize.Name,
                        fontWeight = FontWeight.Medium,
                        color = DS.Colors.Text,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                    Tag(tag.first, tag.second, RowTagStyle.STATUS)
                    extraTag?.let { Tag(it.first, it.second, RowTagStyle.STATUS) }
                }
                Text(
                    lines.meta, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis,
                    color = if (metaBold) DS.Colors.Text else OrderRowMetaColor,
                    fontWeight = if (metaBold) FontWeight.Medium else FontWeight.Normal,
                )
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(Modifier.weight(1f)) {
                        when {
                            !chips.isNullOrEmpty() -> DateChipsRow(chips)
                            lines.task != null -> Text(lines.task, fontSize = DS.TextSize.Body, fontWeight = FontWeight.Medium, color = DS.Colors.Text, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                    }
                    if (qty != null) {
                        Text(
                            "× $qty", fontSize = DS.TextSize.Secondary, color = Color(0xFF334155), maxLines = 1,
                            modifier = Modifier.clip(RoundedCornerShape(6.dp)).background(Color(0xFFF1F5F9)).padding(horizontal = 7.dp, vertical = 2.dp),
                        )
                    }
                    if (total != null) {
                        Text(
                            total,
                            fontSize = DS.TextSize.Name,
                            fontWeight = RowMoneyText.totalWeight,
                            color = if (struck) DS.Colors.TextMuted else DS.Colors.Text,
                            textDecoration = if (struck) TextDecoration.LineThrough else null,
                            maxLines = 1,
                        )
                    }
                }
                val payShown = pay?.takeIf { total != null }
                if (pills.isNotEmpty() || payShown != null) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.weight(1f)) {
                            pills.forEach { (text, warning) -> RowWarningText(text, warning) }
                        }
                        payShown?.let { Text(it.first, fontSize = DS.TextSize.Secondary, fontWeight = RowMoneyText.payWeight, color = it.second, maxLines = 1) }
                    }
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
            // #891 (owner): no ">" chevron; the whole row stays tappable and the content takes the width
        }
        HorizontalDivider(color = DS.Colors.Divider)
    }
}

/** #496 line 1 muted "#0053 · tạo T2 05/10", line 2 the task of the status ("Giao T2 05/10 · trả T4 07/10") */
@Composable
internal fun OrderRowDateLines(lines: OrderRowDates.Lines) {
    Text(lines.meta, fontSize = 13.sp, color = OrderRowMetaColor, maxLines = 1, overflow = TextOverflow.Ellipsis)
    lines.task?.let { Text(it, fontSize = DS.TextSize.Body, fontWeight = FontWeight.Medium, color = DS.Colors.Text, maxLines = 1, overflow = TextOverflow.Ellipsis) }
}

/** #891 (option C): the "↗ dd/mm/yy" / "↩ dd/mm/yy" (#1026 sale "↗ dd/mm/yy") chips, no colour; the sorted date only bolder (iOS DateChipStack) */
@Composable
internal fun DateChipsRow(chips: List<OrderRowDates.DateChip>) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
        chips.forEach { chip ->
            // #893 (owner on device): the sorted chip is bold (icon and date), the other regular
            val weight = if (chip.bold) DateChipText.sortedWeight else DateChipText.otherWeight
            DateChip(chip.kind, chip.date, chip.accessibilityText, DS.TextSize.Body, weight)
        }
    }
}

/**
 * #1008 (owner): one date chip: the pickup / return / sale icon (as big as the 14sp label it replaces)
 * then the date; TalkBack reads [spoken] ("Lấy 14/10/26"). Order rows, Việc cần làm and the calendar day rows.
 * #1026 (owner): no fill (so no start padding), a grey icon, dark text; only the status badge keeps colour.
 */
@Composable
internal fun DateChip(kind: OrderRowDates.ChipKind, date: String, spoken: String, dateSize: TextUnit, weight: FontWeight) {
    val colors = OrdersBoardLogic.chipColors(kind)
    val iconSize = with(LocalDensity.current) { DS.TextSize.Secondary.toDp() }
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        modifier = Modifier.background(colors.fill).padding(start = 0.dp, end = 4.dp, top = 4.dp, bottom = 4.dp)
            .clearAndSetSemantics { contentDescription = spoken },
    ) {
        Icon(OrdersBoardLogic.chipIcon(kind), contentDescription = null, tint = OrdersBoardLogic.chipIconTint, modifier = Modifier.size(iconSize))
        Text(date, fontSize = dateSize, fontWeight = weight, color = colors.text, maxLines = 1)
    }
}

/**
 * #1032 (owner, mockup "Mọi màn đơn hàng: cảnh báo gọn"): an order row warning: the icon then the text in the
 * warning colour, 12sp medium, no fill, no start padding; TalkBack reads [text] (plus [suffix]) as before.
 * [suffix] (the calendar " · phí N") follows in grey regular on the same line; [padded] false under a total.
 */
@Composable
internal fun RowWarningText(text: String, warning: RowWarning, suffix: String? = null, padded: Boolean = true) {
    val iconSize = with(LocalDensity.current) { RowWarning.fontSize.toDp() }
    val spoken = text + suffix.orEmpty()
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(3.dp),
        modifier = Modifier.background(warning.fill)
            .then(if (padded) Modifier.padding(start = 0.dp, end = 4.dp, top = 4.dp, bottom = 4.dp) else Modifier)
            .clearAndSetSemantics { contentDescription = spoken },
    ) {
        Icon(warning.icon, contentDescription = null, tint = warning.color, modifier = Modifier.size(iconSize))
        Text(text, fontSize = RowWarning.fontSize, fontWeight = RowWarning.weight, color = warning.color, maxLines = 1)
        suffix?.let {
            Text(it, fontSize = RowWarning.fontSize, fontWeight = RowWarning.feeWeight, color = RowWarning.feeColor, maxLines = 1)
        }
    }
}

/** #893: weights of the date chips (iOS DateChipStack) */
internal object DateChipText {
    val sortedWeight = FontWeight.Medium
    val otherWeight = FontWeight.Normal
}

/** Chip labels in the app language */
@Composable
internal fun chipLabels(): Pair<String, String> = stringResource(R.string.orders_chip_pickup) to stringResource(R.string.orders_chip_return)

/** #1026: the spoken word of a sale date chip ("Bán") */
@Composable
internal fun saleChipLabel(): String = stringResource(R.string.orders_chip_sale)


/** #496 line 1 of an order row */
internal val OrderRowMetaColor = Color(0xFF64748B)

/**
 * Coloured tag of an order row (#468, boards Main / VL-tat-ca / VL-ban): STATUS ("Giao", "Đã đặt") 14sp bold,
 * 8/3 padding, radius 7; NOTE ("Trễ 1 ngày", "Chưa soạn đồ") 12sp regular, 6/2 padding, radius 6.
 */
internal enum class RowTagStyle(
    val fontSize: TextUnit,
    val weight: FontWeight,
    val horizontal: Dp,
    val vertical: Dp,
    val radius: Dp,
) {
    STATUS(DS.TextSize.Secondary, FontWeight.Bold, 8.dp, 3.dp, DS.Radius.tag),
    NOTE(DS.TextSize.Pill, FontWeight.Normal, 6.dp, 2.dp, DS.Radius.chip),
}

/** Money column of an order row (#468): the total bold, the pay line ("còn thu N" / "trả cọc N") regular */
internal object RowMoneyText {
    val totalWeight = FontWeight.Medium
    val payWeight = FontWeight.Normal
}

/** Tag of an order row; also the status tag of the order detail header (#482) */
@Composable
internal fun Tag(text: String, colors: DS.Pill, style: RowTagStyle) {
    Box(
        Modifier
            .background(colors.fill, RoundedCornerShape(style.radius))
            .padding(horizontal = style.horizontal, vertical = style.vertical),
    ) {
        Text(text, color = colors.text, fontSize = style.fontSize, fontWeight = style.weight, maxLines = 1)
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

/** "Lọc & sắp xếp" (board Loc): sort, date range and "Xem N đơn". #1025: a product's orders hide the range ([showsRange]) */
@OptIn(ExperimentalLayoutApi::class, ExperimentalMaterial3Api::class)
@Composable
internal fun FilterSheet(
    initial: RentOrdersFilter,
    count: suspend (RentOrdersFilter) -> Int?,
    onApply: (RentOrdersFilter) -> Unit,
    onDismiss: () -> Unit,
    showsRange: Boolean = true,
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
            // #888: one date for the order and the range (Ngày lấy / Ngày trả / Ngày tạo)
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                SheetLabel(stringResource(R.string.orders_v2_filter_sort_by).uppercase())
                SegmentTrack(SortDate.entries.map { stringResource(sortDateLabel(it)) }, SortDate.entries.indexOf(filter.sortDate)) {
                    filter = filter.copy(sortDate = SortDate.entries[it])
                }
            }
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                SheetLabel(stringResource(R.string.orders_v2_filter_order).uppercase())
                SegmentTrack(SortDirection.entries.map { stringResource(directionLabel(filter.sortDate, it)) }, SortDirection.entries.indexOf(filter.direction)) {
                    filter = filter.copy(direction = SortDirection.entries[it])
                }
            }
            if (showsRange) Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                val dateName = stringResource(sortDateLabel(filter.sortDate)).lowercase()
                SheetLabel(stringResource(R.string.orders_v2_filter_range_of, dateName).uppercase())
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
                // Board: "Sắp xếp và khoảng ngày cùng tính theo **ngày lấy**."
                val hint = stringResource(R.string.orders_v2_filter_same_date, dateName)
                val at = hint.lastIndexOf(dateName)
                Text(
                    buildAnnotatedString {
                        append(hint)
                        if (at >= 0) addStyle(SpanStyle(fontWeight = FontWeight.Bold, color = DS.Colors.Text), at, at + dateName.length)
                    },
                    fontSize = DS.TextSize.Secondary,
                    color = DS.Colors.TextMuted,
                )
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

/** #888 a segmented track (board Loc): grey track, the selected segment white with a light shadow */
@Composable
private fun SegmentTrack(labels: List<String>, selectedIndex: Int, onSelect: (Int) -> Unit) {
    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(BoardColors.Track).padding(4.dp)) {
        labels.forEachIndexed { index, label ->
            val selected = index == selectedIndex
            val shape = RoundedCornerShape(9.dp)
            Box(
                Modifier
                    .weight(1f)
                    .height(40.dp)
                    .then(if (selected) Modifier.shadow(1.dp, shape) else Modifier)
                    .clip(shape)
                    .background(if (selected) DS.Colors.Surface else Color.Transparent)
                    .clickable { onSelect(index) }
                    .semantics { this.selected = selected; role = Role.RadioButton },
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    label,
                    fontSize = DS.TextSize.Body,
                    fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                    color = if (selected) DS.Colors.Text else DS.Colors.TextMuted,
                    maxLines = 1,
                )
            }
        }
    }
}

@Composable
private fun SheetLabel(text: String) {
    Text(text, fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Bold, letterSpacing = 0.5.sp, color = DS.Colors.TextMuted)
}

