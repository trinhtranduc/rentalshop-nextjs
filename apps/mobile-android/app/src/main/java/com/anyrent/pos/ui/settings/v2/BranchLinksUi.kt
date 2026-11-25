package com.anyrent.pos.ui.settings.v2

import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.domain.settings.OutletLinkEntry
import com.anyrent.pos.domain.settings.OutletLinkError
import com.anyrent.pos.domain.settings.OutletLinkLogic
import com.anyrent.pos.domain.settings.OutletLinkResult
import com.anyrent.pos.domain.settings.OutletLinkType
import com.anyrent.pos.domain.settings.OutletLinksResult
import com.anyrent.pos.ui.home.v2.ThinDivider
import com.anyrent.pos.ui.home.v2.V2Colors
import com.anyrent.pos.ui.theme.DS

private val LinkBorder = Color(0xFFCBD5E1)

/** "Facebook" for a network, the localized "Website" / "Khác" for the two generic types */
@Composable
internal fun outletLinkTypeName(type: OutletLinkType): String =
    OutletLinkLogic.brandName(type) ?: stringResource(
        if (type == OutletLinkType.WEBSITE) R.string.shopinfo_links_type_website else R.string.shopinfo_links_type_other,
    )

/**
 * #1643 "Liên kết" group of the branch form (iOS: `EditStoreViewController` links section): a row per link (type above, address
 * below, tap to edit) and "＋ Thêm liên kết" while fewer than 6. Staff only see the rows; nothing is drawn when there is nothing to see.
 */
@Composable
internal fun BranchLinksSection(
    links: List<OutletLinkEntry>,
    canEdit: Boolean,
    onOpen: (Int) -> Unit,
) {
    if (!canEdit && links.isEmpty()) return
    Column(Modifier.testTag("branchLinksSection"), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            stringResource(R.string.shopinfo_links_title),
            fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text,
            modifier = Modifier.padding(top = 6.dp).semantics { heading() },
        )
        Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).border(1.dp, LinkBorder, RoundedCornerShape(12.dp))) {
            links.forEachIndexed { index, link ->
                val name = if (link.type == OutletLinkType.OTHER) link.label.orEmpty() else outletLinkTypeName(link.type)
                Row(
                    Modifier.fillMaxWidth().heightIn(min = 56.dp)
                        .clickable(enabled = canEdit) { onOpen(index) }
                        .testTag("branchLinkRow_$index")
                        .semantics { contentDescription = "$name, ${link.url}"; if (canEdit) role = Role.Button }
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(name, fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted, maxLines = 1)
                        Text(link.url, fontSize = DS.TextSize.Input, color = DS.Colors.Text, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    if (canEdit) {
                        Icon(Icons.AutoMirrored.Outlined.KeyboardArrowRight, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(18.dp))
                    }
                }
                if (index < links.lastIndex || (canEdit && links.size < OutletLinkLogic.MAX)) ThinDivider()
            }
            if (canEdit && links.size < OutletLinkLogic.MAX) {
                val add = stringResource(R.string.shopinfo_links_add)
                Row(
                    Modifier.fillMaxWidth().heightIn(min = 52.dp)
                        .clickable { onOpen(-1) }
                        .testTag("branchLinkAdd")
                        .semantics { contentDescription = add; role = Role.Button }
                        .padding(horizontal = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Icon(Icons.Outlined.Add, contentDescription = null, tint = DS.Colors.Primary, modifier = Modifier.size(20.dp))
                    Text(add, fontSize = DS.TextSize.Input, fontWeight = FontWeight.SemiBold, color = DS.Colors.Primary)
                }
            }
        }
        if (canEdit) {
            Text(
                stringResource(R.string.shopinfo_links_used, links.size, OutletLinkLogic.MAX),
                fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted,
            )
            Text(stringResource(R.string.shopinfo_links_hint), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
        }
    }
}

/** The text under a field for a failed check; the example is the network's own */
@Composable
private fun linkErrorText(error: OutletLinkError, type: OutletLinkType): String = when (error) {
    OutletLinkError.INVALID -> stringResource(R.string.shopinfo_links_err_invalid, OutletLinkLogic.example(type))
    OutletLinkError.PLATFORM -> stringResource(R.string.shopinfo_links_err_platform, outletLinkTypeName(type), OutletLinkLogic.example(type))
    OutletLinkError.LABEL_REQUIRED -> stringResource(R.string.shopinfo_links_err_label_required)
    OutletLinkError.LABEL_TOO_LONG -> stringResource(R.string.shopinfo_links_err_label_too_long, OutletLinkLogic.LABEL_MAX)
}

/**
 * #1643 add / edit one link (mockup "Thêm liên kết"): the type list with ✓, the address (checked on Xong, the error shows under the field),
 * the name for "Khác", and "Xóa liên kết" for a link already in the list. [index] -1 = a new link. [onDone] gets the whole new list.
 */
@Composable
internal fun BranchLinkEditor(
    links: List<OutletLinkEntry>,
    index: Int,
    onBack: () -> Unit,
    onDone: (List<OutletLinkEntry>) -> Unit,
) {
    val existing = links.getOrNull(index)
    var type by remember { mutableStateOf(existing?.type ?: OutletLinkType.WEBSITE) }
    var url by remember { mutableStateOf(existing?.url.orEmpty()) }
    var label by remember { mutableStateOf(existing?.label.orEmpty()) }
    var urlError by remember { mutableStateOf<OutletLinkError?>(null) }
    var labelError by remember { mutableStateOf<OutletLinkError?>(null) }

    fun check(): Boolean {
        urlError = null
        labelError = null
        val result = OutletLinkLogic.normalize(type, url, label)
        if (result is OutletLinkResult.Bad) {
            if (result.error == OutletLinkError.LABEL_REQUIRED || result.error == OutletLinkError.LABEL_TOO_LONG) labelError = result.error
            else urlError = result.error
            return false
        }
        return true
    }

    fun done() {
        if (!check()) return
        val entry = (OutletLinkLogic.normalize(type, url, label) as OutletLinkResult.Ok).link
        val next = if (existing != null) links.toMutableList().also { it[index] = entry } else links + entry
        when (val all = OutletLinkLogic.normalizeAll(next)) {
            is OutletLinksResult.Ok -> onDone(all.links)
            else -> urlError = OutletLinkError.INVALID
        }
    }

    SettingsDetailPage(
        title = stringResource(if (existing != null) R.string.shopinfo_links_edit_title else R.string.shopinfo_links_add),
        onBack = onBack,
        actions = {
            TextButton(onClick = ::done, modifier = Modifier.testTag("linkDoneButton")) {
                Text(stringResource(R.string.shopinfo_links_done), fontSize = DS.TextSize.Input, fontWeight = FontWeight.Bold, color = DS.Colors.Primary)
            }
        },
    ) {
        Column(
            Modifier.fillMaxSize().imePadding().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(
                stringResource(R.string.shopinfo_links_type_title), fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold,
                color = DS.Colors.Text, modifier = Modifier.semantics { heading() },
            )
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).border(1.dp, LinkBorder, RoundedCornerShape(12.dp))) {
                OutletLinkLogic.typeOrder.forEachIndexed { i, option ->
                    val name = outletLinkTypeName(option)
                    Row(
                        Modifier.fillMaxWidth().heightIn(min = 48.dp)
                            .clickable { type = option; urlError = null; labelError = null }
                            .testTag("linkTypeRow_${option.wire}")
                            .semantics { contentDescription = name; role = Role.RadioButton; selected = type == option }
                            .padding(horizontal = 14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(name, fontSize = DS.TextSize.Input, color = DS.Colors.Text, modifier = Modifier.weight(1f))
                        if (type == option) Icon(Icons.Outlined.Check, contentDescription = null, tint = DS.Colors.Primary, modifier = Modifier.size(DS.Icon.Md))
                    }
                    if (i < OutletLinkLogic.typeOrder.lastIndex) ThinDivider()
                }
            }
            LinkField(
                title = stringResource(R.string.shopinfo_links_url_title),
                value = url,
                placeholder = OutletLinkLogic.example(type),
                error = urlError?.let { linkErrorText(it, type) },
                keyboardType = KeyboardType.Uri,
                tag = "linkUrlField",
                onValueChange = { url = it; urlError = null },
            )
            if (type == OutletLinkType.OTHER) {
                LinkField(
                    title = stringResource(R.string.shopinfo_links_label_title),
                    value = label,
                    placeholder = null,
                    error = labelError?.let { linkErrorText(it, type) },
                    keyboardType = KeyboardType.Text,
                    tag = "linkLabelField",
                    onValueChange = { label = it; labelError = null },
                )
            }
            if (existing != null) {
                TextButton(
                    onClick = { onDone(links.filterIndexed { i, _ -> i != index }) },
                    modifier = Modifier.testTag("linkRemoveButton"),
                ) {
                    Text(stringResource(R.string.shopinfo_links_remove), fontSize = DS.TextSize.Input, fontWeight = FontWeight.SemiBold, color = V2Colors.Danger)
                }
            }
        }
    }
}

@Composable
private fun LinkField(
    title: String,
    value: String,
    placeholder: String?,
    error: String?,
    keyboardType: KeyboardType,
    tag: String,
    onValueChange: (String) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(title, fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text)
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            singleLine = true,
            isError = error != null,
            placeholder = placeholder?.let { { Text(it, fontSize = DS.TextSize.Input, color = DS.Colors.TextMuted) } },
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = ImeAction.Done),
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = LinkBorder, focusedBorderColor = DS.Colors.Primary),
            textStyle = TextStyle(fontSize = DS.TextSize.Input, color = DS.Colors.Text),
            modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp).testTag(tag).semantics { contentDescription = title },
        )
        if (error != null) {
            Text(error, fontSize = DS.TextSize.Secondary, color = V2Colors.Danger, modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite })
        }
    }
}
