package com.anyrent.pos.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.anyrent.pos.R
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.ui.auth.ForgotPasswordScreen
import com.anyrent.pos.ui.settings.UserFormScreen
import com.anyrent.pos.ui.settings.StoreInfoScreen
import com.anyrent.pos.ui.settings.PrinterNetworkScreen
import com.anyrent.pos.ui.settings.ExportAuthScreen
import com.anyrent.pos.ui.home.CartCheckoutScreen
import com.anyrent.pos.ui.home.CameraBarcodeScreen
import com.anyrent.pos.ui.home.BarcodeMode
import com.anyrent.pos.ui.auth.RegisterStoreScreen
import com.anyrent.pos.ui.auth.OnboardingScreen
import com.anyrent.pos.ui.auth.CheckEmailScreen
import com.anyrent.pos.ui.auth.LoginScreen
import com.anyrent.pos.ui.calendar.CalendarScreen
import com.anyrent.pos.ui.customers.CustomersScreen
import com.anyrent.pos.ui.home.HomeScreen
import com.anyrent.pos.ui.home.ProductManageScreen
import com.anyrent.pos.ui.home.ProductFormScreen
import com.anyrent.pos.data.model.Product
import com.anyrent.pos.data.model.StaffUser
import com.anyrent.pos.ui.inbox.InboxScreen
import com.anyrent.pos.ui.orders.OrderCheckScreen
import com.anyrent.pos.ui.orders.OrderDetailScreen
import com.anyrent.pos.ui.orders.OrdersScreen
import com.anyrent.pos.ui.overview.OverviewScreen
import com.anyrent.pos.ui.settings.AppInfoScreen
import com.anyrent.pos.ui.settings.SettingsScreen
import com.anyrent.pos.ui.settings.UserManagementScreen
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

object Routes {
    const val Login = "login"
    const val Forgot = "forgot"
    const val Register = "register"
    const val CheckEmail = "check-email/{email}"
    const val Onboarding = "onboarding"
    const val CameraBarcode = "camera-barcode/{mode}"
    const val StoreInfo = "store-info"
    const val UserForm = "user-form"
    const val Main = "main"
    const val Inbox = "inbox"
    const val OrderDetail = "order/{orderId}"
    const val OrderCheck = "order-check"
    const val Cart = "cart"
    const val Barcode = "barcode"
    const val ProductNew = "product-new"
    const val ProductEdit = "product-edit/{productId}"
    const val UserEdit = "user-edit/{userId}"
    const val PickCustomer = "pick-customer"
    const val Customers = "customers"
    const val Users = "users"
    const val Export = "export"
    const val Printer = "printer"
    const val AppInfo = "app-info"

    fun orderDetail(id: Int) = "order/$id"
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
    val start = when {
        !SessionStore.onboardingDone && !SessionStore.isLoggedIn -> Routes.Onboarding
        SessionStore.isLoggedIn -> Routes.Main
        else -> Routes.Login
    }

    NavHost(navController = rootNavController, startDestination = start) {
        composable(Routes.Login) {
            LoginScreen(
                onLoggedIn = {
                    rootNavController.navigate(Routes.Main) {
                        popUpTo(Routes.Login) { inclusive = true }
                    }
                },
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
        composable(Routes.OrderCheck) {
            OrderCheckScreen(
                onBack = { rootNavController.popBackStack() },
                onOpenOrder = { id -> rootNavController.navigate(Routes.orderDetail(id)) },
            )
        }
        composable(Routes.Cart) {
            CartCheckoutScreen(
                onBack = { rootNavController.popBackStack() },
                onPickCustomer = { rootNavController.navigate(Routes.PickCustomer) },
                onCreated = { id ->
                    rootNavController.popBackStack()
                    rootNavController.navigate(Routes.orderDetail(id))
                },
            )
        }
        composable(Routes.Barcode) {
            CameraBarcodeScreen(
                mode = BarcodeMode.PRODUCT,
                onBack = { rootNavController.popBackStack() },
            )
        }
        composable(
            Routes.CameraBarcode,
            arguments = listOf(navArgument("mode") { type = NavType.StringType }),
        ) { entry ->
            val mode = if (entry.arguments?.getString("mode") == "order") BarcodeMode.ORDER else BarcodeMode.PRODUCT
            CameraBarcodeScreen(
                mode = mode,
                onBack = { rootNavController.popBackStack() },
                onOrderFound = { id -> rootNavController.navigate(Routes.orderDetail(id)) },
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
                rootNavController.navigate(Routes.Login) {
                    popUpTo(Routes.Onboarding) { inclusive = true }
                }
            })
        }
        composable(Routes.StoreInfo) {
            StoreInfoScreen(onBack = { rootNavController.popBackStack() })
        }
        composable(Routes.ProductNew) {
            ProductFormScreen(
                initial = null,
                onBack = { rootNavController.popBackStack() },
                onSaved = { rootNavController.popBackStack() },
            )
        }
        composable(
            Routes.ProductEdit,
            arguments = listOf(navArgument("productId") { type = NavType.IntType }),
        ) { entry ->
            val id = entry.arguments?.getInt("productId") ?: return@composable
            var product by remember { mutableStateOf<Product?>(null) }
            LaunchedEffect(id) {
                product = withContext(Dispatchers.IO) {
                    com.anyrent.pos.data.ApiClient.get().getProduct(id).getOrNull()
                }
            }
            product?.let {
                ProductFormScreen(
                    initial = it,
                    onBack = { rootNavController.popBackStack() },
                    onSaved = { rootNavController.popBackStack() },
                )
            }
        }
        composable(Routes.PickCustomer) {
            CustomersScreen(
                pickMode = true,
                onPicked = { rootNavController.popBackStack() },
                onBack = { rootNavController.popBackStack() },
            )
        }
        composable(Routes.Customers) {
            CustomersScreen(onBack = { rootNavController.popBackStack() })
        }
        composable(Routes.Users) {
            var editing by remember { mutableStateOf<StaffUser?>(null) }
            if (editing != null) {
                UserFormScreen(
                    initial = editing,
                    onBack = { editing = null },
                    onSaved = { editing = null },
                )
            } else {
                UserManagementScreen(
                    onBack = { rootNavController.popBackStack() },
                    onCreateUser = { rootNavController.navigate(Routes.UserForm) },
                    onEditUser = { editing = it },
                )
            }
        }
        composable(Routes.UserForm) {
            UserFormScreen(
                initial = null,
                onBack = { rootNavController.popBackStack() },
                onSaved = { rootNavController.popBackStack() },
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
}

@Composable
private fun MainTabs(
    rootNavController: NavHostController,
    startOrderId: Int?,
) {
    val tabNav = rememberNavController()
    val backStack by tabNav.currentBackStackEntryAsState()
    val current = backStack?.destination?.route

    LaunchedOpenPendingOrder(rootNavController, startOrderId)

    Scaffold(
        bottomBar = {
            NavigationBar {
                MainTab.entries.forEach { tab ->
                    NavigationBarItem(
                        selected = current == tab.route,
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
                                contentDescription = null,
                            )
                        },
                        label = { Text(stringResource(tab.labelRes)) },
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
                    onOpenBarcode = { rootNavController.navigate(Routes.Barcode) },
                    onManageProducts = { rootNavController.navigate(Routes.ProductNew) },
                    onEditProduct = { id -> rootNavController.navigate("product-edit/$id") },
                )
            }
            composable(MainTab.Orders.route) {
                OrdersScreen(
                    onOpenOrder = { id -> rootNavController.navigate(Routes.orderDetail(id)) },
                    onOrderCheck = { rootNavController.navigate(Routes.OrderCheck) },
                    onCameraScan = { rootNavController.navigate("camera-barcode/order") },
                )
            }
            composable(MainTab.Calendar.route) {
                CalendarScreen(onOpenOrder = { id -> rootNavController.navigate(Routes.orderDetail(id)) })
            }
            composable(MainTab.Overview.route) { OverviewScreen() }
            composable(MainTab.Settings.route) {
                SettingsScreen(
                    onOpenUsers = { rootNavController.navigate(Routes.Users) },
                    onOpenCustomers = { rootNavController.navigate(Routes.Customers) },
                    onOpenExport = { rootNavController.navigate(Routes.Export) },
                    onOpenPrinter = { rootNavController.navigate(Routes.Printer) },
                    onOpenAppInfo = { rootNavController.navigate(Routes.AppInfo) },
                    onOpenStore = { rootNavController.navigate(Routes.StoreInfo) },
                    onLoggedOut = {
                        rootNavController.navigate(Routes.Login) {
                            popUpTo(Routes.Main) { inclusive = true }
                        }
                    },
                )
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
