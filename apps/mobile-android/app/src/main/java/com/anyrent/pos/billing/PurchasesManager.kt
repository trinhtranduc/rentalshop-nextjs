package com.anyrent.pos.billing

import android.app.Activity
import android.app.Application
import android.util.Log
import com.anyrent.pos.BuildConfig
import com.anyrent.pos.data.SessionStore
import com.revenuecat.purchases.CustomerInfo
import com.revenuecat.purchases.LogLevel
import com.revenuecat.purchases.Package
import com.revenuecat.purchases.PurchaseParams
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.PurchasesConfiguration
import com.revenuecat.purchases.PurchasesError
import com.revenuecat.purchases.getOfferingsWith
import com.revenuecat.purchases.logInWith
import com.revenuecat.purchases.logOutWith
import com.revenuecat.purchases.purchaseWith
import com.revenuecat.purchases.restorePurchasesWith
import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine

data class RenewPackage(
    val productId: String,
    val title: String,
    val priceLabel: String,
    /** Store price in currency major units (from amountMicros). */
    val priceAmount: Double,
)

/**
 * RevenueCat wrapper for MERCHANT subscription renewals (6m / 12m via Store IAP).
 *
 * App User ID = `merchant_{publicId}` so webhooks can map to our Subscription row.
 * Non-merchant roles never log in to Purchases.
 */
object PurchasesManager {
    private const val TAG = "PurchasesManager"
    const val ENTITLEMENT_MERCHANT = "merchant_subscription"
    /** Play / App Store product ids — must match RevenueCat + store consoles. */
    const val PRODUCT_SEMI_ANNUAL = "anyrent_merchant_semi_annual"
    const val PRODUCT_ANNUAL = "anyrent_merchant_annual"

    @Volatile
    private var configured = false

    /** Cached packages keyed by store product id (from last offerings fetch). */
    @Volatile
    private var packageByProductId: Map<String, Package> = emptyMap()

    fun isConfigured(): Boolean = configured

    fun configure(app: Application) {
        val apiKey = BuildConfig.REVENUECAT_API_KEY.trim()
        if (apiKey.isEmpty()) {
            Log.w(TAG, "REVENUECAT_ANDROID_API_KEY empty — Purchases not configured")
            return
        }
        if (configured) return
        Purchases.logLevel = if (BuildConfig.DEBUG) LogLevel.DEBUG else LogLevel.INFO
        Purchases.configure(
            PurchasesConfiguration.Builder(app, apiKey).build(),
        )
        configured = true
        Log.i(TAG, "RevenueCat configured")
        syncFromSession()
    }

    /** Call after login / on cold start when session already exists. */
    fun syncFromSession() {
        if (!configured) return
        val role = SessionStore.role
        val merchantId = SessionStore.merchantId
        if (role == "MERCHANT" && merchantId != null && merchantId > 0) {
            logInMerchant(merchantId)
        } else {
            logOut()
        }
    }

    fun logInMerchant(merchantId: Int) {
        if (!configured) return
        val appUserId = "merchant_$merchantId"
        Purchases.sharedInstance.logInWith(
            appUserId,
            onError = { error -> Log.e(TAG, "logIn failed: ${error.message}") },
            onSuccess = { customerInfo, created ->
                Log.i(TAG, "logIn ok user=$appUserId created=$created active=${customerInfo.entitlements.active.keys}")
            },
        )
    }

    fun logOut() {
        if (!configured) return
        if (!Purchases.sharedInstance.isAnonymous) {
            Purchases.sharedInstance.logOutWith(
                onError = { error -> Log.e(TAG, "logOut failed: ${error.message}") },
                onSuccess = { Log.i(TAG, "logOut ok") },
            )
        }
    }

    fun hasMerchantEntitlement(info: CustomerInfo): Boolean =
        info.entitlements[ENTITLEMENT_MERCHANT]?.isActive == true

    suspend fun getRenewPackages(): Result<List<RenewPackage>> =
        suspendCancellableCoroutine { cont ->
            if (!configured) {
                cont.resume(Result.failure(IllegalStateException("Purchases not configured")))
                return@suspendCancellableCoroutine
            }
            Purchases.sharedInstance.getOfferingsWith(
                onError = { error ->
                    Log.e(TAG, "getOfferings failed: ${error.message}")
                    cont.resume(Result.failure(PurchasesException(error)))
                },
                onSuccess = { offerings ->
                    val allPackages = buildList {
                        offerings.current?.availablePackages?.let { addAll(it) }
                        offerings.all.values.forEach { offering ->
                            addAll(offering.availablePackages)
                        }
                    }
                    val byId = LinkedHashMap<String, Package>()
                    for (pkg in allPackages) {
                        byId.putIfAbsent(pkg.product.id, pkg)
                    }
                    packageByProductId = byId
                    val orderedIds = listOf(PRODUCT_SEMI_ANNUAL, PRODUCT_ANNUAL)
                    val renew = orderedIds.mapNotNull { id ->
                        val pkg = byId[id] ?: return@mapNotNull null
                        RenewPackage(
                            productId = id,
                            title = titleForProduct(id),
                            priceLabel = pkg.product.price.formatted,
                            priceAmount = pkg.product.price.amountMicros / 1_000_000.0,
                        )
                    }
                    cont.resume(Result.success(renew))
                },
            )
        }

    suspend fun purchase(activity: Activity, productId: String): Result<CustomerInfo> =
        suspendCancellableCoroutine { cont ->
            if (!configured) {
                cont.resume(Result.failure(IllegalStateException("Purchases not configured")))
                return@suspendCancellableCoroutine
            }
            val pkg = packageByProductId[productId]
            if (pkg == null) {
                cont.resume(
                    Result.failure(
                        IllegalStateException("Package not found for $productId — refresh offerings first"),
                    ),
                )
                return@suspendCancellableCoroutine
            }
            val params = PurchaseParams.Builder(activity, pkg).build()
            Purchases.sharedInstance.purchaseWith(
                params,
                onError = { error, userCancelled ->
                    if (userCancelled) {
                        cont.resume(Result.failure(PurchaseCancelledException()))
                    } else {
                        Log.e(TAG, "purchase failed: ${error.message}")
                        cont.resume(Result.failure(PurchasesException(error)))
                    }
                },
                onSuccess = { _, customerInfo ->
                    Log.i(TAG, "purchase ok active=${customerInfo.entitlements.active.keys}")
                    cont.resume(Result.success(customerInfo))
                },
            )
        }

    suspend fun restore(): Result<CustomerInfo> =
        suspendCancellableCoroutine { cont ->
            if (!configured) {
                cont.resume(Result.failure(IllegalStateException("Purchases not configured")))
                return@suspendCancellableCoroutine
            }
            Purchases.sharedInstance.restorePurchasesWith(
                onError = { error ->
                    Log.e(TAG, "restore failed: ${error.message}")
                    cont.resume(Result.failure(PurchasesException(error)))
                },
                onSuccess = { customerInfo ->
                    Log.i(TAG, "restore ok active=${customerInfo.entitlements.active.keys}")
                    cont.resume(Result.success(customerInfo))
                },
            )
        }

    private fun titleForProduct(productId: String): String = when (productId) {
        PRODUCT_SEMI_ANNUAL -> "6 months"
        PRODUCT_ANNUAL -> "12 months"
        else -> productId
    }
}

class PurchaseCancelledException : Exception("Purchase cancelled")

class PurchasesException(val purchasesError: PurchasesError) :
    Exception(purchasesError.message)
