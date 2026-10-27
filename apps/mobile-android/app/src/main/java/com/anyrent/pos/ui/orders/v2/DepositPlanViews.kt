package com.anyrent.pos.ui.orders.v2

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.ui.layout.layout
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.testTagsAsResourceId
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.data.DepositPlanApi
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.domain.ShopTime
import com.anyrent.pos.domain.deposit.DepositPlanLogic
import com.anyrent.pos.domain.deposit.DepositPlanMath
import com.anyrent.pos.domain.deposit.OrderInstallment
import com.anyrent.pos.domain.error.ApiErrorMessages
import com.anyrent.pos.domain.error.AppError
import com.anyrent.pos.ui.common.AppPrimaryButton
import com.anyrent.pos.ui.common.formatMoneyVnd
import com.anyrent.pos.ui.common.toLocalDateUtc
import com.anyrent.pos.ui.common.toUtcMillis
import com.anyrent.pos.ui.deposit.DepositFullScreen
import com.anyrent.pos.ui.deposit.DepositNote
import com.anyrent.pos.ui.deposit.DepositPill
import com.anyrent.pos.ui.deposit.DepositWarningBox
import com.anyrent.pos.ui.deposit.installmentChip
import com.anyrent.pos.ui.home.v2.SectionBand
import com.anyrent.pos.ui.home.v2.V2Colors
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.LocalDate
import java.util.UUID

/**
 * Order detail of a "Thu cọc theo giai đoạn" order (#1199, iOS `DepositPlanViews.swift`): the progress card, "Thu giai
 * đoạn N", the stages still unpaid at hand-over, the cancel sheet with the kept amount, and the plan editor.
 */

private val CardBorder = Color(0xFFE2E8F0)
private val Green = Color(0xFF10B981)
private val DarkGreen = Color(0xFF047857)

/** The shop day (Vietnam civil day) of a collection instant; never the UTC day (timezone-dates) */
private fun cutDay(iso: String?): String {
    val instant = iso?.let { runCatching { java.time.Instant.parse(it) }.getOrNull() ?: runCatching { java.time.OffsetDateTime.parse(it).toInstant() }.getOrNull() }
        ?: return DepositPlanMath.dayText(iso?.take(10))
    return DepositPlanMath.dayText(instant.atZone(ShopTime.zone).toLocalDate().toString())
}

@Composable
private fun stageSubtitle(stage: OrderInstallment): String {
    val percent = DepositPlanMath.percentText(stage.percent)
    return when {
        stage.isRest -> stringResource(R.string.deposit_card_rest_detail, DepositPlanMath.dayText(stage.dueDateKey))
        stage.isPaid -> stringResource(R.string.deposit_card_paid_detail, percent, cutDay(stage.collectedAt))
        else -> stringResource(R.string.deposit_card_due_detail, percent, DepositPlanMath.dayText(stage.dueDateKey))
    }
}

/** The card. [onEdit] is "Sửa" / "Xem"; [onCollect] is the blue button; [onStage] a tap on a paid stage (owner: void it). */
@Composable
internal fun InstallmentCard(
    detail: OrderDetail,
    role: String?,
    onEdit: () -> Unit,
    onCollect: (OrderInstallment) -> Unit,
    onStage: (OrderInstallment) -> Unit,
) {
    val info = detail.deposit ?: return
    val stages = info.installments.orEmpty()
    val summary = info.summary
    val percent = summary?.percentCollected ?: 0.0
    val collected = summary?.collected ?: stages.sumOf { it.paidAmount }
    val planned = summary?.planned ?: stages.sumOf { it.amount }
    val reserved = detail.summary.status.equals("RESERVED", true)
    val today = ShopTime.today().toString()
    Column(
        Modifier.fillMaxWidth().padding(vertical = 12.dp) // #1246: no frame; #1265: inside its own band-to-band section
            .testTag("deposit.card"),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(stringResource(R.string.deposit_card_title).uppercase(), fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Bold, color = DS.Colors.TextMuted, modifier = Modifier.weight(1f))
            DepositPill(stringResource(R.string.deposit_badge_collected, DepositPlanMath.percentText(percent)), DS.Status.Done, Modifier.testTag("deposit.card.badge"))
            if (reserved) {
                Text(
                    stringResource(if (DepositPlanLogic.canEditPlan(role)) R.string.deposit_card_edit else R.string.deposit_card_view),
                    fontSize = DS.TextSize.Body, fontWeight = FontWeight.Bold, color = DS.Colors.Primary,
                    modifier = Modifier.clickable(onClick = onEdit).heightIn(min = 44.dp).wrapContentHeight(Alignment.CenterVertically).padding(horizontal = 4.dp).testTag("deposit.card.edit"),
                )
            }
        }
        Box(Modifier.fillMaxWidth().height(8.dp).background(CardBorder, RoundedCornerShape(4.dp))) {
            Box(Modifier.fillMaxHeight().fillMaxWidth((percent / 100).coerceIn(0.0001, 1.0).toFloat()).background(Green, RoundedCornerShape(4.dp)))
        }
        Row(Modifier.fillMaxWidth()) {
            Column(Modifier.weight(1f)) {
                Text(stringResource(R.string.deposit_card_collected), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
                Text(formatMoneyVnd(collected), fontSize = DS.TextSize.Name, fontWeight = FontWeight.Bold)
            }
            Column(Modifier.weight(1f), horizontalAlignment = Alignment.End) {
                Text(stringResource(R.string.deposit_card_remaining), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
                Text(formatMoneyVnd(maxOf(0.0, planned - collected)), fontSize = DS.TextSize.Name, fontWeight = FontWeight.Bold)
            }
        }
        stages.forEachIndexed { index, stage ->
            HorizontalDividerLine()
            StageRow(stage, index + 1, today, tappable = reserved && stage.isPaid && DepositPlanLogic.canVoid(role), onTap = { onStage(stage) })
        }
        val next = if (reserved) DepositPlanLogic.nextToCollect(stages, detail.summary.status) else null
        val number = next?.let { DepositPlanLogic.stageNumber(stages, it.key) }
        if (next != null && number != null) {
            Button(
                onClick = { onCollect(next) },
                modifier = Modifier.fillMaxWidth().height(46.dp).testTag("deposit.card.collect"),
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = DS.Colors.Primary),
            ) { Text(stringResource(R.string.deposit_card_collect_stage, number), fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold) }
        }
    }
}

@Composable
private fun HorizontalDividerLine() {
    Box(Modifier.fillMaxWidth().height(1.dp).background(DS.Colors.Divider))
}

@Composable
private fun StageRow(stage: OrderInstallment, number: Int, today: String, tappable: Boolean, onTap: () -> Unit) {
    val paid = stage.isPaid
    val (chipText, chipColors) = installmentChip(stage, today)
    val late = stage.status == "OVERDUE"
    // a late stage stands out with a soft red band that bleeds 8dp past the text column
    val band = if (late) {
        Modifier.layout { measurable, constraints ->
            val bleed = 8.dp.roundToPx()
            val placeable = measurable.measure(constraints.copy(minWidth = constraints.maxWidth + 2 * bleed, maxWidth = constraints.maxWidth + 2 * bleed))
            layout(constraints.maxWidth, placeable.height) { placeable.place(-bleed, 0) }
        }.background(Color(0xFFFEF2F2), RoundedCornerShape(8.dp)).padding(horizontal = 8.dp)
    } else {
        Modifier
    }
    Row(
        Modifier.fillMaxWidth().then(band).then(if (tappable) Modifier.clickable(onClick = onTap) else Modifier).padding(vertical = 10.dp).testTag("deposit.stage.${stage.key}"),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Box(Modifier.size(24.dp).background(if (paid) Green else if (late) Color(0xFFFEE2E2) else Color(0xFFEFF6FF), CircleShape), contentAlignment = Alignment.Center) {
            Text(if (paid) "✓" else if (late) "!" else "$number", fontSize = DS.TextSize.Pill, fontWeight = FontWeight.Bold,
                color = if (paid) Color.White else if (late) Color(0xFFB91C1C) else DS.Colors.Primary)
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(if (stage.isRest) stringResource(R.string.deposit_rest_label) else stage.label, fontSize = DS.TextSize.Body)
            Text(stageSubtitle(stage), fontSize = DS.TextSize.Pill, color = DS.Colors.TextMuted)
        }
        Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(formatMoneyVnd(stage.amount), fontSize = DS.TextSize.Body, fontWeight = FontWeight.Bold)
            DepositPill(chipText, chipColors)
        }
    }
}

// MARK: Sheets

@OptIn(ExperimentalMaterial3Api::class, ExperimentalComposeUiApi::class)
@Composable
private fun DepositSheetFrame(onDismiss: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = DS.Colors.Surface,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
    ) {
        Column(
            Modifier.fillMaxWidth().semantics { testTagsAsResourceId = true }.navigationBarsPadding()
                .verticalScroll(rememberScrollState()).padding(horizontal = 16.dp).padding(bottom = 20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            content = content,
        )
    }
}

/** "Thu giai đoạn N": the amount (up to what the stage still needs); the method is always CASH (#1237) */
@Composable
internal fun CollectInstallmentSheet(
    detail: OrderDetail,
    stage: OrderInstallment,
    number: Int,
    onDismiss: () -> Unit,
    onCollected: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var amountText by remember { mutableStateOf((if (stage.remaining > 0) stage.remaining else stage.amount).toLong().toString()) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    // One per sheet: a retry after a lost answer is the same collect for the API
    val reference = remember { "android-" + UUID.randomUUID() }
    val amount = amountText.toDoubleOrNull() ?: 0.0
    val valid = amount > 0 && amount <= stage.plannedAmount + 0.000001 && !busy
    DepositSheetFrame(onDismiss = { if (!busy) onDismiss() }) {
        Text(stringResource(R.string.deposit_collect_title, number), fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Text(
            listOf(if (stage.isRest) stringResource(R.string.deposit_rest_label) else stage.label, DepositPlanMath.percentText(stage.percent) + "%").joinToString(" · "),
            fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted,
        )
        OutlinedTextField(
            value = amountText, onValueChange = { amountText = it.filter(Char::isDigit).take(12).trimStart('0'); error = null },
            singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            visualTransformation = com.anyrent.pos.ui.deposit.MoneyGrouping,
            textStyle = androidx.compose.ui.text.TextStyle(fontSize = 22.sp, fontWeight = FontWeight.Bold),
            modifier = Modifier.fillMaxWidth().testTag("deposit.collect.amount"),
        )
        error?.let { Text(it, fontSize = DS.TextSize.Secondary, color = V2Colors.Danger) }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            SecondaryBarButton(stringResource(R.string.cancel), Modifier.weight(1f), !busy, onClick = onDismiss)
            PrimaryBarButton(
                stringResource(R.string.deposit_collect_confirm, formatMoneyVnd(amount)), Modifier.weight(1.6f).testTag("deposit.collect.confirm"), valid,
            ) {
                busy = true
                scope.launch {
                    val result = withContext(Dispatchers.IO) { DepositPlanApi.collect(detail.summary.id, stage.key, amount, "CASH", reference) }
                    busy = false
                    result.onSuccess { onCollected() }
                        .onFailure { error = ApiErrorMessages.resolve(context, AppError.from(it).code, it.message.orEmpty()) }
                }
            }
        }
    }
}

/** "Còn giai đoạn cọc chưa thu": the hand-over waits until these are collected (API: INSTALLMENT_UNPAID_AT_PICKUP) */
@Composable
internal fun UnpaidStagesSheet(unpaid: List<OrderInstallment>, all: List<OrderInstallment>, onDismiss: () -> Unit, onCollect: (OrderInstallment) -> Unit) {
    DepositSheetFrame(onDismiss = onDismiss) {
        Text(stringResource(R.string.deposit_unpaid_title), fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Text(stringResource(R.string.deposit_unpaid_message), fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted)
        unpaid.forEach { stage ->
            val number = DepositPlanLogic.stageNumber(all, stage.key) ?: 0
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(stringResource(R.string.deposit_unpaid_row, number, stage.label), fontSize = DS.TextSize.Body, modifier = Modifier.weight(1f))
                Text(formatMoneyVnd(stage.amount), fontSize = DS.TextSize.Body, fontWeight = FontWeight.Bold)
            }
        }
        unpaid.firstOrNull()?.let { first ->
            val number = DepositPlanLogic.stageNumber(all, first.key) ?: 1
            PrimaryBarButton(stringResource(R.string.deposit_card_collect_stage, number), Modifier.fillMaxWidth().testTag("deposit.unpaid.collect"), true) { onCollect(first) }
        }
        SecondaryBarButton(stringResource(R.string.cancel), Modifier.fillMaxWidth(), true, onClick = onDismiss)
    }
}

/** "Huỷ đơn #N?" with the policy and "Khách đã trả / Tiệm giữ lại / Hoàn cho khách" (staff refund everything) */
@Composable
internal fun CancelDepositOrderSheet(
    orderNumber: String,
    collected: Double,
    policy: String?,
    canKeep: Boolean,
    onDismiss: () -> Unit,
    onConfirm: (kept: Double, note: String?) -> Unit,
) {
    var amounts by remember { mutableStateOf(DepositPlanLogic.CancelAmounts.keeping(0.0, collected)) }
    var keptText by remember { mutableStateOf("") }
    var refundText by remember { mutableStateOf(collected.toLong().toString()) }
    var note by remember { mutableStateOf("") }
    fun shown(v: Double) = v.toLong().toString()
    DepositSheetFrame(onDismiss = onDismiss) {
        Text(stringResource(R.string.deposit_cancel_title, orderNumber), fontSize = 22.sp, fontWeight = FontWeight.Bold)
        if (!policy.isNullOrBlank()) DepositWarningBox(stringResource(R.string.deposit_cancel_policy, policy))
        AmountLine(stringResource(R.string.deposit_cancel_paid)) { Text(formatMoneyVnd(collected), fontSize = 17.sp, fontWeight = FontWeight.Bold) }
        AmountLine(stringResource(R.string.deposit_cancel_kept)) {
            AmountField(keptText, canKeep, "deposit.cancel.kept") { text ->
                keptText = text
                amounts = DepositPlanLogic.CancelAmounts.keeping(text.toDoubleOrNull() ?: 0.0, collected)
                refundText = shown(amounts.refund)
            }
        }
        AmountLine(stringResource(R.string.deposit_cancel_refund)) {
            AmountField(refundText, canKeep, "deposit.cancel.refund") { text ->
                refundText = text
                amounts = DepositPlanLogic.CancelAmounts.refunding(text.toDoubleOrNull() ?: 0.0, collected)
                keptText = amounts.kept.takeIf { it > 0 }?.let(::shown).orEmpty()
            }
        }
        if (canKeep) {
            Text(stringResource(R.string.deposit_cancel_hint), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
            OutlinedTextField(
                value = note, onValueChange = { note = it }, singleLine = true,
                placeholder = { Text(stringResource(R.string.deposit_cancel_note)) },
                modifier = Modifier.fillMaxWidth().testTag("deposit.cancel.noteField"),
            )
        } else {
            Text(stringResource(R.string.deposit_cancel_staff_hint), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
        }
        Button(
            onClick = { onConfirm(if (canKeep) amounts.kept else 0.0, if (canKeep) note else null) },
            enabled = amounts.isValid,
            modifier = Modifier.fillMaxWidth().height(52.dp).testTag("deposit.cancel.confirm"),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626)),
        ) { Text(stringResource(R.string.deposit_cancel_confirm), fontSize = DS.TextSize.Input, fontWeight = FontWeight.Bold) }
    }
}

@Composable
private fun AmountLine(label: String, right: @Composable () -> Unit) {
    Row(Modifier.fillMaxWidth().heightIn(min = 44.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(label, fontSize = 17.sp, modifier = Modifier.weight(1f))
        right()
    }
}

@Composable
private fun AmountField(value: String, enabled: Boolean, tag: String, onChange: (String) -> Unit) {
    OutlinedTextField(
        value = value, onValueChange = { onChange(it.filter(Char::isDigit).take(12).trimStart('0')) }, enabled = enabled, singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
        visualTransformation = com.anyrent.pos.ui.deposit.MoneyGrouping,
        textStyle = androidx.compose.ui.text.TextStyle(fontSize = 17.sp, fontWeight = FontWeight.Bold, textAlign = androidx.compose.ui.text.style.TextAlign.End),
        placeholder = { Text("0", modifier = Modifier.fillMaxWidth(), textAlign = androidx.compose.ui.text.style.TextAlign.End) },
        modifier = Modifier.width(160.dp).testTag(tag),
    )
}

// MARK: Sửa kế hoạch thanh toán

private data class PlanRow(
    val key: String?,
    val label: String,
    val percentText: String,
    val dueKey: String,
    val paid: Boolean,
    /** The amount the stage had when it was opened: kept while the percentage is not touched */
    val keepAmount: Double?,
    val paidAmount: Double,
) {
    val percent: Double get() = percentText.replace(',', '.').toDoubleOrNull() ?: 0.0
}

/** Edit the plan of one order (owner and outlet admin); everyone else reads it. Stages already collected are locked. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun EditDepositPlanScreen(detail: OrderDetail, canEdit: Boolean, onDismiss: () -> Unit, onSaved: () -> Unit) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val currency = SessionStore.currency
    val orderTotal = detail.summary.totalAmount
    val stages = detail.deposit?.installments.orEmpty()
    val rest = stages.firstOrNull { it.isRest }
    var rows by remember {
        mutableStateOf(
            stages.filter { !it.isRest }.map { stage ->
                PlanRow(
                    key = stage.key, label = stage.label, percentText = DepositPlanMath.percentText(stage.percent),
                    dueKey = stage.dueDateKey ?: ShopTime.today().toString(), paid = stage.isPaid,
                    // a stage the owner gave a fixed amount keeps it until its percentage is touched
                    keepAmount = if (stage.isPaid || kotlin.math.abs(stage.plannedAmount - DepositPlanMath.percentOf(orderTotal, stage.percent, currency)) <= 0.5) null else stage.plannedAmount,
                    paidAmount = stage.paidAmount,
                )
            },
        )
    }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var pickingDate by remember { mutableStateOf<Int?>(null) }
    val secondLabel = stringResource(R.string.deposit_stage_default2)

    fun amount(row: PlanRow): Double = when {
        row.paid -> row.paidAmount
        row.keepAmount != null -> row.keepAmount
        else -> DepositPlanMath.percentOf(orderTotal, row.percent, currency)
    }
    val explicit = rows.sumOf(::amount)
    val fits = explicit <= orderTotal + 0.000001
    // the automatic last stage is the rest: when the stages fit, the plan always adds up to 100%
    val totalPercent = if (fits) 100.0 else if (orderTotal > 0) explicit / orderTotal * 100 else 0.0

    DepositFullScreen(
        stringResource(if (canEdit) R.string.deposit_plan_title_edit else R.string.deposit_plan_title_view), onBack = onDismiss,
        bottomBar = {
            if (canEdit) {
                AppPrimaryButton(
                    stringResource(R.string.deposit_plan_save), enabled = fits, loading = saving,
                    modifier = Modifier.navigationBarsPadding().padding(horizontal = 16.dp, vertical = 10.dp).testTag("deposit.plan.save"),
                    onClick = {
                        saving = true
                        val items = rows.map { row ->
                            org.json.JSONObject()
                                .put("label", row.label.trim().ifEmpty { "—" }).put("type", "PERCENT").put("value", row.percent).put("dueDateKey", row.dueKey)
                                .apply {
                                    row.key?.let { put("key", it) }
                                    if (!row.paid && row.keepAmount != null) put("amountOverride", row.keepAmount)
                                }
                        }
                        scope.launch {
                            val result = withContext(Dispatchers.IO) { DepositPlanApi.editPlan(detail.summary.id, items) }
                            saving = false
                            result.onSuccess { onSaved() }
                                .onFailure { error = ApiErrorMessages.resolve(context, AppError.from(it).code, it.message.orEmpty()) }
                        }
                    },
                )
            }
        },
    ) {
        Column(Modifier.verticalScroll(rememberScrollState())) {
            if (!canEdit) DepositWarningBox(stringResource(R.string.deposit_plan_staff_note), Modifier.padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 4.dp))
            SectionBand(stringResource(R.string.deposit_plan_header))
            Text("#${detail.summary.orderNumber} · ${formatMoneyVnd(orderTotal)}", fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted, modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp))
            rows.forEachIndexed { index, row ->
                Column(
                    Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp)
                        .background(if (row.paid) Color(0xFFF8FAFC) else Color.White, RoundedCornerShape(12.dp))
                        .border(1.dp, CardBorder, RoundedCornerShape(12.dp)).padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    OutlinedTextField(
                        value = row.label, onValueChange = { text -> rows = rows.toMutableList().also { it[index] = row.copy(label = text) } },
                        enabled = canEdit && !row.paid, singleLine = true,
                        placeholder = { Text(stringResource(R.string.deposit_template_stage_label)) },
                        modifier = Modifier.fillMaxWidth().testTag("deposit.plan.label.$index"),
                    )
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = row.percentText,
                            onValueChange = { text -> rows = rows.toMutableList().also { it[index] = row.copy(percentText = text, keepAmount = null) } },
                            enabled = canEdit && !row.paid, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            modifier = Modifier.width(96.dp).testTag("deposit.plan.percent.$index"),
                        )
                        Text(stringResource(R.string.deposit_template_percent_of_order), fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted, modifier = Modifier.weight(1f))
                        Text("= " + formatMoneyVnd(amount(row)), fontSize = DS.TextSize.Body, fontWeight = FontWeight.Bold)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(stringResource(R.string.deposit_plan_due), fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted, modifier = Modifier.weight(1f))
                        TextButton(onClick = { pickingDate = index }, enabled = canEdit && !row.paid, modifier = Modifier.testTag("deposit.plan.due.$index")) {
                            Text(DepositPlanMath.dayText(row.dueKey), fontWeight = FontWeight.Bold)
                        }
                    }
                    if (row.paid) {
                        Text(stringResource(R.string.deposit_plan_locked, DepositPlanMath.dayText(row.dueKey)), fontSize = DS.TextSize.Pill, color = DarkGreen)
                    } else if (canEdit && rows.size > 1) {
                        TextButton(onClick = { rows = rows.toMutableList().also { it.removeAt(index) } }, modifier = Modifier.align(Alignment.End)) {
                            Text(stringResource(R.string.deposit_template_remove_stage), color = V2Colors.Danger)
                        }
                    }
                }
            }
            if (canEdit && rows.size < 3) {
                TextButton(
                    onClick = {
                        val used = rows.sumOf { it.percent }
                        rows = rows + PlanRow(null, secondLabel, DepositPlanMath.percentText(minOf(40.0, maxOf(10.0, 100 - used - 10))), ShopTime.today().toString(), false, null, 0.0)
                    },
                    modifier = Modifier.heightIn(min = 48.dp).padding(start = 8.dp).testTag("deposit.plan.add"),
                ) { Text(stringResource(R.string.deposit_template_add_stage), fontWeight = FontWeight.Bold) }
            }
            rest?.let {
                Column(Modifier.padding(horizontal = 16.dp, vertical = 6.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                    Text(stringResource(R.string.deposit_rest_label), fontSize = DS.TextSize.Body, fontWeight = FontWeight.Bold)
                    Text(stringResource(R.string.deposit_plan_rest_detail, DepositPlanMath.dayText(it.dueDateKey)), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
                }
            }
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    stringResource(R.string.deposit_plan_total, DepositPlanMath.percentText(Math.round(totalPercent * 100) / 100.0), formatMoneyVnd(if (fits) orderTotal else explicit)),
                    fontSize = DS.TextSize.Name, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f),
                )
                Text(
                    if (fits) "✓ " + stringResource(R.string.deposit_plan_fits) else stringResource(R.string.deposit_cart_exceeds_short),
                    fontSize = DS.TextSize.Body, fontWeight = FontWeight.Bold, color = if (fits) DarkGreen else V2Colors.Danger,
                )
            }
            Spacer(Modifier.height(24.dp))
        }
    }
    pickingDate?.let { index ->
        val row = rows.getOrNull(index)
        if (row == null) { pickingDate = null; return@let }
        val state = rememberDatePickerState(initialSelectedDateMillis = runCatching { LocalDate.parse(row.dueKey).toUtcMillis() }.getOrNull())
        DatePickerDialog(
            onDismissRequest = { pickingDate = null },
            confirmButton = {
                TextButton(onClick = {
                    state.selectedDateMillis?.let { ms -> rows = rows.toMutableList().also { it[index] = row.copy(dueKey = ms.toLocalDateUtc().toString()) } }
                    pickingDate = null
                }) { Text(stringResource(R.string.ok)) }
            },
            dismissButton = { TextButton(onClick = { pickingDate = null }) { Text(stringResource(R.string.cancel)) } },
        ) { DatePicker(state = state) }
    }
    error?.let { com.anyrent.pos.ui.common.AppAlertError(message = it, onDismiss = { error = null }) }
}
