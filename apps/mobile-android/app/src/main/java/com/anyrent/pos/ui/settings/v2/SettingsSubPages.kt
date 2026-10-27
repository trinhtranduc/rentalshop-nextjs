package com.anyrent.pos.ui.settings.v2

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.res.stringResource
import com.anyrent.pos.R
import com.anyrent.pos.data.DepositPlanApi
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.data.repository.BankAccountRepository
import com.anyrent.pos.domain.deposit.DepositSettings
import com.anyrent.pos.domain.settings.SettingsRows
import com.anyrent.pos.ui.deposit.DepositFullScreen
import com.anyrent.pos.ui.deposit.DepositStart
import com.anyrent.pos.ui.home.v2.SectionBand
import com.anyrent.pos.ui.home.v2.V2Colors
import com.anyrent.pos.ui.settings.roleDisplayValue
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** #1259: active bank accounts of the own branch (the owner: the default, else the first, branch); null when unknown or not for this role */
internal object SettingsBankCount {
    suspend fun load(role: String?): Int? {
        if (!com.anyrent.pos.domain.bank.BankAccountRules.canManage(role)) return null
        return withContext(Dispatchers.IO) {
            runCatching {
                val outlet = BankAccountRepository.outlets().firstOrNull() ?: return@runCatching null
                BankAccountRepository.list(outlet.id).size
            }.getOrNull()
        }
    }
}

/**
 * Cài đặt › Cọc (#1270 plan B; iOS `DepositHubViewController`): CÁCH THU CỌC (the mode screen) and GIAI ĐOẠN & CHÍNH SÁCH
 * (Mẫu giai đoạn, Chính sách huỷ / dời ngày). Every role reads; only the shop owner edits. The two lower rows look dimmed
 * in "Thu cọc 1 lần" but stay tappable.
 */
@Composable
internal fun DepositHubScreen(onBack: () -> Unit, onOpenDeposit: (DepositStart) -> Unit, refreshKey: Int) {
    var settings by remember { mutableStateOf<DepositSettings?>(null) }
    LaunchedEffect(refreshKey) {
        withContext(Dispatchers.IO) { DepositPlanApi.settings() }.onSuccess { settings = it }
    }
    val loaded = settings
    val staged = loaded?.depositMode == com.anyrent.pos.domain.deposit.DepositMode.STAGED
    val dim = if (SettingsRows.depositStagesDimmed(staged)) 0.45f else 1f
    DepositFullScreen(stringResource(R.string.settings_v2_deposit), onBack = onBack) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
            SectionBand(stringResource(R.string.settings_v2_deposit_group_mode))
            SettingRow(
                stringResource(R.string.deposit_settings_title),
                stringResource(if (staged) R.string.settings_v2_collect_staged else R.string.settings_v2_collect_one_time),
                chevron = true,
            ) { onOpenDeposit(DepositStart.MODE) }
            SectionBand(stringResource(R.string.settings_v2_deposit_group_stages))
            Column(Modifier.alpha(dim)) {
                SettingRow(
                    stringResource(R.string.deposit_templates_row),
                    loaded?.let { stringResource(R.string.deposit_templates_count, it.choices.size) },
                    chevron = true,
                ) { onOpenDeposit(DepositStart.TEMPLATES) }
                SettingRow(
                    stringResource(R.string.deposit_policy_row),
                    loaded?.let {
                        stringResource(
                            if (it.cancellationPolicy.isNotBlank()) R.string.settings_v2_collect_policy_set else R.string.settings_v2_collect_policy_unset,
                        )
                    },
                    chevron = true,
                ) { onOpenDeposit(DepositStart.POLICY) }
            }
        }
    }
}

/** Cài đặt › Nâng cao (#1259): Thông tin ứng dụng, Xoá tài khoản (no longer next to Đổi mật khẩu) */
@Composable
internal fun AdvancedScreen(onBack: () -> Unit, onOpenAppInfo: () -> Unit, onDeleteAccount: () -> Unit) {
    DepositFullScreen(stringResource(R.string.settings_v2_advanced), onBack = onBack) {
        Column(Modifier.fillMaxSize()) {
            SettingRow(stringResource(R.string.app_info), null, chevron = true, onClick = onOpenAppInfo)
            SettingRow(stringResource(R.string.delete_account), null, chevron = true, titleColor = V2Colors.Danger, onClick = onDeleteAccount)
        }
    }
}

/** The name card opens Hồ sơ & bảo mật (#1259): the profile lines (name, email, role) and Đổi mật khẩu */
@Composable
internal fun ProfileSecurityScreen(onBack: () -> Unit, onChangePassword: () -> Unit) {
    val name = SessionStore.userName?.takeIf { it.isNotBlank() } ?: "-"
    DepositFullScreen(stringResource(R.string.settings_v2_profile_title), onBack = onBack) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
            SectionBand(stringResource(R.string.settings_v2_profile_group))
            SettingRow(stringResource(R.string.name), name, chevron = false) {}
            SettingRow(stringResource(R.string.email), SessionStore.email.orEmpty(), chevron = false) {}
            SettingRow(stringResource(R.string.role), roleDisplayValue(SessionStore.role), chevron = false) {}
            SectionBand(stringResource(R.string.settings_v2_profile_security))
            SettingRow(stringResource(R.string.change_password), null, chevron = true, onClick = onChangePassword)
        }
    }
}
