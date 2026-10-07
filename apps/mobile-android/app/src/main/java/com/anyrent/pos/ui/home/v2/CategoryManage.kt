package com.anyrent.pos.ui.home.v2

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.MoreHoriz
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiParity
import com.anyrent.pos.data.PermissionManager
import com.anyrent.pos.domain.products.CategoryRules
import com.anyrent.pos.ui.common.AppFormSheet
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * #632 — name prompt for "Thêm danh mục" / "Đổi tên danh mục" (iOS `CategoryManageViewController.promptName`).
 * [onSave] gets the trimmed name once it passes [CategoryRules.validateName]; it returns an error text or null.
 */
@Composable
fun CategoryNameDialog(
    title: String,
    initial: String?,
    onDismiss: () -> Unit,
    onSave: suspend (String) -> String?,
) {
    var name by remember { mutableStateOf(initial.orEmpty()) }
    var error by remember { mutableStateOf<String?>(null) }
    var saving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val required = stringResource(R.string.v2_category_name_required)
    val tooShort = stringResource(R.string.v2_category_name_too_short)
    val tooLong = stringResource(R.string.v2_category_name_too_long)
    AlertDialog(
        onDismissRequest = { if (!saving) onDismiss() },
        title = { Text(title) },
        text = {
            Column {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it; error = null },
                    singleLine = true,
                    placeholder = { Text(stringResource(R.string.v2_category_name_placeholder)) },
                    modifier = Modifier.fillMaxWidth(),
                )
                error?.let { Text(it, color = V2Colors.Danger, fontSize = DS.TextSize.Secondary, modifier = Modifier.padding(top = 6.dp)) }
            }
        },
        confirmButton = {
            TextButton(enabled = !saving, onClick = {
                val problem = CategoryRules.validateName(name)
                if (problem != null) {
                    error = when (problem) {
                        CategoryRules.NameError.REQUIRED -> required
                        CategoryRules.NameError.TOO_SHORT -> tooShort
                        CategoryRules.NameError.TOO_LONG -> tooLong
                    }
                    return@TextButton
                }
                saving = true
                scope.launch {
                    error = onSave(name.trim())
                    saving = false
                }
            }) { Text(stringResource(R.string.v2_category_save)) }
        },
        dismissButton = { TextButton(enabled = !saving, onClick = onDismiss) { Text(stringResource(R.string.cancel)) } },
    )
}

/**
 * #632 — the one category screen (iOS `CategoryManageViewController`). With [onPick] (product form) it picks:
 * "Không chọn" + the categories, ✓ on [selectedId], a tap picks and closes. From Cài đặt → Danh mục it only manages.
 * Both: search (accent-insensitive), + adds (MERCHANT, OUTLET_ADMIN; in pick mode the new one is picked),
 * ⋯ renames / deletes (MERCHANT; never the default). [onChanged] gets the fresh list after every load.
 */
@Composable
fun CategoryManageScreen(
    onDismiss: () -> Unit,
    onChanged: (List<ApiParity.Category>) -> Unit = {},
    selectedId: Int? = null,
    onPick: ((ApiParity.Category?) -> Unit)? = null,
) {
    var categories by remember { mutableStateOf<List<ApiParity.Category>>(emptyList()) }
    var loaded by remember { mutableStateOf(false) }
    var version by remember { mutableStateOf(0) }
    var selected by remember { mutableStateOf<ApiParity.Category?>(null) }
    var renaming by remember { mutableStateOf<ApiParity.Category?>(null) }
    var deleting by remember { mutableStateOf<ApiParity.Category?>(null) }
    var adding by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val canManage = CategoryRules.canManage(PermissionManager.role)
    val canAdd = CategoryRules.canAdd(PermissionManager.role)
    var query by remember { mutableStateOf("") }
    val shown = categories.filter { CategoryRules.matches(it.name, query) }
    val showsNone = onPick != null && query.isBlank()
    fun pick(category: ApiParity.Category?) {
        onPick?.invoke(category)
        onDismiss()
    }

    LaunchedEffect(version) {
        withContext(Dispatchers.IO) { ApiParity.listCategories() }
            .onSuccess { categories = it; loaded = true; onChanged(it) }
            .onFailure { error = it.message; loaded = true }
    }

    AppFormSheet(onDismiss = onDismiss, fullScreen = true) {
        Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding()) {
            Row(Modifier.fillMaxWidth().height(56.dp).padding(horizontal = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onDismiss) {
                    Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = stringResource(R.string.close), modifier = Modifier.size(DS.Icon.Lg))
                }
                Text(stringResource(R.string.v2_form_category), fontSize = 20.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                if (canAdd) {
                    IconButton(onClick = { error = null; adding = true }) {
                        Icon(Icons.Outlined.Add, contentDescription = stringResource(R.string.v2_category_add_title), modifier = Modifier.size(DS.Icon.Lg))
                    }
                }
            }
            HorizontalDivider(color = DS.Colors.Border)
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                singleLine = true,
                leadingIcon = { Icon(Icons.Outlined.Search, contentDescription = null) },
                placeholder = { Text(stringResource(R.string.v2_category_search)) },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            )
            error?.let { Text(it, color = V2Colors.Danger, fontSize = DS.TextSize.Secondary, modifier = Modifier.padding(16.dp)) }
            if (loaded && shown.isEmpty() && !showsNone && error == null) {
                Text(stringResource(R.string.v2_category_empty), color = DS.Colors.TextMuted, modifier = Modifier.padding(16.dp))
            }
            LazyColumn(Modifier.fillMaxSize().navigationBarsPadding()) {
                if (showsNone) {
                    item(key = "none") {
                        Row(
                            Modifier.fillMaxWidth().clickable { pick(null) }.heightIn(min = 56.dp).padding(horizontal = 16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(stringResource(R.string.v2_form_no_category), fontSize = 16.sp, color = DS.Colors.TextMuted, modifier = Modifier.weight(1f))
                            if (selectedId == null) Icon(Icons.Outlined.Check, contentDescription = null, tint = DS.Colors.Primary)
                        }
                        HorizontalDivider(color = DS.Colors.Divider)
                    }
                }
                items(shown, key = { it.id }) { category ->
                    Row(
                        Modifier.fillMaxWidth()
                            .then(if (onPick != null) Modifier.clickable { pick(category) } else Modifier)
                            .heightIn(min = 56.dp)
                            .padding(start = 16.dp, end = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(category.name, fontSize = 16.sp, modifier = Modifier.weight(1f))
                        if (category.isDefault) {
                            Text(stringResource(R.string.v2_category_default), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
                        }
                        if (onPick != null && category.id == selectedId) {
                            Icon(Icons.Outlined.Check, contentDescription = null, tint = DS.Colors.Primary, modifier = Modifier.padding(start = 8.dp))
                        }
                        if (canManage) {
                            IconButton(onClick = { error = null; selected = category }) {
                                Icon(Icons.Outlined.MoreHoriz, contentDescription = stringResource(R.string.v2_category_actions), tint = DS.Colors.TextMuted)
                            }
                        } else {
                            Spacer(Modifier.width(12.dp))
                        }
                    }
                    HorizontalDivider(color = DS.Colors.Divider)
                }
            }
        }
    }

    selected?.let { category ->
        AlertDialog(
            onDismissRequest = { selected = null },
            title = { Text(category.name) },
            text = {
                Column {
                    Text(
                        stringResource(R.string.v2_category_rename), fontSize = 16.sp,
                        modifier = Modifier.fillMaxWidth().clickable { selected = null; renaming = category }.padding(vertical = 12.dp),
                    )
                    if (CategoryRules.canDelete(category.isDefault)) {
                        Text(
                            stringResource(R.string.v2_category_delete), fontSize = 16.sp, color = V2Colors.Danger, fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.fillMaxWidth().clickable { selected = null; deleting = category }.padding(vertical = 12.dp),
                        )
                    }
                }
            },
            confirmButton = { TextButton(onClick = { selected = null }) { Text(stringResource(R.string.cancel)) } },
        )
    }
    if (adding) {
        CategoryNameDialog(stringResource(R.string.v2_category_add_title), null, onDismiss = { adding = false }) { name ->
            withContext(Dispatchers.IO) { ApiParity.createCategory(name) }.fold(
                onSuccess = { created ->
                    adding = false
                    // pick mode: the new category is picked straight away
                    if (onPick != null) pick(created) else version++
                    null
                },
                onFailure = { it.message },
            )
        }
    }
    renaming?.let { category ->
        CategoryNameDialog(stringResource(R.string.v2_category_rename_title), category.name, onDismiss = { renaming = null }) { name ->
            withContext(Dispatchers.IO) { ApiParity.renameCategory(category.id, name) }.fold(
                onSuccess = { renaming = null; version++; null },
                onFailure = { it.message },
            )
        }
    }
    deleting?.let { category ->
        AlertDialog(
            onDismissRequest = { deleting = null },
            title = { Text(stringResource(R.string.v2_category_delete_title, category.name)) },
            confirmButton = {
                TextButton(onClick = {
                    deleting = null
                    scope.launch {
                        withContext(Dispatchers.IO) { ApiParity.deleteCategory(category.id) }
                            .onSuccess { version++ }
                            .onFailure { error = it.message }
                    }
                }) { Text(stringResource(R.string.v2_category_delete), color = V2Colors.Danger) }
            },
            dismissButton = { TextButton(onClick = { deleting = null }) { Text(stringResource(R.string.cancel)) } },
        )
    }
}
