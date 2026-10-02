package com.anyrent.pos.ui.navigation

import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import com.anyrent.pos.data.FeatureFlags
import com.anyrent.pos.domain.appconfig.MobileFeature
import com.anyrent.pos.ui.orders.v2.OrderDetailV2Screen
import com.anyrent.pos.ui.orders.v2.OrdersHomeScreen
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.CartStore
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.push.DraftOrderReminder
import com.anyrent.pos.ui.auth.CheckEmailScreen
import com.anyrent.pos.ui.auth.ForgotPasswordScreen
import com.anyrent.pos.ui.auth.LoginScreen
import com.anyrent.pos.ui.auth.OnboardingScreen
import com.anyrent.pos.ui.auth.RegisterStoreScreen
import com.anyrent.pos.ui.auth.v2.EmailSentV2Screen
import com.anyrent.pos.domain.auth.EmailSentKind
import com.anyrent.pos.ui.auth.v2.ForgotPasswordV2Screen
import com.anyrent.pos.ui.auth.v2.LoginV2Screen
import com.anyrent.pos.ui.auth.v2.RegisterStoreV2Screen
import com.anyrent.pos.data.repository.SessionStoreAppConfigCache
import com.anyrent.pos.ui.availability.AvailabilityScreen
import com.anyrent.pos.ui.calendar.CalendarScreen
import com.anyrent.pos.ui.calendar.v2.CalendarV2Screen
import com.anyrent.pos.ui.common.AppAlertError
import com.anyrent.pos.ui.customers.CustomersScreen
import com.anyrent.pos.ui.customers.v2.CustomerDetailV2Screen
import com.anyrent.pos.ui.customers.v2.CustomersListV2Screen
import com.anyrent.pos.ui.customers.v2.EditCustomerV2Screen
import com.anyrent.pos.ui.onboarding.OnboardingV2Screen
import com.anyrent.pos.ui.home.BarcodeMode
import com.anyrent.pos.ui.home.CameraBarcodeScreen
import com.anyrent.pos.ui.home.CartCheckoutScreen
import com.anyrent.pos.ui.home.HomeScreen
import com.anyrent.pos.ui.home.v2.CartV2Screen
import com.anyrent.pos.ui.home.v2.ProductDetailScreen
import com.anyrent.pos.ui.home.v2.ProductsHomeScreen
import com.anyrent.pos.ui.inbox.InboxScreen
import com.anyrent.pos.ui.orders.FindOrderScreen
import com.anyrent.pos.ui.orders.OrderDetailScreen
import com.anyrent.pos.ui.orders.OrdersScreen
import com.anyrent.pos.domain.overview.OverviewLinks
import com.anyrent.pos.ui.overview.OverviewScreen
import com.anyrent.pos.ui.overview.v2.OverviewV2Screen
import com.anyrent.pos.ui.settings.AppInfoScreen
import com.anyrent.pos.ui.settings.ExportAuthScreen
import com.anyrent.pos.ui.settings.PrinterNetworkScreen
import com.anyrent.pos.ui.settings.SettingsScreen
import com.anyrent.pos.ui.settings.StoreInfoScreen
import com.anyrent.pos.ui.settings.SubscriptionScreen
import com.anyrent.pos.ui.settings.UserManagementScreen
import com.anyrent.pos.ui.settings.v2.SettingsV2Screen
import com.anyrent.pos.ui.theme.AppMuted
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

object Routes {
    const val Login = "login"
    const val Forgot = "forgot"
    const val Register = "register"
    const val CheckEmail = "check-email/{email}"
    // #386 redesigned forgot password and its email-sent screen (flag newAuth)
    const val ForgotV2 = "forgot-v2?email={email}"
    const val EmailSentV2 = "email-sent-v2/{email}?kind={kind}"
    const val Onboarding = "onboarding"
    const val CameraBarcode = "camera-barcode/{mode}"
    const val StoreInfo = "store-info"
    const val Main = "main"
    const val Inbox = "inbox"
    const val OrderDetail = "order/{orderId}"
    const val OrderCheck = "order-check"
    const val FindOrder = "find-order"
    // #388: optional period (overview top product); without it, every order of the entity
    const val AnalyticsOrders = "analytics-orders/{entityType}/{entityId}?start={start}&end={end}"
    const val OverviewStatusOrders = "overview-orders/{kind}/{startDate}/{endDate}"
    const val Cart = "cart"
    const val CartPreview = "cart-preview"
    const val ProductAvailability = "product-availability/{productId}"
    const val UserEdit = "user-edit/{userId}"
    const val Customers = "customers"
    const val Users = "users"
    const val Export = "export"
    const val Printer = "printer"
    const val AppInfo = "app-info"
    const val Subscription = "subscription"
    // #373 redesigned products and cart (flag newProducts)
    const val ProductDetailV2 = "product-v2/{productId}"
    const val CartV2 = "cart-v2"
    const val CartV2Preview = "cart-v2-preview"
    // #387 redesigned customer detail (flag newCustomers)
    const val CustomerDetailV2 = "customer-v2/{customerId}"
    const val CustomerEditV2 = "customer-v2-edit/{customerId}"

    fun orderDetail(id: Int) = "order/$id"
    fun analyticsOrders(entityType: String, entityId: Int) = "analytics-orders/$entityType/$entityId"
    fun analyticsOrders(entityType: String, entityId: Int, start: String, end: String) =
        "analytics-orders/$entityType/$entityId?start=$start&end=$end"
    fun overviewStatusOrders(kind: String, startDate: String, endDate: String) =
        "overview-orders/$kind/$startDate/$endDate"
    fun productAvailability(id: Int) = "product-availability/$id"
    fun productDetailV2(id: Int) = "product-v2/$id"
    fun customerDetailV2(id: Int) = "customer-v2/$id"
    fun customerEditV2(id: Int) = "customer-v2-edit/$id"

    /** The cart the user works in: the redesigned one behind `newProducts`, else the current one */
    fun cart(): String = if (FeatureFlags.isOn(MobileFeature.NEW_PRODUCTS)) CartV2 else Cart
}

private enum class MainTab(val route: String, val labelRes: Int) {
    Home("tab_home", R.string.home),
    Orders("tab_orders", R.string.orders),
    Calendar("tab_calendar", R.string.calendar),
    Overview("tab_overview", R.string.overview),
    Settings("tab_settings", R.string.settings),
}

@Composable
fun AnyRentNavHost(
    startOrderId: Int? = null,
    rootNavController: NavHostController = rememberNavController(),
) {
    // iOS: onboarding after first successful login (loadMainUserView), not before login.
    val start = when {
        SessionStore.isLoggedIn && !SessionStore.onboardingDone -> Routes.Onboarding
        SessionStore.isLoggedIn -> Routes.Main
        else -> Routes.Login
    }

    fun navigateAfterLogin() {
        val dest = if (SessionStore.onboardingDone) Routes.Main else Routes.Onboarding
        rootNavController.navigate(dest) {
            popUpTo(Routes.Login) { inclusive = true }
            launchSingleTop = true
        }
    }

    val context = LocalContext.current
    LaunchedEffect(rootNavController) {
        SessionStore.sessionExpired.collect { code ->
            // #386: a wrong password is a 401 too; the new login is already on screen and shows it inline,
            // so do not rebuild it (that would wipe the message and the typed email)
            val onNewLogin = rootNavController.currentDestination?.route == Routes.Login && isNewAuthOn()
            if (onNewLogin) return@collect
            // Say why: another device signed in vs. the session simply ended (#344)
            val reason = if (code == "SESSION_REPLACED") {
                R.string.api_error_session_replaced
            } else {
                R.string.api_error_session_expired
            }
            Toast.makeText(context, context.getString(reason), Toast.LENGTH_LONG).show()
            rootNavController.navigate(Routes.Login) {
                popUpTo(rootNavController.graph.id) { inclusive = true }
                launchSingleTop = true
            }
        }
    }

    NavHost(navController = rootNavController, startDestination = start) {
        composable(Routes.Login) {
            // #386: redesigned auth behind `newAuth`, from the cached app config (before any login); a first
            // fetch that lands while the splash is up still applies
            val features by FeatureFlags.enabled.collectAsState()
            val newAuth = remember(features) { isNewAuthOn() }
            if (newAuth) {
                LoginV2Screen(
                    onLoggedIn = { navigateAfterLogin() },
                    onForgotPassword = { email -> rootNavController.navigate("forgot-v2?email=${Uri.encode(email)}") },
                    onRegister = { rootNavController.navigate(Routes.Register) },
                )
                return@composable
            }
            LoginScreen(
                onLoggedIn = { navigateAfterLogin() },
                onForgotPassword = { rootNavController.navigate(Routes.Forgot) },
                onRegister = { rootNavController.navigate(Routes.Register) },
            )
        }
        composable(
            Routes.ForgotV2,
            arguments = listOf(navArgument("email") { type = NavType.StringType; defaultValue = "" }),
        ) { entry ->
            ForgotPasswordV2Screen(
                initialEmail = entry.arguments?.getString("email").orEmpty(),
                onBack = { rootNavController.popBackStack() },
                onSent = { email -> rootNavController.navigate("email-sent-v2/${Uri.encode(email)}") },
            )
        }
        composable(Routes.Forgot) {
            ForgotPasswordScreen(
                onBack = { rootNavController.popBackStack() },
                onCheckEmail = { email ->
                    rootNavController.navigate("check-email/$email")
                },
            )
        }
        composable(Routes.Main) {
            MainTabs(
                rootNavController = rootNavController,
                startOrderId = startOrderId,
            )
        }
        composable(Routes.Inbox) {
            InboxScreen(
                onBack = { rootNavController.popBackStack() },
                onOpenOrder = { id -> rootNavController.navigate(Routes.orderDetail(id)) },
            )
        }
        composable(
            Routes.OrderDetail,
            arguments = listOf(navArgument("orderId") { type = NavType.IntType }),
        ) { entry ->
            val id = entry.arguments?.getInt("orderId") ?: return@composable
            // Redesigned detail behind the server flag (#372); the current screen otherwise
            val features by FeatureFlags.enabled.collectAsState()
            if (MobileFeature.NEW_ORDER_DETAIL in features) {
                OrderDetailV2Screen(
                    orderId = id,
                    onBack = { rootNavController.popBackStack() },
                    onEditInCart = {
                        MainTabRouter.openHome()
                        rootNavController.navigate(Routes.cart()) {
                            popUpTo(Routes.Main)
                            launchSingleTop = true
                        }
                    },
                )
                return@composable
            }
            OrderDetailScreen(orderId = id, onBack = { rootNavController.popBackStack() })
        }
        composable(Routes.OrderCheck) { entry ->
            val scannedProductId by entry.savedStateHandle
                .getStateFlow<Int?>("availabilityProductId", null)
                .collectAsState()
            AvailabilityScreen(
                onBack = { rootNavController.popBackStack() },
                onFindOrder = { rootNavController.navigate(Routes.FindOrder) },
                onScanProduct = { rootNavController.navigate("camera-barcode/availability") },
                onOpenOrder = { id -> rootNavController.navigate(Routes.orderDetail(id)) },
                scannedProductId = scannedProductId,
            )
        }
        composable(
            Routes.ProductAvailability,
            arguments = listOf(navArgument("productId") { type = NavType.IntType }),
        ) { entry ->
            val productId = entry.arguments?.getInt("productId") ?: return@composable
            AvailabilityScreen(
                onBack = { rootNavController.popBackStack() },
                onFindOrder = { rootNavController.navigate(Routes.FindOrder) },
                onScanProduct = { rootNavController.navigate("camera-barcode/availability") },
                onOpenOrder = { id -> rootNavController.navigate(Routes.orderDetail(id)) },
                scannedProductId = productId,
                focusedProductMode = true,
            )
        }
        composable(Routes.FindOrder) {
            FindOrderScreen(
                onBack = { rootNavController.popBackStack() },
                onOpenOrder = { id -> rootNavController.navigate(Routes.orderDetail(id)) },
            )
        }
        composable(
            Routes.AnalyticsOrders,
            arguments = listOf(
                navArgument("entityType") { type = NavType.StringType },
                navArgument("entityId") { type = NavType.IntType },
                navArgument("start") { type = NavType.StringType; nullable = true; defaultValue = null },
                navArgument("end") { type = NavType.StringType; nullable = true; defaultValue = null },
            ),
        ) { entry ->
            val entityType = entry.arguments?.getString("entityType") ?: return@composable
            val entityId = entry.arguments?.getInt("entityId") ?: return@composable
            OrdersScreen(
                onOpenOrder = { id -> rootNavController.navigate(Routes.orderDetail(id)) },
                onOrderCheck = {},
                productId = entityId.takeIf { entityType == "product" },
                customerId = entityId.takeIf { entityType == "customer" },
                startDate = entry.arguments?.getString("start"),
                endDate = entry.arguments?.getString("end"),
                filteredTitle = stringResource(
                    if (entityType == "product") R.string.product_orders
                    else R.string.customer_orders,
                ),
                onBack = { rootNavController.popBackStack() },
            )
        }
        composable(
            Routes.OverviewStatusOrders,
            arguments = listOf(
                navArgument("kind") { type = NavType.StringType },
                navArgument("startDate") { type = NavType.StringType },
                navArgument("endDate") { type = NavType.StringType },
            ),
        ) { entry ->
            val kind = entry.arguments?.getString("kind") ?: return@composable
            val startDate = entry.arguments?.getString("startDate") ?: return@composable
            val endDate = entry.arguments?.getString("endDate") ?: return@composable
            val titleRes = OverviewLinks.listTitle(kind)
            // #388: "rented" / "late" are lists of now, not of the period
            val now = kind == OverviewLinks.RENTED || kind == OverviewLinks.LATE
            OrdersScreen(
                onOpenOrder = { id -> rootNavController.navigate(Routes.orderDetail(id)) },
                onOrderCheck = {},
                initialStatus = "PICKUPED".takeIf { now },
                snapshotKind = kind.takeUnless { now },
                startDate = startDate.takeUnless { now },
                endDate = endDate.takeUnless { now },
                filteredTitle = stringResource(titleRes),
                onBack = { rootNavController.popBackStack() },
                lateOnly = kind == OverviewLinks.LATE,
            )
        }
        composable(Routes.Cart) {
            CartCheckoutScreen(
                onBack = { rootNavController.popBackStack() },
                onPreview = {
                    rootNavController.navigate(Routes.CartPreview) {
                        launchSingleTop = true
                    }
                },
                onCreated = {
                    rootNavController.popBackStack(Routes.Cart, inclusive = true)
                    MainTabRouter.openOrdersList()
                },
                onViewCustomerOrders = { customer ->
                    rootNavController.navigate(Routes.analyticsOrders("customer", customer.id))
                },
            )
        }
        composable(
            Routes.ProductDetailV2,
            arguments = listOf(navArgument("productId") { type = NavType.IntType }),
        ) { entry ->
            ProductDetailScreen(
                productId = entry.arguments?.getInt("productId") ?: 0,
                onBack = { rootNavController.popBackStack() },
                onOpenOrder = { id -> rootNavController.navigate(Routes.orderDetail(id)) },
                onOpenCalendar = { id -> rootNavController.navigate(Routes.productAvailability(id)) },
                onOpenAllOrders = { id -> rootNavController.navigate(Routes.analyticsOrders("product", id)) },
            )
        }
        composable(Routes.CartV2) {
            CartV2Screen(
                onBack = { rootNavController.popBackStack() },
                onAddItems = {
                    // #433: the product list on Home, not the screen that opened the cart (e.g. a customer)
                    val backStack = rootNavController.currentBackStack.value.map { it.destination.route }
                    val target = CartAddItems.popTarget(backStack)
                    if (target == null) {
                        rootNavController.popBackStack()
                    } else {
                        MainTabRouter.openHome()
                        rootNavController.popBackStack(target, inclusive = false)
                    }
                },
                onPreview = { rootNavController.navigate(Routes.CartV2Preview) { launchSingleTop = true } },
            )
        }
        composable(Routes.CartV2Preview) {
            // Existing preview: creates the order with the existing logic
            CartCheckoutScreen(
                previewMode = true,
                onBack = { rootNavController.popBackStack() },
                onPreview = {},
                onCreated = {
                    rootNavController.popBackStack(Routes.CartV2, inclusive = true)
                    MainTabRouter.openOrdersList()
                },
            )
        }
        composable(Routes.CartPreview) {
            CartCheckoutScreen(
                previewMode = true,
                onBack = { rootNavController.popBackStack() },
                onPreview = {},
                onCreated = {
                    // Leave cart + preview, land on Orders tab (not order detail).
                    rootNavController.popBackStack(Routes.Cart, inclusive = true)
                    MainTabRouter.openOrdersList()
                },
            )
        }
        composable(
            Routes.CameraBarcode,
            arguments = listOf(navArgument("mode") { type = NavType.StringType }),
        ) { entry ->
            val mode = when (entry.arguments?.getString("mode")) {
                "order" -> BarcodeMode.ORDER
                "availability" -> BarcodeMode.AVAILABILITY
                else -> BarcodeMode.PRODUCT
            }
            CameraBarcodeScreen(
                mode = mode,
                onBack = { rootNavController.popBackStack() },
                onOrderFound = { id -> rootNavController.navigate(Routes.orderDetail(id)) },
                onProductFound = { product ->
                    rootNavController.previousBackStackEntry
                        ?.savedStateHandle
                        ?.set("availabilityProductId", product.id)
                },
            )
        }
        composable(Routes.Register) {
            val features by FeatureFlags.enabled.collectAsState()
            if (remember(features) { isNewAuthOn() }) {
                RegisterStoreV2Screen(
                    onBack = { rootNavController.popBackStack() },
                    // Like iOS: the "Kiểm tra email" screen for the activation email; back goes to login
                    onRegistered = { email ->
                        rootNavController.navigate("email-sent-v2/${Uri.encode(email)}?kind=${EmailSentKind.ACTIVATION.key}") {
                            popUpTo(Routes.Register) { inclusive = true }
                        }
                    },
                )
                return@composable
            }
            RegisterStoreScreen(
                onBack = { rootNavController.popBackStack() },
                onRegistered = {
                    rootNavController.navigate(Routes.Login) {
                        popUpTo(Routes.Register) { inclusive = true }
                    }
                },
            )
        }
        composable(
            Routes.CheckEmail,
            arguments = listOf(navArgument("email") { type = NavType.StringType }),
        ) { entry ->
            CheckEmailScreen(
                email = entry.arguments?.getString("email").orEmpty(),
                onBack = { rootNavController.popBackStack() },
            )
        }
        composable(
            Routes.EmailSentV2,
            arguments = listOf(
                navArgument("email") { type = NavType.StringType },
                navArgument("kind") {
                    type = NavType.StringType
                    defaultValue = EmailSentKind.RESET.key
                },
            ),
        ) { entry ->
            EmailSentV2Screen(
                email = entry.arguments?.getString("email").orEmpty(),
                kind = EmailSentKind.parse(entry.arguments?.getString("kind")),
                onBackToLogin = { rootNavController.popBackStack(Routes.Login, inclusive = false) },
            )
        }
        composable(Routes.Onboarding) {
            val finish = {
                SessionStore.onboardingDone = true
                rootNavController.navigate(Routes.Main) {
                    popUpTo(Routes.Onboarding) { inclusive = true }
                    launchSingleTop = true
                }
            }
            // #387: redesigned onboarding behind `newAuth`; same "show once" storage
            if (FeatureFlags.isOn(MobileFeature.NEW_AUTH)) {
                OnboardingV2Screen(onFinished = finish)
                return@composable
            }
            OnboardingScreen(onFinished = finish)
        }
        composable(Routes.StoreInfo) {
            StoreInfoScreen(onBack = { rootNavController.popBackStack() })
        }
        composable(Routes.Subscription) {
            SubscriptionScreen(onBack = { rootNavController.popBackStack() })
        }
        composable(Routes.Customers) {
            // #387: redesigned list behind `newCustomers`
            val features by FeatureFlags.enabled.collectAsState()
            if (MobileFeature.NEW_CUSTOMERS in features) {
                CustomersListV2Screen(
                    onBack = { rootNavController.popBackStack() },
                    onOpen = { row -> rootNavController.navigate(Routes.customerDetailV2(row.id)) },
                )
                return@composable
            }
            CustomersScreen(
                onBack = { rootNavController.popBackStack() },
                onViewOrders = { customer ->
                    rootNavController.navigate(Routes.analyticsOrders("customer", customer.id))
                },
            )
        }
        composable(
            Routes.CustomerDetailV2,
            arguments = listOf(navArgument("customerId") { type = NavType.IntType }),
        ) { entry ->
            val customerId = entry.arguments?.getInt("customerId") ?: 0
            val edits by entry.savedStateHandle.getStateFlow("customerEdits", 0).collectAsState()
            CustomerDetailV2Screen(
                customerId = customerId,
                refreshToken = edits,
                onEdit = { rootNavController.navigate(Routes.customerEditV2(customerId)) },
                onBack = { rootNavController.popBackStack() },
                onOpenOrder = { id -> rootNavController.navigate(Routes.orderDetail(id)) },
                onCreateOrder = { customer ->
                    // A new cart for this customer: an order being edited is dropped first
                    if (CartStore.isEditing) CartStore.clear()
                    CartStore.setCustomer(customer)
                    rootNavController.navigate(Routes.cart())
                },
            )
        }
        composable(
            Routes.CustomerEditV2,
            arguments = listOf(navArgument("customerId") { type = NavType.IntType }),
        ) { entry ->
            EditCustomerV2Screen(
                customerId = entry.arguments?.getInt("customerId") ?: 0,
                onBack = { rootNavController.popBackStack() },
                onSaved = {
                    rootNavController.previousBackStackEntry?.savedStateHandle?.let { handle ->
                        handle["customerEdits"] = (handle.get<Int>("customerEdits") ?: 0) + 1
                    }
                    rootNavController.popBackStack()
                },
            )
        }
        composable(Routes.Users) {
            UserManagementScreen(
                onBack = { rootNavController.popBackStack() },
            )
        }
        composable(Routes.Export) {
            ExportAuthScreen(onBack = { rootNavController.popBackStack() })
        }
        composable(Routes.Printer) {
            PrinterNetworkScreen(onBack = { rootNavController.popBackStack() })
        }
        composable(Routes.AppInfo) {
            AppInfoScreen(onBack = { rootNavController.popBackStack() })
        }
    }

    LaunchedOpenDraftCart(rootNavController)
}

/**
 * Edit order = load it into the cart (same as the list swipe "Sửa"). Shared by the orders list and the
 * new order detail (#372). Fetch on IO, cart on the caller's thread.
 */
internal suspend fun loadOrderIntoCart(orderId: Int): Result<Unit> {
    val detail = withContext(Dispatchers.IO) { ApiClient.get().getOrder(orderId) }
        .getOrElse { return Result.failure(Exception(it.message ?: "Could not load order", it)) }
    return runCatching { CartStore.loadFromOrderDetail(detail) }
        .recoverCatching { throw Exception(it.message ?: "Could not load order into cart", it) }
}

@Composable
private fun MainTabs(
    rootNavController: NavHostController,
    startOrderId: Int?,
) {
    val tabNav = rememberNavController()
    val backStack by tabNav.currentBackStackEntryAsState()
    val current = backStack?.destination?.route
    val scope = rememberCoroutineScope()
    var editOrderError by remember { mutableStateOf<String?>(null) }
    var editOrderLoading by remember { mutableStateOf(false) }
    val unselectedTabColor = if (isSystemInDarkTheme()) {
        MaterialTheme.colorScheme.onSurfaceVariant
    } else {
        AppMuted
    }

    fun editOrderIntoCart(orderId: Int) {
        if (editOrderLoading) return
        scope.launch {
            editOrderLoading = true
            editOrderError = null
            val result = loadOrderIntoCart(orderId)
            editOrderLoading = false
            result
                .onSuccess {
                    MainTabRouter.openHome()
                    rootNavController.navigate(Routes.cart()) {
                        launchSingleTop = true
                    }
                }
                .onFailure { editOrderError = it.message }
        }
    }

    LaunchedOpenPendingOrder(rootNavController, startOrderId)

    LaunchedEffect(Unit) {
        MainTabRouter.selectTab.collect { route ->
            tabNav.navigate(route) {
                popUpTo(tabNav.graph.findStartDestination().id) { saveState = true }
                launchSingleTop = true
                // Fresh list after create — don't restore a stale Orders snapshot.
                restoreState = false
            }
            MainTabRouter.tabShown(route)
        }
    }

    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = MaterialTheme.colorScheme.surface,
                tonalElevation = 0.dp,
            ) {
                MainTab.entries.forEach { tab ->
                    val selected = current == tab.route
                    NavigationBarItem(
                        selected = selected,
                        onClick = {
                            tabNav.navigate(tab.route) {
                                popUpTo(tabNav.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = {
                            Icon(
                                when (tab) {
                                    MainTab.Home -> Icons.Default.Home
                                    MainTab.Orders -> Icons.Default.ReceiptLong
                                    MainTab.Calendar -> Icons.Default.CalendarMonth
                                    MainTab.Overview -> Icons.Default.BarChart
                                    MainTab.Settings -> Icons.Default.Settings
                                },
                                contentDescription = stringResource(tab.labelRes),
                            )
                        },
                        // Keep tab bar height stable: never wrap labels (VI "Trang chủ"
                        // etc. otherwise grow NavigationBar vertically with 5 items).
                        alwaysShowLabel = true,
                        label = {
                            Text(
                                text = stringResource(tab.labelRes),
                                maxLines = 1,
                                softWrap = false,
                                overflow = TextOverflow.Ellipsis,
                                textAlign = TextAlign.Center,
                                style = MaterialTheme.typography.labelSmall,
                                fontSize = 11.sp,
                                lineHeight = 12.sp,
                                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                            )
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MaterialTheme.colorScheme.onSurface,
                            selectedTextColor = MaterialTheme.colorScheme.onSurface,
                            unselectedIconColor = unselectedTabColor,
                            unselectedTextColor = unselectedTabColor,
                            indicatorColor = Color.Transparent,
                        ),
                    )
                }
            }
        }
    ) { padding ->
        NavHost(
            navController = tabNav,
            startDestination = MainTab.Home.route,
            modifier = Modifier.padding(padding),
        ) {
            composable(MainTab.Home.route) {
                // #373: the redesigned Home behind `newProducts`; off keeps the current Home
                val features by FeatureFlags.enabled.collectAsState()
                if (MobileFeature.NEW_PRODUCTS in features) {
                    ProductsHomeScreen(
                        onOpenProduct = { id -> rootNavController.navigate(Routes.productDetailV2(id)) },
                        onOpenCart = { rootNavController.navigate(Routes.CartV2) },
                        onOpenInbox = { rootNavController.navigate(Routes.Inbox) },
                    )
                } else {
                    HomeScreen(
                        onOpenCart = { rootNavController.navigate(Routes.Cart) },
                        onOpenInbox = { rootNavController.navigate(Routes.Inbox) },
                        onCheckProductAvailability = { id ->
                            rootNavController.navigate(Routes.productAvailability(id))
                        },
                    )
                }
            }
            composable(MainTab.Orders.route) {
                // Redesigned orders tab behind the server flag (#371); the current list otherwise
                val features by FeatureFlags.enabled.collectAsState()
                if (MobileFeature.NEW_ORDERS in features) {
                    OrdersHomeScreen(onOpenOrder = { id -> rootNavController.navigate(Routes.orderDetail(id)) })
                    return@composable
                }
                OrdersScreen(
                    onOpenOrder = { id -> rootNavController.navigate(Routes.orderDetail(id)) },
                    onOrderCheck = { rootNavController.navigate(Routes.OrderCheck) },
                    onCameraScan = { rootNavController.navigate("camera-barcode/order") },
                    onEditOrder = { id -> editOrderIntoCart(id) },
                )
            }
            composable(MainTab.Calendar.route) {
                // #374: redesigned calendar behind `newCalendar`; off keeps the current screen
                val features by FeatureFlags.enabled.collectAsState()
                if (MobileFeature.NEW_CALENDAR in features) {
                    CalendarV2Screen(onOpenOrder = { id -> rootNavController.navigate(Routes.orderDetail(id)) })
                    return@composable
                }
                CalendarScreen(onOpenOrder = { id -> rootNavController.navigate(Routes.orderDetail(id)) })
            }
            composable(MainTab.Overview.route) {
            // #374: redesigned overview behind `newOverview`
            val features by FeatureFlags.enabled.collectAsState()
            if (MobileFeature.NEW_OVERVIEW in features) {
                OverviewV2Screen(
                    onOpenList = { kind, start, end -> rootNavController.navigate(Routes.overviewStatusOrders(kind, start, end)) },
                    onOpenProduct = { id, start, end -> rootNavController.navigate(Routes.analyticsOrders("product", id, start, end)) },
                )
                return@composable
            }
            OverviewScreen(
                onViewProductOrders = { item ->
                    item.id?.let { rootNavController.navigate(Routes.analyticsOrders("product", it)) }
                },
                onViewCustomerOrders = { item ->
                    item.id?.let { rootNavController.navigate(Routes.analyticsOrders("customer", it)) }
                },
            )
            }
            composable(MainTab.Settings.route) {
                // #374: redesigned settings behind `newSettings`; same sub-screens
                val features by FeatureFlags.enabled.collectAsState()
                if (MobileFeature.NEW_SETTINGS in features) {
                    SettingsV2Screen(
                        onOpenStore = { rootNavController.navigate(Routes.StoreInfo) },
                        onOpenPrinter = { rootNavController.navigate(Routes.Printer) },
                        onOpenCustomers = { rootNavController.navigate(Routes.Customers) },
                        onOpenUsers = { rootNavController.navigate(Routes.Users) },
                        onOpenExport = { rootNavController.navigate(Routes.Export) },
                        onOpenAppInfo = { rootNavController.navigate(Routes.AppInfo) },
                        onLoggedOut = {
                            rootNavController.navigate(Routes.Login) {
                                popUpTo(Routes.Main) { inclusive = true }
                            }
                        },
                    )
                    return@composable
                }
                SettingsScreen(
                    onOpenUsers = { rootNavController.navigate(Routes.Users) },
                    onOpenCustomers = { rootNavController.navigate(Routes.Customers) },
                    onOpenExport = { rootNavController.navigate(Routes.Export) },
                    onOpenPrinter = { rootNavController.navigate(Routes.Printer) },
                    onOpenAppInfo = { rootNavController.navigate(Routes.AppInfo) },
                    onOpenStore = { rootNavController.navigate(Routes.StoreInfo) },
                    onOpenSubscription = { rootNavController.navigate(Routes.Subscription) },
                    onOpenNotifications = { rootNavController.navigate(Routes.Inbox) },
                    onLoggedOut = {
                        rootNavController.navigate(Routes.Login) {
                            popUpTo(Routes.Main) { inclusive = true }
                        }
                    },
                )
            }
        }
    }

    editOrderError?.let { message ->
        AppAlertError(
            title = stringResource(R.string.edit_order),
            message = message,
            onDismiss = { editOrderError = null },
        )
    }

    if (editOrderLoading) {
        Dialog(
            onDismissRequest = {},
            properties = DialogProperties(
                dismissOnBackPress = false,
                dismissOnClickOutside = false,
            ),
        ) {
            Box(
                Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator()
            }
        }
    }
}

/** #386: `newAuth` from the cached app config (written on every successful fetch), else the live flags */
private fun isNewAuthOn(): Boolean =
    MobileFeature.NEW_AUTH in (SessionStoreAppConfigCache.read()?.features ?: FeatureFlags.enabled.value)

@Composable
private fun LaunchedOpenPendingOrder(navController: NavHostController, startOrderId: Int?) {
    androidx.compose.runtime.LaunchedEffect(startOrderId, SessionStore.pendingOrderId) {
        val id = startOrderId ?: SessionStore.pendingOrderId
        if (id != null && SessionStore.isLoggedIn) {
            SessionStore.pendingOrderId = null
            navController.navigate(Routes.orderDetail(id))
        }
    }
}

@Composable
private fun LaunchedOpenDraftCart(navController: NavHostController) {
    val pending by DraftOrderReminder.pendingOpenCart.collectAsState()
    val currentRoute = navController.currentBackStackEntryAsState().value?.destination?.route
    LaunchedEffect(pending, currentRoute) {
        if (!pending || !SessionStore.isLoggedIn) return@LaunchedEffect
        val dest = currentRoute ?: return@LaunchedEffect
        if (dest == Routes.Login ||
            dest == Routes.Forgot ||
            dest == Routes.Register ||
            dest == Routes.Onboarding ||
            dest.startsWith("check-email") ||
            dest == Routes.ForgotV2 ||
            dest == Routes.EmailSentV2
        ) {
            return@LaunchedEffect
        }
        if (!DraftOrderReminder.consumeOpenCart()) return@LaunchedEffect
        MainTabRouter.openHome()
        navController.navigate(Routes.cart()) { launchSingleTop = true }
    }
}
