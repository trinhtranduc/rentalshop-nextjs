package com.anyrent.pos.ui.deposit

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.anyrent.pos.R
import com.anyrent.pos.domain.deposit.DepositPlanLogic
import com.anyrent.pos.domain.deposit.DepositPlanMath
import com.anyrent.pos.domain.deposit.DepositStagePreview
import com.anyrent.pos.domain.deposit.DepositTemplate
import com.anyrent.pos.ui.common.formatMoneyVnd
import com.anyrent.pos.ui.home.v2.V2ValueRow
import com.anyrent.pos.ui.theme.DS

/**
 * The cart of a "Thu cọc theo giai đoạn" shop (#1199, iOS `CartV2ViewController.stagedSection`): the template, the
 * stages with their amount and day, and "Thu ngay giai đoạn 1". It replaces the "Cọc" row. Staff cannot pick a
 * template or edit an amount (the API uses the shop's default template for them).
 */
@Composable
internal fun CartStagedSection(
    preview: List<DepositStagePreview>,
    templateName: String,
    choices: List<DepositTemplate>,
    canEdit: Boolean,
    exceeds: Boolean,
    collectNow: Double,
    collectMethod: String,
    todayKey: String,
    staffLike: Boolean,
    onPickTemplate: (DepositTemplate) -> Unit,
    onEditStage: (Int) -> Unit,
    onCollectFirst: (String?) -> Unit,
) {
    var templateMenu by remember { mutableStateOf(false) }
    var collectMenu by remember { mutableStateOf(false) }
    val pickable = canEdit && choices.size > 1
    Column(Modifier.fillMaxWidth()) {
        Box {
            V2ValueRow(
                stringResource(R.string.deposit_cart_title),
                templateName + if (pickable) "  ⌄" else "",
                onClick = if (pickable) ({ templateMenu = true }) else null,
                valueColor = DS.Colors.Primary,
                wrapValue = true,
            )
            DropdownMenu(expanded = templateMenu, onDismissRequest = { templateMenu = false }) {
                choices.forEach { template ->
                    DropdownMenuItem(text = { Text(template.name) }, onClick = { templateMenu = false; onPickTemplate(template) })
                }
            }
        }
        DepositDivider()
        preview.forEachIndexed { index, stage ->
            StageRow(stage, editable = canEdit && !stage.isRest, todayKey = todayKey, onClick = { onEditStage(index) })
            DepositDivider()
        }
        if (exceeds) DepositWarningBox(stringResource(R.string.deposit_cart_exceeds), Modifier.padding(horizontal = 16.dp, vertical = 8.dp))
        Box {
            V2ValueRow(
                stringResource(R.string.deposit_cart_collect_first, 1),
                if (collectNow > 0 && preview.isNotEmpty()) formatMoneyVnd(preview.first().amount) + " · " + depositMethodName(collectMethod)
                else stringResource(R.string.deposit_cart_collect_none_short),
                onClick = { collectMenu = true },
                valueColor = DS.Colors.Primary,
            )
            DropdownMenu(expanded = collectMenu, onDismissRequest = { collectMenu = false }) {
                DepositPlanLogic.collectMethods(staffLike).filter { it != "CHECK" }.forEach { method ->
                    DropdownMenuItem(text = { Text(depositMethodName(method)) }, onClick = { collectMenu = false; onCollectFirst(method) })
                }
                DropdownMenuItem(text = { Text(stringResource(R.string.deposit_cart_collect_none_short)) }, onClick = { collectMenu = false; onCollectFirst(null) })
            }
        }
        DepositDivider()
    }
}

@Composable
private fun StageRow(stage: DepositStagePreview, editable: Boolean, todayKey: String, onClick: () -> Unit) {
    val due = if (stage.dueDateKey == todayKey) stringResource(R.string.deposit_due_today) else DepositPlanMath.dayText(stage.dueDateKey)
    val detail = if (stage.isRest) stringResource(R.string.deposit_cart_rest_detail, due)
    else stringResource(R.string.deposit_cart_stage_detail, DepositPlanMath.percentText(stage.percent), due)
    Row(
        Modifier.fillMaxWidth().then(if (editable) Modifier.clickable(onClick = onClick) else Modifier)
            .heightIn(min = 56.dp).padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(stage.label, fontSize = DS.TextSize.Body)
            Text(detail, fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
        }
        Text(
            formatMoneyVnd(stage.amount), fontSize = DS.TextSize.Body,
            fontWeight = if (editable) FontWeight.Bold else FontWeight.Medium,
            color = if (editable) DS.Colors.Primary else DS.Colors.Text,
        )
        if (editable) Icon(Icons.Outlined.Edit, contentDescription = null, tint = DS.Colors.Primary, modifier = Modifier.size(DS.Icon.Sm))
    }
}
