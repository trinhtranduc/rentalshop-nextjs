package com.anyrent.pos.ui.settings.v2

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.ui.home.v2.ThinDivider
import com.anyrent.pos.ui.home.v2.V2Colors
import com.anyrent.pos.ui.theme.DS

/** What the store form edits (#1313): the shop (owner) or a branch (name, phone, address) */
internal enum class StoreFormKind { SHOP, BRANCH }

/** The fields of the store form (#484, #1313, same fields as iOS EditStoreViewController) */
internal data class StoreForm(
    val name: String = "",
    val phone: String = "",
    val taxId: String = "",
    val address: String = "",
    val city: String = "",
    val state: String = "",
    val country: String = "",
    val zipCode: String = "",
    val description: String = "",
)

/** Country names the API stores (English, iOS `CountryList.getAllCountries`) */
internal object StoreCountries {
    val all: List<String> = listOf(
        "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda",
        "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain",
        "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia",
        "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso",
        "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic",
        "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia",
        "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic",
        "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini",
        "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany",
        "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti",
        "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland",
        "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati",
        "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia",
        "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia",
        "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico",
        "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique",
        "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua",
        "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan",
        "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines",
        "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis",
        "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe",
        "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia",
        "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan",
        "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan",
        "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago",
        "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates",
        "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City",
        "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe",
    ).sorted()

    /** Case-insensitive contains; a stored value missing from the list still shows first */
    fun filter(query: String, current: String): List<String> {
        val base = if (current.isNotBlank() && current !in all) listOf(current) + all else all
        val q = query.trim()
        return if (q.isEmpty()) base else base.filter { it.contains(q, ignoreCase = true) }
    }
}

private val FieldBorder = Color(0xFFCBD5E1)
private val Required = Color(0xFFB91C1C)

/**
 * #484 / #1313 shop and branch form in the v2 style (board CH-sua, mockup "Sửa thông tin shop"): label above each field, no icons in
 * fields, "KHÁC (không bắt buộc)", Hủy / Lưu footer. Without `canEdit` the fields are off and there is no footer.
 * - SHOP: name*, phone, tax id, ĐỊA CHỈ (street, ward / district, province), KHÁC (country, postal code, description)
 * - BRANCH: name*, phone, address*
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun StoreInfoV2Page(
    kind: StoreFormKind,
    title: String,
    subtitle: String?,
    form: StoreForm,
    onChange: (StoreForm) -> Unit,
    canEdit: Boolean,
    loadingInitial: Boolean,
    saving: Boolean,
    nameError: Boolean,
    addressError: Boolean = false,
    message: String?,
    error: String?,
    onBack: () -> Unit,
    onSave: () -> Unit,
) {
    var showCountries by remember { mutableStateOf(false) }
    SettingsDetailPage(
        title = title,
        onBack = onBack,
        bottomBar = if (canEdit) {
            {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedButton(
                        onClick = onBack,
                        modifier = Modifier.height(52.dp),
                        shape = RoundedCornerShape(14.dp),
                        border = BorderStroke(1.dp, FieldBorder),
                        contentPadding = PaddingValues(horizontal = 20.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = DS.Colors.Text),
                    ) { Text(stringResource(R.string.cancel), fontSize = DS.TextSize.Input, fontWeight = FontWeight.SemiBold) }
                    Button(
                        onClick = onSave,
                        enabled = !loadingInitial && !saving,
                        modifier = Modifier.weight(1f).height(52.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = DS.Colors.Primary, contentColor = Color.White),
                    ) {
                        if (saving) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = Color.White)
                        else Text(stringResource(R.string.save), fontSize = DS.TextSize.Input, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        } else {
            null
        },
    ) {
        Column(
            Modifier.fillMaxSize().imePadding().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            if (loadingInitial) {
                SettingsDetailNote(stringResource(R.string.loading))
            } else {
                subtitle?.let { SettingsDetailNote(it) }
                val shop = kind == StoreFormKind.SHOP
                val nameLabel = stringResource(if (shop) R.string.shopinfo_shop_name else R.string.shopinfo_branch_name)
                StoreField(
                    label = buildAnnotatedString {
                        append(nameLabel)
                        if (canEdit) withStyle(SpanStyle(color = Required)) { append(" *") }
                    },
                    description = nameLabel,
                    value = form.name, enabled = canEdit, isError = nameError,
                    capitalization = KeyboardCapitalization.Words,
                ) { onChange(form.copy(name = it)) }
                StoreField(
                    AnnotatedString(stringResource(R.string.store_v2_phone)), value = form.phone, enabled = canEdit,
                    keyboardType = KeyboardType.Phone,
                ) { onChange(form.copy(phone = it)) }
                if (shop) {
                    StoreField(AnnotatedString(stringResource(R.string.shopinfo_tax_id)), value = form.taxId, enabled = canEdit) {
                        onChange(form.copy(taxId = it))
                    }
                    SectionTitle(stringResource(R.string.store_v2_address_section).uppercase(), null)
                    StoreField(AnnotatedString(stringResource(R.string.store_v2_street)), value = form.address, enabled = canEdit) {
                        onChange(form.copy(address = it))
                    }
                    StoreField(AnnotatedString(stringResource(R.string.store_v2_state)), value = form.state, enabled = canEdit) {
                        onChange(form.copy(state = it))
                    }
                    StoreField(AnnotatedString(stringResource(R.string.store_v2_city)), value = form.city, enabled = canEdit) {
                        onChange(form.copy(city = it))
                    }
                    SectionTitle(stringResource(R.string.store_v2_other).uppercase(), stringResource(R.string.store_v2_optional))
                    CountryField(form.country, enabled = canEdit, modifier = Modifier.fillMaxWidth()) { showCountries = true }
                    StoreField(
                        AnnotatedString(stringResource(R.string.store_v2_postal)), value = form.zipCode, enabled = canEdit,
                        keyboardType = KeyboardType.Number,
                    ) { onChange(form.copy(zipCode = it)) }
                    StoreField(
                        AnnotatedString(stringResource(R.string.store_v2_description)), value = form.description, enabled = canEdit,
                        singleLine = false, placeholder = stringResource(R.string.store_v2_description_placeholder),
                        capitalization = KeyboardCapitalization.Sentences, imeAction = ImeAction.Default,
                    ) { onChange(form.copy(description = it)) }
                } else {
                    val addressLabel = stringResource(R.string.shopinfo_address_label)
                    StoreField(
                        label = buildAnnotatedString {
                            append(addressLabel)
                            if (canEdit) withStyle(SpanStyle(color = Required)) { append(" *") }
                        },
                        description = addressLabel,
                        value = form.address, enabled = canEdit, isError = addressError,
                        capitalization = KeyboardCapitalization.Sentences,
                    ) { onChange(form.copy(address = it)) }
                }
            }
            message?.let { SettingsDetailNote(it, DS.Colors.Primary) }
            error?.let { SettingsDetailNote(it, V2Colors.Danger) }
        }
    }

    if (showCountries) {
        ModalBottomSheet(
            onDismissRequest = { showCountries = false },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
            containerColor = DS.Colors.Surface,
        ) {
            CountrySheet(form.country) {
                showCountries = false
                onChange(form.copy(country = it))
            }
        }
    }
}

@Composable
private fun SectionTitle(title: String, note: String?) {
    Text(
        buildAnnotatedString {
            append(title)
            if (note != null) withStyle(SpanStyle(fontWeight = FontWeight.Normal, letterSpacing = 0.sp)) { append(" $note") }
        },
        fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Bold, color = DS.Colors.TextMuted, letterSpacing = 0.5.sp,
        modifier = Modifier.padding(top = 6.dp).semantics { heading() },
    )
}

@Composable
private fun StoreField(
    label: AnnotatedString,
    value: String,
    enabled: Boolean,
    modifier: Modifier = Modifier,
    description: String = label.text,
    isError: Boolean = false,
    singleLine: Boolean = true,
    placeholder: String? = null,
    keyboardType: KeyboardType = KeyboardType.Text,
    capitalization: KeyboardCapitalization = KeyboardCapitalization.None,
    imeAction: ImeAction = ImeAction.Next,
    onValueChange: (String) -> Unit,
) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text)
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            enabled = enabled,
            singleLine = singleLine,
            minLines = if (singleLine) 1 else 3,
            isError = isError,
            placeholder = placeholder?.let { { Text(it, fontSize = DS.TextSize.Input, color = DS.Colors.TextMuted) } },
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType, capitalization = capitalization, imeAction = imeAction),
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                unfocusedBorderColor = FieldBorder,
                focusedBorderColor = DS.Colors.Primary,
                disabledBorderColor = FieldBorder,
                disabledTextColor = DS.Colors.TextMuted,
                disabledContainerColor = V2Colors.Section,
            ),
            textStyle = TextStyle(fontSize = DS.TextSize.Input, color = DS.Colors.Text),
            modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp).semantics { contentDescription = description },
        )
    }
}

/** "Quốc gia" opens the country list; looks like a field with a chevron */
@Composable
private fun CountryField(country: String, enabled: Boolean, modifier: Modifier, onClick: () -> Unit) {
    val label = stringResource(R.string.store_v2_country)
    val placeholder = stringResource(R.string.store_v2_country_pick)
    Column(modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text)
        Row(
            Modifier
                .fillMaxWidth()
                .height(52.dp)
                .clip(RoundedCornerShape(12.dp))
                .border(1.dp, FieldBorder, RoundedCornerShape(12.dp))
                .clickable(enabled = enabled, onClick = onClick)
                .semantics {
                    contentDescription = "$label: ${country.ifBlank { placeholder }}"
                    role = Role.Button
                }
                .padding(horizontal = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                country.ifBlank { placeholder }, fontSize = DS.TextSize.Input, maxLines = 1,
                color = if (country.isBlank() || !enabled) DS.Colors.TextMuted else DS.Colors.Text,
                modifier = Modifier.weight(1f),
            )
            Icon(Icons.AutoMirrored.Outlined.KeyboardArrowRight, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(18.dp))
        }
    }
}

@Composable
private fun CountrySheet(selected: String, onSelect: (String) -> Unit) {
    var query by remember { mutableStateOf("") }
    val countries = StoreCountries.filter(query, selected)
    Column(Modifier.fillMaxWidth().padding(bottom = 16.dp)) {
        Text(
            stringResource(R.string.store_v2_country_pick), fontSize = 18.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text,
            modifier = Modifier.padding(start = 20.dp, end = 20.dp, bottom = 8.dp).semantics { heading() },
        )
        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            singleLine = true,
            placeholder = { Text(stringResource(R.string.search), fontSize = DS.TextSize.Input, color = DS.Colors.TextMuted) },
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = FieldBorder, focusedBorderColor = DS.Colors.Primary),
            textStyle = TextStyle(fontSize = DS.TextSize.Input, color = DS.Colors.Text),
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).heightIn(min = 52.dp),
        )
        Box(Modifier.fillMaxWidth().height(8.dp))
        ThinDivider()
        LazyColumn(Modifier.fillMaxWidth().heightIn(max = 480.dp)) {
            items(countries, key = { it }) { country ->
                Row(
                    Modifier.fillMaxWidth().heightIn(min = 52.dp).clickable { onSelect(country) }.padding(horizontal = 20.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(country, fontSize = DS.TextSize.Body, color = DS.Colors.Text, modifier = Modifier.weight(1f))
                    if (country == selected) Icon(Icons.Outlined.Check, contentDescription = null, tint = DS.Colors.Primary, modifier = Modifier.size(DS.Icon.Md))
                }
                ThinDivider()
            }
        }
    }
}
