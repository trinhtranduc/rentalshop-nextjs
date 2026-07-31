package com.anyrent.pos.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.ApiParity
import com.anyrent.pos.push.PushRegistrar
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private val AuthBlue = Color(0xFF2454F4)

@Composable
private fun AuthBackground(content: @Composable () -> Unit) {
    Box(
        Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(Color(0xFF59C7F4), Color(0xFFDFF7FF), Color(0xFF0872EA)),
                ),
            ),
    ) {
        Box(
            Modifier
                .fillMaxSize()
                .background(
                    Brush.radialGradient(
                        listOf(Color.White.copy(alpha = .78f), Color.Transparent),
                        radius = 780f,
                    ),
                ),
        )
        content()
    }
}

@Composable
private fun AuthCard(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(22.dp),
        color = Color.White.copy(alpha = .92f),
        shadowElevation = 2.dp,
        content = { content() },
    )
}

@Composable
private fun AuthField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    placeholder: String,
    icon: ImageVector,
    keyboardType: KeyboardType = KeyboardType.Text,
    password: Boolean = false,
) {
    var visible by remember { mutableStateOf(false) }
    Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
        Text(label, fontWeight = FontWeight.Medium)
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            placeholder = { Text(placeholder) },
            leadingIcon = { Icon(icon, contentDescription = null) },
            trailingIcon = if (password) {
                {
                    IconButton(onClick = { visible = !visible }) {
                        Icon(
                            if (visible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                            contentDescription = null,
                        )
                    }
                }
            } else null,
            visualTransformation = if (password && !visible) PasswordVisualTransformation()
            else VisualTransformation.None,
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
            singleLine = true,
            shape = RoundedCornerShape(14.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = Color.White,
                unfocusedContainerColor = Color.White,
            ),
            modifier = Modifier.fillMaxWidth().height(60.dp),
        )
    }
}

@Composable
fun LoginScreen(
    onLoggedIn: () -> Unit,
    onForgotPassword: () -> Unit,
    onRegister: () -> Unit,
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    AuthBackground {
        Column(
            Modifier.fillMaxSize().imePadding().verticalScroll(rememberScrollState()).padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Box(
                Modifier.size(62.dp).background(AuthBlue, RoundedCornerShape(18.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Text("A", color = Color.White, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
            }
            Spacer(Modifier.height(22.dp))
            Text(stringResource(R.string.welcome_back), style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(28.dp))
            AuthCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(15.dp)) {
                    AuthField(email, { email = it }, stringResource(R.string.email), stringResource(R.string.enter_email), Icons.Default.Email, KeyboardType.Email)
                    AuthField(password, { password = it }, stringResource(R.string.password), stringResource(R.string.enter_password), Icons.Default.Lock, KeyboardType.Password, true)
                    Text(
                        stringResource(R.string.forgot_password),
                        modifier = Modifier.align(Alignment.End).clickable(onClick = onForgotPassword).padding(8.dp),
                        color = AuthBlue,
                    )
                    error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                    Button(
                        onClick = {
                            loading = true
                            error = null
                            scope.launch {
                                val result = withContext(Dispatchers.IO) { ApiClient.get().login(email, password) }
                                loading = false
                                result.onSuccess {
                                    PushRegistrar.refreshTokenIfLoggedIn()
                                    onLoggedIn()
                                }.onFailure { error = it.message }
                            }
                        },
                        enabled = !loading && email.isNotBlank() && password.isNotBlank(),
                        modifier = Modifier.fillMaxWidth().height(56.dp),
                    ) { Text(if (loading) stringResource(R.string.loading) else stringResource(R.string.login), fontWeight = FontWeight.Bold) }
                }
            }
            Spacer(Modifier.height(18.dp))
            OutlinedButton(
                onClick = onRegister,
                modifier = Modifier.fillMaxWidth().height(58.dp),
                colors = ButtonDefaults.outlinedButtonColors(containerColor = Color.White),
                shape = RoundedCornerShape(28.dp),
            ) { Text(stringResource(R.string.create_store_account), color = AuthBlue, fontWeight = FontWeight.Bold) }
        }
    }
}

@Composable
fun ForgotPasswordScreen(onBack: () -> Unit, onCheckEmail: (String) -> Unit) {
    var email by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    AuthBackground {
        Column(Modifier.fillMaxSize().imePadding()) {
            AuthHeader(stringResource(R.string.forgot_password_title), onBack)
            AuthCard(Modifier.fillMaxWidth().padding(20.dp).padding(top = 20.dp)) {
                Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
                    Text(
                        stringResource(R.string.reset_password_instruction),
                        modifier = Modifier.fillMaxWidth(),
                        textAlign = TextAlign.Center,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    AuthField(email, { email = it }, stringResource(R.string.email), stringResource(R.string.enter_email), Icons.Default.Email, KeyboardType.Email)
                    error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                    Button(
                        onClick = {
                            loading = true
                            scope.launch {
                                val result = withContext(Dispatchers.IO) { ApiClient.get().forgotPassword(email) }
                                loading = false
                                result.onSuccess { onCheckEmail(email) }.onFailure { error = it.message }
                            }
                        },
                        enabled = !loading && email.isNotBlank(),
                        modifier = Modifier.fillMaxWidth().height(56.dp),
                    ) { Text(stringResource(R.string.send_reset), fontWeight = FontWeight.Bold) }
                }
            }
        }
    }
}

@Composable
private fun AuthHeader(title: String, onBack: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().background(Color.White.copy(alpha = .9f)).padding(horizontal = 10.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onBack) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.back))
        }
        Text(title, modifier = Modifier.weight(1f), textAlign = TextAlign.Center, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Spacer(Modifier.size(48.dp))
    }
}

@Composable
fun CheckEmailScreen(email: String, onBack: () -> Unit) {
    var message by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    AuthBackground {
        Column(Modifier.fillMaxSize()) {
            AuthHeader(stringResource(R.string.check_email), onBack)
            AuthCard(Modifier.fillMaxWidth().padding(20.dp).padding(top = 36.dp)) {
                Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Icon(Icons.Default.Email, contentDescription = null, tint = AuthBlue, modifier = Modifier.size(52.dp))
                    Text(email, style = MaterialTheme.typography.titleMedium)
                    message?.let { Text(it, color = AuthBlue) }
                    error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                    Button(
                        onClick = {
                            scope.launch {
                                ApiParity.resendVerification(email)
                                    .onSuccess { message = "Resent" }
                                    .onFailure { error = it.message }
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text(stringResource(R.string.resend_email)) }
                }
            }
        }
    }
}

@Composable
fun RegisterStoreScreen(onBack: () -> Unit, onRegistered: () -> Unit) {
    var step by remember { mutableIntStateOf(0) }
    var fullName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var storeName by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var selectedTags by remember { mutableStateOf(setOf<String>()) }
    var accepted by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val tags = listOf("AO_DAI", "COSTUME", "WEDDING", "EQUIPMENT", "VEHICLE", "FILM", "OTHER")
    val tagLabels = listOf(R.string.tag_ao_dai, R.string.tag_costume, R.string.tag_wedding, R.string.tag_equipment, R.string.tag_vehicle, R.string.tag_film, R.string.tag_other)
    val canContinue = when (step) {
        0 -> storeName.isNotBlank() && phone.isNotBlank() && address.isNotBlank()
        1 -> fullName.isNotBlank() && email.isNotBlank() && password.length >= 6 && password == confirmPassword
        else -> selectedTags.isNotEmpty() && accepted
    }

    AuthBackground {
        Column(Modifier.fillMaxSize().imePadding()) {
            AuthHeader(stringResource(R.string.create_account), onBack)
            Column(
                Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                AuthCard(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        Text(stringResource(R.string.step_progress, step + 1), modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Row(Modifier.align(Alignment.CenterHorizontally), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            repeat(3) { index ->
                                Box(Modifier.size(10.dp).background(if (index == step) AuthBlue else Color(0xFFB9C9FF), CircleShape))
                            }
                        }
                        when (step) {
                            0 -> {
                                Text(stringResource(R.string.shop_information), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                                Text(stringResource(R.string.shop_information_subtitle), color = MaterialTheme.colorScheme.onSurfaceVariant)
                                AuthField(storeName, { storeName = it }, stringResource(R.string.store_name_required), stringResource(R.string.store_name_hint), Icons.Default.Business)
                                AuthField(phone, { phone = it }, stringResource(R.string.phone_required), stringResource(R.string.phone_hint), Icons.Default.Phone, KeyboardType.Phone)
                                AuthField(address, { address = it }, stringResource(R.string.location_required), stringResource(R.string.location_hint), Icons.Default.LocationOn)
                            }
                            1 -> {
                                Text(stringResource(R.string.owner_information), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                                Text(stringResource(R.string.owner_information_subtitle), color = MaterialTheme.colorScheme.onSurfaceVariant)
                                AuthField(fullName, { fullName = it }, stringResource(R.string.name_required), stringResource(R.string.name_hint), Icons.Default.Person)
                                AuthField(email, { email = it }, stringResource(R.string.email_required), stringResource(R.string.activation_email_hint), Icons.Default.Email, KeyboardType.Email)
                                AuthField(password, { password = it }, stringResource(R.string.password_required), stringResource(R.string.password_hint), Icons.Default.Lock, KeyboardType.Password, true)
                                AuthField(confirmPassword, { confirmPassword = it }, stringResource(R.string.confirm_password_required), stringResource(R.string.confirm_password_hint), Icons.Default.Lock, KeyboardType.Password, true)
                            }
                            else -> {
                                Text(stringResource(R.string.what_do_you_rent), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                                Text(stringResource(R.string.select_all_apply), color = MaterialTheme.colorScheme.onSurfaceVariant)
                                tags.zip(tagLabels).chunked(2).forEach { row ->
                                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        row.forEach { (tag, label) ->
                                            FilterChip(
                                                selected = tag in selectedTags,
                                                onClick = { selectedTags = if (tag in selectedTags) selectedTags - tag else selectedTags + tag },
                                                label = { Text(stringResource(label)) },
                                                modifier = Modifier.weight(1f),
                                            )
                                        }
                                        if (row.size == 1) Spacer(Modifier.weight(1f))
                                    }
                                }
                                Row(verticalAlignment = Alignment.Top) {
                                    Checkbox(checked = accepted, onCheckedChange = { accepted = it })
                                    Text(stringResource(R.string.accept_policy_terms), modifier = Modifier.padding(top = 12.dp), color = AuthBlue)
                                }
                            }
                        }
                        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            if (step > 0) {
                                OutlinedButton(onClick = { step-- }, modifier = Modifier.weight(1f).height(56.dp)) {
                                    Text(stringResource(R.string.previous), fontWeight = FontWeight.Bold)
                                }
                            }
                            Button(
                                onClick = {
                                    if (step < 2) {
                                        step++
                                    } else {
                                        loading = true
                                        scope.launch {
                                            val result = withContext(Dispatchers.IO) {
                                                ApiParity.registerMerchant(email, password, fullName, phone, storeName, address, selectedTags.toList())
                                            }
                                            loading = false
                                            result.onSuccess { onRegistered() }.onFailure { error = it.message }
                                        }
                                    }
                                },
                                enabled = canContinue && !loading,
                                modifier = Modifier.weight(1f).height(56.dp),
                            ) {
                                Text(
                                    if (loading) stringResource(R.string.loading)
                                    else if (step == 2) stringResource(R.string.register)
                                    else stringResource(R.string.next),
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun OnboardingScreen(onFinished: () -> Unit) {
    val pages = listOf(
        stringResource(R.string.onboarding_1),
        stringResource(R.string.onboarding_2),
        stringResource(R.string.onboarding_3),
    )
    var index by remember { mutableIntStateOf(0) }
    Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center) {
        Text(pages[index], style = MaterialTheme.typography.headlineSmall)
        Spacer(Modifier.height(24.dp))
        Button(
            onClick = { if (index < pages.lastIndex) index++ else onFinished() },
            modifier = Modifier.fillMaxWidth(),
        ) { Text(if (index < pages.lastIndex) stringResource(R.string.next) else stringResource(R.string.get_started)) }
    }
}
