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
import androidx.compose.ui.res.stringResource
import com.anyrent.pos.R
import com.anyrent.pos.data.DepositPlanApi
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.data.repository.BankAccountRepository
import com.anyrent.pos.domain.deposit.DepositSettings
import com.anyrent.pos.domain.settings.CollectRow
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
        if (CollectRow.BANK_ACCOUNTS !in SettingsRows.collectRows(role)) return null
        return withContext(Dispatchers.IO) {
            runCatching {
                val outlet = BankAccountRepository.outlets().firstOrNull() ?: return@runCatching null
                BankAccountRepository.list(outlet.id).size
            }.getOrNull()
        }
    }
}

/**
 * Cài đặt › Thu tiền (#1259; iOS `CollectMoneyViewController`): NGÂN HÀNG (Tài khoản ngân hàng, owner and outlet admin)
 * and CỌC (Cách thu cọc, Mẫu giai đoạn, Chính sách huỷ / dời ngày). Every role reads the deposit lines; only the shop
 * owner edits them.
 */
@Composable
internal fun CollectMoneyScreen(
    onBack: () -> Unit,
    onOpenBankAccounts: () -> Unit,
    onOpenDeposit: (DepositStart) -> Unit,
    refreshKey: Int,
) {
    val role = SessionStore.role
    var settings by remember { mutableStateOf<DepositSettings?>(null) }
    var bankCount by remember { mutableStateOf<Int?>(null) }
    LaunchedEffect(refreshKey) {
        withContext(Dispatchers.IO) { DepositPlanApi.settings() }.onSuccess { settings = it }
        SettingsBankCount.load(role)?.let { bankCount = it }
    }
    val rows = SettingsRows.collectRows(role)
    DepositFullScreen(stringResource(R.string.settings_v2_collect), onBack = onBack) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
            if (CollectRow.BANK_ACCOUNTS in rows) {
                SectionBand(stringResource(R.string.settings_v2_collect_group_bank))
                SettingRow(
                    stringResource(R.string.bank_accounts),
                    bankCount?.let { stringResource(R.string.settings_v2_collect_accounts, it) },
                    chevron = true,
                    onClick = onOpenBankAccounts,
                )
            }
            SectionBand(stringResource(R.string.settings_v2_collect_group_deposit))
            val loaded = settings
            rows.filter { it != CollectRow.BANK_ACCOUNTS }.forEach { row ->
                when (row) {
                    CollectRow.DEPOSIT_MODE -> SettingRow(
                        stringResource(R.string.deposit_settings_title),
                        stringResource(
                            if (loaded?.depositMode == com.anyrent.pos.domain.deposit.DepositMode.STAGED) R.string.settings_v2_collect_staged
                            else R.string.settings_v2_collect_one_time,
                        ),
                        chevron = true,
                    ) { onOpenDeposit(DepositStart.MODE) }
                    CollectRow.TEMPLATES -> SettingRow(
                        stringResource(R.string.deposit_templates_row),
                        loaded?.let { stringResource(R.string.deposit_templates_count, it.choices.size) },
                        chevron = true,
                    ) { onOpenDeposit(DepositStart.TEMPLATES) }
                    CollectRow.POLICY -> SettingRow(
                        stringResource(R.string.deposit_policy_row),
                        loaded?.let {
                            stringResource(
                                if (it.cancellationPolicy.isNotBlank()) R.string.settings_v2_collect_policy_set else R.string.settings_v2_collect_policy_unset,
                            )
                        },
                        chevron = true,
                    ) { onOpenDeposit(DepositStart.POLICY) }
                    CollectRow.BANK_ACCOUNTS -> Unit
                }
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
