package com.anyrent.pos.ui.attendance

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.CancellationSignal
import android.os.Looper
import androidx.core.content.ContextCompat
import com.anyrent.pos.data.PunchLocation
import com.anyrent.pos.domain.attendance.AttendanceLogic
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import kotlin.coroutines.resume

/**
 * One fresh location fix for a punch (#910): GPS when on, else the network provider; null when location is off,
 * not allowed, or nothing came within [timeoutMs]. No Play Services dependency.
 */
object AttendanceLocation {
    private const val TIMEOUT_MS = 20_000L

    fun toPunch(location: Location): PunchLocation = PunchLocation(
        latitude = location.latitude,
        longitude = location.longitude,
        accuracy = if (location.hasAccuracy()) location.accuracy.toDouble() else 0.0,
        isMock = isMock(location),
    )

    /** `Location.isMock` on API 31+, `isFromMockProvider` before */
    @Suppress("DEPRECATION")
    fun isMock(location: Location): Boolean =
        AttendanceLogic.isMock(Build.VERSION.SDK_INT, { Build.VERSION.SDK_INT >= 31 && location.isMock }, { location.isFromMockProvider })

    @SuppressLint("MissingPermission")
    suspend fun current(context: Context, timeoutMs: Long = TIMEOUT_MS): Location? {
        val manager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager ?: return null
        val provider = listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER)
            .firstOrNull { runCatching { manager.isProviderEnabled(it) }.getOrDefault(false) } ?: return null
        return withTimeoutOrNull(timeoutMs) {
            suspendCancellableCoroutine { cont ->
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    val signal = CancellationSignal()
                    cont.invokeOnCancellation { signal.cancel() }
                    manager.getCurrentLocation(provider, signal, ContextCompat.getMainExecutor(context)) { location ->
                        if (cont.isActive) cont.resume(location)
                    }
                } else {
                    val listener = object : LocationListener {
                        override fun onLocationChanged(location: Location) {
                            manager.removeUpdates(this)
                            if (cont.isActive) cont.resume(location)
                        }
                        @Deprecated("Deprecated in Java")
                        override fun onStatusChanged(provider: String?, status: Int, extras: android.os.Bundle?) = Unit
                        override fun onProviderEnabled(provider: String) = Unit
                        override fun onProviderDisabled(provider: String) = Unit
                    }
                    cont.invokeOnCancellation { manager.removeUpdates(listener) }
                    @Suppress("DEPRECATION")
                    manager.requestSingleUpdate(provider, listener, Looper.getMainLooper())
                }
            }
        }
    }
}
