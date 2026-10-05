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
import com.anyrent.pos.data.SessionStore
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
            ?: intent.data?.lastPathSegment?.toIntOrNull()
        if (launchOrderId != null) {
            SessionStore.pendingOrderId = launchOrderId
        }
        consumeOpenCartIntent(intent)
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
    }

    override fun onResume() {
        super.onResume()
        // First check at launch, again each time the app comes back (a minimum version can change meanwhile)
        appConfigViewModel.refresh()
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
        consumeOpenCartIntent(intent)
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
