package com.anyrent.pos.ui.appconfig

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.anyrent.pos.R

/**
 * Shows the blocking update screen when this build is below the minimum version (#370), otherwise [content].
 * While the first check runs the splash screen stays up, so [content] is shown for `Loading` too.
 */
@Composable
fun AppConfigGate(viewModel: AppConfigViewModel, content: @Composable () -> Unit) {
    val state by viewModel.state.collectAsState()
    val ready = state as? AppConfigUiState.Ready
    if (ready?.updateRequired == true) {
        UpdateRequiredScreen(storeUrl = ready.storeUrl)
    } else {
        content()
    }
}

@Composable
fun UpdateRequiredScreen(storeUrl: String?) {
    val context = LocalContext.current
    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Column(
            modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = stringResource(R.string.update_required_title),
                style = MaterialTheme.typography.titleLarge,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(12.dp))
            Text(
                text = stringResource(R.string.update_required_message),
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )
            if (!storeUrl.isNullOrBlank()) {
                Spacer(Modifier.height(24.dp))
                Button(
                    onClick = {
                        runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(storeUrl))) }
                    },
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                ) {
                    Text(stringResource(R.string.update_required_button))
                }
            }
        }
    }
}
