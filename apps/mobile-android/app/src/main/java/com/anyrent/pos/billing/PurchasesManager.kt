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
import com.revenuecat.purchases.getCustomerInfoWith
import com.revenuecat.purchases.getOfferingsWith
import com.revenuecat.purchases.models.GoogleReplacementMode
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
    /** #1459 ISO code of the store price ("VND", "USD") */
    val currencyCode: String = "VND",
)

/**
 * RevenueCat wrapper for MERCHANT subscription renewals (6m / 12m via Store IAP).
 * #1459: Basic and Professional (four products). Google Play may name a product `id:basePlan`; matching uses the part
 * before ":". Without `REVENUECAT_ANDROID_API_KEY` nothing is configured and every call fails softly.
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
    /** #1459 Professional, sold on the phone too (owner chose B on 2026-11-02) */
    const val PRODUCT_PRO_SEMI_ANNUAL = "anyrent_professional_semi_annual"
    const val PRODUCT_PRO_ANNUAL = "anyrent_professional_annual"
    val ALL_PRODUCTS = listOf(PRODUCT_SEMI_ANNUAL, PRODUCT_ANNUAL, PRODUCT_PRO_SEMI_ANNUAL, PRODUCT_PRO_ANNUAL)

    /** `anyrent_merchant_annual:annual` → `anyrent_merchant_annual` */
    fun baseId(id: String): String = id.substringBefore(':')

    /** Play subscription center, on the product when known (Google Play policy: a manage / cancel link) */
    fun manageUrl(packageName: String, productId: String?): String {
        val base = "https://play.google.com/store/account/subscriptions?package=$packageName"
        return productId?.takeIf { it.isNotBlank() }?.let { "$base&sku=${baseId(it)}" } ?: base
    }

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
                        byId.putIfAbsent(baseId(pkg.product.id), pkg)
                    }
                    packageByProductId = byId
                    val renew = ALL_PRODUCTS.mapNotNull { id ->
                        val pkg = byId[id] ?: return@mapNotNull null
                        RenewPackage(
                            productId = id,
                            title = titleForProduct(id),
                            priceLabel = pkg.product.price.formatted,
                            priceAmount = pkg.product.price.amountMicros / 1_000_000.0,
                            currencyCode = pkg.product.price.currencyCode,
                        )
                    }
                    cont.resume(Result.success(renew))
                },
            )
        }

    /** Active store subscriptions of this customer (base product ids); empty when unknown */
    suspend fun activeProductIds(): Set<String> =
        suspendCancellableCoroutine { cont ->
            if (!configured) {
                cont.resume(emptySet())
                return@suspendCancellableCoroutine
            }
            Purchases.sharedInstance.getCustomerInfoWith(
                onError = { error ->
                    Log.e(TAG, "getCustomerInfo failed: ${error.message}")
                    cont.resume(emptySet())
                },
                onSuccess = { info -> cont.resume(info.activeSubscriptions.map(::baseId).toSet()) },
            )
        }

    /**
     * #1459: buying Professional (or the other period) while a Play subscription to another of our products is still active
     * replaces it at once, so Google never runs two subscriptions. CHARGE_FULL_PRICE: the new period starts today
     * (the disclosure says so) and Google adds the unused time of the old one.
     */
    suspend fun purchase(activity: Activity, productId: String): Result<CustomerInfo> {
        val replaced = activeProductIds().firstOrNull { it in ALL_PRODUCTS && it != baseId(productId) }
        return purchase(activity, productId, replaced)
    }

    private suspend fun purchase(activity: Activity, productId: String, oldProductId: String?): Result<CustomerInfo> =
        suspendCancellableCoroutine { cont ->
            if (!configured) {
                cont.resume(Result.failure(IllegalStateException("Purchases not configured")))
                return@suspendCancellableCoroutine
            }
            val pkg = packageByProductId[baseId(productId)]
            if (pkg == null) {
                cont.resume(
                    Result.failure(
                        IllegalStateException("Package not found for $productId — refresh offerings first"),
                    ),
                )
                return@suspendCancellableCoroutine
            }
            val params = PurchaseParams.Builder(activity, pkg).apply {
                if (oldProductId != null) {
                    oldProductId(oldProductId)
                    googleReplacementMode(GoogleReplacementMode.CHARGE_FULL_PRICE)
                }
            }.build()
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
        PRODUCT_SEMI_ANNUAL, PRODUCT_PRO_SEMI_ANNUAL -> "6 months"
        PRODUCT_ANNUAL, PRODUCT_PRO_ANNUAL -> "12 months"
        else -> productId
    }

    /** Months of one of our products (6 or 12), from its id */
    fun monthsOf(productId: String): Int = if (baseId(productId).endsWith("semi_annual")) 6 else 12
}

class PurchaseCancelledException : Exception("Purchase cancelled")

class PurchasesException(val purchasesError: PurchasesError) :
    Exception(purchasesError.message)
