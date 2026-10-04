package com.anyrent.pos.ui.auth.v2

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.listSaver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.error
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLinkStyles
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.config.AppLegalLinks
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.ApiParity
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.domain.auth.AuthErrorMapping
import com.anyrent.pos.domain.auth.AuthField
import com.anyrent.pos.domain.auth.AuthValidation
import com.anyrent.pos.domain.auth.BusinessTagRules
import com.anyrent.pos.domain.auth.RegisterDraft
import com.anyrent.pos.domain.auth.ResendCooldown
import com.anyrent.pos.domain.error.AppError
import com.anyrent.pos.push.PushRegistrar
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

// #386 — boards Dang-nhap, Dang-ky, Dang-ky-2, Quen-mat-khau, Quen-mat-khau-da-gui (flag `newAuth`)

private val FieldBorder = Color(0xFFCBD5E1)
private val ErrorRed = Color(0xFFB91C1C)
private val ChipBorder = Color(0xFFE2E8F0)
private val Track = Color(0xFFE5E7EB)
private val TermsText = Color(0xFF334155)
private val MaxWidth = 480.dp

// MARK: - Building blocks

/** White page: optional [header], scrolling [content] and a [footer] pinned above the keyboard */
@Composable
private fun AuthPage(
    header: (@Composable () -> Unit)?,
    footer: @Composable ColumnScope.() -> Unit,
    contentTop: Int,
    content: @Composable ColumnScope.() -> Unit,
) {
    Surface(Modifier.fillMaxSize(), color = Color.White) {
        Column(
            Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().imePadding(),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(Modifier.widthIn(max = MaxWidth).fillMaxWidth()) { header?.invoke() }
            Column(
                Modifier
                    .weight(1f)
                    .widthIn(max = MaxWidth)
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(start = 24.dp, end = 24.dp, top = contentTop.dp, bottom = 16.dp),
                content = content,
            )
            Column(
                Modifier.widthIn(max = MaxWidth).fillMaxWidth().padding(start = 24.dp, end = 24.dp, top = 12.dp, bottom = 24.dp),
                content = footer,
            )
        }
    }
}

@Composable
private fun AuthTitle(title: String, subtitle: String) {
    Text(
        title,
        modifier = Modifier.semantics { heading() },
        color = DS.Colors.Text,
        fontSize = 24.sp,
        fontWeight = FontWeight.Bold,
    )
    Spacer(Modifier.height(6.dp))
    Text(subtitle, color = DS.Colors.TextMuted, fontSize = 15.sp, lineHeight = 22.sp)
}

@Composable
private fun AuthBackHeader(onBack: () -> Unit, step: Int? = null, total: Int = 2) {
    Column {
        Row(Modifier.fillMaxWidth().padding(start = 4.dp, top = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.authv2_back), tint = DS.Colors.Text)
            }
            Spacer(Modifier.weight(1f))
            if (step != null) {
                Text(
                    stringResource(R.string.authv2_step, step, total),
                    modifier = Modifier.padding(end = 24.dp),
                    color = DS.Colors.TextMuted,
                    fontSize = 13.sp,
                )
            }
        }
        if (step != null) {
            Box(
                Modifier.padding(horizontal = 24.dp).padding(top = 4.dp).fillMaxWidth().height(4.dp)
                    .background(Track, RoundedCornerShape(2.dp)),
            ) {
                Box(
                    Modifier.fillMaxWidth(step.toFloat() / total).height(4.dp)
                        .background(DS.Colors.Primary, RoundedCornerShape(2.dp)),
                )
            }
        }
    }
}

/** Label above, field, optional hint and the inline error below */
@Composable
private fun AuthField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    error: String?,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
    hint: String? = null,
    keyboardType: KeyboardType = KeyboardType.Text,
    capitalization: KeyboardCapitalization = KeyboardCapitalization.None,
    password: Boolean = false,
    imeAction: ImeAction = ImeAction.Next,
    onImeAction: (() -> Unit)? = null,
) {
    var visible by rememberSaveable { mutableStateOf(false) }
    val focus = LocalFocusManager.current
    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, color = DS.Colors.Text, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 52.dp)
                .semantics {
                    contentDescription = label
                    if (error != null) error(error)
                },
            placeholder = placeholder?.let { { Text(it, color = DS.Colors.TextMuted, fontSize = 16.sp) } },
            singleLine = true,
            isError = error != null,
            textStyle = TextStyle(fontSize = 16.sp, color = DS.Colors.Text),
            shape = RoundedCornerShape(12.dp),
            visualTransformation = if (password && !visible) PasswordVisualTransformation() else VisualTransformation.None,
            keyboardOptions = KeyboardOptions(
                keyboardType = if (password) KeyboardType.Password else keyboardType,
                capitalization = capitalization,
                autoCorrectEnabled = !password && keyboardType == KeyboardType.Text,
                imeAction = imeAction,
            ),
            keyboardActions = KeyboardActions(
                onNext = { focus.moveFocus(androidx.compose.ui.focus.FocusDirection.Down) },
                onDone = { focus.clearFocus(); onImeAction?.invoke() },
                onGo = { focus.clearFocus(); onImeAction?.invoke() },
                onSend = { focus.clearFocus(); onImeAction?.invoke() },
            ),
            trailingIcon = if (password) {
                {
                    IconButton(onClick = { visible = !visible }) {
                        Icon(
                            if (visible) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility,
                            contentDescription = stringResource(if (visible) R.string.authv2_password_hide else R.string.authv2_password_show),
                            tint = DS.Colors.TextMuted,
                        )
                    }
                }
            } else null,
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = Color.White,
                unfocusedContainerColor = Color.White,
                errorContainerColor = Color.White,
                focusedBorderColor = DS.Colors.Primary,
                unfocusedBorderColor = FieldBorder,
                errorBorderColor = ErrorRed,
                cursorColor = DS.Colors.Primary,
                errorCursorColor = ErrorRed,
            ),
        )
        if (hint != null && error == null) Text(hint, color = DS.Colors.TextMuted, fontSize = 13.sp)
        if (error != null) Text(error, color = ErrorRed, fontSize = 13.sp, fontWeight = FontWeight.Medium)
    }
}

@Composable
private fun AuthButton(text: String, loading: Boolean, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        enabled = !loading,
        modifier = Modifier.fillMaxWidth().height(52.dp),
        shape = RoundedCornerShape(14.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = DS.Colors.Primary,
            disabledContainerColor = DS.Colors.Primary.copy(alpha = .6f),
            disabledContentColor = Color.White,
        ),
    ) {
        if (loading) {
            CircularProgressIndicator(Modifier.size(22.dp), color = Color.White, strokeWidth = 2.dp)
        } else {
            Text(text, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun AuthLink(text: String, onClick: () -> Unit, enabled: Boolean = true) {
    TextButton(onClick = onClick, enabled = enabled, modifier = Modifier.heightIn(min = 48.dp)) {
        Text(
            text,
            color = if (enabled) DS.Colors.Primary else DS.Colors.TextMuted,
            fontSize = 15.sp,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

/** Message for a failed call: the screens' own copy for known codes, else what `ApiClient` resolved */
@Composable
private fun rememberErrorText(): (Throwable) -> String {
    val context = LocalContext.current
    return { error ->
        val appError = AppError.from(error)
        val status = (appError as? AppError.Http)?.statusCode
        AuthErrorMapping.messageRes(appError.code, status)?.let(context::getString)
            ?: appError.message.ifBlank { context.getString(R.string.request_failed) }
    }
}

// MARK: - Login (Dang-nhap)

@Composable
fun LoginV2Screen(
    onLoggedIn: () -> Unit,
    onForgotPassword: (String) -> Unit,
    onRegister: () -> Unit,
) {
    // Prefill like the current screen (lastLoginEmail survives clearAuth)
    var email by rememberSaveable { mutableStateOf(SessionStore.lastLoginEmail.orEmpty()) }
    var password by rememberSaveable { mutableStateOf("") }
    var emailError by remember { mutableStateOf<String?>(null) }
    var passwordError by remember { mutableStateOf<String?>(null) }
    var generalError by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val errorText = rememberErrorText()

    fun submit() {
        val errors = AuthValidation.login(email, password)
        emailError = errors[AuthField.EMAIL]?.let { context.getString(it.messageRes) }
        passwordError = errors[AuthField.PASSWORD]?.let { context.getString(it.messageRes) }
        generalError = null
        if (errors.isNotEmpty()) return
        loading = true
        scope.launch {
            // Same call and success path as the current LoginScreen
            val result = withContext(Dispatchers.IO) { ApiClient.get().login(email.trim(), password) }
            loading = false
            result.onSuccess {
                SessionStore.lastLoginEmail = email.trim()
                PushRegistrar.refreshTokenIfLoggedIn()
                onLoggedIn()
            }.onFailure { failure ->
                val message = errorText(failure)
                when (AuthErrorMapping.login(AppError.from(failure).code)) {
                    is AuthErrorMapping.Placement.Field -> passwordError = message
                    AuthErrorMapping.Placement.General -> generalError = message
                }
            }
        }
    }

    AuthPage(
        header = null,
        contentTop = 56,
        footer = {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                Text(stringResource(R.string.authv2_no_store), color = DS.Colors.TextMuted, fontSize = 15.sp)
                AuthLink(stringResource(R.string.authv2_create_store), onRegister)
            }
        },
    ) {
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            Image(
                painter = painterResource(R.drawable.anyrent_logo),
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                contentScale = ContentScale.Fit,
            )
            Spacer(Modifier.height(12.dp))
            Text("AnyRent", color = DS.Colors.Text, fontSize = 22.sp, fontWeight = FontWeight.Bold)
        }
        Spacer(Modifier.height(40.dp))
        AuthTitle(stringResource(R.string.authv2_login_title), stringResource(R.string.authv2_login_subtitle))
        Spacer(Modifier.height(24.dp))
        AuthField(
            label = stringResource(R.string.authv2_email),
            value = email,
            onValueChange = { email = it; emailError = null },
            error = emailError,
            placeholder = stringResource(R.string.authv2_email_placeholder),
            keyboardType = KeyboardType.Email,
        )
        Spacer(Modifier.height(16.dp))
        AuthField(
            label = stringResource(R.string.authv2_password),
            value = password,
            onValueChange = { password = it; passwordError = null },
            error = passwordError,
            password = true,
            imeAction = ImeAction.Go,
            onImeAction = { submit() },
        )
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
            AuthLink(stringResource(R.string.authv2_forgot_link), { onForgotPassword(email.trim()) })
        }
        generalError?.let {
            Text(it, color = ErrorRed, fontSize = 14.sp, modifier = Modifier.padding(bottom = 8.dp))
        }
        AuthButton(stringResource(R.string.authv2_login_button), loading) { submit() }
    }
}

// MARK: - Create store (Dang-ky, Dang-ky-2)

private val RegisterDraftSaver = listSaver<RegisterDraft, Any>(
    save = {
        listOf(it.storeName, it.phone, it.address, ArrayList(it.tags), it.fullName, it.email, it.password,
            it.confirmPassword, it.termsAccepted)
    },
    restore = {
        @Suppress("UNCHECKED_CAST")
        RegisterDraft(
            storeName = it[0] as String, phone = it[1] as String, address = it[2] as String,
            tags = (it[3] as List<String>).toSet(), fullName = it[4] as String, email = it[5] as String,
            password = it[6] as String, confirmPassword = it[7] as String, termsAccepted = it[8] as Boolean,
        )
    },
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun RegisterStoreV2Screen(onBack: () -> Unit, onRegistered: () -> Unit) {
    var step by rememberSaveable { mutableIntStateOf(1) }
    var draft by rememberSaveable(stateSaver = RegisterDraftSaver) { mutableStateOf(RegisterDraft()) }
    var errors by remember { mutableStateOf<Map<AuthField, String>>(emptyMap()) }
    var generalError by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val errorText = rememberErrorText()

    fun clear(field: AuthField) {
        if (field in errors) errors = errors - field
    }

    fun back() {
        errors = emptyMap()
        generalError = null
        if (step == 2) step = 1 else onBack()
    }

    fun primary() {
        generalError = null
        val found = if (step == 1) draft.storeErrors else draft.ownerErrors
        errors = found.mapValues { context.getString(it.value.messageRes) }
        if (found.isNotEmpty()) return
        if (step == 1) {
            step = 2
            return
        }
        val request = draft.request()
        loading = true
        scope.launch {
            // Same call as the current sign-up
            val result = withContext(Dispatchers.IO) {
                ApiParity.registerMerchant(
                    request.email, request.password, request.fullName, request.phone,
                    request.storeName, request.address, request.businessTags,
                )
            }
            loading = false
            result.onSuccess { onRegistered() }.onFailure { failure ->
                val message = errorText(failure)
                when (val placement = AuthErrorMapping.register(AppError.from(failure).code)) {
                    is AuthErrorMapping.Placement.Field -> errors = errors + (placement.field to message)
                    AuthErrorMapping.Placement.General -> generalError = message
                }
            }
        }
    }

    androidx.activity.compose.BackHandler(enabled = step == 2) { back() }

    AuthPage(
        header = { AuthBackHeader(onBack = { back() }, step = step) },
        contentTop = 20,
        footer = {
            generalError?.let { Text(it, color = ErrorRed, fontSize = 14.sp, modifier = Modifier.padding(bottom = 8.dp)) }
            AuthButton(
                stringResource(if (step == 1) R.string.authv2_continue else R.string.authv2_create_store_button),
                loading,
            ) { primary() }
        },
    ) {
        if (step == 1) {
            AuthTitle(stringResource(R.string.authv2_store_title), stringResource(R.string.authv2_store_subtitle))
            Spacer(Modifier.height(20.dp))
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                AuthField(
                    label = stringResource(R.string.authv2_store_name),
                    value = draft.storeName,
                    onValueChange = { draft = draft.copy(storeName = it); clear(AuthField.STORE_NAME) },
                    error = errors[AuthField.STORE_NAME],
                    capitalization = KeyboardCapitalization.Words,
                )
                AuthField(
                    label = stringResource(R.string.authv2_phone),
                    value = draft.phone,
                    onValueChange = { draft = draft.copy(phone = it); clear(AuthField.PHONE) },
                    error = errors[AuthField.PHONE],
                    keyboardType = KeyboardType.Phone,
                )
                AuthField(
                    label = stringResource(R.string.authv2_address),
                    value = draft.address,
                    onValueChange = { draft = draft.copy(address = it); clear(AuthField.ADDRESS) },
                    error = errors[AuthField.ADDRESS],
                    placeholder = stringResource(R.string.authv2_address_placeholder),
                    capitalization = KeyboardCapitalization.Sentences,
                    imeAction = ImeAction.Done,
                )
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        buildAnnotatedString {
                            withStyle(SpanStyle(fontWeight = FontWeight.SemiBold, color = DS.Colors.Text)) {
                                append(stringResource(R.string.authv2_rent_what))
                            }
                            append(" ")
                            withStyle(SpanStyle(color = DS.Colors.TextMuted)) { append(stringResource(R.string.authv2_rent_what_hint)) }
                        },
                        fontSize = 14.sp,
                    )
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        BusinessTagRules.options.forEach { option ->
                            TagChip(
                                label = stringResource(option.labelRes),
                                selected = option.apiValue in draft.tags,
                                onClick = { draft = draft.copy(tags = BusinessTagRules.toggle(option.apiValue, draft.tags)) },
                            )
                        }
                    }
                }
            }
        } else {
            AuthTitle(stringResource(R.string.authv2_owner_title), stringResource(R.string.authv2_owner_subtitle))
            Spacer(Modifier.height(20.dp))
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                AuthField(
                    label = stringResource(R.string.authv2_full_name),
                    value = draft.fullName,
                    onValueChange = { draft = draft.copy(fullName = it); clear(AuthField.FULL_NAME) },
                    error = errors[AuthField.FULL_NAME],
                    capitalization = KeyboardCapitalization.Words,
                )
                AuthField(
                    label = stringResource(R.string.authv2_email),
                    value = draft.email,
                    onValueChange = { draft = draft.copy(email = it); clear(AuthField.EMAIL) },
                    error = errors[AuthField.EMAIL],
                    keyboardType = KeyboardType.Email,
                )
                AuthField(
                    label = stringResource(R.string.authv2_password),
                    value = draft.password,
                    onValueChange = { draft = draft.copy(password = it); clear(AuthField.PASSWORD) },
                    error = errors[AuthField.PASSWORD],
                    hint = stringResource(R.string.authv2_password_hint),
                    password = true,
                )
                AuthField(
                    label = stringResource(R.string.authv2_confirm_password),
                    value = draft.confirmPassword,
                    onValueChange = { draft = draft.copy(confirmPassword = it); clear(AuthField.CONFIRM_PASSWORD) },
                    error = errors[AuthField.CONFIRM_PASSWORD],
                    password = true,
                    imeAction = ImeAction.Done,
                )
                TermsRow(
                    checked = draft.termsAccepted,
                    error = errors[AuthField.TERMS],
                    onToggle = {
                        draft = draft.copy(termsAccepted = !draft.termsAccepted)
                        clear(AuthField.TERMS)
                    },
                )
            }
        }
    }
}

@Composable
private fun TagChip(label: String, selected: Boolean, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(999.dp),
        color = if (selected) DS.Colors.Text else Color.White,
        border = if (selected) null else BorderStroke(1.dp, ChipBorder),
        modifier = Modifier.heightIn(min = 40.dp).semantics { contentDescription = label },
    ) {
        Box(Modifier.heightIn(min = 40.dp).padding(horizontal = 14.dp), contentAlignment = Alignment.Center) {
            Text(
                label,
                color = if (selected) Color.White else DS.Colors.Text,
                fontSize = 14.sp,
                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
            )
        }
    }
}

@Composable
private fun TermsRow(checked: Boolean, error: String?, onToggle: () -> Unit) {
    val terms = stringResource(R.string.authv2_terms_of_use)
    val privacy = stringResource(R.string.authv2_privacy_policy)
    val full = stringResource(R.string.authv2_terms, terms, privacy)
    val linkStyle = TextLinkStyles(SpanStyle(color = DS.Colors.Primary, fontWeight = FontWeight.SemiBold))
    val text = buildAnnotatedString {
        append(full)
        full.indexOf(terms).takeIf { it >= 0 }?.let {
            addLink(LinkAnnotation.Url(AppLegalLinks.TERMS_URL, linkStyle), it, it + terms.length)
        }
        full.indexOf(privacy).takeIf { it >= 0 }?.let {
            addLink(LinkAnnotation.Url(AppLegalLinks.PRIVACY_URL, linkStyle), it, it + privacy.length)
        }
    }
    Column {
        Row(
            Modifier
                .fillMaxWidth()
                .heightIn(min = 48.dp)
                .toggleable(value = checked, role = Role.Checkbox, onValueChange = { onToggle() }),
            verticalAlignment = Alignment.Top,
        ) {
            Checkbox(
                checked = checked,
                onCheckedChange = null,
                modifier = Modifier.padding(top = 12.dp, end = 12.dp),
                colors = CheckboxDefaults.colors(
                    checkedColor = DS.Colors.Primary,
                    uncheckedColor = if (error != null) ErrorRed else FieldBorder,
                ),
            )
            Text(text, color = TermsText, fontSize = 14.sp, lineHeight = 20.sp, modifier = Modifier.padding(top = 12.dp))
        }
        if (error != null) Text(error, color = ErrorRed, fontSize = 13.sp, fontWeight = FontWeight.Medium)
    }
}

// MARK: - Forgot password (Quen-mat-khau)

@Composable
fun ForgotPasswordV2Screen(initialEmail: String, onBack: () -> Unit, onSent: (String) -> Unit) {
    var email by rememberSaveable { mutableStateOf(initialEmail) }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val errorText = rememberErrorText()

    fun send() {
        val problem = AuthValidation.forgot(email)[AuthField.EMAIL]
        error = problem?.let { context.getString(it.messageRes) }
        if (problem != null) return
        val value = email.trim()
        loading = true
        scope.launch {
            // Same call as the current screen; errors inline as there
            val result = withContext(Dispatchers.IO) { ApiClient.get().forgotPassword(value) }
            loading = false
            result.onSuccess { onSent(value) }.onFailure { error = errorText(it) }
        }
    }

    AuthPage(
        header = { AuthBackHeader(onBack) },
        contentTop = 24,
        footer = {
            Text(
                stringResource(R.string.authv2_forgot_staff_note),
                modifier = Modifier.fillMaxWidth(),
                color = DS.Colors.TextMuted,
                fontSize = 14.sp,
                textAlign = TextAlign.Center,
            )
        },
    ) {
        AuthTitle(stringResource(R.string.authv2_forgot_title), stringResource(R.string.authv2_forgot_text))
        Spacer(Modifier.height(24.dp))
        AuthField(
            label = stringResource(R.string.authv2_email),
            value = email,
            onValueChange = { email = it; error = null },
            error = error,
            placeholder = stringResource(R.string.authv2_email_placeholder),
            keyboardType = KeyboardType.Email,
            imeAction = ImeAction.Send,
            onImeAction = { send() },
        )
        Spacer(Modifier.height(20.dp))
        AuthButton(stringResource(R.string.authv2_forgot_send), loading) { send() }
    }
}

// MARK: - Email sent (Quen-mat-khau-da-gui)

@Composable
fun EmailSentV2Screen(email: String, onBackToLogin: () -> Unit) {
    var cooldownEnd by rememberSaveable { mutableLongStateOf(0L) }
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    var sending by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val errorText = rememberErrorText()
    val cooldown = ResendCooldown(endsAtMillis = cooldownEnd.takeIf { it > 0 })
    val remaining = cooldown.remaining(now)

    LaunchedEffect(cooldownEnd) {
        while (cooldown.remaining(System.currentTimeMillis()) > 0) {
            now = System.currentTimeMillis()
            delay(250)
        }
        now = System.currentTimeMillis()
    }

    androidx.activity.compose.BackHandler { onBackToLogin() }

    AuthPage(
        header = { AuthBackHeader(onBackToLogin) },
        contentTop = 24,
        footer = {
            error?.let { Text(it, color = ErrorRed, fontSize = 14.sp, modifier = Modifier.padding(bottom = 8.dp)) }
            AuthButton(stringResource(R.string.authv2_back_to_login), loading = false, onClick = onBackToLogin)
            Spacer(Modifier.height(8.dp))
            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                AuthLink(
                    text = if (remaining > 0) stringResource(R.string.authv2_resend_in, remaining) else stringResource(R.string.authv2_resend),
                    enabled = remaining == 0 && !sending,
                    onClick = {
                        sending = true
                        error = null
                        scope.launch {
                            val result = withContext(Dispatchers.IO) { ApiClient.get().forgotPassword(email) }
                            sending = false
                            result.onSuccess {
                                cooldownEnd = ResendCooldown().start(System.currentTimeMillis()).endsAtMillis ?: 0L
                            }.onFailure { error = errorText(it) }
                        }
                    },
                )
            }
        },
    ) {
        Box(
            Modifier.size(56.dp).background(DS.Status.Done.fill, RoundedCornerShape(16.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Outlined.Email, contentDescription = null, tint = DS.Status.Done.text, modifier = Modifier.size(28.dp))
        }
        Spacer(Modifier.height(20.dp))
        Text(
            stringResource(R.string.authv2_sent_title),
            modifier = Modifier.semantics { heading() },
            color = DS.Colors.Text,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
        )
        Spacer(Modifier.height(6.dp))
        val full = stringResource(R.string.authv2_sent_reset, email)
        Text(
            buildAnnotatedString {
                append(full)
                full.indexOf(email).takeIf { it >= 0 && email.isNotEmpty() }?.let {
                    addStyle(SpanStyle(fontWeight = FontWeight.Bold, color = DS.Colors.Text), it, it + email.length)
                }
            },
            color = DS.Colors.TextMuted,
            fontSize = 15.sp,
            lineHeight = 22.sp,
        )
    }
}
