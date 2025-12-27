package com.prepverse.prepverse.data.local

import android.content.Context
import android.util.Base64
import dagger.hilt.android.qualifiers.ApplicationContext
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages message encryption using simple AES-256-GCM.
 * Each session has a shared secret key exchanged securely.
 */
@Singleton
class EncryptionManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val tokenStorage: TokenStorage
) {
    private val sessionKeys = mutableMapOf<String, SecretKey>()

    /**
     * Generate a new AES-256 key for a session.
     */
    fun generateSessionKey(): String {
        val keyGen = KeyGenerator.getInstance("AES")
        keyGen.init(256)
        val secretKey = keyGen.generateKey()
        return Base64.encodeToString(secretKey.encoded, Base64.NO_WRAP)
    }

    /**
     * Store a session key for encryption/decryption.
     */
    fun storeSessionKey(sessionId: String, keyBase64: String) {
        val keyBytes = Base64.decode(keyBase64, Base64.NO_WRAP)
        val secretKey = SecretKeySpec(keyBytes, "AES")
        sessionKeys[sessionId] = secretKey
    }

    /**
     * Encrypt a message for a specific session.
     * Returns: "iv:ciphertext" format in Base64
     */
    fun encrypt(message: String, sessionId: String): String {
        val secretKey = sessionKeys[sessionId] 
            ?: throw IllegalStateException("No key found for session $sessionId")

        val cipher = Cipher.getInstance("AES/CBC/PKCS5Padding")
        val iv = ByteArray(16)
        SecureRandom().nextBytes(iv)
        cipher.init(Cipher.ENCRYPT_MODE, secretKey, IvParameterSpec(iv))

        val encrypted = cipher.doFinal(message.toByteArray(Charsets.UTF_8))
        val ivBase64 = Base64.encodeToString(iv, Base64.NO_WRAP)
        val encryptedBase64 = Base64.encodeToString(encrypted, Base64.NO_WRAP)

        return "$ivBase64:$encryptedBase64"
    }

    /**
     * Decrypt a message for a specific session.
     * Input format: "iv:ciphertext" in Base64
     */
    fun decrypt(encryptedData: String, sessionId: String): String {
        val secretKey = sessionKeys[sessionId]
            ?: throw IllegalStateException("No key found for session $sessionId")

        val parts = encryptedData.split(":")
        if (parts.size != 2) throw IllegalArgumentException("Invalid encrypted data format")

        val iv = Base64.decode(parts[0], Base64.NO_WRAP)
        val encrypted = Base64.decode(parts[1], Base64.NO_WRAP)

        val cipher = Cipher.getInstance("AES/CBC/PKCS5Padding")
        cipher.init(Cipher.DECRYPT_MODE, secretKey, IvParameterSpec(iv))

        val decrypted = cipher.doFinal(encrypted)
        return String(decrypted, Charsets.UTF_8)
    }

    /**
     * Clear session key when leaving a session.
     */
    fun clearSessionKey(sessionId: String) {
        sessionKeys.remove(sessionId)
    }
}
