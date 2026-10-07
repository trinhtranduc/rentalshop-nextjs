package com.anyrent.pos.ui.home.v2

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.HorizontalDivider
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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiParity
import com.anyrent.pos.domain.products.CategoryRules
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
 * #632 — "Quản lý danh mục" (MERCHANT): the shop's categories; tap one to rename it or delete it (never the default).
 * [onChanged] gets the fresh list after every change so the product form can update its choice.
 */
@Composable
fun CategoryManageDialog(
    onDismiss: () -> Unit,
    onChanged: (List<ApiParity.Category>) -> Unit,
) {
    var categories by remember { mutableStateOf<List<ApiParity.Category>>(emptyList()) }
    var version by remember { mutableStateOf(0) }
    var selected by remember { mutableStateOf<ApiParity.Category?>(null) }
    var renaming by remember { mutableStateOf<ApiParity.Category?>(null) }
    var deleting by remember { mutableStateOf<ApiParity.Category?>(null) }
    var adding by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(version) {
        withContext(Dispatchers.IO) { ApiParity.listCategories() }
            .onSuccess { categories = it; onChanged(it) }
            .onFailure { error = it.message }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.v2_category_manage)) },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                error?.let { Text(it, color = V2Colors.Danger, fontSize = DS.TextSize.Secondary, modifier = Modifier.padding(bottom = 8.dp)) }
                if (categories.isEmpty()) {
                    Text(stringResource(R.string.v2_category_empty), color = DS.Colors.TextMuted)
                }
                categories.forEach { category ->
                    Row(
                        Modifier.fillMaxWidth().clickable { error = null; selected = category }.padding(vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(category.name, fontSize = 16.sp, modifier = Modifier.weight(1f))
                        if (category.isDefault) {
                            Text(stringResource(R.string.v2_category_default), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
                        }
                    }
                    HorizontalDivider(color = DS.Colors.Divider)
                }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.close)) } },
        dismissButton = {
            TextButton(onClick = { error = null; adding = true }) { Text(stringResource(R.string.v2_category_add)) }
        },
    )

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
                onSuccess = { adding = false; version++; null },
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
