package com.anyrent.pos.ui.navigation

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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
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
import com.anyrent.pos.ui.availability.AvailabilityScreen
import com.anyrent.pos.ui.calendar.CalendarScreen
import com.anyrent.pos.ui.common.AppAlertError
import com.anyrent.pos.ui.customers.CustomersScreen
import com.anyrent.pos.ui.home.BarcodeMode
import com.anyrent.pos.ui.home.CameraBarcodeScreen
import com.anyrent.pos.ui.home.CartCheckoutScreen
import com.anyrent.pos.ui.home.HomeScreen
import com.anyrent.pos.ui.inbox.InboxScreen
import com.anyrent.pos.ui.orders.FindOrderScreen
import com.anyrent.pos.ui.orders.OrderDetailScreen
import com.anyrent.pos.ui.orders.OrdersScreen
import com.anyrent.pos.ui.overview.OverviewScreen
import com.anyrent.pos.ui.settings.AppInfoScreen
import com.anyrent.pos.ui.settings.ExportAuthScreen
import com.anyrent.pos.ui.settings.PrinterNetworkScreen
import com.anyrent.pos.ui.settings.SettingsScreen
import com.anyrent.pos.ui.settings.StoreInfoScreen
import com.anyrent.pos.ui.settings.SubscriptionScreen
import com.anyrent.pos.ui.settings.UserManagementScreen
import com.anyrent.pos.ui.theme.AppMuted
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

object Routes {
    const val Login = "login"
    const val Forgot = "forgot"
    const val Register = "register"
    const val CheckEmail = "check-email/{email}"
    const val Onboarding = "onboarding"
    const val CameraBarcode = "camera-barcode/{mode}"
    const val StoreInfo = "store-info"
    const val Main = "main"
    const val Inbox = "inbox"
    const val OrderDetail = "order/{orderId}"
    const val OrderCheck = "order-check"
    const val FindOrder = "find-order"
    const val AnalyticsOrders = "analytics-orders/{entityType}/{entityId}"
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

    fun orderDetail(id: Int) = "order/$id"
    fun analyticsOrders(entityType: String, entityId: Int) = "analytics-orders/$entityType/$entityId"
    fun overviewStatusOrders(kind: String, startDate: String, endDate: String) =
        "overview-orders/$kind/$startDate/$endDate"
    fun productAvailability(id: Int) = "product-availability/$id"
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

    LaunchedEffect(rootNavController) {
        SessionStore.sessionExpired.collect {
            rootNavController.navigate(Routes.Login) {
                popUpTo(rootNavController.graph.id) { inclusive = true }
                launchSingleTop = true
            }
        }
    }

    NavHost(navController = rootNavController, startDestination = start) {
        composable(Routes.Login) {
            LoginScreen(
                onLoggedIn = { navigateAfterLogin() },
                onForgotPassword = { rootNavController.navigate(Routes.Forgot) },
                onRegister = { rootNavController.navigate(Routes.Register) },
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
            ),
        ) { entry ->
            val entityType = entry.arguments?.getString("entityType") ?: return@composable
            val entityId = entry.arguments?.getInt("entityId") ?: return@composable
            OrdersScreen(
                onOpenOrder = { id -> rootNavController.navigate(Routes.orderDetail(id)) },
                onOrderCheck = {},
                productId = entityId.takeIf { entityType == "product" },
                customerId = entityId.takeIf { entityType == "customer" },
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
            val titleRes = when (kind.lowercase()) {
                "new" -> R.string.snapshot_new_rentals
                "pickup" -> R.string.in_progress
                "return" -> R.string.completed
                "cancelled" -> R.string.cancelled
                else -> R.string.orders
            }
            OrdersScreen(
                onOpenOrder = { id -> rootNavController.navigate(Routes.orderDetail(id)) },
                onOrderCheck = {},
                snapshotKind = kind,
                startDate = startDate,
                endDate = endDate,
                filteredTitle = stringResource(titleRes),
                onBack = { rootNavController.popBackStack() },
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
        composable(Routes.Onboarding) {
            OnboardingScreen(onFinished = {
                SessionStore.onboardingDone = true
                rootNavController.navigate(Routes.Main) {
                    popUpTo(Routes.Onboarding) { inclusive = true }
                    launchSingleTop = true
                }
            })
        }
        composable(Routes.StoreInfo) {
            StoreInfoScreen(onBack = { rootNavController.popBackStack() })
        }
        composable(Routes.Subscription) {
            SubscriptionScreen(onBack = { rootNavController.popBackStack() })
        }
        composable(Routes.Customers) {
            CustomersScreen(
                onBack = { rootNavController.popBackStack() },
                onViewOrders = { customer ->
                    rootNavController.navigate(Routes.analyticsOrders("customer", customer.id))
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
            val result = withContext(Dispatchers.IO) { ApiClient.get().getOrder(orderId) }
            editOrderLoading = false
            result.fold(
                onSuccess = { detail ->
                    runCatching { CartStore.loadFromOrderDetail(detail) }
                        .onSuccess {
                            MainTabRouter.openHome()
                            rootNavController.navigate(Routes.Cart) {
                                launchSingleTop = true
                            }
                        }
                        .onFailure { editOrderError = it.message ?: "Could not load order into cart" }
                },
                onFailure = { editOrderError = it.message ?: "Could not load order" },
            )
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
                HomeScreen(
                    onOpenCart = { rootNavController.navigate(Routes.Cart) },
                    onOpenInbox = { rootNavController.navigate(Routes.Inbox) },
                    onCheckProductAvailability = { id ->
                        rootNavController.navigate(Routes.productAvailability(id))
                    },
                )
            }
            composable(MainTab.Orders.route) {
                OrdersScreen(
                    onOpenOrder = { id -> rootNavController.navigate(Routes.orderDetail(id)) },
                    onOrderCheck = { rootNavController.navigate(Routes.OrderCheck) },
                    onCameraScan = { rootNavController.navigate("camera-barcode/order") },
                    onEditOrder = { id -> editOrderIntoCart(id) },
                )
            }
            composable(MainTab.Calendar.route) {
                CalendarScreen(onOpenOrder = { id -> rootNavController.navigate(Routes.orderDetail(id)) })
            }
            composable(MainTab.Overview.route) {
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
            dest.startsWith("check-email")
        ) {
            return@LaunchedEffect
        }
        if (!DraftOrderReminder.consumeOpenCart()) return@LaunchedEffect
        MainTabRouter.openHome()
        navController.navigate(Routes.Cart) { launchSingleTop = true }
    }
}
