package com.anyrent.pos.ui.home.v2

import android.widget.Toast
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Checkroom
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
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
import coil.compose.AsyncImage
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.CartStore
import com.anyrent.pos.data.PermissionManager
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.data.model.Product
import com.anyrent.pos.domain.products.ProductAccess
import com.anyrent.pos.domain.products.ProductPricing
import com.anyrent.pos.domain.products.ProductStock
import com.anyrent.pos.domain.products.barcodeText
import com.anyrent.pos.ui.common.AppFormSheet
import com.anyrent.pos.ui.common.AppPrimaryButton
import com.anyrent.pos.ui.common.AppSecondaryButton
import com.anyrent.pos.ui.common.LoadingBox
import com.anyrent.pos.ui.common.OrderStatusStyle
import com.anyrent.pos.ui.common.StatusBadge
import com.anyrent.pos.ui.common.formatDayShort
import com.anyrent.pos.ui.common.formatMoneyVnd
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.Instant

/**
 * Redesigned product detail (#373, flag `newProducts`, board SP-chi-tiet): photos, prices per rental / per day /
 * sale, rented and free units, and the product's orders.
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun ProductDetailScreen(
    productId: Int,
    onBack: () -> Unit,
    onOpenOrder: (Int) -> Unit,
    onOpenCalendar: (Int) -> Unit,
) {
    val context = LocalContext.current
    var product by remember { mutableStateOf<Product?>(null) }
    var orders by remember { mutableStateOf<List<OrderSummary>>(emptyList()) }
    var ordersTotal by remember { mutableIntStateOf(0) }
    var error by remember { mutableStateOf<String?>(null) }
    var reloadKey by remember { mutableIntStateOf(0) }
    var showEdit by remember { mutableStateOf(false) }
    val added = stringResource(R.string.v2_added_to_cart)

    LaunchedEffect(productId, reloadKey) {
        withContext(Dispatchers.IO) { ApiClient.get().getProduct(productId) }
            .onSuccess { product = it; error = null }
            .onFailure { if (product == null) error = it.message }
        withContext(Dispatchers.IO) { ApiClient.get().searchProductOrders(productId, page = 1, limit = 20) }
            .onSuccess {
                orders = it.items
                ordersTotal = it.total ?: it.items.size
            }
    }

    val current = product
    Column(Modifier.fillMaxSize().background(Color.White)) {
        if (current == null) {
            Box(Modifier.fillMaxSize().statusBarsPadding()) {
                if (error != null) Text(error!!, modifier = Modifier.padding(32.dp)) else LoadingBox()
                RoundButton(onClick = onBack, label = stringResource(R.string.back), modifier = Modifier.padding(12.dp)) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                }
            }
            return@Column
        }
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState())) {
            // Photos with back / edit on top
            val urls = current.images.ifEmpty { listOfNotNull(current.imageUrl) }
            Box(Modifier.fillMaxWidth().aspectRatio(1.6f).background(V2Colors.Chip)) {
                if (urls.isEmpty()) {
                    Icon(Icons.Outlined.Checkroom, contentDescription = null, tint = DS.Colors.TextMuted, modifier = Modifier.size(64.dp).align(Alignment.Center))
                } else {
                    val pager = rememberPagerState { urls.size }
                    HorizontalPager(state = pager, modifier = Modifier.fillMaxSize()) { page ->
                        AsyncImage(model = urls[page], contentDescription = current.name, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                    }
                    if (urls.size > 1) {
                        Text(
                            "${pager.currentPage + 1}/${urls.size}",
                            fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color.White,
                            modifier = Modifier.align(Alignment.BottomEnd).padding(10.dp)
                                .clip(RoundedCornerShape(999.dp)).background(DS.Colors.Text.copy(alpha = 0.6f))
                                .padding(horizontal = 8.dp, vertical = 2.dp),
                        )
                    }
                }
                Row(Modifier.fillMaxWidth().statusBarsPadding().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    RoundButton(onClick = onBack, label = stringResource(R.string.back)) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                    Spacer(Modifier.weight(1f))
                    if (ProductAccess.canEdit(PermissionManager.role)) {
                        RoundButton(onClick = { showEdit = true }, label = stringResource(R.string.edit_product)) {
                            Text(stringResource(R.string.v2_detail_edit), fontSize = 14.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(horizontal = 12.dp))
                        }
                    }
                }
            }

            // Name, meta, prices, stock
            Column(Modifier.padding(horizontal = 16.dp, vertical = 14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(current.name, fontSize = 22.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text)
                val meta = listOfNotNull(
                    current.categoryName, current.barcodeText,
                    current.deposit.takeIf { it > 0 }?.let { stringResource(R.string.v2_detail_deposit, formatMoneyVnd(it)) },
                ).filter { it.isNotBlank() }
                if (meta.isNotEmpty()) Text(meta.joinToString(" · "), fontSize = 13.sp, color = DS.Colors.TextMuted)
                val tiles = listOfNotNull(
                    ProductPricing.perRental(current)?.let { stringResource(R.string.v2_price_per_rental) to it },
                    ProductPricing.perDay(current)?.let { stringResource(R.string.v2_price_per_day) to it },
                    ProductPricing.sale(current)?.let { stringResource(R.string.v2_price_sale) to it },
                )
                if (tiles.isNotEmpty()) {
                    Row(Modifier.fillMaxWidth().padding(top = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        tiles.forEach { (title, value) -> PriceTile(title, value, Modifier.weight(1f)) }
                    }
                }
                val counts = ProductStock.counts(current, SessionStore.outletId)
                Text(
                    stringResource(R.string.v2_stock_summary, counts.rented, counts.free, counts.total),
                    fontSize = 14.sp, color = DS.Colors.TextMuted, modifier = Modifier.padding(top = 4.dp),
                )
            }
            Spacer(Modifier.fillMaxWidth().height(8.dp).background(DS.Colors.Background))

            // Orders
            Row(Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(stringResource(R.string.v2_detail_orders), fontSize = 16.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                if (ordersTotal > 0) {
                    Text(stringResource(R.string.v2_detail_orders_count, ordersTotal), fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = DS.Colors.Primary)
                }
            }
            if (orders.isEmpty()) {
                Text(stringResource(R.string.v2_detail_no_orders), fontSize = 14.sp, color = DS.Colors.TextMuted, modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp))
            }
            orders.forEach { order -> OrderRow(order) { onOpenOrder(order.id) } }
            Spacer(Modifier.height(24.dp))
        }

        // Bottom actions
        HorizontalDivider(color = DS.Colors.Border)
        Row(
            Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Box(
                Modifier.weight(1f).height(50.dp).clip(RoundedCornerShape(12.dp))
                    .border(1.dp, V2Colors.Border, RoundedCornerShape(12.dp))
                    .clickable { onOpenCalendar(current.id) }
                    .semantics { role = Role.Button },
                contentAlignment = Alignment.Center,
            ) {
                Text(stringResource(R.string.v2_detail_free_calendar), fontSize = 15.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, color = DS.Colors.Text)
            }
            AppPrimaryButton(
                stringResource(R.string.v2_detail_add_to_cart),
                onClick = {
                    CartStore.addProduct(current)
                    Toast.makeText(context, added, Toast.LENGTH_SHORT).show()
                },
                modifier = Modifier.weight(2f),
            )
        }
    }

    if (showEdit && current != null) {
        AppFormSheet(onDismiss = { showEdit = false }, fullScreen = true) {
            ProductFormV2Screen(
                initial = current,
                onBack = { showEdit = false },
                onSaved = {
                    showEdit = false
                    product = it
                    reloadKey += 1
                },
            )
        }
    }
}

@Composable
private fun RoundButton(onClick: () -> Unit, label: String, modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Box(
        modifier
            .height(44.dp)
            .widthIn(min = 44.dp)
            .clip(RoundedCornerShape(999.dp))
            .background(Color.White.copy(alpha = 0.92f))
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp)
            .semantics { contentDescription = label; role = Role.Button },
        contentAlignment = Alignment.Center,
    ) { content() }
}

@Composable
private fun PriceTile(title: String, value: Double, modifier: Modifier = Modifier) {
    Column(
        modifier
            .border(1.dp, V2Colors.Line, RoundedCornerShape(12.dp))
            .padding(horizontal = 10.dp, vertical = 8.dp),
    ) {
        Text(title, fontSize = 12.sp, color = DS.Colors.TextMuted)
        Text(formatMoneyVnd(value), fontSize = 16.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
private fun OrderRow(order: OrderSummary, onClick: () -> Unit) {
    val dates = if (order.orderType.equals("RENT", ignoreCase = true) && order.pickupPlanAt != null && order.returnPlanAt != null) {
        listOfNotNull(dayOf(order.pickupPlanAt), dayOf(order.returnPlanAt)).joinToString(" → ")
    } else {
        dayOf(order.createdAt).orEmpty()
    }
    Column(Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Row(
            Modifier.fillMaxWidth().heightIn(min = 64.dp).padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Box(Modifier.width(4.dp).height(40.dp).clip(RoundedCornerShape(4.dp)).background(OrderStatusStyle.badgeColor(order.status)))
            Column(Modifier.weight(1f)) {
                Text(order.customerName.orEmpty(), fontSize = 15.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("$dates · #${order.orderNumber}", fontSize = 13.sp, color = DS.Colors.TextMuted, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            StatusBadge(order.status)
        }
        HorizontalDivider(color = DS.Colors.Divider)
    }
}

private fun dayOf(iso: String?): String? = iso?.let { runCatching { formatDayShort(Instant.parse(it)) }.getOrNull() }
