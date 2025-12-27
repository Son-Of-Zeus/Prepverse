package com.prepverse.prepverse

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import com.prepverse.prepverse.data.remote.AuthManager
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import javax.inject.Inject

/**
 * Activity that handles the OAuth callback deep link.
 * Receives prepverse://auth/callback?token=xxx&needs_onboarding=true/false
 * or prepverse://auth/callback?error=xxx
 */
@AndroidEntryPoint
class AuthCallbackActivity : ComponentActivity() {

    @Inject
    lateinit var authManager: AuthManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent) {
        val uri = intent.data

        Timber.d("AuthCallbackActivity received intent: $uri")

        if (uri != null &&
            uri.scheme == "prepverse" &&
            uri.host == "auth" &&
            uri.path == "/callback"
        ) {
            val token = uri.getQueryParameter("token")
            val error = uri.getQueryParameter("error")
            val needsOnboarding = uri.getQueryParameter("needs_onboarding")?.toBoolean() ?: false

            when {
                token != null -> {
                    Timber.d("Received auth callback with token, needsOnboarding=$needsOnboarding")
                    authManager.handleAuthCallback(token, needsOnboarding)
                }
                error != null -> {
                    Timber.e("Received auth callback with error: $error")
                    authManager.handleAuthError(error)
                }
                else -> {
                    Timber.e("Received auth callback without token or error")
                    authManager.handleAuthError("invalid_callback")
                }
            }

            // Launch MainActivity and finish this activity
            val mainIntent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            startActivity(mainIntent)
        } else {
            Timber.e("Invalid callback URI: $uri")
        }

        finish()
    }
}
