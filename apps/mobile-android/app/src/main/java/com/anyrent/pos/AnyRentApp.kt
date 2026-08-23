package com.anyrent.pos

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.anyrent.pos.billing.PurchasesManager
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.data.CartStore
import com.anyrent.pos.di.AppContainer
import com.anyrent.pos.push.PushRegistrar
import com.anyrent.pos.push.DraftOrderReminder
import com.google.firebase.FirebaseApp

class AnyRentApp : Application() {
    val container: AppContainer by lazy { AppContainer() }

    override fun onCreate() {
        super.onCreate()
        instance = this
        SessionStore.init(this)
        CartStore.init(this)
        CartStore.restoreFromDisk()
        createNotificationChannels()
        runCatching { FirebaseApp.initializeApp(this) }
            .onFailure { android.util.Log.w(TAG, "Firebase init skipped/failed: ${it.message}") }
        runCatching { PurchasesManager.configure(this) }
            .onFailure { android.util.Log.w(TAG, "RevenueCat init skipped/failed: ${it.message}") }
        PushRegistrar.refreshTokenIfLoggedIn()
        DraftOrderReminder.install()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(
                CHANNEL_ID,
                getString(R.string.notification_channel_name),
                NotificationManager.IMPORTANCE_HIGH,
            ).apply {
                description = getString(R.string.notification_channel_desc)
                enableVibration(true)
            },
        )
        // New channel id: Android ignores importance changes on an existing channel.
        manager.createNotificationChannel(
            NotificationChannel(
                DRAFT_CHANNEL_ID,
                getString(R.string.draft_channel_name),
                NotificationManager.IMPORTANCE_DEFAULT,
            ).apply {
                description = getString(R.string.draft_channel_desc)
                setSound(null, null)
                enableVibration(false)
                enableLights(false)
                setShowBadge(false)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            },
        )
    }

    companion object {
        const val CHANNEL_ID = "order_updates"
        const val DRAFT_CHANNEL_ID = "draft_order"
        private const val TAG = "AnyRentApp"

        @Volatile
        var instance: AnyRentApp? = null
            private set
    }
}
