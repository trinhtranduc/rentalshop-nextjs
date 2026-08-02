package com.anyrent.pos.ui.inbox

import androidx.compose.foundation.clickable
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.filled.DoneAll
import androidx.compose.material.icons.filled.DeleteSweep
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.model.InboxNotification
import com.anyrent.pos.ui.common.EmptyOrError
import com.anyrent.pos.ui.common.LoadingBox
import com.anyrent.pos.ui.common.AppCard
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun InboxScreen(
    onBack: () -> Unit,
    onOpenOrder: (Int) -> Unit,
) {
    var items by remember { mutableStateOf<List<InboxNotification>>(emptyList()) }
    var page by remember { mutableIntStateOf(1) }
    var hasMore by remember { mutableStateOf(true) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()

    fun load(reset: Boolean = false) {
        scope.launch {
            if (reset) {
                page = 1
                hasMore = true
                items = emptyList()
            }
            loading = true
            error = null
            val result = withContext(Dispatchers.IO) {
                ApiClient.get().getNotifications(page)
            }
            loading = false
            result.onSuccess { data ->
                items = if (reset) data.items else items + data.items
                hasMore = data.hasMore
                page += 1
            }.onFailure {
                error = it.message
            }
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

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.notifications)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
                actions = {
                    IconButton(
                        onClick = {
                            scope.launch {
                                withContext(Dispatchers.IO) { ApiClient.get().markAllNotificationsRead() }
                                load(reset = true)
                            }
                        },
                    ) {
                        Icon(
                            Icons.Default.DoneAll,
                            contentDescription = stringResource(R.string.mark_all_read),
                            tint = MaterialTheme.colorScheme.primary,
                        )
                    }
                    IconButton(
                        onClick = {
                            scope.launch {
                                withContext(Dispatchers.IO) {
                                    com.anyrent.pos.data.ApiParity.deleteAllReadNotifications()
                                }
                                load(reset = true)
                            }
                        },
                    ) {
                        Icon(
                            Icons.Default.DeleteSweep,
                            contentDescription = stringResource(R.string.clear_read),
                            tint = MaterialTheme.colorScheme.error,
                        )
                    }
                },
            )
        }
    ) { padding ->
        when {
            loading && items.isEmpty() -> LoadingBox()
            error != null && items.isEmpty() -> EmptyOrError(error!!)
            items.isEmpty() -> EmptyOrError(stringResource(R.string.empty_notifications))
            else -> LazyColumn(
                state = listState,
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(items, key = { it.id }) { item ->
                    AppCard(
                        modifier = Modifier
                            .fillMaxWidth()
                            .combinedClickable(
                                onClick = {
                                    scope.launch {
                                        withContext(Dispatchers.IO) {
                                            ApiClient.get().markNotificationRead(item.id)
                                        }
                                        item.orderId?.let(onOpenOrder)
                                    }
                                },
                                onLongClick = {
                                    scope.launch {
                                        withContext(Dispatchers.IO) {
                                            com.anyrent.pos.data.ApiParity.deleteNotification(item.id)
                                        }
                                        load(reset = true)
                                    }
                                },
                            ),
                    ) {
                        Row(
                            Modifier.fillMaxWidth().padding(14.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.Top,
                        ) {
                            androidx.compose.foundation.layout.Box(
                                Modifier
                                    .size(44.dp)
                                    .background(
                                        notificationAccent(item.type).copy(alpha = 0.12f),
                                        CircleShape,
                                    ),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(
                                    notificationIcon(item.type),
                                    contentDescription = null,
                                    tint = notificationAccent(item.type),
                                )
                            }
                            Column(
                                Modifier.weight(1f),
                                verticalArrangement = Arrangement.spacedBy(4.dp),
                            ) {
                                Text(
                                    item.title,
                                    style = MaterialTheme.typography.bodyLarge,
                                    fontWeight = if (item.isRead) FontWeight.Normal else FontWeight.SemiBold,
                                )
                                Text(
                                    item.body,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 3,
                                )
                                item.createdAt?.let {
                                    Text(
                                        formatNotificationTime(it),
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.outline,
                                    )
                                }
                            }
                            if (!item.isRead) {
                                androidx.compose.foundation.layout.Box(
                                    Modifier
                                        .padding(top = 5.dp)
                                        .size(9.dp)
                                        .background(MaterialTheme.colorScheme.primary, CircleShape),
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun notificationIcon(type: String) = when {
    type.contains("ORDER", ignoreCase = true) -> Icons.AutoMirrored.Filled.ReceiptLong
    type.contains("PAYMENT", ignoreCase = true) -> Icons.Default.Payments
    type.contains("PRODUCT", ignoreCase = true) ||
        type.contains("STOCK", ignoreCase = true) -> Icons.Default.Inventory2
    else -> Icons.Default.Notifications
}

private fun notificationAccent(type: String): Color = when {
    type.contains("PAYMENT", ignoreCase = true) -> Color(0xFF23844A)
    type.contains("PRODUCT", ignoreCase = true) ||
        type.contains("STOCK", ignoreCase = true) -> Color(0xFFE88A19)
    else -> Color(0xFF2454F4)
}

private val notificationTimeFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")

private fun formatNotificationTime(value: String): String = runCatching {
    OffsetDateTime.parse(value).format(notificationTimeFormatter)
}.getOrDefault(value.replace("T", " ").take(16))
