package com.anyrent.pos.ui.widget

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

/**
 * The widget's background refresh (#1381). No network constraint on purpose: with no network it still redraws, so a list
 * of yesterday turns "Cũ". Signed out it calls no network. It always succeeds: the next run is the retry.
 */
class TodayWidgetWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        TodayWidgetSync.refreshAndDraw(applicationContext)
        return Result.success()
    }
}
