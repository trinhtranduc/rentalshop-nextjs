package com.anyrent.pos.ui.orders.v2

import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Notes
import androidx.compose.material.icons.outlined.Cancel
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Event
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Print
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.FirstBaseline
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.domain.orders.OrderActionSheet
import com.anyrent.pos.ui.theme.DS

/**
 * #519 ⋯ sheet of the order detail (board CT-thao-tac): only actions that are not already a button on the screen,
 * then a separate red group (Huỷ đơn, Xoá đơn when allowed). [rows] comes from [OrderActionSheet.rows]. #1438: a small icon left of each title.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun OrderActionsSheet(
    rows: OrderActionSheet.Rows,
    /** "Máy in 192.168.1.199"; null = no subtitle */
    printerSubtitle: String?,
    notes: String?,
    notePhotos: Int,
    /** "6 lần thay đổi · gần nhất 15:10 hôm nay"; null while unknown or without changes */
    historySubtitle: String?,
    onDismiss: () -> Unit,
    onAction: (OrderActionSheet.Action) -> Unit,
) {
    val notesSubtitle = OrderActionSheet.notesSubtitle(
        notes,
        notePhotos,
        OrderActionSheet.NotesTexts(
            withText = stringResource(R.string.order_sheet_notes_with_text),
            photos = pluralStringResource(R.plurals.order_sheet_notes_photos, notePhotos.coerceAtLeast(1)),
            photosOnly = pluralStringResource(R.plurals.order_sheet_notes_photos_only, notePhotos.coerceAtLeast(1)),
            add = stringResource(R.string.order_sheet_notes_add),
        ),
    )
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = DS.Colors.Surface,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
    ) {
        Column(
            Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 16.dp).padding(bottom = 20.dp),
        ) {
            // #1395: the title and the close button (the order number stays on the screen's top bar, #1297)
            OrderSheetTitle(stringResource(R.string.order_sheet_title_actions)) {
                val closeLabel = stringResource(R.string.close)
                Box(
                    Modifier.size(36.dp).clip(CircleShape).background(Color(0xFFF1F5F9)).clickable(onClickLabel = closeLabel, onClick = onDismiss),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Outlined.Close, contentDescription = closeLabel, tint = DS.Colors.TextMuted, modifier = Modifier.size(18.dp))
                }
            }
            Spacer(Modifier.height(6.dp))
            rows.main.forEach { action ->
                when (action) {
                    OrderActionSheet.Action.PRINT -> ActionRow(action, stringResource(R.string.order_sheet_print), printerSubtitle) { onAction(action) }
                    OrderActionSheet.Action.NOTES -> ActionRow(action, stringResource(R.string.order_sheet_notes), notesSubtitle) { onAction(action) }
                    OrderActionSheet.Action.HISTORY -> ActionRow(action, stringResource(R.string.order_sheet_history), historySubtitle ?: stringResource(R.string.order_sheet_history_hint)) { onAction(action) }
                    OrderActionSheet.Action.EDIT -> ActionRow(action, stringResource(R.string.order_sheet_edit), stringResource(R.string.order_sheet_edit_hint)) { onAction(action) }
                    OrderActionSheet.Action.EXTEND -> ActionRow(action, stringResource(R.string.order_sheet_extend), stringResource(R.string.order_sheet_extend_hint)) { onAction(action) }
                    OrderActionSheet.Action.SHARE -> ActionRow(action, stringResource(R.string.order_sheet_share), stringResource(R.string.order_sheet_share_hint)) { onAction(action) }
                    else -> Unit
                }
            }
            if (rows.danger.isNotEmpty()) {
                Spacer(Modifier.height(8.dp))
                rows.danger.forEach { action ->
                    when (action) {
                        OrderActionSheet.Action.CANCEL -> ActionRow(
                            action, stringResource(R.string.order_sheet_cancel), stringResource(R.string.order_sheet_cancel_hint), danger = true,
                        ) { onAction(action) }
                        OrderActionSheet.Action.DELETE -> ActionRow(
                            action, stringResource(R.string.order_sheet_delete), stringResource(R.string.order_sheet_delete_hint), danger = true,
                        ) { onAction(action) }
                        else -> Unit
                    }
                }
            }
        }
    }
}

/** #1438: the icon left of a row's title. iOS `OrderActionSheet.symbol(of:)` */
internal fun orderActionIcon(action: OrderActionSheet.Action): ImageVector = when (action) {
    OrderActionSheet.Action.PRINT -> Icons.Outlined.Print
    OrderActionSheet.Action.NOTES -> Icons.AutoMirrored.Outlined.Notes
    OrderActionSheet.Action.HISTORY -> Icons.Outlined.History
    OrderActionSheet.Action.EDIT -> Icons.Outlined.Edit
    OrderActionSheet.Action.EXTEND -> Icons.Outlined.Event
    OrderActionSheet.Action.SHARE -> Icons.Outlined.Share
    OrderActionSheet.Action.CANCEL -> Icons.Outlined.Cancel
    OrderActionSheet.Action.DELETE -> Icons.Outlined.Delete
}

@Composable
private fun ActionRow(action: OrderActionSheet.Action, title: String, subtitle: String?, danger: Boolean = false, onClick: () -> Unit) {
    val red = Color(0xFFB91C1C)
    // Half the cap height of the 16 sp title: the icon's centre sits this far above the title's baseline
    val titleMiddle = with(LocalDensity.current) { 5.7.sp.roundToPx() }
    Row(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .semantics { role = Role.Button }
            .heightIn(min = 56.dp)
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // #1438: the text stays centred in the row; the decorative icon follows the title's first line.
        // One neutral colour, except the red of the Cancel and Delete rows' text
        Row(Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Icon(
                orderActionIcon(action),
                contentDescription = null,
                tint = if (danger) red else DS.Colors.TextMuted,
                modifier = Modifier.size(20.dp).alignBy { it.measuredHeight / 2 + titleMiddle },
            )
            Column(Modifier.weight(1f).alignBy(FirstBaseline)) {
                Text(title, fontSize = 16.sp, fontWeight = FontWeight.Medium, color = if (danger) red else DS.Colors.Text)
                if (!subtitle.isNullOrBlank()) {
                    Text(subtitle, fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
                }
            }
        }
    }
    HorizontalDivider(color = DS.Colors.Divider)
}
