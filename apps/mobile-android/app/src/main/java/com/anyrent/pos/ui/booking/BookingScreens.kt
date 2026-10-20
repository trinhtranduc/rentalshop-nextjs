package com.anyrent.pos.ui.booking

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.CartStore
import com.anyrent.pos.data.FeatureFlags
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.data.model.Product
import com.anyrent.pos.domain.appconfig.MobileFeature
import com.anyrent.pos.domain.booking.BookingLogic
import com.anyrent.pos.domain.booking.BookingRejectReason
import com.anyrent.pos.domain.booking.BookingRequest
import com.anyrent.pos.domain.booking.BookingRequestItem
import com.anyrent.pos.domain.booking.BookingStatus
import com.anyrent.pos.ui.navigation.OrdersChanged
import com.anyrent.pos.ui.settings.v2.SettingsDetailPage
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** #1124 red count inside the "Đặt online" chip (iOS `bookingBadge`) */
private val BadgeRed = Color(0xFFDC2626)
private val ChipBorder = Color(0xFFCBD5E1)

private fun statusLabel(status: BookingStatus): Int = when (status) {
    BookingStatus.PENDING -> R.string.booking_status_pending
    BookingStatus.CONFIRMED -> R.string.booking_status_confirmed
    BookingStatus.REJECTED -> R.string.booking_status_rejected
    BookingStatus.EXPIRED -> R.string.booking_status_expired
    BookingStatus.CANCELLED -> R.string.booking_status_cancelled
    BookingStatus.UNKNOWN -> R.string.booking_status_unknown
}

private fun statusPill(status: BookingStatus): DS.Pill = when (status) {
    BookingStatus.PENDING -> DS.Status.Waiting
    BookingStatus.CONFIRMED -> DS.Status.Done
    BookingStatus.REJECTED -> DS.Status.Late
    else -> DS.Status.Cancelled
}

private fun reasonLabel(reason: BookingRejectReason): Int = when (reason) {
    BookingRejectReason.OUT_OF_STOCK -> R.string.booking_reject_out_of_stock
    BookingRejectReason.CANNOT_CONTACT -> R.string.booking_reject_cannot_contact
    BookingRejectReason.OTHER -> R.string.booking_reject_other
}

/**
 * #1124 "Đặt online" beside the Orders title, with the red count of requests waiting. Hidden unless the feature is
 * on, the user may see bookings (a session from before #1124: by role) and the shop takes online bookings (profile
 * `onlineBookingEnabled`). Re-reads when an order changes (a booking confirmed or rejected).
 */
@Composable
fun BookingChip(onClick: () -> Unit) {
    var available by remember { mutableStateOf(false) }
    var count by remember { mutableIntStateOf(0) }
    val features by FeatureFlags.enabled.collectAsState()
    val ordersVersion by OrdersChanged.version.collectAsState()
    LaunchedEffect(features, ordersVersion) {
        val featureOn = MobileFeature.ONLINE_BOOKING in features
        if (!BookingLogic.isAvailable(featureOn, true, SessionStore.permissions, SessionStore.role)) {
            available = false
            return@LaunchedEffect
        }
        val enabled = withContext(Dispatchers.IO) { ApiClient.get().onlineBookingEnabled() }.getOrNull() ?: return@LaunchedEffect
        available = BookingLogic.isAvailable(featureOn, enabled, SessionStore.permissions, SessionStore.role)
        if (!available) return@LaunchedEffect
        withContext(Dispatchers.IO) { ApiClient.get().bookingRequests(BookingStatus.PENDING, limit = 1) }
            .onSuccess { count = it.pendingCount }
    }
    if (!available) return
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(10.dp),
        color = DS.Colors.Surface,
        border = BorderStroke(1.dp, ChipBorder),
        modifier = Modifier.height(40.dp).testTag("orders.booking"),
    ) {
        Row(Modifier.padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(R.string.booking_chip), fontSize = DS.TextSize.Body, fontWeight = FontWeight.Bold, color = DS.Colors.Text)
            if (count > 0) {
                Spacer(Modifier.width(8.dp))
                Box(
                    Modifier.heightIn(min = 18.dp).widthIn(min = 18.dp)
                        .background(BadgeRed, RoundedCornerShape(9.dp))
                        .padding(horizontal = 6.dp, vertical = 1.dp)
                        .testTag("orders.booking.count"),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(BookingLogic.badgeText(count), fontSize = DS.TextSize.Pill, fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
        }
    }
    Spacer(Modifier.width(8.dp))
}

@Composable
private fun StatusPill(status: BookingStatus) {
    val pill = statusPill(status)
    Text(
        stringResource(statusLabel(status)),
        fontSize = DS.TextSize.Pill,
        fontWeight = FontWeight.Bold,
        color = pill.text,
        maxLines = 1,
        modifier = Modifier.background(pill.fill, RoundedCornerShape(6.dp)).padding(horizontal = 8.dp, vertical = 3.dp),
    )
}

/** #1124 the shop's online booking requests: tabs per status with counts, newest first (iOS `BookingRequestsViewController`) */
@Composable
fun BookingRequestsScreen(onBack: () -> Unit, onOpenRequest: (Int) -> Unit) {
    var status by remember { mutableStateOf(BookingStatus.PENDING) }
    var rows by remember { mutableStateOf<List<BookingRequest>?>(null) }
    var counts by remember { mutableStateOf<Map<String, Int>>(emptyMap()) }
    var error by remember { mutableStateOf<String?>(null) }
    var attempt by remember { mutableIntStateOf(0) }
    val ordersVersion by OrdersChanged.version.collectAsState()
    LaunchedEffect(status, attempt, ordersVersion) {
        withContext(Dispatchers.IO) { ApiClient.get().bookingRequests(status) }
            .onSuccess {
                rows = it.requests
                counts = it.counts
                error = null
            }
            .onFailure { if (rows == null) error = it.message.orEmpty() }
    }

    SettingsDetailPage(title = stringResource(R.string.booking_title), onBack = onBack) {
        Row(
            Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            BookingStatus.tabs.forEach { tab ->
                val selected = tab == status
                val count = counts[tab.apiValue] ?: 0
                Surface(
                    onClick = {
                        if (tab != status) {
                            status = tab
                            rows = null
                        }
                    },
                    shape = RoundedCornerShape(18.dp),
                    color = if (selected) DS.Colors.Text else DS.Colors.Surface,
                    border = if (selected) null else BorderStroke(1.dp, DS.Colors.Border),
                    modifier = Modifier.height(36.dp).testTag("booking.tab.${tab.apiValue}"),
                ) {
                    Box(Modifier.padding(horizontal = 12.dp), contentAlignment = Alignment.Center) {
                        Text(
                            stringResource(statusLabel(tab)) + if (count > 0) " $count" else "",
                            fontSize = DS.TextSize.Secondary,
                            fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                            color = if (selected) Color.White else DS.Colors.Text,
                        )
                    }
                }
            }
        }
        val current = rows
        val failure = error
        when {
            current == null && failure != null -> Column(Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(failure.ifBlank { stringResource(R.string.booking_load_failed) }, fontSize = DS.TextSize.Body,
                    color = DS.Colors.TextMuted, textAlign = TextAlign.Center)
                TextButton(onClick = { attempt++ }) { Text(stringResource(R.string.retry)) }
            }
            current == null -> Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            current.isEmpty() -> Text(
                stringResource(R.string.booking_empty),
                fontSize = DS.TextSize.Body,
                color = DS.Colors.TextMuted,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(top = 48.dp, start = 32.dp, end = 32.dp),
            )
            else -> LazyColumn(Modifier.fillMaxSize().testTag("booking.list")) {
                items(current, key = { it.id }) { row -> BookingRow(row) { onOpenRequest(row.id) } }
            }
        }
    }
}

@Composable
private fun BookingRow(row: BookingRequest, onClick: () -> Unit) {
    val closed = row.status == BookingStatus.EXPIRED || row.status == BookingStatus.REJECTED || row.status == BookingStatus.CANCELLED
    Column(Modifier.fillMaxWidth().clickable(onClick = onClick).testTag("booking.row")) {
        Column(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp).alpha(if (closed) 0.6f else 1f),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(row.customerName, fontSize = DS.TextSize.Name, fontWeight = FontWeight.Medium, color = DS.Colors.Text,
                    maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                StatusPill(row.status)
            }
            val info = listOfNotNull(
                row.code,
                stringResource(R.string.booking_items, row.itemCount),
                row.outlet?.name,
                BookingLogic.dateRange(row.pickupDate, row.returnDate),
            ).joinToString(" · ")
            Text(info, fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted, maxLines = 2)
            val expires = row.expiresAt
            if (row.status == BookingStatus.PENDING && expires != null) {
                Text(stringResource(R.string.booking_hours_left, BookingLogic.hoursLeft(expires)), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
            }
        }
        HorizontalDivider(color = DS.Colors.Border, thickness = 1.dp)
    }
}

/**
 * #1124 one request: customer (tap to call), returning-customer hint, branch, days, items with what is free, note.
 * "Xác nhận" opens a new cart filled from the request (the order is created there with `bookingRequestId`); "Từ chối"
 * asks a reason (iOS `BookingRequestDetailViewController`).
 */
@Composable
fun BookingRequestDetailScreen(requestId: Int, onBack: () -> Unit, onOpenCart: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var request by remember { mutableStateOf<BookingRequest?>(null) }
    var loadError by remember { mutableStateOf<String?>(null) }
    var alert by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var attempt by remember { mutableIntStateOf(0) }
    var askReason by remember { mutableStateOf(false) }
    val limitText = stringResource(R.string.v2_cart_multi_limit)
    LaunchedEffect(requestId, attempt) {
        withContext(Dispatchers.IO) { ApiClient.get().bookingRequest(requestId) }
            .onSuccess {
                request = it
                loadError = null
            }
            .onFailure { if (request == null) loadError = it.message.orEmpty() }
    }

    fun reject(reason: BookingRejectReason, note: String?) {
        busy = true
        scope.launch {
            withContext(Dispatchers.IO) { ApiClient.get().rejectBookingRequest(requestId, reason, note) }
                .onFailure { alert = it.message.orEmpty() }
            busy = false
            OrdersChanged.notifyChanged()
            attempt++
        }
    }

    /** prepare → the products' prices → a new cart beside any draft → the cart screen */
    fun confirm() {
        busy = true
        scope.launch {
            val prepare = withContext(Dispatchers.IO) { ApiClient.get().prepareBookingRequest(requestId) }
                .getOrElse {
                    busy = false
                    alert = it.message.orEmpty()
                    attempt++
                    return@launch
                }
            val products: Map<Int, Product> = withContext(Dispatchers.IO) {
                prepare.items.map { it.productId }.distinct()
                    .mapNotNull { id -> ApiClient.get().getProduct(id).getOrNull()?.let { id to it } }
                    .toMap()
            }
            busy = false
            if (!CartStore.startBookingCart(prepare, products)) {
                alert = limitText
                return@launch
            }
            onOpenCart()
        }
    }

    val current = request
    val canAct = current?.status == BookingStatus.PENDING && BookingLogic.canManage(SessionStore.permissions, SessionStore.role)
    val actions: (@Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit)? = if (!canAct) null else {
        {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedButton(
                    onClick = { askReason = true },
                    enabled = !busy,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.weight(1f).height(48.dp).testTag("booking.reject"),
                ) {
                    Text(stringResource(R.string.booking_action_reject), fontSize = DS.TextSize.Input, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text)
                }
                Button(
                    onClick = { confirm() },
                    enabled = !busy,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = DS.Colors.Primary),
                    modifier = Modifier.weight(1f).height(48.dp).testTag("booking.confirm"),
                ) {
                    if (busy) CircularProgressIndicator(Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                    else Text(stringResource(R.string.booking_action_confirm), fontSize = DS.TextSize.Input, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
    SettingsDetailPage(title = stringResource(R.string.booking_detail_title), onBack = onBack, bottomBar = actions) {
        val failure = loadError
        when {
            current != null -> DetailContent(current) {
                val digits = current.customerPhone.filter { it.isDigit() || it == '+' }
                if (digits.isNotEmpty()) runCatching { context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$digits"))) }
            }
            failure != null -> Column(Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(failure.ifBlank { stringResource(R.string.booking_load_failed) }, fontSize = DS.TextSize.Body,
                    color = DS.Colors.TextMuted, textAlign = TextAlign.Center)
                TextButton(onClick = { attempt++ }) { Text(stringResource(R.string.retry)) }
            }
            else -> Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        }
    }

    alert?.let { message ->
        AlertDialog(
            onDismissRequest = { alert = null },
            text = { Text(message) },
            confirmButton = { TextButton(onClick = { alert = null }) { Text(stringResource(R.string.ok)) } },
        )
    }

    if (askReason) {
        RejectSheet(
            onDismiss = { askReason = false },
            onSend = { reason, note ->
                askReason = false
                reject(reason, note)
            },
        )
    }
}

/**
 * #1137 "Từ chối đơn online" as a bottom sheet (iOS `BookingRejectSheetViewController`): title, a line saying the
 * customer sees the reason, one row per reason (tap picks it), a note for the customer (needed for "Khác"), "Từ chối".
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RejectSheet(onDismiss: () -> Unit, onSend: (BookingRejectReason, String?) -> Unit) {
    var selected by remember { mutableStateOf<BookingRejectReason?>(null) }
    var note by remember { mutableStateOf("") }
    val ready = selected != null && (selected != BookingRejectReason.OTHER || note.isNotBlank())
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
        containerColor = DS.Colors.Surface,
    ) {
        Column(
            Modifier.fillMaxWidth().navigationBarsPadding().imePadding().verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp).padding(bottom = 24.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(stringResource(R.string.booking_reject_sheet_title), fontSize = 20.sp, fontWeight = FontWeight.Bold,
                    color = DS.Colors.Text, modifier = Modifier.weight(1f).testTag("booking.reject.sheet"))
                val closeLabel = stringResource(R.string.booking_cancel)
                Box(
                    Modifier.size(36.dp).clip(CircleShape).background(DS.Colors.Divider).clickable(onClickLabel = closeLabel, onClick = onDismiss),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Outlined.Close, contentDescription = closeLabel, tint = DS.Colors.TextMuted, modifier = Modifier.size(18.dp))
                }
            }
            Spacer(Modifier.height(12.dp))
            Text(stringResource(R.string.booking_reject_sheet_description), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
            Spacer(Modifier.height(16.dp))
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).border(1.dp, DS.Colors.Border, RoundedCornerShape(12.dp))) {
                BookingRejectReason.entries.forEachIndexed { index, reason ->
                    if (index > 0) HorizontalDivider(color = DS.Colors.Divider)
                    val on = reason == selected
                    Row(
                        Modifier.fillMaxWidth().height(52.dp)
                            .selectable(selected = on, onClick = { selected = reason })
                            .padding(horizontal = 16.dp)
                            .testTag("booking.reject.${reason.apiValue}"),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(stringResource(reasonLabel(reason)), fontSize = DS.TextSize.Body,
                            fontWeight = if (on) FontWeight.Bold else FontWeight.Normal, color = DS.Colors.Text, modifier = Modifier.weight(1f))
                        if (on) Icon(Icons.Outlined.Check, contentDescription = null, tint = DS.Colors.Primary, modifier = Modifier.size(20.dp))
                    }
                }
            }
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = note,
                onValueChange = { note = it },
                singleLine = true,
                placeholder = { Text(stringResource(R.string.booking_reject_note_placeholder)) },
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth().testTag("booking.reject.note"),
            )
            Spacer(Modifier.height(16.dp))
            Button(
                onClick = { selected?.let { onSend(it, note.trim().ifEmpty { null }) } },
                enabled = ready,
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626)),
                modifier = Modifier.fillMaxWidth().height(52.dp).testTag("booking.reject.send"),
            ) {
                Text(stringResource(R.string.booking_action_reject), fontSize = DS.TextSize.Input, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
private fun SectionHeader(text: String) {
    Text(
        text,
        fontSize = DS.TextSize.Pill,
        fontWeight = FontWeight.Bold,
        color = DS.Colors.TextMuted,
        modifier = Modifier.fillMaxWidth().background(DS.Colors.Background).padding(horizontal = 16.dp, vertical = 8.dp),
    )
}

@Composable
private fun KeyValue(key: String, value: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(key, fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted)
        Text(value, fontSize = DS.TextSize.Body, fontWeight = FontWeight.Medium, color = DS.Colors.Text,
            textAlign = TextAlign.End, modifier = Modifier.weight(1f))
    }
}

@Composable
private fun DetailContent(request: BookingRequest, onCall: () -> Unit) {
    val pending = request.status == BookingStatus.PENDING
    Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState())) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(request.code, fontSize = DS.TextSize.Name, fontWeight = FontWeight.Bold, color = DS.Colors.Text, modifier = Modifier.weight(1f))
                StatusPill(request.status)
            }
            val expires = request.expiresAt
            if (pending && expires != null) {
                Text(stringResource(R.string.booking_hours_left, BookingLogic.hoursLeft(expires)), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
            }
            val reason = BookingRejectReason.entries.firstOrNull { it.apiValue == request.rejectReason }
            if (request.status == BookingStatus.REJECTED && reason != null) {
                Text(
                    listOfNotNull(stringResource(reasonLabel(reason)), request.rejectNote?.takeIf { it.isNotBlank() }).joinToString(": "),
                    fontSize = DS.TextSize.Secondary,
                    color = DS.Colors.TextMuted,
                )
            }
        }
        SectionHeader(stringResource(R.string.booking_section_customer))
        Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(request.customerName, fontSize = DS.TextSize.Body, fontWeight = FontWeight.Medium, color = DS.Colors.Text)
            Text(
                "📞 " + request.customerPhone,
                fontSize = DS.TextSize.Body,
                fontWeight = FontWeight.Medium,
                color = DS.Colors.Primary,
                modifier = Modifier.clickable(onClick = onCall).padding(vertical = 4.dp).testTag("booking.call"),
            )
            val known = request.customer
            if (known != null) {
                Text(
                    stringResource(R.string.booking_returning_customer, known.fullName.ifBlank { request.customerName }),
                    fontSize = DS.TextSize.Secondary,
                    color = DS.Status.Done.text,
                    modifier = Modifier.testTag("booking.returning"),
                )
            } else {
                Text(stringResource(R.string.booking_new_customer), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
            }
        }
        SectionHeader(stringResource(R.string.booking_section_rental))
        Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            KeyValue(stringResource(R.string.booking_outlet), request.outlet?.name ?: "—")
            KeyValue(stringResource(R.string.booking_dates), BookingLogic.dateRange(request.pickupDate, request.returnDate))
        }
        SectionHeader(stringResource(R.string.booking_items, request.itemCount))
        Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            if (pending && BookingLogic.hasShortItem(request.items)) {
                Text(
                    stringResource(R.string.booking_short_warning),
                    fontSize = DS.TextSize.Secondary,
                    color = DS.Status.Late.text,
                    modifier = Modifier.fillMaxWidth().background(DS.Status.Late.fill, RoundedCornerShape(8.dp))
                        .padding(horizontal = 10.dp, vertical = 8.dp).testTag("booking.shortWarning"),
                )
            }
            request.items.forEach { ItemRow(it, pending) }
        }
        val note = request.note
        if (!note.isNullOrBlank()) {
            SectionHeader(stringResource(R.string.booking_section_note))
            Text(note, fontSize = DS.TextSize.Body, color = DS.Colors.Text, modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp))
        }
    }
}

@Composable
private fun ItemRow(item: BookingRequestItem, pending: Boolean) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text("${item.productName.ifBlank { "#${item.productId}" }} × ${item.quantity}", fontSize = DS.TextSize.Body, color = DS.Colors.Text)
        if (!pending) return@Column
        val short = item.shortDay
        if (short != null) {
            Text(stringResource(R.string.booking_item_short, BookingLogic.dayMonth(short)), fontSize = DS.TextSize.Secondary, color = DS.Status.Late.text)
        } else {
            Text(stringResource(R.string.booking_item_free), fontSize = DS.TextSize.Secondary, color = DS.Status.Done.text)
        }
    }
}
