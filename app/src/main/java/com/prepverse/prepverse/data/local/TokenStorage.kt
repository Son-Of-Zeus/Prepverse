package com.prepverse.prepverse.data.local

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Secure token storage using EncryptedSharedPreferences.
 * Stores the session token received from the backend after OAuth.
 */
@Singleton
class TokenStorage @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val masterKey: MasterKey by lazy {
        MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
    }

    private val prefs: SharedPreferences by lazy {
        EncryptedSharedPreferences.create(
            context,
            PREFS_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    companion object {
        private const val PREFS_NAME = "prepverse_secure_prefs"
        private const val KEY_SESSION_TOKEN = "session_token"
    }

    fun saveToken(token: String) {
        prefs.edit().putString(KEY_SESSION_TOKEN, token).apply()
        Timber.d("Session token saved securely")
    }

    fun getToken(): String? {
        return prefs.getString(KEY_SESSION_TOKEN, null)
    }

    fun clearToken() {
        prefs.edit().remove(KEY_SESSION_TOKEN).apply()
        Timber.d("Session token cleared")
    }

    fun hasToken(): Boolean {
        return getToken() != null
    }
}
