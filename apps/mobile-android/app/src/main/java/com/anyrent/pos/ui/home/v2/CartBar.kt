package com.anyrent.pos.ui.home.v2

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.KeyboardArrowDown
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SwipeToDismissBox
import androidx.compose.material3.SwipeToDismissBoxValue
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.rememberSwipeToDismissBoxState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
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
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.data.CartStore
import com.anyrent.pos.ui.common.formatMoneyVnd
import com.anyrent.pos.ui.theme.DS

/** #1079: when the cart bar shows (iOS `CartSwitchBar.shouldShow`) */
object CartBarLogic {
    /**
     * With 2+ carts (also while an order edit is the cart in use, so the other carts stay in reach), or with 1 cart
     * that has items (that is how a second cart is started).
     */
    fun shouldShow(cartCount: Int, itemCount: Int, isEditing: Boolean): Boolean =
        cartCount > 1 || (!isEditing && itemCount > 0)

    private val palette = listOf(Color(0xFF1D4ED8), Color(0xFF7C3AED), Color(0xFF0F766E), Color(0xFFEA580C))
    private val noCustomer = Color(0xFF94A3B8)

    /** Round avatar colour: grey with no customer, else one of four by the cart number (iOS `CartAvatarView`) */
    fun avatarColor(summary: CartStore.CartSummary): Color =
        if (summary.customerName == null) noCustomer else palette[(summary.number - 1).mod(palette.size)]
}

@Composable
private fun CartAvatar(summary: CartStore.CartSummary, size: Int = 34) {
    Box(
        Modifier.size(size.dp).clip(CircleShape).background(CartBarLogic.avatarColor(summary)),
        contentAlignment = Alignment.Center,
    ) {
        Text(summary.avatar, color = Color.White, fontSize = (size * 0.35f).sp, fontWeight = FontWeight.Bold, maxLines = 1)
    }
}

@Composable
private fun cartTitle(summary: CartStore.CartSummary): String =
    summary.customerName ?: stringResource(R.string.v2_cart_multi_title, summary.number)

@Composable
private fun cartSummaryLine(summary: CartStore.CartSummary): String {
    val text = pluralStringResource(R.plurals.v2_cart_multi_summary, summary.itemCount, summary.itemCount, formatMoneyVnd(summary.total))
    val number = summary.editOrderNumber ?: return text
    return stringResource(R.string.v2_cart_multi_edit_title, number) + " · " + text
}

/**
 * Floating bar above the bottom navigation while the cart in use has items or 2+ carts are open: avatar, name with a
 * chevron, "N món · total", the rental dates, and "Xem giỏ ›". Tapping the name opens "Chọn giỏ" (iOS `CartSwitchBar`).
 */
@Composable
fun CartSwitchBar(onOpenCart: () -> Unit, modifier: Modifier = Modifier) {
    CartStore.revision.collectAsState().value
    val lines by CartStore.lines.collectAsState()
    val editing by CartStore.editingOrderId.collectAsState()
    var showPicker by remember { mutableStateOf(false) }
    if (!CartBarLogic.shouldShow(CartStore.cartCount, lines.sumOf { it.quantity }, editing != null)) return
    val summary = CartStore.cartSummaries()[CartStore.activeIndex]
    val shape = RoundedCornerShape(16.dp)

    Row(
        modifier
            .fillMaxWidth()
            .padding(horizontal = 10.dp, vertical = 8.dp)
            .background(DS.Colors.Surface, shape)
            .border(1.dp, DS.Colors.Border, shape)
            .padding(start = 10.dp, top = 8.dp, bottom = 8.dp, end = 8.dp)
            .testTag("cart.switchBar"),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(9.dp),
    ) {
        Row(
            Modifier
                .weight(1f)
                .clip(RoundedCornerShape(10.dp))
                .clickable(role = Role.Button) { showPicker = true }
                .testTag("cart.switchBar.switch"),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(9.dp),
        ) {
            CartAvatar(summary)
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text(
                        cartTitle(summary), fontSize = DS.TextSize.Body, fontWeight = FontWeight.Medium, color = DS.Colors.Text,
                        maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false),
                    )
                    Icon(Icons.Outlined.KeyboardArrowDown, contentDescription = null, tint = DS.Colors.Primary, modifier = Modifier.size(18.dp))
                }
                Text(cartSummaryLine(summary), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted, maxLines = 1, overflow = TextOverflow.Ellipsis)
                summary.dates?.let {
                    Text(it, fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted, maxLines = 1)
                }
            }
        }
        Row(
            Modifier
                .clip(RoundedCornerShape(11.dp))
                .background(DS.Colors.Primary)
                .clickable(role = Role.Button, onClick = onOpenCart)
                .padding(horizontal = 12.dp, vertical = 10.dp)
                .testTag("cart.switchBar.open"),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(3.dp),
        ) {
            Text(stringResource(R.string.v2_cart_multi_view), color = Color.White, fontWeight = FontWeight.Bold, fontSize = DS.TextSize.Body)
            Icon(Icons.AutoMirrored.Outlined.KeyboardArrowRight, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
        }
    }

    if (showPicker) CartPickerSheet(onDismiss = { showPicker = false })
}

/** "Chọn giỏ": the open carts (✓ on the one in use), "+ Giỏ mới", swipe to delete with a confirm (iOS `CartPickerSheet`) */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CartPickerSheet(onDismiss: () -> Unit) {
    CartStore.revision.collectAsState().value
    val summaries = CartStore.cartSummaries()
    val active = CartStore.activeIndex
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var confirmDelete by remember { mutableStateOf<Int?>(null) }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState, containerColor = DS.Colors.Surface) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(bottom = DS.Spacing.lg).testTag("cart.picker")) {
            Row(Modifier.fillMaxWidth().padding(horizontal = DS.Spacing.lg), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    stringResource(R.string.v2_cart_multi_picker_title), fontSize = 18.sp, fontWeight = FontWeight.Bold,
                    color = DS.Colors.Text, modifier = Modifier.weight(1f).semantics { heading() },
                )
                Text(pluralStringResource(R.plurals.v2_cart_multi_picker_count, summaries.size, summaries.size), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
            }
            Spacer(Modifier.height(8.dp))
            Column(Modifier.weight(1f, fill = false).verticalScroll(rememberScrollState())) {
                summaries.forEachIndexed { index, summary ->
                    PickerRow(
                        summary = summary,
                        isActive = index == active,
                        onChoose = { CartStore.switchCart(index); onDismiss() },
                        onDelete = { confirmDelete = index },
                    )
                }
            }
            if (summaries.size < CartStore.MAX_CARTS) {
                Box(
                    Modifier
                        .padding(horizontal = DS.Spacing.lg, vertical = 12.dp)
                        .fillMaxWidth()
                        .heightIn(min = 48.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .border(1.5.dp, DS.Colors.Primary, RoundedCornerShape(12.dp))
                        .clickable(role = Role.Button) { CartStore.newCart(); onDismiss() }
                        .testTag("cart.picker.new"),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(stringResource(R.string.v2_cart_multi_new), color = DS.Colors.Primary, fontWeight = FontWeight.Bold, fontSize = DS.TextSize.Body)
                }
            }
        }
    }

    confirmDelete?.let { index ->
        val summary = summaries.getOrNull(index)
        if (summary == null) {
            confirmDelete = null
        } else {
            AlertDialog(
                onDismissRequest = { confirmDelete = null },
                title = { Text(stringResource(R.string.v2_cart_multi_delete_title)) },
                text = { Text(stringResource(R.string.v2_cart_multi_delete_message, cartTitle(summary), summary.itemCount)) },
                confirmButton = {
                    TextButton(onClick = { confirmDelete = null; CartStore.deleteCart(index) }, modifier = Modifier.testTag("cart.picker.deleteConfirm")) {
                        Text(stringResource(R.string.v2_cart_multi_delete), color = Color(0xFFDC2626), fontWeight = FontWeight.SemiBold)
                    }
                },
                dismissButton = { TextButton(onClick = { confirmDelete = null }) { Text(stringResource(R.string.cancel)) } },
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PickerRow(summary: CartStore.CartSummary, isActive: Boolean, onChoose: () -> Unit, onDelete: () -> Unit) {
    // Swiping end-to-start asks to delete; the row springs back and the confirm decides (iOS: the alert after the swipe)
    val state = rememberSwipeToDismissBoxState(
        confirmValueChange = { value ->
            if (value == SwipeToDismissBoxValue.EndToStart) onDelete()
            false
        },
        positionalThreshold = { total -> total * 0.4f },
    )
    SwipeToDismissBox(
        state = state,
        enableDismissFromStartToEnd = false,
        backgroundContent = {
            Box(Modifier.fillMaxSize().background(Color(0xFFDC2626)).padding(end = 24.dp), contentAlignment = Alignment.CenterEnd) {
                Text(stringResource(R.string.v2_cart_multi_delete), color = Color.White, fontWeight = FontWeight.Bold, fontSize = DS.TextSize.Body)
            }
        },
    ) {
        val title = cartTitle(summary)
        val kind = stringResource(if (summary.isSale) R.string.v2_cart_sale else R.string.v2_cart_rent)
        val noCustomer = if (summary.customerName == null) " · " + stringResource(R.string.v2_cart_multi_no_customer) else ""
        Row(
            Modifier
                .fillMaxWidth()
                .background(if (isActive) Color(0xFFEFF6FF) else DS.Colors.Surface)
                .clickable(role = Role.Button, onClick = onChoose)
                .padding(horizontal = DS.Spacing.lg, vertical = 10.dp)
                .semantics { contentDescription = title }
                .testTag("cart.picker.row"),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(11.dp),
        ) {
            CartAvatar(summary, size = 40)
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(title, fontSize = DS.TextSize.Input, fontWeight = FontWeight.Medium, color = DS.Colors.Text, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(
                    kind + " · " + cartSummaryLine(summary) + noCustomer,
                    fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted, maxLines = 2, overflow = TextOverflow.Ellipsis,
                )
                summary.dates?.let { Text(it, fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted, maxLines = 1) }
            }
            if (isActive) Icon(Icons.Outlined.Check, contentDescription = null, tint = DS.Colors.Primary, modifier = Modifier.size(20.dp))
        }
    }
}

/** Top row of the cart screen while 2+ carts are open: "Giỏ  Nguyễn Thị Mai  1/3  Đổi ⌄" (iOS `CartSwitchRow`) */
@Composable
fun CartSwitchRow(modifier: Modifier = Modifier) {
    CartStore.revision.collectAsState().value
    val summaries = CartStore.cartSummaries()
    if (summaries.size < 2) return
    var showPicker by remember { mutableStateOf(false) }
    val summary = summaries[CartStore.activeIndex]
    Row(
        modifier
            .fillMaxWidth()
            .background(Color(0xFFF8FAFC))
            .clickable(role = Role.Button) { showPicker = true }
            .heightIn(min = 44.dp)
            .padding(horizontal = DS.Spacing.lg, vertical = 8.dp)
            .testTag("cart.switchRow"),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(stringResource(R.string.v2_cart_multi_row_label), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
        Text(
            cartTitle(summary), fontSize = DS.TextSize.Body, fontWeight = FontWeight.Medium, color = DS.Colors.Text,
            maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f),
        )
        Text("${CartStore.activeIndex + 1}/${summaries.size}", fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
        Text(stringResource(R.string.v2_cart_multi_change), fontSize = DS.TextSize.Body, fontWeight = FontWeight.Medium, color = DS.Colors.Primary)
        Icon(Icons.Outlined.KeyboardArrowDown, contentDescription = null, tint = DS.Colors.Primary, modifier = Modifier.size(18.dp))
    }
    if (showPicker) CartPickerSheet(onDismiss = { showPicker = false })
}
