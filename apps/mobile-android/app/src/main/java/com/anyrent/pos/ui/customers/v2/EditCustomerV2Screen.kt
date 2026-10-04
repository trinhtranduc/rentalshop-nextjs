package com.anyrent.pos.ui.customers.v2

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowLeft
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
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
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.data.CustomersV2Api
import com.anyrent.pos.domain.customers.CustomerEditForm
import com.anyrent.pos.domain.customers.CustomerEditRules
import com.anyrent.pos.domain.error.AppError
import com.anyrent.pos.ui.common.AppAlertError
import com.anyrent.pos.ui.common.AppIcon
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private val EditBorder = Color(0xFFCBD5E1)
private val EditDanger = Color(0xFFB91C1C)

/**
 * "Sửa khách hàng" (#387, flag `newCustomers`, board KH-sua): phone and name required, then optional email, address,
 * ID number, date of birth and notes. Loads `GET /api/customers/{id}`, saves through `PUT /api/customers/{id}`.
 * A phone that belongs to another customer (HTTP 409) is shown under the phone field.
 */
@Composable
fun EditCustomerV2Screen(customerId: Int, onBack: () -> Unit, onSaved: () -> Unit) {
    var form by remember { mutableStateOf<CustomerEditForm?>(null) }
    var saving by remember { mutableStateOf(false) }
    var phoneError by remember { mutableStateOf<String?>(null) }
    var problem by remember { mutableStateOf<CustomerEditRules.Problem?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val needPhone = stringResource(R.string.customers_v2_need_phone)
    val phoneTaken = stringResource(R.string.customers_v2_phone_taken)

    LaunchedEffect(customerId) {
        withContext(Dispatchers.IO) { CustomersV2Api.profile(customerId) }
            .onSuccess { form = it }
            .onFailure { error = it.message }
    }

    fun save() {
        val current = form ?: return
        problem = CustomerEditRules.validate(current)
        phoneError = if (problem == CustomerEditRules.Problem.MISSING_PHONE) needPhone else null
        if (problem != null) return
        saving = true
        scope.launch {
            withContext(Dispatchers.IO) { CustomersV2Api.update(customerId, CustomerEditRules.updatePayload(current)) }
                .onSuccess { onSaved() }
                .onFailure {
                    if ((it as? AppError.Http)?.statusCode == 409) phoneError = phoneTaken else error = it.message
                }
            saving = false
        }
    }

    Column(Modifier.fillMaxSize().background(DS.Colors.Surface).statusBarsPadding().imePadding()) {
        Row(Modifier.fillMaxWidth().padding(start = 8.dp, end = 8.dp, top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) {
                AppIcon(Icons.AutoMirrored.Outlined.KeyboardArrowLeft, contentDescription = stringResource(R.string.back), size = DS.Icon.Lg, tint = DS.Colors.Text)
            }
            Text(stringResource(R.string.customers_v2_edit_title), fontSize = 20.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text,
                modifier = Modifier.semantics { heading() })
        }
        HorizontalDivider(color = DS.Colors.Border)
        val current = form
        if (current == null) {
            Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                if (error == null) CircularProgressIndicator(Modifier.size(28.dp), strokeWidth = 2.dp)
            }
        } else {
            Column(
                Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                EditField(stringResource(R.string.customers_v2_phone), current.phone, keyboardType = KeyboardType.Phone, error = phoneError) {
                    form = current.copy(phone = it); phoneError = null
                }
                EditField(
                    stringResource(R.string.customers_v2_name), current.name, capitalization = KeyboardCapitalization.Words,
                    error = stringResource(R.string.customers_v2_need_name).takeIf { problem == CustomerEditRules.Problem.MISSING_NAME },
                ) { form = current.copy(name = it); if (problem == CustomerEditRules.Problem.MISSING_NAME) problem = null }
                Text(
                    buildAnnotatedString {
                        append(stringResource(R.string.customers_v2_more_info).uppercase())
                        withStyle(SpanStyle(fontWeight = FontWeight.Normal, letterSpacing = 0.sp)) { append(" " + stringResource(R.string.customers_v2_optional)) }
                    },
                    fontSize = 13.sp, fontWeight = FontWeight.Bold, color = DS.Colors.TextMuted, letterSpacing = 0.5.sp,
                    modifier = Modifier.padding(top = 6.dp),
                )
                EditField(
                    "Email", current.email, keyboardType = KeyboardType.Email, placeholder = stringResource(R.string.customers_v2_email_placeholder),
                    error = stringResource(R.string.customers_v2_bad_email).takeIf { problem == CustomerEditRules.Problem.BAD_EMAIL },
                ) { form = current.copy(email = it); if (problem == CustomerEditRules.Problem.BAD_EMAIL) problem = null }
                EditField(stringResource(R.string.customers_v2_address), current.address) { form = current.copy(address = it) }
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Box(Modifier.weight(1f)) {
                        EditField(stringResource(R.string.customers_v2_id_number), current.idNumber) { form = current.copy(idNumber = it) }
                    }
                    Box(Modifier.weight(1f)) {
                        EditField(
                            stringResource(R.string.customers_v2_date_of_birth), current.dateOfBirth, placeholder = "dd/MM/yyyy",
                            keyboardType = KeyboardType.Number,
                            error = stringResource(R.string.customers_v2_bad_date).takeIf { problem == CustomerEditRules.Problem.BAD_DATE },
                        ) { form = current.copy(dateOfBirth = it); if (problem == CustomerEditRules.Problem.BAD_DATE) problem = null }
                    }
                }
                EditField(stringResource(R.string.customers_v2_note), current.notes, imeAction = ImeAction.Done) { form = current.copy(notes = it) }
            }
        }
        HorizontalDivider(color = DS.Colors.Border)
        Row(
            Modifier.fillMaxWidth().navigationBarsPadding().padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            OutlinedButton(
                onClick = onBack,
                modifier = Modifier.height(52.dp),
                shape = RoundedCornerShape(14.dp),
                border = BorderStroke(1.dp, EditBorder),
                contentPadding = PaddingValues(horizontal = 20.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = DS.Colors.Text),
            ) { Text(stringResource(R.string.customers_v2_cancel), fontSize = 16.sp, fontWeight = FontWeight.SemiBold) }
            Button(
                onClick = ::save,
                enabled = form != null && !saving,
                modifier = Modifier.weight(1f).height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = DS.Colors.Primary, contentColor = Color.White),
            ) {
                if (saving) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = Color.White)
                else Text(stringResource(R.string.save), fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }
    error?.let { AppAlertError(message = it, onDismiss = { error = null }) }
}

@Composable
private fun EditField(
    label: String,
    value: String,
    keyboardType: KeyboardType = KeyboardType.Text,
    capitalization: KeyboardCapitalization = KeyboardCapitalization.None,
    imeAction: ImeAction = ImeAction.Next,
    placeholder: String? = null,
    error: String? = null,
    onValueChange: (String) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text)
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            singleLine = true,
            isError = error != null,
            placeholder = placeholder?.let { { Text(it, fontSize = 16.sp, color = DS.Colors.TextMuted) } },
            supportingText = error?.let { { Text(it, color = EditDanger) } },
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType, capitalization = capitalization, imeAction = imeAction),
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = EditBorder, focusedBorderColor = DS.Colors.Primary),
            textStyle = androidx.compose.ui.text.TextStyle(fontSize = 16.sp, color = DS.Colors.Text),
            modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp).semantics { contentDescription = label },
        )
    }
}
