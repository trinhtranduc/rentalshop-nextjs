package com.anyrent.pos.ui.orders.v2

import android.content.Intent
import android.net.Uri
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Call
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.CustomersV2Api
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.data.model.Product
import com.anyrent.pos.domain.customers.CustomerRules
import com.anyrent.pos.domain.orders.EntityOrdersLogic
import com.anyrent.pos.domain.products.ProductStock
import com.anyrent.pos.domain.products.barcodeText
import com.anyrent.pos.ui.common.AppIcon
import com.anyrent.pos.ui.common.formatDayShort
import com.anyrent.pos.ui.common.formatMoneyVnd
import com.anyrent.pos.ui.customers.v2.CustomerAvatar
import com.anyrent.pos.ui.home.v2.ProductThumb
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.LocalDate

/** "CN 27/09 – T7 03/10" from the route's `yyyy-MM-dd` days (iOS `OverviewLogic.longRange`); null without a period */
internal fun entityPeriodRange(start: String?, end: String?): String? {
    val from = start?.let { runCatching { LocalDate.parse(it) }.getOrNull() } ?: return null
    val to = end?.let { runCatching { LocalDate.parse(it) }.getOrNull() } ?: from
    fun label(day: LocalDate) = formatDayShort(day)
    return if (from == to) label(from) else "${label(from)} – ${label(to)}"
}

/**
 * #482 — "Đơn theo sản phẩm" / "Đơn theo khách hàng" (boards DT-don-theo-sp, DT-don-theo-kh): flat header with the
 * product photo or the customer's initials, a period chip, three tiles, a "ĐƠN HÀNG" band and the Orders tab
 * "Tất cả" rows. Existing endpoints only (iOS `OverviewRankingOrdersViewController`).
 */
@Composable
fun EntityOrdersScreen(
    isProduct: Boolean,
    entityId: Int,
    startDate: String?,
    endDate: String?,
    onOpenOrder: (Int) -> Unit,
    onOpenProduct: (Int) -> Unit,
    onOpenCustomer: (Int) -> Unit,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()
    var orders by remember { mutableStateOf<List<OrderSummary>>(emptyList()) }
    var total by remember { mutableIntStateOf(0) }
    var hasMore by remember { mutableStateOf(false) }
    var page by remember { mutableIntStateOf(1) }
    var loading by remember { mutableStateOf(true) }
    var loadingMore by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var product by remember { mutableStateOf<Product?>(null) }
    var customerName by remember { mutableStateOf<String?>(null) }
    var customerPhone by remember { mutableStateOf<String?>(null) }
    var spent by remember { mutableStateOf<Double?>(null) }
    var renting by remember { mutableStateOf<Int?>(null) }

    suspend fun fetch(pageNumber: Int): Result<ApiClient.PageResult<OrderSummary>> = withContext(Dispatchers.IO) {
        if (isProduct) {
            ApiClient.get().searchOrders(
                page = pageNumber, productId = entityId, startDate = startDate, endDate = endDate,
                sortBy = "createdAt", sortOrder = "desc",
            )
        } else {
            CustomersV2Api.ordersPage(entityId, pageNumber, 20, startDate, endDate).map { (rows, summary) ->
                if (pageNumber == 1) {
                    withContext(Dispatchers.Main) {
                        customerName = CustomerRules.displayName(summary.firstName, summary.lastName, summary.phone)
                        customerPhone = summary.phone
                        spent = summary.totalAmount
                    }
                }
                rows.copy(total = summary.totalOrders)
            }
        }
    }

    LaunchedEffect(isProduct, entityId, startDate, endDate) {
        loading = true
        val side = if (isProduct) {
            async(Dispatchers.IO) { ApiClient.get().getProduct(entityId).getOrNull()?.let { product = it } }
        } else {
            async(Dispatchers.IO) { CustomersV2Api.rentingCount(entityId).getOrNull()?.let { renting = it } }
        }
        fetch(1).onSuccess {
            orders = it.items
            total = it.total ?: it.items.size
            hasMore = it.hasMore
            page = 1
            error = null
        }.onFailure { error = it.message }
        loading = false
        side.await()
    }

    LaunchedEffect(listState, hasMore, loadingMore) {
        snapshotFlow {
            val info = listState.layoutInfo
            (info.visibleItemsInfo.lastOrNull()?.index ?: -1) >= info.totalItemsCount - 3
        }.distinctUntilChanged().collect { nearEnd ->
            if (!nearEnd || !hasMore || loadingMore) return@collect
            loadingMore = true
            scope.launch {
                fetch(page + 1).onSuccess {
                    orders = orders + it.items
                    hasMore = it.hasMore
                    page += 1
                }
                loadingMore = false
            }
        }
    }

    val freeFormat = stringResource(R.string.orders_entity_free)
    val million = stringResource(R.string.orders_entity_million)
    val millionWhole = stringResource(R.string.orders_entity_million_whole)
    val money: (Double) -> String = { EntityOrdersLogic.compactMoney(it, ::formatMoneyVnd, million, millionWhole) }
    val partial = hasMore && orders.isNotEmpty()
    val titles: List<String>
    val values: List<String>
    if (isProduct) {
        titles = listOf(
            stringResource(R.string.orders_entity_tile_orders),
            stringResource(R.string.orders_entity_tile_rentals),
            stringResource(R.string.orders_entity_tile_revenue),
        )
        values = EntityOrdersLogic.productValues(orders, entityId, total, partial, hidesMoney = false, money = money)
    } else {
        titles = listOf(
            stringResource(R.string.orders_entity_tile_orders),
            stringResource(R.string.orders_entity_tile_spent),
            stringResource(R.string.orders_entity_tile_renting),
        )
        values = EntityOrdersLogic.customerValues(total, if (loading) null else spent ?: EntityOrdersLogic.spent(orders), renting,
            hidesMoney = false, money = money)
    }
    val name = if (isProduct) product?.name ?: "" else customerName ?: orders.firstOrNull()?.customerName.orEmpty()
    val subtitle = if (isProduct) {
        product?.let { EntityOrdersLogic.productSubtitle(it.barcodeText, ProductStock.freeToday(it)) { n -> freeFormat.format(n) } }.orEmpty()
    } else {
        customerPhone.orEmpty()
    }
    val period = entityPeriodRange(startDate, endDate) ?: stringResource(R.string.period_all_time)

    Column(Modifier.fillMaxSize().background(DS.Colors.Surface).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().padding(start = 8.dp, end = 8.dp, top = 10.dp, bottom = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) {
                AppIcon(Icons.AutoMirrored.Outlined.KeyboardArrowLeft, contentDescription = stringResource(R.string.back), size = DS.Icon.Lg, tint = DS.Colors.Text)
            }
            Text(
                stringResource(if (isProduct) R.string.product_orders else R.string.customer_orders),
                fontSize = 20.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text,
            )
        }
        Column(
            Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(
                    Modifier.weight(1f).clickable(onClickLabel = name) { if (isProduct) onOpenProduct(entityId) else onOpenCustomer(entityId) },
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    if (isProduct) {
                        ProductThumb(product?.images?.firstOrNull() ?: product?.imageUrl, 56.dp, 12.dp)
                    } else {
                        CustomerAvatar(name, 52, 17)
                    }
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(name, fontSize = DS.TextSize.Name, fontWeight = FontWeight.Bold, color = DS.Colors.Text, maxLines = 2,
                            overflow = TextOverflow.Ellipsis)
                        if (subtitle.isNotEmpty()) Text(subtitle, fontSize = DS.TextSize.Secondary, color = Color(0xFF64748B))
                    }
                    if (isProduct) {
                        AppIcon(Icons.AutoMirrored.Outlined.KeyboardArrowRight, contentDescription = null, size = DS.Icon.Sm, tint = Color(0xFF94A3B8))
                    }
                }
                val digits = CustomerRules.phoneDigits(customerPhone)
                if (!isProduct && digits.isNotEmpty()) {
                    val callLabel = stringResource(R.string.call_customer)
                    Box(
                        Modifier.size(40.dp).clip(RoundedCornerShape(10.dp)).border(1.dp, Color(0xFFCBD5E1), RoundedCornerShape(10.dp))
                            .clickable {
                                runCatching { context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$digits"))) }
                            }
                            .semantics { contentDescription = callLabel; role = Role.Button },
                        contentAlignment = Alignment.Center,
                    ) {
                        AppIcon(Icons.Outlined.Call, contentDescription = null, size = DS.Icon.Sm, tint = DS.Colors.Text)
                    }
                }
            }
            Row(
                Modifier.height(32.dp).clip(RoundedCornerShape(999.dp)).background(Color(0xFFEFF6FF)).padding(horizontal = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                AppIcon(Icons.Outlined.CalendarMonth, contentDescription = null, size = 14.dp, tint = Color(0xFF1E40AF))
                Text(period, fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.SemiBold, color = Color(0xFF1E40AF), maxLines = 1)
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                titles.zip(values).forEachIndexed { index, (title, value) ->
                    val accent = !isProduct && index == 2
                    Column(
                        Modifier.weight(1f).clip(RoundedCornerShape(DS.Radius.card)).background(Color(0xFFF8FAFC))
                            .padding(horizontal = 12.dp, vertical = 10.dp).semantics(mergeDescendants = true) {},
                        verticalArrangement = Arrangement.spacedBy(2.dp),
                    ) {
                        Text(title, fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted, maxLines = 1)
                        Text(value, fontSize = 18.sp, fontWeight = FontWeight.Bold, maxLines = 1,
                            color = if (accent) DS.Status.Return.text else DS.Colors.Text)
                    }
                }
            }
        }
        Spacer(Modifier.fillMaxWidth().height(8.dp).background(DS.Colors.Background))
        Text(
            stringResource(R.string.orders_entity_section), fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Bold,
            color = DS.Colors.TextMuted, letterSpacing = 0.56.sp,
            modifier = Modifier.fillMaxWidth().background(Color(0xFFF8FAFC)).padding(start = 16.dp, end = 16.dp, top = 10.dp, bottom = 6.dp),
        )
        HorizontalDivider(color = DS.Colors.Divider, thickness = 1.dp)
        when {
            loading && orders.isEmpty() -> Box(Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(Modifier.size(28.dp), strokeWidth = 2.dp)
            }
            error != null && orders.isEmpty() -> Box(Modifier.fillMaxWidth().weight(1f).padding(32.dp), contentAlignment = Alignment.Center) {
                Text(error.orEmpty(), fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted)
            }
            orders.isEmpty() -> Box(Modifier.fillMaxWidth().weight(1f).padding(32.dp), contentAlignment = Alignment.Center) {
                Text(stringResource(R.string.empty_orders), fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted)
            }
            else -> LazyColumn(Modifier.fillMaxWidth().weight(1f), state = listState) {
                items(OrdersHomeLogic.orderRows(orders).filterIsInstance<OrdersRow.Order>(), key = { it.key }) { row ->
                    OrderListRow(row, onClick = { onOpenOrder(row.orderId) })
                }
                if (loadingMore) {
                    item {
                        Box(Modifier.fillMaxWidth().padding(12.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(Modifier.size(24.dp), strokeWidth = 2.dp)
                        }
                    }
                }
            }
        }
    }
}
