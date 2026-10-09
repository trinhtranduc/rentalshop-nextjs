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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Image
import androidx.compose.material.icons.outlined.MoreHoriz
import androidx.compose.material.icons.outlined.Phone
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
import androidx.compose.ui.platform.LocalContext
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
import com.anyrent.pos.data.PermissionManager
import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.data.model.OrderItem
import com.anyrent.pos.domain.ShopTime
import com.anyrent.pos.domain.error.ApiErrorMessages
import com.anyrent.pos.domain.orders.BalancePayment
import com.anyrent.pos.domain.orders.DetailPrimary
import com.anyrent.pos.domain.orders.OrderActionSheet
import com.anyrent.pos.domain.orders.OrderDetailHeader
import com.anyrent.pos.domain.orders.OrderDetailLogic
import com.anyrent.pos.domain.history.ChangeHistory
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.ui.history.changeHistoryTexts
import com.anyrent.pos.domain.orders.RentalExtension
import com.anyrent.pos.print.ThermalPrinter
import com.anyrent.pos.ui.common.AppAlertConfirm
import com.anyrent.pos.ui.common.AppAlertError
import com.anyrent.pos.ui.common.FullScreenImagePreview
import com.anyrent.pos.ui.common.LoadingBox
import com.anyrent.pos.ui.common.copyUriToCacheFile
import com.anyrent.pos.ui.common.fileToNotesJpegBytes
import com.anyrent.pos.ui.common.formatDayShort
import com.anyrent.pos.ui.common.formatMoneyVnd
import com.anyrent.pos.domain.products.CartV2Logic
import com.anyrent.pos.ui.home.v2.orderItemPricingParts
import androidx.compose.material.icons.outlined.Edit
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

private enum class DetailSheet { HAND_OVER, RETURN, NOTES }

internal fun OrderDetail.balancePayments(): List<BalancePayment> =
    payments.map { BalancePayment(it.amount, it.status, it.notes) }

/** `03/10` — shop civil day (#602) */
internal fun shortDay(value: String?, zone: ZoneId = ShopTime.zone): String =
    OrdersHomeLogic.parseInstant(value)?.atZone(zone)?.toLocalDate()
        ?.let { "%02d/%02d".format(it.dayOfMonth, it.monthValue) } ?: "—"

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
                ThermalPrinter.printOrder(ThermalPrinter.configFromPrefs(printerPrefs, context.getString(R.string.bill_bank_qr_title), context.getString(R.string.bill_bank_qr_account)), detail)
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
                    DetailHeader(detail)
                    DetailBody(
                        detail,
                        onPreview = { previewImage = it },
                        onEditNotes = { openNotes(detail) },
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
                    Spacer(Modifier.height(24.dp))
                }
                DetailBottomBar(
                    detail = detail,
                    primary = actions!!.primary,
                    canEdit = actions.canEdit,
                    canCancel = actions.canCancel,
                    canExtend = canExtend,
                    busy = state.busy || editing,
                    onHandOver = { sheet = DetailSheet.HAND_OVER },
                    onReturn = { sheet = DetailSheet.RETURN },
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
            orderNumber = detail.summary.orderNumber,
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
                    OrderActionSheet.Action.CANCEL -> { confirmCancel = true }
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
            onDismiss = vm::dismissStatusError,
        )
    }
    previewImage?.let { FullScreenImagePreview(model = it, onDismiss = { previewImage = null }) }
}

@Composable
private fun DetailHeader(detail: OrderDetail) {
    val context = LocalContext.current
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
    Column(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .padding(top = 4.dp, bottom = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        // #643: name large, phone small under it, a round call button on the right (no full-width phone bar)
        val dial = OrderDetailHeader.dialNumber(summary.customerPhone)
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    OrderDetailHeader.customerName(summary.customerName) ?: stringResource(R.string.detail_walk_in),
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = DS.Colors.Text,
                )
                if (dial != null) {
                    Text(summary.customerPhone.orEmpty().trim(), fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted)
                }
            }
            if (dial != null) {
                val callLabel = stringResource(R.string.detail_call_customer)
                Box(
                    Modifier
                        .size(46.dp)
                        .clip(CircleShape)
                        .background(DS.Status.Done.fill)
                        .clickable(onClickLabel = callLabel) {
                            context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$dial")))
                        }
                        .semantics { contentDescription = callLabel },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Outlined.Phone, contentDescription = null, tint = DS.Status.Done.text, modifier = Modifier.size(DS.Icon.Md))
                }
            }
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
        // #643: one light box: status pill + note (rent) or sale day, then the three steps of a rent
        Column(
            Modifier
                .fillMaxWidth()
                .background(Color(0xFFF8FAFC), RoundedCornerShape(14.dp))
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Tag(stringResource(OrderStatusTag.labelRes(summary.status)), OrderStatusTag.colors(summary.status), RowTagStyle.STATUS)
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
                            Text(
                                step.day,
                                fontSize = DS.TextSize.Body,
                                fontWeight = FontWeight.Bold,
                                color = if (step.accent) DS.Colors.Primary else DS.Colors.Text,
                                maxLines = 1,
                            )
                        }
                    }
                }
            }
        }
    }
    Box(Modifier.fillMaxWidth().height(8.dp).background(DS.Colors.Background))
}

/** "7 ngày · trả sau 2 ngày" (#643) */
@Composable
private fun headerNoteText(note: OrderDetailHeader.Note): String {
    val days = note.rentalDays?.let { pluralStringResource(R.plurals.detail_note_days, it, it) }
    val due = when (val d = note.due) {
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

@Composable
private fun DetailBody(
    detail: OrderDetail,
    onPreview: (Any) -> Unit,
    onEditNotes: () -> Unit,
    readyRow: (@Composable () -> Unit)? = null,
) {
    val summary = detail.summary
    val isRent = summary.orderType.equals("RENT", ignoreCase = true)
    val status = summary.status.uppercase()
    Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
        // #643: no "Lịch thuê" / "Ngày bán" rows; the header box carries the days, the steps and the sale day
        if (isRent) readyRow?.invoke()
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
                note?.let { Text("${stringResource(R.string.notes)}: $it", fontSize = DS.TextSize.Body, color = Color(0xFF78350F)) }
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
        Text(text, fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
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

/**
 * Board D2 (owner 2026-10-09): the row reads like the cart line — name, "400.000đ / theo ngày × 3 ngày", the item
 * note in a yellow box, then "SL N" and the line total (iOS `itemRow`)
 */
@Composable
private fun ItemRow(item: OrderItem, orderType: String) {
    val (amount, unit) = orderItemPricingParts(item.unitPrice, item.pricingType, item.rentalDays, !orderType.equals("RENT", ignoreCase = true))
    Row(
        Modifier.fillMaxWidth().padding(vertical = 12.dp),
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Thumb(item.imageUrl, 56.dp)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                item.productName ?: "—",
                fontSize = DS.TextSize.Name,
                fontWeight = FontWeight.SemiBold,
                color = DS.Colors.Text,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                buildAnnotatedString {
                    withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = DS.Colors.Text)) { append(amount) }
                    append(" / $unit")
                },
                fontSize = DS.TextSize.Body,
                color = Color(0xFF475569),
            )
            CartV2Logic.noteText(item.note)?.let { note -> ItemNoteBox(note) }
            Row(Modifier.fillMaxWidth().padding(top = 2.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    stringResource(R.string.v2_detail_item_qty, item.quantity),
                    fontSize = DS.TextSize.Secondary,
                    color = DS.Colors.TextMuted,
                    modifier = Modifier.weight(1f),
                )
                Text(formatMoneyVnd(item.totalPrice), fontSize = DS.TextSize.Name, fontWeight = FontWeight.Bold, color = DS.Colors.Text)
            }
        }
    }
    HorizontalDivider(color = DS.Colors.Divider)
}

/** Board D2: the item note on a light yellow box with a pencil, so it does not read as part of the name */
@Composable
private fun ItemNoteBox(note: String) {
    val ink = Color(0xFF7A4A00)
    val label = stringResource(R.string.v2_item_note_label)
    Row(
        Modifier
            .padding(top = 2.dp)
            .fillMaxWidth()
            .background(Color(0xFFFFF7E6), RoundedCornerShape(10.dp))
            .padding(horizontal = 10.dp, vertical = 8.dp)
            .semantics(mergeDescendants = true) { contentDescription = "$label: $note" },
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(Icons.Outlined.Edit, contentDescription = null, tint = ink, modifier = Modifier.padding(top = 2.dp).size(16.dp))
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

