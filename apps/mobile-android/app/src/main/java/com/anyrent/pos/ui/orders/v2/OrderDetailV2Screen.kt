package com.anyrent.pos.ui.orders.v2

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Cancel
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.EditCalendar
import androidx.compose.material.icons.outlined.EditNote
import androidx.compose.material.icons.outlined.Image
import androidx.compose.material.icons.outlined.MoreHoriz
import androidx.compose.material.icons.outlined.Phone
import androidx.compose.material.icons.outlined.Print
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.WarningAmber
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.anyrent.pos.AnyRentApp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiParity
import com.anyrent.pos.data.PermissionManager
import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.data.model.OrderItem
import com.anyrent.pos.domain.error.ApiErrorMessages
import com.anyrent.pos.domain.orders.BalancePayment
import com.anyrent.pos.domain.orders.DetailPrimary
import com.anyrent.pos.domain.orders.OrderDetailLogic
import com.anyrent.pos.domain.orders.OrderPlanDays
import com.anyrent.pos.domain.orders.RentalExtension
import com.anyrent.pos.domain.products.CartV2Logic
import com.anyrent.pos.print.ThermalPrinter
import com.anyrent.pos.ui.common.AppAlertConfirm
import com.anyrent.pos.ui.common.AppAlertError
import com.anyrent.pos.ui.common.AppMenuAction
import com.anyrent.pos.ui.common.AppOverflowMenuAnchor
import com.anyrent.pos.ui.common.FullScreenImagePreview
import com.anyrent.pos.ui.common.LoadingBox
import com.anyrent.pos.ui.common.StatusBadge
import com.anyrent.pos.ui.common.copyUriToCacheFile
import com.anyrent.pos.ui.common.fileToNotesJpegBytes
import com.anyrent.pos.ui.common.formatDayShort
import com.anyrent.pos.ui.common.formatMoneyVnd
import com.anyrent.pos.ui.common.orderLinePricingText
import com.anyrent.pos.ui.navigation.loadOrderIntoCart
import com.anyrent.pos.ui.orders.shareOrderReceipt
import com.anyrent.pos.ui.payment.PaymentViewModel
import com.anyrent.pos.ui.theme.DS
import java.io.File
import java.time.ZoneId
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private enum class DetailSheet { HAND_OVER, RETURN, NOTES }

internal fun OrderDetail.balancePayments(): List<BalancePayment> =
    payments.map { BalancePayment(it.amount, it.status, it.notes) }

/** `03/10` — civil day in the device zone */
internal fun shortDay(value: String?, zone: ZoneId = ZoneId.systemDefault()): String =
    OrdersHomeLogic.parseInstant(value)?.atZone(zone)?.toLocalDate()
        ?.let { "%02d/%02d".format(it.dayOfMonth, it.monthValue) } ?: "—"

/**
 * Redesigned order detail behind `newOrderDetail` (#372, boards CT-gon, CT-qua-han, CT-ban):
 * one primary action by status, ⋯ for the rest, hand-over and return sheets with the API money rule.
 */
@Composable
fun OrderDetailV2Screen(orderId: Int, onBack: () -> Unit, onEditInCart: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val factory = remember(orderId) { OrderDetailV2ViewModel.Factory(orderId) }
    val vm: OrderDetailV2ViewModel = viewModel(key = "order-detail-v2-$orderId", factory = factory)
    val state by vm.state.collectAsState()
    val app = context.applicationContext as AnyRentApp
    val paymentFactory = remember { PaymentViewModel.Factory(app.container.paymentRepository) }
    val paymentVm: PaymentViewModel = viewModel(key = "order-detail-v2-payment-$orderId", factory = paymentFactory)
    val printerPrefs = remember { context.getSharedPreferences("anyrent.printer", 0) }

    var sheet by remember { mutableStateOf<DetailSheet?>(null) }
    var menuOpen by remember { mutableStateOf(false) }
    var confirmCancel by remember { mutableStateOf(false) }
    var confirmDelete by remember { mutableStateOf(false) }
    var extending by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf(false) }
    var previewImage by remember { mutableStateOf<Any?>(null) }
    // Notes draft lives here so the gallery round-trip cannot drop it with the sheet
    var notesText by remember { mutableStateOf("") }
    var notesKept by remember { mutableStateOf<List<String>>(emptyList()) }
    var notesFiles by remember { mutableStateOf<List<File>>(emptyList()) }
    var notesPicking by remember { mutableStateOf(false) }
    var notesError by remember { mutableStateOf<String?>(null) }

    fun toast(text: String?) {
        if (!text.isNullOrBlank()) Toast.makeText(context, text, Toast.LENGTH_SHORT).show()
    }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetMultipleContents()) { uris ->
        notesPicking = false
        val slots = OrderDetailLogic.MAX_NOTE_PHOTOS - notesKept.size - notesFiles.size
        if (uris.isEmpty() || slots <= 0) return@rememberLauncherForActivityResult
        scope.launch {
            val copied = withContext(Dispatchers.IO) {
                uris.take(slots).mapNotNull { runCatching { context.copyUriToCacheFile(it) }.getOrNull() }
            }
            notesFiles = notesFiles + copied
        }
    }

    fun print(detail: OrderDetail) {
        scope.launch {
            val result = withContext(Dispatchers.IO) {
                ThermalPrinter.printOrder(ThermalPrinter.configFromPrefs(printerPrefs), detail)
            }
            when (result) {
                is ThermalPrinter.Result.Success -> Unit
                is ThermalPrinter.Result.Failure -> toast(result.message)
            }
        }
    }

    fun openNotes(detail: OrderDetail) {
        notesText = detail.summary.notes.orEmpty()
        notesKept = detail.notesImages
        notesFiles = emptyList()
        notesError = null
        sheet = DetailSheet.NOTES
    }

    fun closeNotes() {
        notesFiles.forEach { runCatching { it.delete() } }
        notesFiles = emptyList()
        sheet = null
    }

    val detail = state.detail
    val actions = detail?.let {
        OrderDetailLogic.actions(
            it.summary.orderType,
            it.summary.status,
            PermissionManager.canManageOrders(),
            PermissionManager.canDeleteCancelledOrders(),
        )
    }
    // #390: "Gia hạn" for open rentals (orders.update, OUTLET_STAFF included; the API checks the outlet)
    val canExtend = detail?.let {
        RentalExtension.canExtend(it.summary.orderType, it.summary.status, PermissionManager.canUpdateOrders())
    } == true

    Column(Modifier.fillMaxSize().background(DS.Colors.Surface).statusBarsPadding()) {
        // Top bar: back, order code, print, ⋯
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = stringResource(R.string.back), modifier = Modifier.size(DS.Icon.Lg))
            }
            Text(
                detail?.summary?.orderNumber?.let { "#$it" } ?: stringResource(R.string.order_detail),
                color = DS.Colors.TextMuted,
                fontSize = 14.sp,
                modifier = Modifier.weight(1f),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            if (detail != null && actions != null) {
                IconButton(onClick = { print(detail) }) {
                    Icon(Icons.Outlined.Print, contentDescription = stringResource(R.string.detail_print_receipt), modifier = Modifier.size(DS.Icon.Md))
                }
                val menu = buildList {
                    if (actions.canEdit) {
                        add(AppMenuAction(stringResource(R.string.edit_order), Icons.Outlined.Edit, {
                            if (!editing) {
                                editing = true
                                scope.launch {
                                    loadOrderIntoCart(orderId)
                                        .onSuccess { onEditInCart() }
                                        .onFailure { toast(it.message) }
                                    editing = false
                                }
                            }
                        }))
                    }
                    if (canExtend) {
                        add(AppMenuAction(stringResource(R.string.extend_rental), Icons.Outlined.EditCalendar, { extending = true }))
                    }
                    add(AppMenuAction(stringResource(R.string.detail_edit_notes), Icons.Outlined.EditNote, { openNotes(detail) }))
                    add(AppMenuAction(stringResource(R.string.share_order), Icons.Outlined.Share, {
                        scope.launch { runCatching { shareOrderReceipt(context, detail) }.onFailure { toast(it.message) } }
                    }))
                    if (actions.canCancel) {
                        add(AppMenuAction(stringResource(R.string.cancel_order), Icons.Outlined.Cancel, { confirmCancel = true }, destructive = true))
                    }
                    if (actions.canDelete) {
                        add(AppMenuAction(stringResource(R.string.delete_order), Icons.Outlined.Delete, { confirmDelete = true }, destructive = true))
                    }
                }
                AppOverflowMenuAnchor(
                    contentDescription = stringResource(R.string.detail_more_actions),
                    actions = menu,
                    expanded = menuOpen,
                    onExpandedChange = { menuOpen = it },
                    icon = Icons.Outlined.MoreHoriz,
                    iconSize = DS.Icon.Md,
                    iconTint = DS.Colors.Text,
                )
            }
        }

        when {
            detail == null && state.loading -> LoadingBox()
            detail == null -> Column(
                Modifier.fillMaxSize().padding(24.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(state.loadError ?: stringResource(R.string.something_went_wrong), color = DS.Colors.TextMuted)
                OutlinedButton(onClick = vm::load) { Text(stringResource(R.string.retry)) }
            }
            else -> {
                Column(Modifier.weight(1f).verticalScroll(rememberScrollState())) {
                    DetailHeader(detail)
                    DetailBody(detail, onPreview = { previewImage = it }, onEditNotes = { openNotes(detail) })
                    Spacer(Modifier.height(24.dp))
                }
                DetailBottomBar(
                    detail = detail,
                    primary = actions!!.primary,
                    canEdit = actions.canEdit,
                    canCancel = actions.canCancel,
                    canExtend = canExtend,
                    busy = state.busy || editing,
                    onHandOver = {
                        paymentVm.clearError()
                        paymentVm.setOrder(detail)
                        sheet = DetailSheet.HAND_OVER
                    },
                    onReturn = {
                        paymentVm.clearError()
                        paymentVm.setOrder(detail)
                        sheet = DetailSheet.RETURN
                    },
                    onEdit = {
                        editing = true
                        scope.launch {
                            loadOrderIntoCart(orderId).onSuccess { onEditInCart() }.onFailure { toast(it.message) }
                            editing = false
                        }
                    },
                    onCancel = { confirmCancel = true },
                    onPrint = { print(detail) },
                    onExtend = { extending = true },
                )
            }
        }
    }

    val paymentState by paymentVm.state.collectAsState()
    if (detail != null) {
        when (sheet) {
            DetailSheet.HAND_OVER -> HandOverSheet(
                detail = detail,
                payment = paymentState,
                busy = state.busy,
                onMethod = paymentVm::selectMethod,
                onShowQr = paymentVm::loadQr,
                onClearQr = paymentVm::clearQr,
                onDismiss = { sheet = null; paymentVm.clearQr() },
                onConfirm = { papers, securityDeposit ->
                    // Papers and deposit are optional (#427); the PICKUP payment follows the deposit typed in
                    val fields = OrderDetailLogic.handOverFields(
                        papers, securityDeposit, detail.collateralDetails, detail.securityDeposit,
                    )
                    val deposit = fields.securityDeposit ?: detail.securityDeposit
                    if (deposit != detail.securityDeposit || fields.collateralDetails != null) {
                        paymentVm.setOrder(
                            detail.copy(
                                securityDeposit = deposit,
                                collateralDetails = fields.collateralDetails ?: detail.collateralDetails,
                            ),
                        )
                    }
                    paymentVm.submit { vm.handOver(fields) { sheet = null } }
                },
            )
            DetailSheet.RETURN -> ReturnSheet(
                detail = detail,
                payment = paymentState,
                busy = state.busy,
                onMethod = paymentVm::selectMethod,
                onShowQr = paymentVm::loadQr,
                onClearQr = paymentVm::clearQr,
                onDismiss = { sheet = null; paymentVm.clearQr() },
                onConfirm = { late, damage, onError ->
                    scope.launch {
                        var current = detail
                        if (late != detail.lateFee || damage != detail.damageFee) {
                            val saved = vm.saveFees(late, damage)
                            saved.exceptionOrNull()?.let {
                                onError(ApiErrorMessages.resolve(context, null, it.message.orEmpty()))
                                return@launch
                            }
                            current = saved.getOrThrow()
                        }
                        // The payment amount follows the saved fees
                        paymentVm.setOrder(current)
                        paymentVm.submit { vm.changeStatus("RETURNED") { sheet = null } }
                    }
                },
            )
            DetailSheet.NOTES -> NotesSheet(
                text = notesText,
                onTextChange = { notesText = it },
                kept = notesKept,
                files = notesFiles,
                busy = state.busy,
                error = notesError,
                onRemoveKept = { notesKept = notesKept - it },
                onRemoveFile = { file -> runCatching { file.delete() }; notesFiles = notesFiles - file },
                onAdd = {
                    notesPicking = true
                    picker.launch("image/*")
                },
                onPreview = { previewImage = it },
                onDismiss = { if (!notesPicking) closeNotes() },
                onSave = {
                    notesError = null
                    scope.launch {
                        val bytes = runCatching {
                            withContext(Dispatchers.IO) { notesFiles.map { fileToNotesJpegBytes(it) } }
                        }.getOrElse { notesError = it.message; return@launch }
                        vm.saveNotes(notesText.trim(), notesKept, bytes) { error ->
                            if (error == null) closeNotes() else notesError = error
                        }
                    }
                },
            )
            null -> Unit
        }
    }

    if (extending && detail != null) {
        val doneTemplate = stringResource(R.string.extend_rental_done)
        OrderExtendSheet(
            detail = detail,
            onDismiss = { extending = false },
            onExtended = { day ->
                extending = false
                toast(doneTemplate.format(formatDayShort(day.atStartOfDay(ZoneId.systemDefault()).toInstant())))
                vm.load()
            },
        )
    }

    if (confirmCancel) {
        AppAlertConfirm(
            title = stringResource(R.string.cancel_order),
            message = stringResource(R.string.cancel_order_confirmation),
            confirmLabel = stringResource(R.string.confirm),
            destructive = true,
            onConfirm = {
                confirmCancel = false
                vm.changeStatus("CANCELLED")
            },
            onDismiss = { confirmCancel = false },
        )
    }
    if (confirmDelete) {
        AppAlertConfirm(
            title = stringResource(R.string.delete_order),
            message = stringResource(R.string.delete_order_confirmation),
            confirmLabel = stringResource(R.string.delete),
            destructive = true,
            onConfirm = {
                confirmDelete = false
                scope.launch {
                    withContext(Dispatchers.IO) { ApiParity.deleteOrder(orderId) }
                        .onSuccess { onBack() }
                        .onFailure { toast(it.message) }
                }
            },
            onDismiss = { confirmDelete = false },
        )
    }
    state.statusError?.let { failure ->
        AppAlertError(
            message = ApiErrorMessages.resolve(context, failure.code, failure.message),
            onDismiss = vm::dismissStatusError,
        )
    }
    previewImage?.let { FullScreenImagePreview(model = it, onDismiss = { previewImage = null }) }
}

@Composable
private fun DetailHeader(detail: OrderDetail) {
    val context = LocalContext.current
    val summary = detail.summary
    val isRent = summary.orderType.equals("RENT", ignoreCase = true)
    val status = summary.status.uppercase()
    val lateDays = OrdersHomeLogic.lateDays(
        summary.orderType,
        summary.status,
        OrdersHomeLogic.parseInstant(summary.pickupPlanAt),
        OrdersHomeLogic.parseInstant(summary.returnPlanAt),
    )
    Column(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .padding(top = 4.dp, bottom = 16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                summary.customerName?.takeIf { it.isNotBlank() } ?: "—",
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                color = DS.Colors.Text,
                modifier = Modifier.weight(1f),
            )
            StatusBadge(summary.status)
        }
        if (lateDays > 0) {
            val returning = status == "PICKUPED"
            Row(
                Modifier
                    .fillMaxWidth()
                    .background(Color(0xFFFEF2F2), RoundedCornerShape(12.dp))
                    .border(1.dp, Color(0xFFFECACA), RoundedCornerShape(12.dp))
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Icon(Icons.Outlined.WarningAmber, contentDescription = null, tint = DS.Status.Late.text, modifier = Modifier.size(DS.Icon.Md))
                Column {
                    Text(
                        pluralStringResource(if (returning) R.plurals.detail_late_return else R.plurals.detail_late_hand_over, lateDays, lateDays),
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = Color(0xFF991B1B),
                    )
                    Text(
                        stringResource(
                            R.string.detail_due_on,
                            shortDay(if (returning) summary.returnPlanAt else summary.pickupPlanAt),
                        ),
                        fontSize = 13.sp,
                        color = Color(0xFF991B1B),
                    )
                }
            }
        }
        summary.customerPhone?.filterNot { it.isWhitespace() }?.takeIf { it.isNotBlank() }?.let { phone ->
            Button(
                onClick = { context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone"))) },
                modifier = Modifier.fillMaxWidth().height(DS.TouchTarget),
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = DS.Colors.Divider, contentColor = DS.Colors.Text),
            ) {
                Icon(Icons.Outlined.Phone, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.size(6.dp))
                Text(summary.customerPhone.orEmpty(), fontWeight = FontWeight.SemiBold)
            }
        }
        if (isRent && status != "CANCELLED") {
            val reached = when (status) {
                "RESERVED" -> 1
                "PICKUPED", "PICKED_UP" -> 2
                "RETURNED" -> 3
                else -> 0
            }
            val days = OrderDetailLogic.progressDays(summary)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf(
                    stringResource(R.string.detail_progress_booked, shortDay(days.booked)),
                    stringResource(R.string.detail_progress_hand_over, shortDay(days.handOver)),
                    stringResource(R.string.detail_progress_return, shortDay(days.returned)),
                ).forEachIndexed { index, label ->
                    val done = index < reached
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                        Box(
                            Modifier
                                .fillMaxWidth()
                                .height(4.dp)
                                .background(if (done) DS.Colors.Primary else Color(0xFFE2E8F0), RoundedCornerShape(4.dp)),
                        )
                        Text(
                            label,
                            fontSize = 12.sp,
                            fontWeight = if (done) FontWeight.SemiBold else FontWeight.Normal,
                            color = if (done) DS.Colors.Primary else DS.Colors.TextMuted,
                            maxLines = 1,
                        )
                    }
                }
            }
        }
    }
    Box(Modifier.fillMaxWidth().height(8.dp).background(DS.Colors.Background))
}

@Composable
private fun DetailBody(detail: OrderDetail, onPreview: (Any) -> Unit, onEditNotes: () -> Unit) {
    val summary = detail.summary
    val isRent = summary.orderType.equals("RENT", ignoreCase = true)
    val status = summary.status.uppercase()
    Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
        if (isRent) {
            // Day count after the dates, the cart's inclusive count (#425: it follows a Gia hạn)
            val zone = ZoneId.systemDefault()
            val days = OrderPlanDays.dayOf(summary.pickupPlanAt, zone)?.let { from ->
                OrderPlanDays.dayOf(summary.returnPlanAt, zone)?.let { to -> CartV2Logic.rentalDays(from, to) }
            }
            val dates = "${shortDay(summary.pickupPlanAt)} → ${shortDay(summary.returnPlanAt)}"
            InfoRow(stringResource(R.string.detail_schedule), days?.let { dates + " · " + pluralStringResource(R.plurals.v2_cart_days, it, it) } ?: dates)
        } else {
            val day = OrdersHomeLogic.parseInstant(summary.createdAt)?.let { formatDayShort(it) } ?: "—"
            InfoRow(stringResource(R.string.detail_sale_day), listOfNotNull(day, summary.createdByName).joinToString(" · "))
        }
        detail.collateralDetails?.takeIf { it.isNotBlank() }?.let { InfoRow(stringResource(R.string.collateral), it) }

        SectionTitle(stringResource(R.string.detail_items_count, detail.items.sumOf { it.quantity }))
        detail.items.forEach { ItemRow(it, summary.orderType) }

        SectionTitle(stringResource(R.string.detail_money))
        if (isRent) {
            val totalLabel = if (detail.discountAmount > 0) {
                stringResource(R.string.detail_total_discount, formatMoneyVnd(detail.discountAmount))
            } else {
                stringResource(R.string.total)
            }
            MoneyRow(totalLabel, formatMoneyVnd(summary.totalAmount))
            val pickedUp = status == "PICKUPED" || status == "PICKED_UP"
            // Picked up: the return lines below already settle deposit and collateral (board CT-qua-han)
            if (!pickedUp && summary.depositAmount > 0) {
                MoneyRow(stringResource(R.string.detail_deposit_paid), formatMoneyVnd(-summary.depositAmount))
            }
            if (!pickedUp && detail.securityDeposit > 0) {
                MoneyRow(stringResource(R.string.detail_collateral_money), formatMoneyVnd(detail.securityDeposit))
            }
            if (status == "RETURNED") {
                if (detail.lateFee > 0) MoneyRow(stringResource(R.string.detail_late_fee), formatMoneyVnd(detail.lateFee))
                if (detail.damageFee > 0) MoneyRow(stringResource(R.string.damage_fee), formatMoneyVnd(detail.damageFee))
            }
            when (status) {
                "RESERVED" -> {
                    val money = OrderDetailLogic.handOver(
                        summary.totalAmount, summary.depositAmount, detail.securityDeposit, detail.balancePayments(),
                    )
                    if (money.paidBefore > 0) {
                        MoneyRow(stringResource(R.string.detail_paid_before), formatMoneyVnd(-money.paidBefore))
                    }
                    MoneyRow(stringResource(R.string.detail_collect_at_hand_over), formatMoneyVnd(money.collectNow), total = true)
                }
                "PICKUPED", "PICKED_UP" -> {
                    val money = OrderDetailLogic.returnMoney(
                        detail.lateFee, detail.damageFee, detail.securityDeposit, detail.balancePayments(),
                    )
                    if (money.lateFee > 0) MoneyRow(stringResource(R.string.detail_late_fee), "+" + formatMoneyVnd(money.lateFee), valueColor = DS.Status.Late.text)
                    if (money.damageFee > 0) MoneyRow(stringResource(R.string.damage_fee), "+" + formatMoneyVnd(money.damageFee), valueColor = DS.Status.Late.text)
                    if (money.collateralMoney > 0) MoneyRow(stringResource(R.string.detail_return_collateral), formatMoneyVnd(-money.collateralMoney))
                    if (money.settledBefore > 0) MoneyRow(stringResource(R.string.detail_settled_before), formatMoneyVnd(-money.settledBefore))
                    if (money.refund > 0) {
                        MoneyRow(stringResource(R.string.detail_on_return_refund), formatMoneyVnd(money.refund), total = true)
                    } else {
                        MoneyRow(stringResource(R.string.detail_on_return_collect), formatMoneyVnd(money.collect), total = true)
                    }
                }
            }
        } else {
            MoneyRow(stringResource(R.string.detail_goods), formatMoneyVnd(summary.totalAmount + detail.discountAmount))
            if (detail.discountAmount > 0) {
                MoneyRow(stringResource(R.string.discount), formatMoneyVnd(-detail.discountAmount))
            }
            when (status) {
                "COMPLETED" -> MoneyRow(stringResource(R.string.detail_paid), formatMoneyVnd(summary.totalAmount), total = true)
                "RESERVED" -> {
                    val due = OrderDetailLogic.balance(
                        summary.orderType, summary.status, summary.totalAmount, 0.0, 0.0, 0.0, 0.0, detail.balancePayments(),
                    ).amountDue
                    MoneyRow(stringResource(R.string.detail_to_collect), formatMoneyVnd(due), total = true)
                }
            }
        }

        val note = summary.notes?.takeIf { it.isNotBlank() }
        if (note != null || detail.notesImages.isNotEmpty()) {
            Column(
                Modifier
                    .padding(top = 12.dp)
                    .fillMaxWidth()
                    .background(Color(0xFFFFFBEB), RoundedCornerShape(10.dp))
                    .clickable(onClick = onEditNotes)
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                note?.let { Text("${stringResource(R.string.notes)}: $it", fontSize = 14.sp, color = Color(0xFF78350F)) }
                if (detail.notesImages.isNotEmpty()) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        detail.notesImages.forEach { url -> Thumb(url, 48.dp) { onPreview(url) } }
                    }
                }
            }
        }
    }
}

@Composable
private fun DetailBottomBar(
    detail: OrderDetail,
    primary: DetailPrimary,
    canEdit: Boolean,
    canCancel: Boolean,
    canExtend: Boolean,
    busy: Boolean,
    onHandOver: () -> Unit,
    onReturn: () -> Unit,
    onEdit: () -> Unit,
    onCancel: () -> Unit,
    onPrint: () -> Unit,
    onExtend: () -> Unit,
) {
    val isSale = detail.summary.orderType.equals("SALE", ignoreCase = true)
    HorizontalDivider(color = DS.Colors.Border)
    Row(
        Modifier
            .fillMaxWidth()
            .background(DS.Colors.Surface)
            .navigationBarsPadding()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        when {
            primary == DetailPrimary.HAND_OVER -> {
                if (canEdit) SecondaryBarButton(stringResource(R.string.edit_order), Modifier.weight(1f), !busy, onClick = onEdit)
                val due = OrderDetailLogic.handOver(
                    detail.summary.totalAmount, detail.summary.depositAmount, detail.securityDeposit, detail.balancePayments(),
                ).collectNow
                PrimaryBarButton(
                    if (due > 0) stringResource(R.string.detail_hand_over_collect, formatMoneyVnd(due))
                    else stringResource(R.string.detail_hand_over),
                    Modifier.weight(2f),
                    !busy,
                    onHandOver,
                )
            }
            primary == DetailPrimary.TAKE_RETURN -> {
                if (canExtend) SecondaryBarButton(stringResource(R.string.extend_rental), Modifier.weight(1f), !busy, onClick = onExtend)
                PrimaryBarButton(stringResource(R.string.detail_take_return), Modifier.weight(if (canExtend) 2f else 1f), !busy, onReturn)
            }
            isSale && canCancel -> {
                SecondaryBarButton(stringResource(R.string.cancel_order), Modifier.weight(1f), !busy, destructive = true, onClick = onCancel)
                PrimaryBarButton(stringResource(R.string.detail_print_receipt), Modifier.weight(2f), true, onPrint)
            }
            else -> PrimaryBarButton(stringResource(R.string.detail_print_receipt), Modifier.weight(1f), true, onPrint)
        }
    }
}

@Composable
internal fun PrimaryBarButton(text: String, modifier: Modifier, enabled: Boolean, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.height(52.dp),
        shape = RoundedCornerShape(14.dp),
        colors = ButtonDefaults.buttonColors(containerColor = DS.Colors.Primary),
        contentPadding = PaddingValues(horizontal = 12.dp),
    ) {
        Text(text, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
internal fun SecondaryBarButton(
    text: String,
    modifier: Modifier,
    enabled: Boolean,
    destructive: Boolean = false,
    onClick: () -> Unit,
) {
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.height(52.dp),
        shape = RoundedCornerShape(14.dp),
        contentPadding = PaddingValues(horizontal = 12.dp),
        colors = ButtonDefaults.outlinedButtonColors(
            contentColor = if (destructive) DS.Status.Late.text else DS.Colors.Text,
        ),
    ) {
        Text(text, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
private fun SectionTitle(text: String) {
    Text(
        text,
        fontSize = 13.sp,
        fontWeight = FontWeight.Bold,
        color = DS.Colors.TextMuted,
        modifier = Modifier.padding(top = 18.dp, bottom = 4.dp),
    )
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(
        Modifier.fillMaxWidth().heightIn(min = 48.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(label, fontSize = 14.sp, color = DS.Colors.TextMuted)
        Text(
            value,
            fontSize = 15.sp,
            fontWeight = FontWeight.SemiBold,
            color = DS.Colors.Text,
            modifier = Modifier.weight(1f),
            textAlign = androidx.compose.ui.text.style.TextAlign.End,
        )
    }
    HorizontalDivider(color = DS.Colors.Divider)
}

@Composable
internal fun MoneyRow(label: String, value: String, total: Boolean = false, valueColor: Color = DS.Colors.Text) {
    if (total) HorizontalDivider(color = Color(0xFFE2E8F0))
    Row(
        Modifier.fillMaxWidth().heightIn(min = if (total) 48.dp else 36.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            label,
            fontSize = if (total) 15.sp else 14.sp,
            fontWeight = if (total) FontWeight.SemiBold else FontWeight.Normal,
            color = if (total) DS.Colors.Text else DS.Colors.TextMuted,
            modifier = Modifier.weight(1f),
        )
        Text(
            value,
            fontSize = if (total) 20.sp else 15.sp,
            fontWeight = if (total) FontWeight.Bold else FontWeight.Normal,
            color = valueColor,
        )
    }
}

@Composable
private fun ItemRow(item: OrderItem, orderType: String) {
    Row(
        Modifier.fillMaxWidth().heightIn(min = 64.dp).padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Thumb(item.imageUrl, 48.dp)
        Column(Modifier.weight(1f)) {
            Text(
                "${item.productName ?: "—"} × ${item.quantity}",
                fontSize = 15.sp,
                fontWeight = FontWeight.Medium,
                color = DS.Colors.Text,
            )
            Text(
                orderLinePricingText(item.quantity, item.unitPrice, item.pricingType, item.rentalDays, orderType),
                fontSize = 13.sp,
                color = DS.Colors.TextMuted,
            )
        }
        Text(formatMoneyVnd(item.totalPrice), fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text)
    }
    HorizontalDivider(color = DS.Colors.Divider)
}

@Composable
internal fun Thumb(model: Any?, size: Dp, onClick: (() -> Unit)? = null) {
    val base = Modifier
        .size(size)
        .background(Color(0xFFE2E8F0), RoundedCornerShape(10.dp))
        .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(10.dp))
    Box(if (onClick != null) base.clickable(onClick = onClick) else base, contentAlignment = Alignment.Center) {
        if (model == null) {
            Icon(Icons.Outlined.Image, contentDescription = null, tint = DS.Colors.TextMuted, modifier = Modifier.size(DS.Icon.Md))
        } else {
            AsyncImage(
                model = model,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.size(size).clip(RoundedCornerShape(10.dp)),
            )
        }
    }
}

