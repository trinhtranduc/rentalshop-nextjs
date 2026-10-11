package com.anyrent.pos.ui.home.v2

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
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.KeyboardArrowDown
import androidx.compose.material.icons.outlined.Storefront
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.data.CartStore
import com.anyrent.pos.data.CurrentOutlet
import com.anyrent.pos.domain.outlet.CurrentOutletLogic
import com.anyrent.pos.domain.outlet.OutletChoice
import com.anyrent.pos.domain.outlet.OutletHeaderMode
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.launch

/** Colours of the #828 mockup (iOS `OutletHeaderButton` / `OutletPickerSheet`) */
private object OutletColors {
    val PillFill = Color(0xFFEFF6FF)
    val SelectedBorder = Color(0xFFBFDBFE)
    val BadgeFill = Color(0xFFDBEAFE)
    val RadioOff = Color(0xFF94A3B8)
    val Subtle = Color(0xFF64748B)
}

/**
 * #828: the small line above the Home title. A merchant with two or more active branches gets "🏬 <branch> ▾"
 * (soft blue pill when not the default branch) that opens the branch sheet; everyone else sees the branch name in grey,
 * not tappable. The only place the app shows and changes the branch (owner: Home only; Orders, Calendar and Overview
 * just follow the choice).
 */
@Composable
fun OutletHeaderButton(modifier: Modifier = Modifier) {
    // Recompose when the branch or the outlet list changes
    CurrentOutlet.version.collectAsState().value
    val mode = CurrentOutlet.headerMode
    var showSheet by remember { mutableStateOf(false) }
    var confirm by remember { mutableStateOf<OutletChoice?>(null) }
    val scope = rememberCoroutineScope()

    when (mode) {
        OutletHeaderMode.Hidden -> return
        is OutletHeaderMode.Plain -> {
            val label = stringResource(R.string.outlet_header_accessibility, mode.name)
            Row(
                modifier.heightIn(min = 32.dp).semantics(mergeDescendants = true) { contentDescription = label }
                    .testTag("outlet.header.plain"),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Icon(Icons.Outlined.Storefront, contentDescription = null, tint = OutletColors.Subtle, modifier = Modifier.size(16.dp))
                Text(mode.name, fontSize = DS.TextSize.Secondary, color = OutletColors.Subtle, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
        is OutletHeaderMode.Button -> {
            val label = stringResource(R.string.outlet_header_accessibility, mode.name)
            val hint = stringResource(R.string.outlet_header_hint)
            // 44 dp touch target around the 32 dp pill (board SP-dong)
            Box(
                modifier
                    .heightIn(min = 44.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .clickable(onClickLabel = hint, role = Role.Button) {
                        showSheet = true
                        // The list may have changed on the web; the sheet shows the cached one meanwhile
                        scope.launch { CurrentOutlet.refresh() }
                    }
                    .semantics(mergeDescendants = true) { contentDescription = label }
                    .testTag("outlet.header.button"),
                contentAlignment = Alignment.CenterStart,
            ) {
                Row(
                    Modifier
                        .height(32.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(if (mode.highlighted) OutletColors.PillFill else Color.Transparent)
                        .padding(start = if (mode.highlighted) 10.dp else 0.dp, end = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Icon(Icons.Outlined.Storefront, contentDescription = null, tint = DS.Colors.Primary, modifier = Modifier.size(16.dp))
                    Text(
                        mode.name,
                        fontSize = DS.TextSize.Secondary,
                        fontWeight = FontWeight.Bold,
                        color = DS.Colors.Primary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false),
                    )
                    Icon(Icons.Outlined.KeyboardArrowDown, contentDescription = null, tint = DS.Colors.Primary, modifier = Modifier.size(16.dp))
                }
            }
        }
    }

    if (showSheet) {
        val currentId = CurrentOutlet.id
        val outlets = CurrentOutlet.outlets
        if (currentId == null || outlets.size < 2) {
            showSheet = false
        } else {
            OutletPickerSheet(
                outlets = outlets,
                currentId = currentId,
                onDismiss = { showSheet = false },
                onChoose = { outlet ->
                    showSheet = false
                    when {
                        outlet.id == CurrentOutlet.id -> Unit
                        CurrentOutletLogic.needsCartConfirm(CartStore.itemCount) -> confirm = outlet
                        else -> OutletSwitcher.switchTo(outlet.id, clearCart = false)
                    }
                },
            )
        }
    }

    confirm?.let { outlet ->
        val count = CartStore.itemCount
        AlertDialog(
            onDismissRequest = { confirm = null },
            modifier = Modifier.testTag("outlet.switch.confirm"),
            title = { Text(stringResource(R.string.outlet_switch_confirm_title, outlet.name)) },
            text = { Text(pluralStringResource(R.plurals.outlet_switch_confirm_message, count, count, CurrentOutlet.name.orEmpty())) },
            confirmButton = {
                TextButton(onClick = {
                    confirm = null
                    OutletSwitcher.switchTo(outlet.id, clearCart = true)
                }) { Text(stringResource(R.string.outlet_switch_confirm_ok), color = V2Colors.Danger, fontWeight = FontWeight.SemiBold) }
            },
            dismissButton = {
                TextButton(onClick = { confirm = null }) { Text(stringResource(R.string.outlet_switch_confirm_cancel)) }
            },
        )
    }
}

/** Applies a branch choice: drops the cart when asked, then every order and stock view reloads */
object OutletSwitcher {
    fun switchTo(outletId: Int, clearCart: Boolean) {
        if (clearCart) CartStore.clear()
        CurrentOutlet.select(outletId)
    }
}

/**
 * "Chọn chi nhánh": single-select list of the merchant's active branches (name, address, "mặc định"), "Đang chọn" on
 * the branch in use, and "Dùng <branch>" (iOS `OutletPickerSheet`). Opened only from [OutletHeaderButton].
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OutletPickerSheet(
    outlets: List<OutletChoice>,
    currentId: Int,
    onDismiss: () -> Unit,
    onChoose: (OutletChoice) -> Unit,
) {
    var selectedId by remember { mutableStateOf(currentId) }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scope = rememberCoroutineScope()
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState, containerColor = DS.Colors.Surface) {
        Column(
            Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = DS.Spacing.lg).padding(bottom = DS.Spacing.lg)
                .testTag("outlet.picker"),
        ) {
            Text(
                stringResource(R.string.outlet_picker_title),
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = DS.Colors.Text,
                modifier = Modifier.semantics { heading() },
            )
            Spacer(Modifier.height(4.dp))
            Text(stringResource(R.string.outlet_picker_hint), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
            Spacer(Modifier.height(10.dp))
            Column(
                Modifier.weight(1f, fill = false).verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                outlets.forEach { outlet ->
                    OutletOptionRow(outlet, isCurrent = outlet.id == currentId, isChosen = outlet.id == selectedId) {
                        selectedId = outlet.id
                    }
                }
            }
            Spacer(Modifier.height(12.dp))
            val chosen = outlets.firstOrNull { it.id == selectedId }
            // AppPrimaryButton's look on one line: a long branch name is cut with "…" (iOS truncates the tail)
            Button(
                onClick = {
                    val pick = chosen ?: return@Button
                    scope.launch { sheetState.hide() }.invokeOnCompletion { onChoose(pick) }
                },
                modifier = Modifier.fillMaxWidth().height(50.dp).testTag("outlet.picker.use"),
                shape = RoundedCornerShape(12.dp),
            ) {
                Text(
                    stringResource(R.string.outlet_picker_use, chosen?.name.orEmpty()),
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

@Composable
private fun OutletOptionRow(outlet: OutletChoice, isCurrent: Boolean, isChosen: Boolean, onClick: () -> Unit) {
    val defaultWord = stringResource(R.string.outlet_picker_default)
    val currentWord = stringResource(R.string.outlet_picker_current)
    val details = listOfNotNull(outlet.address?.trim()?.takeIf { it.isNotEmpty() }, defaultWord.takeIf { outlet.isDefault })
    val label = (listOf(outlet.name) + details + listOfNotNull(currentWord.takeIf { isCurrent })).joinToString(", ")
    val shape = RoundedCornerShape(12.dp)
    Row(
        Modifier
            .fillMaxWidth()
            .heightIn(min = 60.dp)
            .clip(shape)
            .background(if (isChosen) OutletColors.PillFill else Color.Transparent)
            .border(1.dp, if (isChosen) OutletColors.SelectedBorder else Color.Transparent, shape)
            .clickable(role = Role.RadioButton, onClick = onClick)
            .semantics(mergeDescendants = true) { contentDescription = label }
            .testTag("outlet.picker.row.${outlet.id}")
            .padding(horizontal = 10.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            Modifier.size(22.dp).border(2.dp, if (isChosen) DS.Colors.Primary else OutletColors.RadioOff, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            if (isChosen) Box(Modifier.size(10.dp).clip(CircleShape).background(DS.Colors.Primary))
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(outlet.name, fontSize = DS.TextSize.Input, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text, maxLines = 2, overflow = TextOverflow.Ellipsis)
            if (details.isNotEmpty()) {
                Text(details.joinToString(" · "), fontSize = DS.TextSize.Secondary, color = OutletColors.Subtle, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
        }
        if (isCurrent) {
            Text(
                currentWord,
                fontSize = DS.TextSize.Pill,
                fontWeight = FontWeight.Bold,
                color = DS.Colors.Primary,
                maxLines = 1,
                modifier = Modifier.widthIn(min = 0.dp).clip(RoundedCornerShape(10.dp)).background(OutletColors.BadgeFill)
                    .padding(horizontal = 8.dp, vertical = 2.dp),
            )
        }
    }
}

/** The remembered branch was turned off: the app is back on the default; told once (iOS `showFallback`) */
@Composable
fun OutletFallbackDialog() {
    val name by CurrentOutlet.fallbackNotice.collectAsState()
    val defaultName = name ?: return
    AlertDialog(
        onDismissRequest = { CurrentOutlet.fallbackShown() },
        title = { Text(stringResource(R.string.outlet_fallback_title)) },
        text = { Text(stringResource(R.string.outlet_fallback_message, defaultName)) },
        confirmButton = { TextButton(onClick = { CurrentOutlet.fallbackShown() }) { Text(stringResource(R.string.ok)) } },
    )
}
