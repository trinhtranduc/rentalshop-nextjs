package com.anyrent.pos.domain.widget

import com.anyrent.pos.domain.error.AppError
import com.anyrent.pos.domain.orders.TodayWork
import java.time.Instant
import java.util.concurrent.atomic.AtomicLong

/** Where the widget's file lives */
interface TodayWidgetFile {
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
    private val now: () -> Instant = Instant::now,
) {
    enum class Outcome { WRITTEN, NO_ACCESS, KEPT, SIGNED_OUT, DROPPED }

    /** Bumped at sign-out */
    private val generation = AtomicLong()

    suspend fun refresh(): Outcome {
        val user = userId() ?: run {
            file.clear()
            return Outcome.SIGNED_OUT
        }
        val asked = generation.get()
        val answer = load()
        if (asked != generation.get() || userId() != user) return Outcome.DROPPED
        answer.getOrNull()?.let { work ->
            file.write(TodayWidgetData.snapshot(work, user, outletId(), now()))
            return Outcome.WRITTEN
        }
        val error = answer.exceptionOrNull()
        if (error is AppError.Http && error.statusCode == 403) {
            file.write(TodayWidgetSnapshot.noAccess(user, outletId(), now()))
            return Outcome.NO_ACCESS
        }
        return Outcome.KEPT
    }

    /** Logout, a kicked session, a switch of account: the shop's data leaves the widget at once */
    fun signedOut() {
        generation.incrementAndGet()
        file.clear()
    }
}
