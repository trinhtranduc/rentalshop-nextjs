package com.anyrent.pos

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.push.PushRegistrar
import com.anyrent.pos.ui.navigation.AnyRentNavHost
import com.anyrent.pos.ui.theme.AnyRentTheme

class MainActivity : ComponentActivity() {
    private var launchOrderId: Int? = null

    private val notificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { /* no-op */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        launchOrderId = intent.getIntExtra(EXTRA_ORDER_ID, -1).takeIf { it > 0 }
            ?: intent.data?.lastPathSegment?.toIntOrNull()
        if (launchOrderId != null) {
            SessionStore.pendingOrderId = launchOrderId
        }
        requestNotificationPermissionIfNeeded()
        if (SessionStore.isLoggedIn) {
            PushRegistrar.refreshTokenIfLoggedIn()
        }
        setContent {
            AnyRentTheme {
                AnyRentNavHost(startOrderId = launchOrderId)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val orderId = intent.getIntExtra(EXTRA_ORDER_ID, -1).takeIf { it > 0 }
        if (orderId != null) {
            SessionStore.pendingOrderId = orderId
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
    }
}
