package com.anyrent.pos.ui.deposit

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.anyrent.pos.R
import com.anyrent.pos.data.DepositModeStore
import com.anyrent.pos.data.DepositPlanApi
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.domain.deposit.DepositDueRule
import com.anyrent.pos.domain.deposit.DepositMode
import com.anyrent.pos.domain.deposit.DepositPlanLogic
import com.anyrent.pos.domain.deposit.DepositPlanMath
import com.anyrent.pos.domain.deposit.DepositSettings
import com.anyrent.pos.domain.deposit.DepositStageTemplate
import com.anyrent.pos.domain.deposit.DepositTemplate
import com.anyrent.pos.domain.error.ApiErrorMessages
import com.anyrent.pos.domain.error.AppError
import com.anyrent.pos.ui.common.AppAlertConfirm
import com.anyrent.pos.ui.common.AppAlertError
import com.anyrent.pos.ui.common.AppPrimaryButton
import com.anyrent.pos.ui.home.v2.SectionBand
import com.anyrent.pos.ui.home.v2.V2Colors
import com.anyrent.pos.ui.home.v2.V2ValueRow
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.UUID

private enum class SettingsPage { MAIN, TEMPLATES, EDITOR }

/**
 * "Cách thu cọc" (#1199, iOS `DepositSettingsViewController`): Settings → Cách thu cọc. Two modes as radio rows
 * (never a switch): "Thu cọc 1 lần" and "Thu cọc theo giai đoạn". Only the shop owner changes anything; every other
 * role reads. Mode 2 has the stage templates and the cancellation policy of the shop.
 */
@Composable
fun DepositSettingsScreen(onDismiss: () -> Unit) {
    val role = SessionStore.role
    val canEdit = DepositPlanLogic.canEditSettings(role)
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var settings by remember { mutableStateOf(DepositSettings(depositMode = DepositModeStore.current)) }
    var loaded by remember { mutableStateOf(false) }
    var saving by remember { mutableStateOf(false) }
    var page by remember { mutableStateOf(SettingsPage.MAIN) }
    var focusPolicy by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf<DepositTemplate?>(null) }
    var editingIsNew by remember { mutableStateOf(true) }
    var confirmEnable by remember { mutableStateOf(false) }
    var ownerOnlyAlert by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    // The setting is read when the screen opens (the owner may have changed it on the web)
    LaunchedEffect(Unit) {
        withContext(Dispatchers.IO) { DepositPlanApi.settings() }
            .onSuccess { settings = it; loaded = true; DepositModeStore.didSave(it) }
            .onFailure { if (!loaded) error = ApiErrorMessages.resolve(context, AppError.from(it).code, it.message.orEmpty()) }
    }

    fun failed(failure: Throwable) {
        error = ApiErrorMessages.resolve(context, AppError.from(failure).code, failure.message.orEmpty())
    }

    fun save(mode: DepositMode? = null, policy: String? = null, templates: List<DepositTemplate>? = null, onSaved: (DepositSettings) -> Unit = {}) {
        if (saving) return
        saving = true
        DepositModeStore.saving = true
        scope.launch {
            val result = withContext(Dispatchers.IO) { DepositPlanApi.saveSettings(mode, policy, templates) }
            DepositModeStore.saving = false
            saving = false
            result.onSuccess { saved ->
                settings = saved
                DepositModeStore.didSave(saved)
                onSaved(saved)
            }.onFailure(::failed)
        }
    }

    fun modeTapped(mode: DepositMode) {
        if (mode == settings.depositMode || saving) return
        if (!canEdit) { ownerOnlyAlert = true; return }
        // The warning of the mockup: staff on an older app keep collecting one deposit per product
        if (mode == DepositMode.STAGED) confirmEnable = true else save(mode = mode)
    }

    when (page) {
        SettingsPage.MAIN -> DepositFullScreen(stringResource(R.string.deposit_settings_title), onBack = onDismiss) {
            Column(Modifier.verticalScroll(rememberScrollState()).navigationBarsPadding()) {
                SectionBand(stringResource(R.string.deposit_settings_header))
                DepositRadioRow(
                    stringResource(R.string.deposit_mode_one_time), stringResource(R.string.deposit_mode_one_time_detail),
                    settings.depositMode == DepositMode.ONE_TIME, { modeTapped(DepositMode.ONE_TIME) },
                )
                DepositDivider()
                DepositRadioRow(
                    stringResource(R.string.deposit_mode_staged), stringResource(R.string.deposit_mode_staged_detail),
                    settings.depositMode == DepositMode.STAGED, { modeTapped(DepositMode.STAGED) },
                )
                DepositDivider()
                if (settings.depositMode == DepositMode.STAGED) {
                    DepositWarningBox(stringResource(R.string.deposit_warning_old_apps), Modifier.padding(horizontal = 16.dp, vertical = 12.dp))
                    SectionBand("")
                    V2ValueRow(
                        stringResource(R.string.deposit_templates_row),
                        stringResource(R.string.deposit_templates_count, settings.choices.size),
                        onClick = { focusPolicy = false; page = SettingsPage.TEMPLATES },
                    )
                    DepositDivider()
                    V2ValueRow(stringResource(R.string.deposit_policy_row), "", onClick = { focusPolicy = true; page = SettingsPage.TEMPLATES })
                    DepositDivider()
                    DepositNote(stringResource(R.string.deposit_footnote_new_orders_only))
                } else {
                    SectionBand(stringResource(R.string.deposit_one_time_read_only))
                    NumberedRow("1", stringResource(R.string.deposit_one_time_stage1), stringResource(R.string.deposit_one_time_stage1_detail))
                    DepositDivider()
                    NumberedRow("2", stringResource(R.string.deposit_one_time_stage2), stringResource(R.string.deposit_one_time_stage2_detail))
                    DepositDivider()
                    DepositNote(stringResource(R.string.deposit_one_time_footnote))
                }
                if (!canEdit) DepositNote(stringResource(R.string.deposit_owner_only))
            }
        }
        SettingsPage.TEMPLATES -> TemplatesPage(
            settings = settings, canEdit = canEdit, focusPolicy = focusPolicy, saving = saving,
            onBack = { page = SettingsPage.MAIN },
            onEdit = { template, isNew -> editing = template; editingIsNew = isNew; page = SettingsPage.EDITOR },
            onSavePolicy = { text -> save(policy = text) },
        )
        SettingsPage.EDITOR -> TemplateEditorPage(
            template = editing, isNew = editingIsNew, others = settings.templates.filter { it.id != editing?.id }, saving = saving,
            onBack = { page = SettingsPage.TEMPLATES },
            onSave = { saved ->
                // The default flag moves to this template; every other loses it
                var next = settings.templates
                if (saved.isDefault) next = next.map { it.copy(isDefault = false) }
                next = if (next.any { it.id == saved.id }) next.map { if (it.id == saved.id) saved else it } else next + saved
                save(templates = next) { page = SettingsPage.TEMPLATES }
            },
            onDelete = { id -> save(templates = settings.templates.filter { it.id != id }) { page = SettingsPage.TEMPLATES } },
        )
    }

    if (confirmEnable) {
        AppAlertConfirm(
            title = stringResource(R.string.deposit_enable_title),
            message = stringResource(R.string.deposit_warning_old_apps),
            confirmLabel = stringResource(R.string.deposit_enable_confirm),
            onConfirm = { confirmEnable = false; save(mode = DepositMode.STAGED) },
            onDismiss = { confirmEnable = false },
        )
    }
    if (ownerOnlyAlert) {
        AppAlertError(
            message = stringResource(R.string.deposit_owner_only), title = stringResource(R.string.deposit_settings_title),
            onDismiss = { ownerOnlyAlert = false },
        )
    }
    error?.let { AppAlertError(message = it, onDismiss = { error = null }) }
}

@Composable
private fun NumberedRow(number: String, title: String, detail: String) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.Top) {
        Box(Modifier.size(26.dp).background(Color(0xFFEFF6FF), CircleShape), contentAlignment = Alignment.Center) {
            Text(number, fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Bold, color = DS.Colors.Primary)
        }
        Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(title, fontSize = DS.TextSize.Input, fontWeight = FontWeight.Bold)
            Text(detail, fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
        }
    }
}

// MARK: Mẫu giai đoạn cọc + chính sách huỷ

@Composable
private fun TemplatesPage(
    settings: DepositSettings,
    canEdit: Boolean,
    focusPolicy: Boolean,
    saving: Boolean,
    onBack: () -> Unit,
    onEdit: (DepositTemplate?, Boolean) -> Unit,
    onSavePolicy: (String) -> Unit,
) {
    var policy by remember(settings.cancellationPolicy) { mutableStateOf(settings.cancellationPolicy) }
    DepositFullScreen(stringResource(R.string.deposit_templates_title), onBack = onBack) {
        Column(Modifier.verticalScroll(rememberScrollState()).navigationBarsPadding()) {
            SectionBand(stringResource(R.string.deposit_templates_title))
            DepositNote(stringResource(R.string.deposit_templates_hint))
            DepositDivider()
            if (settings.templates.isEmpty()) settings.defaultTemplate?.let { builtIn ->
                // The built-in template is a copy to save as the shop's own first template
                val copy = builtIn.copy(id = newTemplateId(), isDefault = true)
                TemplateRow(builtIn, canEdit) { onEdit(copy, true) }
            }
            settings.templates.forEach { template -> TemplateRow(template, canEdit) { onEdit(template, false) } }
            if (canEdit && settings.templates.size < 10) {
                TextButton(onClick = { onEdit(null, true) }, modifier = Modifier.heightIn(min = 52.dp).padding(start = 8.dp)) {
                    Text(stringResource(R.string.deposit_templates_add), fontSize = DS.TextSize.Input, fontWeight = FontWeight.Bold)
                }
            }
            SectionBand(stringResource(R.string.deposit_policy_header))
            DepositNote(stringResource(R.string.deposit_policy_hint))
            OutlinedTextField(
                value = policy, onValueChange = { policy = it }, enabled = canEdit,
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).heightIn(min = 110.dp),
            )
            if (canEdit) {
                AppPrimaryButton(
                    stringResource(R.string.deposit_policy_save), onClick = { onSavePolicy(policy) }, loading = saving,
                    modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 28.dp),
                )
            }
        }
    }
}

@Composable
private fun TemplateRow(template: DepositTemplate, canEdit: Boolean, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().then(if (canEdit) Modifier.clickable(onClick = onClick) else Modifier).padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(template.name, fontSize = DS.TextSize.Input, modifier = Modifier.weight(1f, fill = false))
                if (template.isDefault) DepositPill(stringResource(R.string.deposit_templates_default), DS.Status.Done)
            }
            Text(templateSummary(template), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
        }
    }
    DepositDivider()
}

/** "30% giữ chỗ · 40% trước ngày lấy · còn lại khi giao" */
@Composable
internal fun templateSummary(template: DepositTemplate): String {
    val rest = stringResource(R.string.deposit_template_rest_short)
    val parts = template.items.map { "${DepositPlanMath.percentText(it.value)}% ${it.label.lowercase()}" }
    return (parts + rest).joinToString(" · ")
}

private fun newTemplateId(): String = "t" + UUID.randomUUID().toString().take(8).lowercase()

// MARK: Sửa một mẫu

@Composable
private fun TemplateEditorPage(
    template: DepositTemplate?,
    isNew: Boolean,
    others: List<DepositTemplate>,
    saving: Boolean,
    onBack: () -> Unit,
    onSave: (DepositTemplate) -> Unit,
    onDelete: (String) -> Unit,
) {
    val templateId = remember(template) { template?.id ?: newTemplateId() }
    var name by remember(template) { mutableStateOf(template?.name.orEmpty()) }
    var isDefault by remember(template) { mutableStateOf(template?.isDefault == true || (template == null && others.isEmpty())) }
    val firstLabel = stringResource(R.string.deposit_stage_default1)
    val secondLabel = stringResource(R.string.deposit_stage_default2)
    var stages by remember(template) {
        mutableStateOf(template?.items ?: listOf(DepositStageTemplate(label = firstLabel, value = 30.0, dueRule = DepositDueRule.onCreate)))
    }
    var problem by remember { mutableStateOf<String?>(null) }
    var confirmDelete by remember { mutableStateOf(false) }
    val errName = stringResource(R.string.deposit_template_error_name)
    val errStage = stringResource(R.string.deposit_template_error_stage)
    val errTotal = stringResource(R.string.deposit_template_error_total)

    fun trySave() {
        val trimmed = name.trim()
        val total = stages.sumOf { it.value }
        problem = when {
            trimmed.isEmpty() -> errName
            stages.any { it.label.isBlank() || it.value <= 0 || it.value > 100 } -> errStage
            total > 100 -> errTotal
            else -> null
        }
        if (problem != null) return
        val items = stages.map { s ->
            s.copy(label = s.label.trim(), dueRule = if (s.dueRule.kind == DepositDueRule.ON_CREATE) s.dueRule.copy(days = null) else s.dueRule)
        }
        onSave(DepositTemplate(id = templateId, name = trimmed, isDefault = isDefault, items = items))
    }

    DepositFullScreen(
        stringResource(R.string.deposit_template_title), onBack = onBack,
        bottomBar = {
            AppPrimaryButton(
                stringResource(R.string.deposit_template_save), onClick = ::trySave, loading = saving,
                modifier = Modifier.navigationBarsPadding().padding(horizontal = 16.dp, vertical = 10.dp),
            )
        },
    ) {
        Column(Modifier.verticalScroll(rememberScrollState())) {
            SectionBand(stringResource(R.string.deposit_template_name))
            OutlinedTextField(
                value = name, onValueChange = { name = it }, maxLines = 3, // #1243: a long name wraps, never cut
                placeholder = { Text(stringResource(R.string.deposit_template_name_placeholder)) },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
            )
            SectionBand(stringResource(R.string.deposit_template_stages))
            stages.forEachIndexed { index, stage ->
                StageCard(
                    stage = stage, canRemove = stages.size > 1,
                    onChange = { changed -> stages = stages.toMutableList().also { it[index] = changed } },
                    onRemove = { stages = stages.toMutableList().also { it.removeAt(index) } },
                )
            }
            if (stages.size < 3) {
                TextButton(
                    onClick = {
                        val used = stages.sumOf { it.value }
                        stages = stages + DepositStageTemplate(secondLabel, minOf(40.0, maxOf(10.0, 100 - used - 10)), DepositDueRule.beforePickup(3))
                    },
                    modifier = Modifier.heightIn(min = 48.dp).padding(start = 8.dp),
                ) { Text(stringResource(R.string.deposit_template_add_stage), fontWeight = FontWeight.Bold) }
            }
            val rest = maxOf(0.0, 100 - stages.sumOf { it.value })
            Text(
                stringResource(R.string.deposit_template_rest, DepositPlanMath.percentText(rest)),
                fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted, modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp),
            )
            SectionBand("")
            DepositRadioRow(stringResource(R.string.deposit_template_make_default), null, isDefault, onClick = { isDefault = !isDefault })
            problem?.let { Text(it, fontSize = DS.TextSize.Secondary, color = V2Colors.Danger, modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)) }
            if (!isNew) {
                TextButton(onClick = { confirmDelete = true }, modifier = Modifier.heightIn(min = 52.dp).padding(start = 8.dp)) {
                    Text(stringResource(R.string.deposit_template_delete), color = V2Colors.Danger, fontWeight = FontWeight.Bold)
                }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
    if (confirmDelete) {
        AppAlertConfirm(
            title = stringResource(R.string.deposit_template_delete), message = stringResource(R.string.deposit_template_delete_confirm),
            confirmLabel = stringResource(R.string.deposit_template_delete), destructive = true,
            onConfirm = { confirmDelete = false; onDelete(templateId) }, onDismiss = { confirmDelete = false },
        )
    }
}

@Composable
private fun StageCard(stage: DepositStageTemplate, canRemove: Boolean, onChange: (DepositStageTemplate) -> Unit, onRemove: () -> Unit) {
    var percentText by remember { mutableStateOf(DepositPlanMath.percentText(stage.value)) }
    var menu by remember { mutableStateOf(false) }
    Column(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp)
            .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(12.dp)).padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        OutlinedTextField(
            value = stage.label, onValueChange = { onChange(stage.copy(label = it)) }, singleLine = true,
            placeholder = { Text(stringResource(R.string.deposit_template_stage_label)) }, modifier = Modifier.fillMaxWidth(),
        )
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlinedTextField(
                value = percentText,
                onValueChange = { text ->
                    percentText = text
                    onChange(stage.copy(value = text.replace(',', '.').toDoubleOrNull() ?: 0.0))
                },
                singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.width(110.dp),
            )
            Text(stringResource(R.string.deposit_template_percent_of_order), fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted)
        }
        Box {
            TextButton(onClick = { menu = true }) { Text(depositDueText(stage.dueRule) + "  ⌄", fontWeight = FontWeight.Bold) }
            DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                DropdownMenuItem(text = { Text(stringResource(R.string.deposit_due_on_create)) }, onClick = { menu = false; onChange(stage.copy(dueRule = DepositDueRule.onCreate)) })
                DropdownMenuItem(
                    text = { Text(stringResource(R.string.deposit_due_before_pickup, 3).replace("3", "N")) },
                    onClick = { menu = false; onChange(stage.copy(dueRule = DepositDueRule.beforePickup(stage.dueRule.days ?: 3))) },
                )
                DropdownMenuItem(
                    text = { Text(stringResource(R.string.deposit_due_after_create, 3).replace("3", "N")) },
                    onClick = { menu = false; onChange(stage.copy(dueRule = DepositDueRule.afterCreate(stage.dueRule.days ?: 3))) },
                )
            }
        }
        if (stage.dueRule.kind != DepositDueRule.ON_CREATE) {
            OutlinedTextField(
                value = (stage.dueRule.days ?: 0).toString(),
                onValueChange = { text -> onChange(stage.copy(dueRule = stage.dueRule.copy(days = text.filter { it.isDigit() }.take(3).toIntOrNull() ?: 0))) },
                singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.width(110.dp),
            )
        }
        if (canRemove) {
            TextButton(onClick = onRemove, modifier = Modifier.align(Alignment.End)) {
                Text(stringResource(R.string.deposit_template_remove_stage), color = V2Colors.Danger)
            }
        }
    }
}
