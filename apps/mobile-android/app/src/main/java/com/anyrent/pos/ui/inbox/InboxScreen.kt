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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.model.InboxNotification
import com.anyrent.pos.ui.common.EmptyOrError
import com.anyrent.pos.ui.common.LoadingBox
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

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
                    TextButton(onClick = {
                        scope.launch {
                            withContext(Dispatchers.IO) { ApiClient.get().markAllNotificationsRead() }
                            load(reset = true)
                        }
                    }) { Text(stringResource(R.string.mark_all_read)) }
                    TextButton(onClick = {
                        scope.launch {
                            withContext(Dispatchers.IO) { com.anyrent.pos.data.ApiParity.deleteAllReadNotifications() }
                            load(reset = true)
                        }
                    }) { Text("Clear read") }
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
                    Column(
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
                            )
                            .padding(8.dp)
                    ) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(
                                item.title,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = if (item.isRead) FontWeight.Normal else FontWeight.Bold,
                            )
                            if (!item.isRead) {
                                Text("•", color = MaterialTheme.colorScheme.primary)
                            }
                        }
                        Text(item.body, style = MaterialTheme.typography.bodyMedium)
                        item.createdAt?.let {
                            Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
    }
}
