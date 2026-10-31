package com.anyrent.pos.domain.widget

import com.anyrent.pos.domain.error.AppError
import com.anyrent.pos.domain.orders.TodayWork
import java.time.Instant
import java.util.concurrent.atomic.AtomicLong

/** Where the widget's file lives */
interface TodayWidgetFile {
    fun read(): TodayWidgetSnapshot?
    fun write(snapshot: TodayWidgetSnapshot)
    fun clear()
}

/**
 * The one refresh of the widget's file, for the app and the worker (iOS `TodayWidgetSync`). It holds no credential:
 * [load] goes through the app's normal client and session. Signed out it calls no network. A network or server error
 * keeps the last file (the Vietnam-day rule turns it into "Cũ"); an answer from before a sign-out is dropped.
 */
class TodayWidgetRefresher(
    private val load: suspend () -> Result<TodayWork>,
    private val file: TodayWidgetFile,
    /** Who is signed in now; null when nobody is */
    private val userId: () -> Int?,
    private val outletId: () -> Int,
    private val hideNames: () -> Boolean,
    private val now: () -> Instant = Instant::now,
) {
    enum class Outcome { WRITTEN, NO_ACCESS, KEPT, SIGNED_OUT, DROPPED }

    /** Bumped at sign-out */
    private val generation = AtomicLong()

    @Volatile private var lastWork: TodayWork? = null
    @Volatile private var lastUserId: Int? = null

    suspend fun refresh(): Outcome {
        val user = userId() ?: run {
            file.clear()
            return Outcome.SIGNED_OUT
        }
        val asked = generation.get()
        val answer = load()
        if (asked != generation.get() || userId() != user) return Outcome.DROPPED
        answer.getOrNull()?.let { work ->
            lastWork = work
            lastUserId = user
            file.write(TodayWidgetData.snapshot(work, user, outletId(), hideNames(), now()))
            return Outcome.WRITTEN
        }
        val error = answer.exceptionOrNull()
        if (error is AppError.Http && error.statusCode == 403) {
            lastWork = null
            file.write(TodayWidgetSnapshot.noAccess(user, outletId(), now()))
            return Outcome.NO_ACCESS
        }
        return Outcome.KEPT
    }

    /** Logout, a kicked session, a switch of account: the shop's data leaves the widget at once */
    fun signedOut() {
        generation.incrementAndGet()
        lastWork = null
        lastUserId = null
        file.clear()
    }

    /**
     * The owner flipped "Ẩn tên khách trên widget". True when the file is rewritten from the last answer; false when
     * the caller must ask the API again (names can only come back from an answer; hiding them never waits for one).
     */
    fun hideNamesChanged(): Boolean {
        val user = userId()
        val work = lastWork
        if (user != null && work != null && lastUserId == user) {
            file.write(TodayWidgetData.snapshot(work, user, outletId(), hideNames(), now()))
            return true
        }
        if (hideNames()) file.read()?.let { file.write(it.withoutNames()) }
        return false
    }
}
