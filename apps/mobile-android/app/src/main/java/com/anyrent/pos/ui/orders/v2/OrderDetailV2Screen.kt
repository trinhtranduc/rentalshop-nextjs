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
import androidx.compose.foundation.layout.ColumnScope
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Image
import androidx.compose.material.icons.outlined.MoreHoriz
import androidx.compose.material.icons.outlined.Phone
import androidx.compose.material.icons.outlined.StickyNote2
import androidx.compose.material.icons.outlined.WarningAmber
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.layout
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiParity
import com.anyrent.pos.data.DepositModeStore
import com.anyrent.pos.data.DepositPlanApi
import com.anyrent.pos.data.PermissionManager
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.domain.deposit.DepositPlanLogic
import com.anyrent.pos.domain.deposit.OrderInstallment
import com.anyrent.pos.domain.error.AppError
import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.data.model.OrderItem
import com.anyrent.pos.domain.ShopTime
import com.anyrent.pos.domain.error.ApiErrorMessages
import com.anyrent.pos.domain.orders.BalancePayment
import com.anyrent.pos.domain.orders.OrderRowDates
import com.anyrent.pos.domain.orders.DetailPrimary
import com.anyrent.pos.domain.orders.OrderActionSheet
import com.anyrent.pos.domain.orders.OrderDetailHeader
import com.anyrent.pos.domain.orders.OrderDetailLogic
import com.anyrent.pos.domain.history.ChangeHistory
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.ui.history.changeHistoryTexts
import com.anyrent.pos.domain.orders.RentalExtension
import com.anyrent.pos.print.PrintFeedback
import com.anyrent.pos.print.ThermalPrinter
import com.anyrent.pos.ui.common.AppAlertConfirm
import com.anyrent.pos.ui.common.AppAlertError
import com.anyrent.pos.ui.common.FullScreenImagePreview
import com.anyrent.pos.ui.common.LoadingBox
import com.anyrent.pos.ui.common.copyUriToCacheFile
import com.anyrent.pos.ui.common.fileToNotesJpegBytes
import com.anyrent.pos.domain.orders.OrderPlanDays
import com.anyrent.pos.ui.common.formatDayShort
import com.anyrent.pos.ui.common.formatMoneyVnd
import com.anyrent.pos.domain.products.CartV2Logic
import com.anyrent.pos.domain.products.blockDetailLines
import com.anyrent.pos.ui.home.v2.orderItemPricingParts
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import com.anyrent.pos.ui.navigation.loadOrderIntoCart
import com.anyrent.pos.ui.orders.shareOrderReceipt
import com.anyrent.pos.ui.theme.DS
import java.io.File
import java.time.ZoneId
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private enum class DetailSheet { HAND_OVER, RETURN, NOTES, COLLATERAL }

internal fun OrderDetail.balancePayments(): List<BalancePayment> =
    payments.map { BalancePayment(it.amount, it.status, it.notes) }

/** `03/10/26` — shop civil day (#602), dd/mm/yy since #888 */
internal fun shortDay(value: String?, zone: ZoneId = ShopTime.zone): String =
    OrdersHomeLogic.parseInstant(value)?.let { OrderRowDates.dmy(it, zone) } ?: "—"

/**
 * Redesigned order detail behind `newOrderDetail` (#372, boards CT-gon, CT-qua-han, CT-ban):
 * one primary action by status, ⋯ for the rest, hand-over and return sheets with the API money rule.
 */
@Composable
fun OrderDetailV2Screen(
    orderId: Int,
    onBack: () -> Unit,
    onEditInCart: () -> Unit,
    /** #519 "Lịch sử thay đổi", with the screen subtitle "Đơn #… · <customer>" */
    onOpenHistory: (subtitle: String) -> Unit = {},
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val factory = remember(orderId) { OrderDetailV2ViewModel.Factory(orderId) }
    val vm: OrderDetailV2ViewModel = viewModel(key = "order-detail-v2-$orderId", factory = factory)
    val state by vm.state.collectAsState()
    val printerPrefs = remember { context.getSharedPreferences("anyrent.printer", 0) }

    var sheet by remember { mutableStateOf<DetailSheet?>(null) }
    var menuOpen by remember { mutableStateOf(false) }
    // #519: "N lần thay đổi · gần nhất …" under "Lịch sử thay đổi", read when the sheet opens
    var historyPage by remember { mutableStateOf<ChangeHistory.Page?>(null) }
    var confirmCancel by remember { mutableStateOf(false) }
    // #1199 "Thu cọc theo giai đoạn": the stage being collected / voided, the unpaid-stages sheet, the cancel sheet, the plan editor
    var collecting by remember { mutableStateOf<OrderInstallment?>(null) }
    var collectThenHandOver by remember { mutableStateOf(false) }
    var showUnpaid by remember { mutableStateOf(false) }
    var voiding by remember { mutableStateOf<OrderInstallment?>(null) }
    var voidError by remember { mutableStateOf<String?>(null) }
    var cancelSheet by remember { mutableStateOf(false) }
    var editingPlan by remember { mutableStateOf(false) }
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
            val config = ThermalPrinter.configFromPrefs(printerPrefs, context.getString(R.string.bill_bank_qr_title), context.getString(R.string.bill_bank_qr_account))
            val result = withContext(Dispatchers.IO) { ThermalPrinter.printOrder(config, detail) }
            when (result) {
                is ThermalPrinter.Result.Success -> Unit
                is ThermalPrinter.Result.Failure -> toast(PrintFeedback.message(context, result, config)) // #970
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
    val role = SessionStore.role
    val hasPlan = DepositPlanLogic.hasPlan(detail?.deposit)
    // Stages nobody collected block the hand-over: collect them first, then hand over (#1199)
    val unpaidStages = if (hasPlan && detail?.summary?.status.equals("RESERVED", true)) {
        DepositPlanLogic.unpaidBeforePickup(detail?.deposit?.installments.orEmpty())
    } else {
        emptyList()
    }
    fun requestHandOver() {
        if (unpaidStages.isNotEmpty()) showUnpaid = true else sheet = DetailSheet.HAND_OVER
    }
    // An order with collected stages is cancelled in the sheet "Khách đã trả / Tiệm giữ lại / Hoàn cho khách"
    fun requestCancel() {
        if (hasPlan && (detail?.deposit?.summary?.collected ?: 0.0) > 0) cancelSheet = true else confirmCancel = true
    }
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
    // #1279: "Giấy tờ & thế chân" card with "Sửa" on a picked-up rental (same orders.update gate; the API is the lock)
    val canEditCollateral = detail?.let {
        OrderDetailLogic.canEditCollateral(it.summary.orderType, it.summary.status, PermissionManager.canUpdateOrders())
    } == true
    // #470: "Sẵn sàng giao" for rentals not handed over yet (same orders.update gate as Gia hạn)
    val showReady = detail?.let {
        OrderDetailLogic.showsReadyToDeliver(it.summary.orderType, it.summary.status, PermissionManager.canUpdateOrders())
    } == true

    Column(Modifier.fillMaxSize().background(DS.Colors.Surface).statusBarsPadding()) {
        // Top bar: back, order code, ⋯ (#519: the printer icon moved into the ⋯ sheet)
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = stringResource(R.string.back), modifier = Modifier.size(DS.Icon.Lg))
            }
            // #643: "Đơn thuê #n" / "Đơn bán #n", centred between ← and ⋯
            // #643: "Đơn thuê #n" / "Đơn bán #n", centred between ← and ⋯
            Text(
                detail?.summary?.let {
                    stringResource(
                        if (OrderDetailHeader.isRent(it.orderType)) R.string.detail_title_rent else R.string.detail_title_sale,
                        it.orderNumber,
                    )
                } ?: stringResource(R.string.order_detail),
                color = DS.Colors.Text,
                fontSize = DS.TextSize.Name,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
                modifier = Modifier.weight(1f),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            if (detail != null && actions != null) {
                // #519 (board CT-thao-tac): only ⋯ in the header; it opens the action sheet
                IconButton(onClick = { menuOpen = true }) {
                    Icon(Icons.Outlined.MoreHoriz, contentDescription = stringResource(R.string.detail_more_actions), tint = DS.Colors.Text, modifier = Modifier.size(DS.Icon.Md))
                }
            } else {
                Spacer(Modifier.size(48.dp))
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
                    DetailHeader(
                        detail,
                        readyRow = if (showReady) {
                            {
                                ReadyToDeliverRow(detail, saving = state.savingReady) { value, revert ->
                                    vm.setReadyToDeliver(value) { error ->
                                        if (error != null) {
                                            revert()
                                            toast(ApiErrorMessages.resolve(context, null, error))
                                        }
                                    }
                                }
                            }
                        } else {
                            null
                        },
                    )
                    DetailBody(
                        detail,
                        depositCard = if (hasPlan) {
                            {
                                InstallmentCard(
                                    detail, role,
                                    onEdit = { editingPlan = true },
                                    onCollect = { collecting = it },
                                    onStage = { voiding = it },
                                )
                            }
                        } else {
                            null
                        },
                        onPreview = { previewImage = it },
                        onEditNotes = { openNotes(detail) },
                        onEditCollateral = if (canEditCollateral) ({ sheet = DetailSheet.COLLATERAL }) else null,
                    )
                    Spacer(Modifier.height(24.dp))
                }
                DetailBottomBar(
                    detail = detail,
                    primary = actions!!.primary,
                    canCancel = actions.canCancel,
                    busy = state.busy || editing,
                    onHandOver = ::requestHandOver,
                    onReturn = { sheet = DetailSheet.RETURN },
                    onCancel = ::requestCancel,
                    onPrint = { print(detail) },
                )
            }
        }
    }

    if (menuOpen && detail != null && actions != null) {
        val isSale = detail.summary.orderType.equals("SALE", ignoreCase = true)
        val canViewHistory = remember { PermissionManager.canViewChangeHistory() }
        val rows = OrderActionSheet.rows(actions, isSale, canExtend, canViewHistory)
        val historyTexts = remember { changeHistoryTexts(context.resources) }
        LaunchedEffect(orderId) {
            // #670: the API answers 403 to OUTLET_STAFF; no request, no row
            if (!canViewHistory) return@LaunchedEffect
            withContext(Dispatchers.IO) { ApiClient.get().orderChanges(orderId, limit = 1) }
                .onSuccess { historyPage = it }
        }
        val printerConfig = remember { ThermalPrinter.configFromPrefs(printerPrefs) }
        val historySubtitleText = stringResource(
            R.string.history_order_subtitle,
            detail.summary.orderNumber,
            detail.summary.customerName.orEmpty(),
        ).let { text -> if (detail.summary.customerName.isNullOrBlank()) text.substringBeforeLast(" · ") else text }
        OrderActionsSheet(
            rows = rows,
            printerSubtitle = OrderActionSheet.printerSubtitle(
                printerConfig.name, printerConfig.ip, stringResource(R.string.order_sheet_printer),
            ),
            notes = detail.summary.notes,
            notePhotos = detail.notesImages.size,
            historySubtitle = historyPage?.let { ChangeHistory.countSummary(it.total, it.latestAt, java.time.Instant.now(), historyTexts) },
            onDismiss = { menuOpen = false },
            onAction = { action ->
                // Same handlers as the old ⋯ menu and the bottom bar
                when (action) {
                    OrderActionSheet.Action.PRINT -> print(detail)
                    OrderActionSheet.Action.NOTES -> openNotes(detail)
                    OrderActionSheet.Action.HISTORY -> if (canViewHistory) onOpenHistory(historySubtitleText)
                    OrderActionSheet.Action.EDIT -> {
                        if (!editing) {
                            editing = true
                            scope.launch {
                                loadOrderIntoCart(orderId)
                                    .onSuccess { onEditInCart() }
                                    .onFailure { toast(it.message) }
                                editing = false
                            }
                        }
                    }
                    OrderActionSheet.Action.EXTEND -> { extending = true }
                    OrderActionSheet.Action.SHARE -> {
                        scope.launch { runCatching { shareOrderReceipt(context, detail) }.onFailure { toast(it.message) } }
                    }
                    OrderActionSheet.Action.CANCEL -> { requestCancel() }
                    OrderActionSheet.Action.DELETE -> { confirmDelete = true }
                }
                menuOpen = false
            },
        )
    }

    if (detail != null) {
        when (sheet) {
            // Like iOS (owner 2026-10-05, #448): hand-over and return send only the order update
            // (PUT /api/orders/{id}); no payment is recorded, the API works the balance out itself
            DetailSheet.HAND_OVER -> HandOverSheet(
                detail = detail,
                busy = state.busy,
                onDismiss = { sheet = null },
                onConfirm = { papers, securityDeposit ->
                    // Papers and deposit are optional (#427)
                    val fields = OrderDetailLogic.handOverFields(
                        papers, securityDeposit, detail.collateralDetails, detail.securityDeposit,
                    )
                    vm.handOver(fields) { sheet = null }
                },
            )
            DetailSheet.COLLATERAL -> CollateralEditSheet(
                detail = detail,
                busy = state.busy,
                onDismiss = { sheet = null },
                onSave = { papers, securityDeposit ->
                    val fields = OrderDetailLogic.collateralEditFields(
                        papers, securityDeposit, detail.collateralDetails, detail.securityDeposit,
                    )
                    vm.saveCollateral(fields) { ok -> if (ok) sheet = null }
                },
            )
            DetailSheet.RETURN -> ReturnSheet(
                detail = detail,
                busy = state.busy,
                onDismiss = { sheet = null },
                onConfirm = { late, damage, onError ->
                    vm.takeReturn(
                        lateFee = late,
                        damageFee = damage,
                        onError = { onError(ApiErrorMessages.resolve(context, null, it.message.orEmpty())) },
                    ) { sheet = null }
                },
            )
            // #477: full-screen editor of board GC-ghi-chu; same state, picker and save as the sheet it replaces
            DetailSheet.NOTES -> NoteEditorV2(
                orderNumber = detail.summary.orderNumber,
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
                toast(doneTemplate.format(formatDayShort(day)))
                vm.extended()
            },
        )
    }

    // --- #1199 Thu cọc theo giai đoạn
    if (detail != null) {
        val stages = detail.deposit?.installments.orEmpty()
        collecting?.let { stage ->
            CollectInstallmentSheet(
                detail = detail, stage = stage, number = DepositPlanLogic.stageNumber(stages, stage.key) ?: 1,
                onDismiss = { collecting = null; collectThenHandOver = false },
                onCollected = {
                    collecting = null
                    val handOverNext = collectThenHandOver
                    collectThenHandOver = false
                    vm.depositChanged { fresh ->
                        // more stages left: ask again; none left: the hand-over goes on
                        if (handOverNext && fresh != null) {
                            val left = DepositPlanLogic.unpaidBeforePickup(fresh.deposit?.installments.orEmpty())
                            if (left.isNotEmpty()) showUnpaid = true else sheet = DetailSheet.HAND_OVER
                        }
                    }
                },
            )
        }
        if (showUnpaid && unpaidStages.isNotEmpty()) {
            UnpaidStagesSheet(
                unpaid = unpaidStages, all = stages, onDismiss = { showUnpaid = false },
                onCollect = { stage -> showUnpaid = false; collectThenHandOver = true; collecting = stage },
            )
        }
        voiding?.let { stage ->
            val number = DepositPlanLogic.stageNumber(stages, stage.key) ?: 1
            AppAlertConfirm(
                title = stringResource(R.string.deposit_void_title, number),
                message = stringResource(R.string.deposit_void_message, formatMoneyVnd(stage.paidAmount)),
                confirmLabel = stringResource(R.string.deposit_void_confirm),
                destructive = true,
                onConfirm = {
                    voiding = null
                    scope.launch {
                        withContext(Dispatchers.IO) { DepositPlanApi.void(orderId, stage.key) }
                            .onSuccess { vm.depositChanged() }
                            .onFailure { voidError = ApiErrorMessages.resolve(context, AppError.from(it).code, it.message.orEmpty()) }
                    }
                },
                onDismiss = { voiding = null },
            )
        }
        if (cancelSheet) {
            CancelDepositOrderSheet(
                orderNumber = OrdersBoardLogic.shortNumber(detail.summary.orderNumber),
                collected = detail.deposit?.summary?.collected ?: 0.0,
                policy = detail.deposit?.policy ?: DepositModeStore.latest.value?.cancellationPolicy,
                canKeep = DepositPlanLogic.canKeepOnCancel(role),
                onDismiss = { cancelSheet = false },
                onConfirm = { kept, note -> cancelSheet = false; vm.cancel(kept, note) },
            )
        }
        if (editingPlan) {
            EditDepositPlanScreen(
                detail = detail, canEdit = DepositPlanLogic.canEditPlan(role),
                onDismiss = { editingPlan = false },
                onSaved = { editingPlan = false; vm.depositChanged() },
            )
        }
    }
    voidError?.let { AppAlertError(message = it, onDismiss = { voidError = null }) }
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
                        .onSuccess {
                            vm.deleted()
                            onBack()
                        }
                        .onFailure { toast(it.message) }
                }
            },
            onDismiss = { confirmDelete = false },
        )
    }
    state.statusError?.let { failure ->
        AppAlertError(
            message = ApiErrorMessages.resolve(context, failure.code, failure.message),
            onDismiss = {
                vm.dismissStatusError()
                // #1199: the hand-over was refused (INSTALLMENT_UNPAID_AT_PICKUP): after the reload, show the stages to collect
                if (failure.code == "INSTALLMENT_UNPAID_AT_PICKUP" && hasPlan) {
                    vm.reloadThen { fresh ->
                        if (fresh != null && DepositPlanLogic.unpaidBeforePickup(fresh.deposit?.installments.orEmpty()).isNotEmpty()) showUnpaid = true
                    }
                }
            },
        )
    }
    previewImage?.let { FullScreenImagePreview(model = it, onDismiss = { previewImage = null }) }
}

@Composable
private fun DetailHeader(detail: OrderDetail, readyRow: (@Composable () -> Unit)?) {
    val summary = detail.summary
    val isRent = OrderDetailHeader.isRent(summary.orderType)
    val status = summary.status.uppercase()
    val weekdays = stringResource(R.string.order_row_weekdays).split(',').map { it.trim() }
    val lateDays = OrdersHomeLogic.lateDays(
        summary.orderType,
        summary.status,
        OrdersHomeLogic.parseInstant(summary.pickupPlanAt),
        OrdersHomeLogic.parseInstant(summary.returnPlanAt),
    )
        // #643: one light box: status pill + note (rent) or sale day, then the three steps of a rent
        Column(
            Modifier
                .fillMaxWidth()
                // #1279 (owner chose A): edge to edge and square, like iOS; the grey band follows below
                .background(Color(0xFFF8FAFC))
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                // #891: the same badge as the order list rows
                val badge = OrderStatusTag.badge(summary.status)
                Tag(stringResource(badge.labelRes), badge.colors, badge.style)
                Spacer(Modifier.weight(1f))
                val note = if (isRent) OrderDetailHeader.note(summary) else null
                val text = if (isRent) note?.let { headerNoteText(it) }.orEmpty() else OrderDetailHeader.saleDay(summary, weekdays)
                if (text.isNotEmpty()) {
                    Text(
                        text,
                        fontSize = DS.TextSize.Secondary,
                        fontWeight = FontWeight.SemiBold,
                        color = if (note?.due is OrderDetailHeader.Due.PastPickup) DS.Status.Late.text else DS.Colors.TextMuted,
                        textAlign = TextAlign.End,
                    )
                }
            }
            val steps = OrderDetailHeader.steps(summary, weekdays)
            if (steps.isNotEmpty()) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    steps.forEach { step ->
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(1.dp)) {
                            Box(
                                Modifier
                                    .fillMaxWidth()
                                    .height(4.dp)
                                    .background(if (step.done) DS.Colors.Primary else Color(0xFFCBD5E1), RoundedCornerShape(4.dp)),
                            )
                            Spacer(Modifier.height(8.dp))
                            Text(
                                stringResource(
                                    when (step.title) {
                                        OrderDetailHeader.StepTitle.BOOKED -> R.string.detail_step_booked
                                        OrderDetailHeader.StepTitle.HAND_OVER -> R.string.detail_step_hand_over
                                        OrderDetailHeader.StepTitle.HANDED_OVER -> R.string.detail_step_handed_over
                                        OrderDetailHeader.StepTitle.RETURN -> R.string.detail_step_return
                                        OrderDetailHeader.StepTitle.RETURNED -> R.string.detail_step_returned
                                    },
                                ),
                                fontSize = DS.TextSize.Secondary,
                                color = DS.Colors.TextMuted,
                                maxLines = 1,
                            )
                            // #891: "25/09/26 22:48" shrinks to fit one line (iOS adjustsFontSizeToFitWidth, 0.8)
                            FitOneLineText(
                                step.day,
                                fontSize = DS.TextSize.Body,
                                fontWeight = FontWeight.Bold,
                                color = if (step.accent) DS.Colors.Primary else DS.Colors.Text,
                            )
                        }
                    }
                }
            }
            // #891 (owner): who created the order, next to the created step; no line without a name
            OrderDetailHeader.creatorName(summary)?.let { creator ->
                Text(
                    stringResource(R.string.detail_created_by, creator),
                    fontSize = DS.TextSize.Secondary,
                    color = DS.Colors.TextMuted,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    // #1285: under the status block: the late banner (off) and "Sẵn sàng giao"
    val showsBanner = OrderDetailHeader.showsLateBanner && lateDays > 0
    if (showsBanner || (isRent && readyRow != null)) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (showsBanner) {
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
                        fontSize = DS.TextSize.Body,
                        color = Color(0xFF991B1B),
                    )
                    Text(
                        stringResource(
                            R.string.detail_due_on,
                            shortDay(if (returning) summary.returnPlanAt else summary.pickupPlanAt),
                        ),
                        fontSize = DS.TextSize.Secondary,
                        color = Color(0xFF991B1B),
                    )
                }
            }
        }
            if (isRent) readyRow?.invoke()
        }
    }
}

/** Mockup 1b: section "KHÁCH HÀNG": the bold name, the phone under it (tap dials) and a call icon at the right (iOS `customerSection`) */
@Composable
private fun CustomerSection(detail: OrderDetail) {
    val context = LocalContext.current
    val summary = detail.summary
    val dial = OrderDetailHeader.dialNumber(summary.customerPhone)
    val callLabel = stringResource(R.string.detail_call_customer)
    val phone = summary.customerPhone?.trim()?.takeIf { it.isNotEmpty() }
    fun call() = context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$dial")))
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                OrderDetailHeader.customerName(summary.customerName) ?: stringResource(R.string.detail_walk_in),
                fontSize = DS.TextSize.Name,
                fontWeight = FontWeight.Bold,
                color = DS.Colors.Text,
            )
            if (phone != null) {
                Text(
                    phone,
                    fontSize = DS.TextSize.Secondary,
                    color = DS.Colors.TextMuted,
                    modifier = if (dial != null) Modifier.clickable(onClickLabel = callLabel) { call() } else Modifier,
                )
            }
        }
        if (phone != null && dial != null) {
            IconButton(onClick = { call() }) {
                Icon(Icons.Outlined.Phone, contentDescription = callLabel, tint = DS.Colors.Primary, modifier = Modifier.size(DS.Icon.Md))
            }
        }
    }
}

/** "7 ngày · trả sau 2 ngày" (#643) */
@Composable
private fun headerNoteText(note: OrderDetailHeader.Note): String {
    val days = note.rentalDays?.let { pluralStringResource(R.plurals.detail_note_days, it, it) }
    val due = when (val d = OrderDetailHeader.shownDue(note.due)) {
        is OrderDetailHeader.Due.ReturnIn -> pluralStringResource(R.plurals.detail_note_return_in, d.days, d.days)
        OrderDetailHeader.Due.ReturnToday -> stringResource(R.string.detail_note_return_today)
        is OrderDetailHeader.Due.HandOverIn -> pluralStringResource(R.plurals.detail_note_hand_over_in, d.days, d.days)
        OrderDetailHeader.Due.HandOverToday -> stringResource(R.string.detail_note_hand_over_today)
        is OrderDetailHeader.Due.PastPickup -> pluralStringResource(R.plurals.detail_note_past_pickup, d.days, d.days)
        OrderDetailHeader.Due.Returned -> stringResource(R.string.detail_note_returned)
        null -> null
    }
    return listOfNotNull(days, due).joinToString(" · ")
}

// Same names and values as iOS `sectionDividerColor` / `noteFillColor` / `noteInkColor`.
// This screen uses fixed light colours like iOS (locked to Light), so there is no dark variant.
private val SectionDividerColor = Color(0xFFEEF0F4)
private val NoteBoxFill = Color(0xFFF3F4F6)
private val NoteBoxInk = Color(0xFF475569)

/** The 8dp band between two sections (mockup: #EEF0F4, owner level 2; iOS `sectionBand`) */
@Composable
private fun SectionBand() {
    Box(Modifier.fillMaxWidth().height(8.dp).background(SectionDividerColor))
}

/** A section: small caps title, then its rows in the 16dp gutters (iOS `titledSection`) */
@Composable
private fun DetailSection(title: String?, tag: String? = null, content: @Composable ColumnScope.() -> Unit) {
    Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(bottom = 8.dp).let { if (tag != null) it.testTag(tag) else it }) {
        if (title != null) SectionTitle(title)
        content()
    }
}

@Composable
private fun DetailBody(
    detail: OrderDetail,
    depositCard: (@Composable () -> Unit)?,
    onPreview: (Any) -> Unit,
    onEditNotes: () -> Unit,
    onEditCollateral: (() -> Unit)? = null,
) {
    val summary = detail.summary
    val isRent = summary.orderType.equals("RENT", ignoreCase = true)
    val status = summary.status.uppercase()
    val pickedUp = status == "PICKUPED" || status == "PICKED_UP"
    // #1285 (mockup 1b): customer, items, payment, deposit stages, papers & collateral, notes; an 8dp band between sections
    Column(Modifier.fillMaxWidth()) {
        SectionBand()
        DetailSection(stringResource(R.string.customer).uppercase(), "order.detail.customerSection") { CustomerSection(detail) }
        SectionBand()
        DetailSection(stringResource(R.string.detail_items_count, detail.items.size), "order.detail.itemsSection") {
            detail.items.forEach { ItemRow(it, summary.orderType) }
            MoneyRow(stringResource(R.string.subtotal), formatMoneyVnd(OrderDetailLogic.saleSubtotal(detail.items)))
        }
        SectionBand()

        // the last "Khi nhận trả" row moves under the papers & collateral section when that shows (iOS `returnRow`);
        // the shop kept / gave back rows move under the deposit stages (computed here, not inside the section lambdas)
        val returnMoney = if (isRent && pickedUp) {
            OrderDetailLogic.returnMoney(detail.lateFee, detail.damageFee, detail.securityDeposit, detail.balancePayments())
        } else {
            null
        }
        val returnRow: @Composable () -> Unit = {
            if (returnMoney != null) {
                if (returnMoney.refund > 0) {
                    MoneyRow(stringResource(R.string.detail_on_return_refund), formatMoneyVnd(returnMoney.refund), total = true)
                } else {
                    MoneyRow(stringResource(R.string.detail_on_return_collect), formatMoneyVnd(returnMoney.collect), total = true)
                }
            }
        }
        val keptAmount = if (status == "CANCELLED") summary.cancelKeptAmount ?: 0.0 else 0.0
        val cancelRows: @Composable () -> Unit = {
            MoneyRow(stringResource(R.string.deposit_cancel_kept), formatMoneyVnd(keptAmount))
            MoneyRow(
                stringResource(R.string.deposit_cancel_refund),
                formatMoneyVnd(maxOf(0.0, (detail.deposit?.summary?.collected ?: 0.0) - keptAmount)),
            )
        }
        DetailSection(stringResource(R.string.detail_payment_title), "order.detail.paymentSection") {
            if (isRent) {
                if (detail.discountAmount > 0) MoneyRow(stringResource(R.string.discount), formatMoneyVnd(-detail.discountAmount))
                MoneyRow(stringResource(R.string.detail_rent_total), formatMoneyVnd(summary.totalAmount), total = true)
                // Picked up: the return lines below already settle deposit and collateral (board CT-qua-han)
                // #1199: the stages replace the single "Cọc" row
                if (!pickedUp && summary.depositAmount > 0 && depositCard == null) {
                    MoneyRow(stringResource(R.string.detail_deposit), formatMoneyVnd(summary.depositAmount))
                }
                // #1368: a rental waiting for pick-up with a collateral in money says rental left, collateral and what the customer hands over
                val handOverCash = OrderDetailLogic.handOverCash(
                    summary.orderType, summary.status, summary.totalAmount, summary.depositAmount, detail.securityDeposit,
                    detail.balancePayments(), detail.deposit?.hasPlan, detail.deposit?.installments,
                    com.anyrent.pos.domain.money.ShopMoney.current,
                )
                if (!pickedUp && detail.securityDeposit > 0 && handOverCash == null) {
                    MoneyRow(stringResource(R.string.detail_collateral_money), formatMoneyVnd(detail.securityDeposit))
                }
                if (status == "RETURNED") {
                    if (detail.lateFee > 0) MoneyRow(stringResource(R.string.detail_late_fee), formatMoneyVnd(detail.lateFee))
                    if (detail.damageFee > 0) MoneyRow(stringResource(R.string.damage_fee), formatMoneyVnd(detail.damageFee))
                }
                when (status) {
                    "RESERVED" -> if (handOverCash != null) {
                        MoneyRow(stringResource(R.string.share_collect_rental_left), formatMoneyVnd(handOverCash.rentalLeft), total = true)
                        MoneyRow(stringResource(R.string.share_collateral_collect), formatMoneyVnd(handOverCash.collateral))
                        MoneyRow(stringResource(R.string.share_cash_at_handover), formatMoneyVnd(handOverCash.cash), total = true)
                    } else {
                        val money = OrderDetailLogic.handOver(
                            summary.totalAmount, summary.depositAmount, detail.securityDeposit, detail.balancePayments(),
                        )
                        if (money.paidBefore > 0) {
                            MoneyRow(stringResource(R.string.detail_paid_before), formatMoneyVnd(-money.paidBefore))
                        }
                        // #1350: with a stage still to collect, the number of the stage card and the share image
                        val collect = OrderDetailLogic.collectOnDeliveryShown(
                            summary.totalAmount, summary.depositAmount, detail.securityDeposit, detail.balancePayments(),
                            detail.deposit?.hasPlan, detail.deposit?.installments, com.anyrent.pos.domain.money.ShopMoney.current,
                        )
                        MoneyRow(stringResource(R.string.detail_collect_at_hand_over), formatMoneyVnd(collect), total = true)
                    }
                    "CANCELLED" -> if (keptAmount > 0 && depositCard == null) cancelRows()  // #1199
                    "PICKUPED", "PICKED_UP" -> {
                        val money = returnMoney!!
                        if (money.lateFee > 0) MoneyRow(stringResource(R.string.detail_late_fee), "+" + formatMoneyVnd(money.lateFee), valueColor = DS.Status.Late.text)
                        if (money.damageFee > 0) MoneyRow(stringResource(R.string.damage_fee), "+" + formatMoneyVnd(money.damageFee), valueColor = DS.Status.Late.text)
                        if (money.collateralMoney > 0) MoneyRow(stringResource(R.string.detail_return_collateral), formatMoneyVnd(-money.collateralMoney))
                        if (money.settledBefore > 0) MoneyRow(stringResource(R.string.detail_settled_before), formatMoneyVnd(-money.settledBefore))
                        if (onEditCollateral == null) returnRow()
                    }
                }
            } else {
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
        }
        if (isRent && depositCard != null) {
            SectionBand()
            DetailSection(null, "deposit.section") {
                depositCard()
                if (keptAmount > 0) cancelRows()
            }
        }
        if (isRent && onEditCollateral != null) {
            SectionBand()
            DetailSection(null) {
                CollateralSection(detail, onEditCollateral)
                if (returnMoney != null) returnRow()
            }
        } else if (isRent) {
            detail.collateralDetails?.takeIf { it.isNotBlank() }?.let {
                SectionBand()
                DetailSection(null) { InfoRow(stringResource(R.string.collateral), it) }
            }
        }

        val note = summary.notes?.takeIf { it.isNotBlank() }
        if (note != null || detail.notesImages.isNotEmpty()) {
            SectionBand()
            DetailSection(stringResource(R.string.notes).uppercase(), "order.detail.notesSection") {
                Column(
                    Modifier
                        .fillMaxWidth()
                        .background(NoteBoxFill, RoundedCornerShape(10.dp))
                        .clickable(onClick = onEditNotes)
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    note?.let { Text(it, fontSize = DS.TextSize.Body, color = NoteBoxInk) }
                    if (detail.notesImages.isNotEmpty()) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            detail.notesImages.forEach { url -> Thumb(url, 48.dp) { onPreview(url) } }
                        }
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
    canCancel: Boolean,
    busy: Boolean,
    onHandOver: () -> Unit,
    onReturn: () -> Unit,
    onCancel: () -> Unit,
    onPrint: () -> Unit,
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
            // #930: "In" (no icon) next to Giao đồ / Nhận trả; Sửa đơn and Gia hạn are in the ⋯ sheet
            primary == DetailPrimary.HAND_OVER -> {
                SecondaryBarButton(stringResource(R.string.print), Modifier.weight(1f), true, onClick = onPrint)
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
                SecondaryBarButton(stringResource(R.string.print), Modifier.weight(1f), true, onClick = onPrint)
                PrimaryBarButton(stringResource(R.string.detail_take_return), Modifier.weight(2f), !busy, onReturn)
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
        // #1243: "Giao đồ · thu 12.345.678" wraps to a second line on a small phone; the amount is never cut
        Text(text, fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, maxLines = 2, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
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
        Text(text, fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
private fun SectionTitle(text: String) {
    Text(
        text,
        fontSize = DS.TextSize.Secondary,
        fontWeight = FontWeight.Bold,
        color = DS.Colors.TextMuted,
        modifier = Modifier.heightIn(min = 38.dp).wrapContentHeight(Alignment.CenterVertically),
    )
}

/** #1279 section "GIẤY TỜ & THẾ CHÂN" with "Sửa" (mockup G22-G24, owner chose A): flat like the items section, two rows like "Đã lấy", no card */
@Composable
private fun CollateralSection(detail: OrderDetail, onEdit: () -> Unit) {
    val none = stringResource(R.string.detail_collateral_none)
    Column(Modifier.fillMaxWidth().testTag("order.detail.collateralSection")) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 10.dp)) {
            Text(
                stringResource(R.string.detail_collateral_card).uppercase(),
                fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Bold, color = DS.Colors.TextMuted,
                modifier = Modifier.weight(1f),
            )
            Text(
                stringResource(R.string.detail_collateral_edit),
                fontSize = DS.TextSize.Body, fontWeight = FontWeight.Bold, color = DS.Colors.Primary,
                modifier = Modifier.heightIn(min = 48.dp).clickable(onClick = onEdit).testTag("order.detail.collateralEdit").wrapContentHeight(Alignment.CenterVertically),
            )
        }
        InfoRow(stringResource(R.string.detail_collateral_papers_row), detail.collateralDetails?.trim()?.takeIf { it.isNotEmpty() } ?: none)
        InfoRow(stringResource(R.string.detail_collateral_money_row), if (detail.securityDeposit > 0) formatMoneyVnd(detail.securityDeposit) else none)
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(
        Modifier.fillMaxWidth().heightIn(min = 48.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(label, fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted)
        Text(
            value,
            fontSize = DS.TextSize.Name,
            fontWeight = FontWeight.SemiBold,
            color = DS.Colors.Text,
            modifier = Modifier.weight(1f),
            textAlign = androidx.compose.ui.text.style.TextAlign.End,
        )
    }
    HorizontalDivider(color = DS.Colors.Divider)
}

/**
 * "Sẵn sàng giao" (#470, board CT-gon): title, subtitle and a switch that saves at once.
 * [onChange] gets the new value and a revert for a failed save; a reload resets the switch to the order.
 */
@Composable
private fun ReadyToDeliverRow(detail: OrderDetail, saving: Boolean, onChange: (Boolean, () -> Unit) -> Unit) {
    var checked by remember(detail) { mutableStateOf(detail.summary.isReadyToDeliver) }
    Row(
        Modifier.fillMaxWidth().heightIn(min = 56.dp).padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(Modifier.weight(1f)) {
            Text(
                stringResource(R.string.ready_to_deliver),
                fontSize = DS.TextSize.Body,
                fontWeight = FontWeight.SemiBold,
                color = DS.Colors.Text,
            )
            Text(
                stringResource(R.string.detail_ready_to_deliver_subtitle),
                fontSize = DS.TextSize.Secondary,
                color = DS.Colors.TextMuted,
            )
        }
        if (saving) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
        Switch(
            checked = checked,
            enabled = !saving,
            onCheckedChange = { value ->
                val before = checked
                checked = value
                onChange(value) { checked = before }
            },
            colors = SwitchDefaults.colors(
                checkedThumbColor = Color.White,
                checkedTrackColor = Color(0xFF34C759),
                checkedBorderColor = Color(0xFF34C759),
            ),
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
            fontSize = if (total) DS.TextSize.Name else DS.TextSize.Body,
            fontWeight = if (total) FontWeight.SemiBold else FontWeight.Normal,
            color = if (total) DS.Colors.Text else DS.Colors.TextMuted,
            modifier = Modifier.weight(1f),
        )
        Text(
            value,
            fontSize = if (total) DS.TextSize.Amount else DS.TextSize.Body,
            fontWeight = if (total) FontWeight.Bold else FontWeight.Normal,
            color = valueColor,
        )
    }
}

/** Bottom line of an order detail item: "1 × 400.000đ × 3 ngày" (days only for a daily rent); the total sits at the right of the name */
@Composable
private fun orderItemQuantityLine(quantity: Int, unitPrice: Double, pricingType: String?, rentalDays: Int, isSale: Boolean): String {
    val money = formatMoneyVnd(unitPrice)
    val type = pricingType?.takeIf { it.isNotBlank() } ?: "FIXED"
    if (isSale || !type.equals("DAILY", ignoreCase = true)) return "$quantity × $money"
    val days = rentalDays.coerceAtLeast(1)
    return "$quantity × $money × " + pluralStringResource(R.plurals.v2_cart_days, days, days)
}

/**
 * Mockup 1b, item style B (iOS `itemRow`): a 36dp photo, the name with the line total at the right, "SL × giá" under the name
 * (a day block adds its sum, "120.000 (3 ngày) + 2 × 20.000"), and the item note in the yellow box (#891) as the last line
 */
@Composable
private fun ItemRow(item: OrderItem, orderType: String) {
    val isRent = orderType.equals("RENT", ignoreCase = true)
    val block = if (isRent) item.blockDetailLines(LocalContext.current.resources) else null
    Row(
        Modifier.fillMaxWidth().padding(vertical = 10.dp),
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Thumb(item.imageUrl, 36.dp)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.Top) {
                Text(
                    item.productName ?: "—",
                    fontSize = DS.TextSize.Body,
                    fontWeight = FontWeight.Bold,
                    color = DS.Colors.Text,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
                Text(formatMoneyVnd(item.totalPrice), fontSize = DS.TextSize.Body, fontWeight = FontWeight.Bold, color = DS.Colors.Text)
            }
            Text(
                block?.first ?: orderItemQuantityLine(item.quantity, item.unitPrice, item.pricingType, item.rentalDays, !isRent),
                fontSize = DS.TextSize.Secondary,
                color = DS.Colors.TextMuted,
            )
            block?.second?.let { formula ->
                Text(formula, fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted, modifier = Modifier.semantics { contentDescription = "orderDetail.item.blockFormula" })
            }
            // #891 (owner): the item note is the last line of the item
            CartV2Logic.noteText(item.note)?.let { note -> ItemNoteBox(note) }
        }
    }
    HorizontalDivider(color = DS.Colors.Divider)
}

/** Board D2: the item note on a light grey box with a pencil, so it does not read as part of the name */
@Composable
private fun ItemNoteBox(note: String) {
    val ink = NoteBoxInk
    val label = stringResource(R.string.v2_item_note_label)
    Row(
        Modifier
            .padding(top = 2.dp)
            .fillMaxWidth()
            .background(NoteBoxFill, RoundedCornerShape(10.dp))
            .padding(horizontal = 10.dp, vertical = 8.dp)
            .semantics(mergeDescendants = true) { contentDescription = "$label: $note" },
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(Icons.Outlined.StickyNote2, contentDescription = null, tint = ink, modifier = Modifier.padding(top = 2.dp).size(16.dp))
        Text(note, fontSize = DS.TextSize.Secondary, color = ink)
    }
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

/** One line that shrinks (down to 70%) instead of wrapping or clipping, like iOS `adjustsFontSizeToFitWidth` */
@Composable
private fun FitOneLineText(text: String, fontSize: androidx.compose.ui.unit.TextUnit, fontWeight: FontWeight, color: Color) {
    var size by remember(text) { mutableStateOf(fontSize) }
    Text(
        text,
        fontSize = size,
        fontWeight = fontWeight,
        color = color,
        maxLines = 1,
        softWrap = false,
        onTextLayout = { layout ->
            if (layout.didOverflowWidth && size.value > fontSize.value * 0.7f) size = (size.value * 0.92f).sp
        },
    )
}
