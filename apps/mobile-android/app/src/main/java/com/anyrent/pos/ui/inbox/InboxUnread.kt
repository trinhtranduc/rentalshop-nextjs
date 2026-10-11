package com.anyrent.pos.ui.inbox

import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.domain.RefreshPolicy
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.withContext
import java.time.Instant

/**
 * #674: the unread badge of the products home (iOS: `.inboxUnreadCountDidChange`). The inbox sets the count it knows;
 * a push marks it stale. The server is asked on first show, after a push, for another account, or when 10 minutes old.
 */
object InboxUnread {
    private val _count = MutableStateFlow(0)
    val count: StateFlow<Int> = _count.asStateFlow()

    /** Bumped when a push arrives, so a home on screen asks the server again */
    private val _invalidations = MutableStateFlow(0L)
    val invalidations: StateFlow<Long> = _invalidations.asStateFlow()

    @Volatile private var fetchedAt: Instant? = null
    @Volatile private var fetchedFor: Int? = null

    fun set(value: Int, owner: Int? = SessionStore.userId, at: Instant = Instant.now()) {
        _count.value = value.coerceAtLeast(0)
        fetchedAt = at
        fetchedFor = owner
    }

    fun invalidate() {
        fetchedAt = null
        _invalidations.update { it + 1 }
    }

    fun needsFetch(owner: Int? = SessionStore.userId, now: Instant = Instant.now()): Boolean =
        owner != fetchedFor || RefreshPolicy.shouldReload(dirty = false, lastLoadedAt = fetchedAt, now = now, ttl = RefreshPolicy.SUMMARY_TTL)

    suspend fun refreshIfNeeded() {
        if (!needsFetch()) return
        withContext(Dispatchers.IO) { ApiClient.get().getUnreadCount() }.onSuccess { set(it) }
    }
}
