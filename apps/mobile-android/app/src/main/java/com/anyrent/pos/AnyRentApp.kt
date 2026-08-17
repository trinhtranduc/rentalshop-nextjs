package com.anyrent.pos

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.anyrent.pos.billing.PurchasesManager
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.di.AppContainer
import com.anyrent.pos.push.PushRegistrar
import com.google.firebase.FirebaseApp

class AnyRentApp : Application() {
    val container: AppContainer by lazy { AppContainer() }

    override fun onCreate() {
        super.onCreate()
        instance = this
        SessionStore.init(this)
        createOrderNotificationChannel()
        runCatching { FirebaseApp.initializeApp(this) }
            .onFailure { android.util.Log.w(TAG, "Firebase init skipped/failed: ${it.message}") }
        runCatching { PurchasesManager.configure(this) }
            .onFailure { android.util.Log.w(TAG, "RevenueCat init skipped/failed: ${it.message}") }
        PushRegistrar.refreshTokenIfLoggedIn()
    }

    private fun createOrderNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.notification_channel_name),
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = getString(R.string.notification_channel_desc)
            enableVibration(true)
        }
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    companion object {
        const val CHANNEL_ID = "order_updates"
        private const val TAG = "AnyRentApp"

        @Volatile
        var instance: AnyRentApp? = null
            private set
    }
}
