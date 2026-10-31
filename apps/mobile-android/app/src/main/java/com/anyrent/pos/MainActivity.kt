package com.anyrent.pos

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.SystemClock
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.testTagsAsResourceId
import androidx.core.content.ContextCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.lifecycleScope
import com.anyrent.pos.data.ApiClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.data.repository.BankAccountRepository
import com.anyrent.pos.domain.widget.TodayWidgetLink
import com.anyrent.pos.domain.widget.TodayWidgetLinks
import com.anyrent.pos.ui.widget.TodayWidgetSync
import com.anyrent.pos.push.PushRegistrar
import com.anyrent.pos.push.DraftOrderReminder
import com.anyrent.pos.ui.appconfig.AppConfigGate
import com.anyrent.pos.ui.appconfig.AppConfigUiState
import com.anyrent.pos.ui.appconfig.AppConfigViewModel
import com.anyrent.pos.ui.navigation.AnyRentNavHost
import com.anyrent.pos.ui.theme.AnyRentTheme

class MainActivity : ComponentActivity() {
    private var launchOrderId: Int? = null

    // Minimum version and screen flags from the API (#370)
    private val appConfigViewModel: AppConfigViewModel by viewModels {
        AppConfigViewModel.Factory((application as AnyRentApp).container.appConfigRepository, BuildConfig.VERSION_NAME)
    }

    private val notificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { /* no-op */ }

    @OptIn(ExperimentalComposeUiApi::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        val splash = installSplashScreen()
        super.onCreate(savedInstanceState)
        // Keep the splash until the first app-config answer, at most 2 s (a slow network never blocks the app)
        val splashStartedAt = SystemClock.elapsedRealtime()
        splash.setKeepOnScreenCondition {
            appConfigViewModel.state.value is AppConfigUiState.Loading &&
                SystemClock.elapsedRealtime() - splashStartedAt < 2_000
        }
        enableEdgeToEdge()
        launchOrderId = intent.getIntExtra(EXTRA_ORDER_ID, -1).takeIf { it > 0 }
        if (launchOrderId != null) {
            SessionStore.pendingOrderId = launchOrderId
        }
        // A recreated activity or a launch from Recents still carries the old link: it was already opened
        val freshLaunch = savedInstanceState == null && intent.flags and Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY == 0
        if (freshLaunch) consumeWidgetLink(intent)
        consumeOpenCartIntent(intent)
        consumeOpenMyShiftsIntent(intent)
        consumeOpenBookingIntent(intent)
        requestNotificationPermissionIfNeeded()
        if (SessionStore.isLoggedIn) {
            PushRegistrar.refreshTokenIfLoggedIn()
        }
        setContent {
            AnyRentTheme {
                // Test tags become resource ids so Maestro / uiautomator find them by `id:` (#448)
                Box(Modifier.fillMaxSize().semantics { testTagsAsResourceId = true }) {
                    AppConfigGate(appConfigViewModel) {
                        AnyRentNavHost(startOrderId = launchOrderId)
                    }
                }
            }
        }
    }

    override fun onStart() {
        super.onStart()
        DraftOrderReminder.onAppForegrounded()
        // #1320: the owner may have changed the bank account on another device or on the web
        BankAccountRepository.clearPrintCache()
    }

    override fun onResume() {
        super.onResume()
        // First check at launch, again each time the app comes back (a minimum version can change meanwhile)
        appConfigViewModel.refresh()
        // #1307: the owner may have changed the shop currency meanwhile (at most once a minute)
        if (SessionStore.isLoggedIn) {
            lifecycleScope.launch(Dispatchers.IO) { ApiClient.get().refreshCurrency() }
            // #1354: and the owner's "show order note on the shared image" switch (at most once a minute)
            lifecycleScope.launch(Dispatchers.IO) { ApiClient.get().refreshShareOrderNote() }
            // #1381: the home-screen widget, when one is placed
            TodayWidgetSync.refreshSoon()
        }
    }

    override fun onStop() {
        DraftOrderReminder.onAppBackgrounded()
        super.onStop()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val orderId = intent.getIntExtra(EXTRA_ORDER_ID, -1).takeIf { it > 0 }
        if (orderId != null) {
            SessionStore.pendingOrderId = orderId
        }
        consumeWidgetLink(intent)
        consumeOpenCartIntent(intent)
        consumeOpenMyShiftsIntent(intent)
        consumeOpenBookingIntent(intent)
    }

    /** #1381 `anyrent://order/<id>`, `anyrent://todo` (the home-screen widget). The navigation applies it when it can. */
    private fun consumeWidgetLink(intent: Intent?) {
        TodayWidgetLink.parse(intent?.dataString)?.let(TodayWidgetLinks::request)
    }

    /** #1124: foreground push = our own extra; background push (tray) = FCM's `type` + `bookingRequestId` string extras */
    private fun consumeOpenBookingIntent(intent: Intent?) {
        if (intent == null) return
        val ours = intent.getIntExtra(com.anyrent.pos.push.BookingPush.EXTRA_BOOKING_REQUEST_ID, -1).takeIf { it > 0 }
        val tray = com.anyrent.pos.domain.booking.BookingLogic.requestIdFromPush(
            mapOf("type" to intent.getStringExtra("type"), "bookingRequestId" to intent.getStringExtra("bookingRequestId")),
        )
        val id = ours ?: tray ?: return
        intent.removeExtra(com.anyrent.pos.push.BookingPush.EXTRA_BOOKING_REQUEST_ID)
        intent.removeExtra("bookingRequestId")
        com.anyrent.pos.push.BookingPush.requestOpen(id)
    }

    private fun consumeOpenMyShiftsIntent(intent: Intent?) {
        if (intent == null) return
        // Foreground push: our own extra. Background push (tray): FCM puts the data keys as string extras.
        val ours = intent.getBooleanExtra(com.anyrent.pos.push.AttendancePush.EXTRA_OPEN_MY_SHIFTS, false)
        val tray = com.anyrent.pos.push.AttendancePush.isShiftChanged(intent.getStringExtra("type"))
        if (ours || tray) {
            intent.removeExtra(com.anyrent.pos.push.AttendancePush.EXTRA_OPEN_MY_SHIFTS)
            intent.removeExtra("type")
            com.anyrent.pos.push.AttendancePush.requestOpenMyShifts()
        }
    }

    private fun consumeOpenCartIntent(intent: Intent?) {
        if (intent?.getBooleanExtra(DraftOrderReminder.EXTRA_OPEN_CART, false) == true ||
            intent?.getBooleanExtra(EXTRA_OPEN_CART, false) == true
        ) {
            DraftOrderReminder.requestOpenCart()
        }
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        val granted = ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED
        if (!granted) {
            notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    companion object {
        const val EXTRA_ORDER_ID = "orderId"
        const val EXTRA_OPEN_CART = "openDraftCart"
    }
}
