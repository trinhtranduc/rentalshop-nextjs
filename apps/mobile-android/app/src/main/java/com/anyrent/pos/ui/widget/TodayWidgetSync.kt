package com.anyrent.pos.ui.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import androidx.glance.appwidget.updateAll
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.anyrent.pos.AnyRentApp
import com.anyrent.pos.data.CurrentOutlet
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.domain.orders.TodayWork
import com.anyrent.pos.domain.widget.TodayWidgetClock
import com.anyrent.pos.domain.widget.TodayWidgetRefresher
import com.anyrent.pos.ui.navigation.OrdersChanged
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.merge
import kotlinx.coroutines.launch
import java.time.Duration
import java.time.Instant
import java.util.concurrent.TimeUnit

/**
 * Keeps the widget up to date (#1381, iOS `TodayWidgetSync`). While the app is open: when it comes back, after sign-in,
 * when the branch or an order changes. In the background: [TodayWidgetWorker]. Both only use the app's normal client and
 * session in this process, with its one refresh lock; no credential goes into a work request, the file or the widget.
 * Nothing calls the network unless a widget is on the home screen.
 */
object TodayWidgetSync {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var appContext: Context? = null
    private var pending: Job? = null

    private val refresher = TodayWidgetRefresher(
        load = { loadWork() },
        file = TodayWidgetStore,
        userId = { signedInUser() },
        outletId = { CurrentOutlet.id ?: SessionStore.outletId ?: 0 },
        hideNames = { TodayWidgetStore.hideNames },
    )

    private suspend fun loadWork(): Result<TodayWork> =
        AnyRentApp.instance?.container?.todayWorkRepository?.load() ?: Result.failure(IllegalStateException("No app"))

    /** Who the widget belongs to now */
    fun signedInUser(): Int? = if (SessionStore.isReady && SessionStore.isLoggedIn) SessionStore.userId else null

    /** Once, from `AnyRentApp` */
    fun install(context: Context) {
        appContext = context.applicationContext
        TodayWidgetStore.init(context)
        scope.launch {
            merge(OrdersChanged.version.drop(1), CurrentOutlet.version.drop(1)).collect { refreshSoon() }
        }
    }

    fun hasWidget(context: Context): Boolean = widgetIds(context).isNotEmpty()

    private fun widgetIds(context: Context): IntArray =
        AppWidgetManager.getInstance(context).getAppWidgetIds(ComponentName(context, TodayWorkWidgetReceiver::class.java))

    /** A few changes in a row make one request (the app is open: no work request needed) */
    fun refreshSoon() {
        val context = appContext ?: return
        if (signedInUser() == null || !hasWidget(context)) return
        synchronized(this) {
            pending?.cancel()
            pending = scope.launch {
                delay(REFRESH_DELAY_MS)
                refreshAndDraw(context)
            }
        }
    }

    /** The refresh of the worker and of the app. Always redraws: past the Vietnam midnight that alone turns the list "Cũ". */
    suspend fun refreshAndDraw(context: Context): TodayWidgetRefresher.Outcome {
        val outcome = refresher.refresh()
        draw(context)
        if (hasWidget(context)) TodayWidgetSchedule.ensure(context)
        return outcome
    }

    private suspend fun draw(context: Context) {
        TodayWidgetStore.touch()
        runCatching { TodayWorkWidget().updateAll(context) }
    }

    /** "Ẩn tên khách trên widget" changed */
    fun hideNamesChanged() {
        val context = appContext ?: return
        val rewritten = refresher.hideNamesChanged()
        scope.launch { draw(context) }
        if (!rewritten) refreshSoon()
    }

    /** Logout, a kicked session, a switch of account (`SessionStore.clearAuth`): the shop's data leaves at once */
    fun signedOut() {
        synchronized(this) { pending?.cancel() }
        refresher.signedOut()
        val context = appContext ?: return
        scope.launch { draw(context) }
    }

    private const val REFRESH_DELAY_MS = 800L
}

/** The background side of the refresh. Every request has an empty `inputData`. */
object TodayWidgetSchedule {
    private const val TAG = "today-widget"
    private const val PERIODIC = "today-widget-periodic"
    private const val NOW = "today-widget-now"
    private const val MIDNIGHT_PREFIX = "today-widget-midnight-"

    /** Every 45 minutes with 15 of flex: 30 to 60 minutes apart (W10); Doze can stretch it */
    fun ensure(context: Context) {
        val work = WorkManager.getInstance(context)
        work.enqueueUniquePeriodicWork(
            PERIODIC,
            ExistingPeriodicWorkPolicy.KEEP,
            PeriodicWorkRequestBuilder<TodayWidgetWorker>(45, TimeUnit.MINUTES, 15, TimeUnit.MINUTES).addTag(TAG).build(),
        )
        // One run per Vietnam midnight, named by that day: the list turns to the new day or to "Cũ" with no app launch
        val now = Instant.now()
        val midnight = TodayWidgetClock.nextMidnight(now)
        work.enqueueUniqueWork(
            MIDNIGHT_PREFIX + TodayWidgetClock.dayKey(midnight),
            ExistingWorkPolicy.KEEP,
            OneTimeWorkRequestBuilder<TodayWidgetWorker>()
                .setInitialDelay(Duration.between(now, midnight))
                .setConstraints(Constraints.NONE)
                .addTag(TAG)
                .build(),
        )
    }

    /** The ↻ button, and a widget just placed */
    fun refreshOnce(context: Context) {
        WorkManager.getInstance(context).enqueueUniqueWork(
            NOW,
            ExistingWorkPolicy.KEEP,
            OneTimeWorkRequestBuilder<TodayWidgetWorker>().addTag(TAG).build(),
        )
    }

    /** The last widget left the home screen */
    fun cancel(context: Context) {
        WorkManager.getInstance(context).cancelAllWorkByTag(TAG)
    }
}
