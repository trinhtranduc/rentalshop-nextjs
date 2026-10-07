package com.anyrent.pos.ui.inbox

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ReceiptLong
import androidx.compose.material.icons.automirrored.outlined.Undo
import androidx.compose.material.icons.outlined.DeleteSweep
import androidx.compose.material.icons.outlined.DoneAll
import androidx.compose.material.icons.outlined.LocalShipping
import androidx.compose.material.icons.outlined.MoreHoriz
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Payments
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.ApiParity
import com.anyrent.pos.data.model.InboxNotification
import com.anyrent.pos.domain.notifications.DayWord
import com.anyrent.pos.domain.notifications.NotificationDayGroup
import com.anyrent.pos.domain.notifications.NotificationKind
import com.anyrent.pos.domain.notifications.NotificationsLogic
import com.anyrent.pos.ui.common.AppAlertConfirm
import com.anyrent.pos.ui.common.AppIcon
import com.anyrent.pos.ui.common.AppMenuAction
import com.anyrent.pos.ui.common.AppOverflowMenu
import com.anyrent.pos.ui.common.formatDayShort
import com.anyrent.pos.ui.settings.v2.SettingsDetailPage
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.ZoneId

/**
 * Inbox of the new UI (#477, board TB-thong-bao), shown when `newProducts` is on: day groups on Vietnam days,
 * type tiles, "Tất cả" / "Chưa đọc · N" chips. Same calls and paging as [InboxScreen].
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun InboxV2Screen(
    onBack: () -> Unit,
    onOpenOrder: (Int) -> Unit,
) {
    var items by remember { mutableStateOf<List<InboxNotification>>(emptyList()) }
    var page by remember { mutableIntStateOf(1) }
    var hasMore by remember { mutableStateOf(true) }
    var loading by remember { mutableStateOf(true) }
    var refreshing by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var unreadOnly by remember { mutableStateOf(false) }
    var unreadCount by remember { mutableIntStateOf(0) }
    var menuOpen by remember { mutableStateOf(false) }
    var confirmDeleteRead by remember { mutableStateOf(false) }
    // Bumped by a reset: a page that lands after a newer reset is dropped
    var generation by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()

    fun load(reset: Boolean = false, fromPull: Boolean = false) {
        if (reset) {
            generation += 1
            page = 1
            hasMore = true
            if (!fromPull) items = emptyList()
        }
        val run = generation
        val wanted = page
        val filter = if (unreadOnly) false else null
        scope.launch {
            loading = true
            refreshing = fromPull
            error = null
            val result = withContext(Dispatchers.IO) { ApiClient.get().getNotifications(wanted, isRead = filter) }
            if (run != generation) return@launch
            loading = false
            refreshing = false
            result.onSuccess { data ->
                items = if (wanted == 1) data.items else items + data.items
                hasMore = data.hasMore
                page = wanted + 1
                data.unreadCount?.let { unreadCount = it }
            }.onFailure { error = it.message }
        }
    }

    LaunchedEffect(Unit) { load(reset = true) }

    LaunchedEffect(listState, hasMore, loading) {
        snapshotFlow {
            val info = listState.layoutInfo
            val last = info.visibleItemsInfo.lastOrNull()?.index ?: 0
            last >= info.totalItemsCount - 2
        }.distinctUntilChanged().collect { nearEnd ->
            if (nearEnd && hasMore && !loading) load()
        }
    }

    SettingsDetailPage(
        title = stringResource(R.string.notifications),
        onBack = onBack,
        actions = {
            TextButton(
                onClick = {
                    scope.launch {
                        withContext(Dispatchers.IO) { ApiClient.get().markAllNotificationsRead() }
                        load(reset = true)
                    }
                },
                enabled = unreadCount > 0,
                modifier = Modifier.height(40.dp),
            ) {
                AppIcon(Icons.Outlined.DoneAll, contentDescription = null, size = DS.Icon.Sm, tint = if (unreadCount > 0) DS.Colors.Primary else DS.Colors.Primary.copy(alpha = 0.4f))
                Text(
                    " " + stringResource(R.string.notifications_v2_mark_all),
                    fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold,
                    color = if (unreadCount > 0) DS.Colors.Primary else DS.Colors.Primary.copy(alpha = 0.4f),
                )
            }
            Box {
                IconButton(onClick = { menuOpen = true }) {
                    AppIcon(Icons.Outlined.MoreHoriz, contentDescription = stringResource(R.string.notifications_v2_more), size = DS.Icon.Md, tint = DS.Colors.Text)
                }
                AppOverflowMenu(
                    expanded = menuOpen,
                    onDismiss = { menuOpen = false },
                    actions = listOf(
                        AppMenuAction(stringResource(R.string.notifications_v2_delete_read), Icons.Outlined.DeleteSweep, { confirmDeleteRead = true }, destructive = true),
                    ),
                )
            }
        },
    ) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            FilterChipV2(stringResource(R.string.notifications_v2_all), selected = !unreadOnly) {
                if (unreadOnly) { unreadOnly = false; load(reset = true) }
            }
            FilterChipV2(stringResource(R.string.notifications_v2_unread, unreadCount), selected = unreadOnly) {
                if (!unreadOnly) { unreadOnly = true; load(reset = true) }
            }
        }
        HorizontalDivider(color = DS.Colors.Divider, thickness = 1.dp)

        PullToRefreshBox(
            isRefreshing = refreshing,
            onRefresh = { load(reset = true, fromPull = true) },
            modifier = Modifier.fillMaxWidth().weight(1f),
        ) {
            when {
                loading && items.isEmpty() && !refreshing -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = DS.Colors.Primary)
                }
                items.isEmpty() -> EmptyInbox(
                    error ?: stringResource(if (unreadOnly) R.string.notifications_v2_empty_unread else R.string.empty_notifications),
                )
                else -> {
                    val groups = NotificationsLogic.groups(items)
                    LazyColumn(state = listState, modifier = Modifier.fillMaxSize()) {
                        groups.forEach { group ->
                            item(key = "day-${group.key}") { DayHeader(group) }
                            items(group.items, key = { it.id }) { item ->
                                NotificationRowV2(
                                    item = item,
                                    onClick = {
                                        if (!item.isRead) {
                                            // Optimistic, as on iOS; the server call follows
                                            items = items.map { if (it.id == item.id) it.copy(isRead = true) else it }
                                            if (unreadCount > 0) unreadCount -= 1
                                        }
                                        scope.launch {
                                            if (!item.isRead) {
                                                withContext(Dispatchers.IO) { ApiClient.get().markNotificationRead(item.id) }
                                            }
                                            item.orderId?.let(onOpenOrder)
                                        }
                                    },
                                    onLongClick = {
                                        scope.launch {
                                            withContext(Dispatchers.IO) { ApiParity.deleteNotification(item.id) }
                                            load(reset = true)
                                        }
                                    },
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    if (confirmDeleteRead) {
        AppAlertConfirm(
            title = stringResource(R.string.notifications_v2_delete_read),
            message = stringResource(R.string.notifications_v2_delete_read_confirm),
            confirmLabel = stringResource(R.string.delete),
            destructive = true,
            onConfirm = {
                confirmDeleteRead = false
                scope.launch {
                    withContext(Dispatchers.IO) { ApiParity.deleteAllReadNotifications() }
                    load(reset = true)
                }
            },
            onDismiss = { confirmDeleteRead = false },
        )
    }
}

@Composable
private fun FilterChipV2(text: String, selected: Boolean, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(999.dp),
        color = if (selected) DS.Colors.Text else Color.White,
        border = if (selected) null else BorderStroke(1.dp, Color(0xFFE2E8F0)),
        modifier = Modifier.heightIn(min = 34.dp).semantics { this.selected = selected; role = Role.Tab },
    ) {
        Box(Modifier.padding(horizontal = 12.dp, vertical = 7.dp), contentAlignment = Alignment.Center) {
            Text(
                text, fontSize = DS.TextSize.Secondary,
                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                color = if (selected) Color.White else DS.Colors.Text,
            )
        }
    }
}

@Composable
private fun DayHeader(group: NotificationDayGroup) {
    val label = group.day?.let {
        formatDayShort(it.atTime(12, 0).atZone(NotificationsLogic.zone).toInstant(), NotificationsLogic.zone)
    }.orEmpty()
    val word = when (group.word) {
        DayWord.TODAY -> stringResource(R.string.notifications_v2_today) + " · "
        DayWord.YESTERDAY -> stringResource(R.string.notifications_v2_yesterday) + " · "
        DayWord.NONE -> ""
    }
    Column(Modifier.fillMaxWidth().background(Color(0xFFF8FAFC))) {
        Text(
            (word + label).uppercase(),
            fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Bold, color = Color(0xFF334155), letterSpacing = 0.3.sp,
            modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 10.dp, bottom = 6.dp).semantics { heading() },
        )
        HorizontalDivider(color = DS.Colors.Divider, thickness = 1.dp)
    }
}

internal fun notificationIcon(kind: NotificationKind): ImageVector = when (kind) {
    NotificationKind.ORDER -> Icons.AutoMirrored.Outlined.ReceiptLong
    NotificationKind.HAND_OVER -> Icons.Outlined.LocalShipping
    NotificationKind.LATE -> Icons.Outlined.Schedule
    NotificationKind.RETURNED -> Icons.AutoMirrored.Outlined.Undo
    NotificationKind.PAYMENT -> Icons.Outlined.Payments
    NotificationKind.NEUTRAL -> Icons.Outlined.Notifications
}

internal fun notificationColors(kind: NotificationKind): DS.Pill = when (kind) {
    NotificationKind.ORDER, NotificationKind.HAND_OVER -> DS.Status.HandOver
    NotificationKind.LATE -> DS.Status.Late
    NotificationKind.RETURNED -> DS.Status.Return
    NotificationKind.PAYMENT -> DS.Status.Done
    NotificationKind.NEUTRAL -> DS.Status.Cancelled
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun NotificationRowV2(item: InboxNotification, onClick: () -> Unit, onLongClick: () -> Unit) {
    val kind = NotificationsLogic.kind(item.type, item.status)
    val colors = notificationColors(kind)
    val style = NotificationsLogic.rowStyle(item.isRead)
    val unreadLabel = stringResource(R.string.notifications_v2_unread_a11y)
    Column(
        Modifier
            .fillMaxWidth()
            .background(Color(style.backgroundArgb))
            .combinedClickable(onClick = onClick, onLongClick = onLongClick)
            .semantics(mergeDescendants = true) { if (!item.isRead) stateDescription = unreadLabel },
    ) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.Top,
        ) {
            Box(
                Modifier.size(40.dp).background(colors.fill, RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(notificationIcon(kind), contentDescription = null, tint = colors.text, modifier = Modifier.size(DS.Icon.Md))
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                // #482: title and body wrap in full (no line limit, no ellipsis); Compose breaks a word longer than
                // the line, so a long unbroken word wraps too
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.Top) {
                    Text(
                        item.title,
                        fontSize = 16.sp,
                        lineHeight = 22.sp,
                        fontWeight = if (style.titleBold) FontWeight.Bold else FontWeight.Medium,
                        color = Color(style.titleArgb),
                        modifier = Modifier.weight(1f),
                    )
                    Text(NotificationsLogic.time(item.createdAt), fontSize = DS.TextSize.Secondary, color = Color(0xFF64748B))
                }
                Text(
                    item.body, fontSize = DS.TextSize.Body, lineHeight = 21.sp, color = DS.Colors.TextMuted,
                )
            }
            Box(
                Modifier.padding(top = 7.dp).size(9.dp)
                    .background(if (style.showsDot) DS.Colors.Primary else Color.Transparent, CircleShape),
            )
        }
        HorizontalDivider(color = DS.Colors.Divider, thickness = 1.dp)
    }
}

@Composable
private fun EmptyInbox(message: String) {
    Column(
        Modifier.fillMaxSize().padding(32.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            Modifier.size(56.dp).background(DS.Status.Cancelled.fill, RoundedCornerShape(16.dp)),
            contentAlignment = Alignment.Center,
        ) {
            AppIcon(Icons.Outlined.Notifications, contentDescription = null, size = DS.Icon.Lg, tint = DS.Status.Cancelled.text)
        }
        Text(
            message, fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted, textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 12.dp).semantics { contentDescription = message },
        )
    }
}
