package com.anyrent.pos.push

import android.util.Log
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.SessionStore
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/** Registers / refreshes FCM token with API when user is logged in. */
object PushRegistrar {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private const val TAG = "PushRegistrar"

    fun refreshTokenIfLoggedIn() {
        if (!SessionStore.isLoggedIn) return
        FirebaseMessaging.getInstance().token
            .addOnSuccessListener { token ->
                if (!token.isNullOrBlank()) register(token)
            }
            .addOnFailureListener { e ->
                Log.w(TAG, "FCM token fetch failed: ${e.message}")
            }
    }

    fun register(token: String) {
        if (!SessionStore.isLoggedIn) {
            Log.d(TAG, "Skip FCM register — not logged in")
            return
        }
        scope.launch {
            ApiClient.get().registerDevice(token)
                .onSuccess { Log.i(TAG, "Device registered for Android push") }
                .onFailure { Log.w(TAG, "Register failed: ${it.message}") }
        }
    }

    fun unregister(onDone: (() -> Unit)? = null) {
        scope.launch {
            ApiClient.get().unregisterDevice()
            onDone?.invoke()
        }
    }
}
