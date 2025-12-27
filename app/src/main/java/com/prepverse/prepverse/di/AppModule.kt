package com.prepverse.prepverse.di

import android.content.Context
import com.prepverse.prepverse.data.local.EncryptionManager
import com.prepverse.prepverse.data.local.TokenStorage
import com.prepverse.prepverse.data.realtime.SupabaseRealtimeManager
import com.prepverse.prepverse.data.remote.AuthManager
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideTokenStorage(
        @ApplicationContext context: Context
    ): TokenStorage {
        return TokenStorage(context)
    }

    @Provides
    @Singleton
    fun provideAuthManager(
        @ApplicationContext context: Context,
        tokenStorage: TokenStorage
    ): AuthManager {
        return AuthManager(context, tokenStorage)
    }

    @Provides
    @Singleton
    fun provideEncryptionManager(
        @ApplicationContext context: Context,
        tokenStorage: TokenStorage
    ): EncryptionManager {
        return EncryptionManager(context, tokenStorage)
    }

    @Provides
    @Singleton
    fun provideSupabaseRealtimeManager(): SupabaseRealtimeManager {
        return SupabaseRealtimeManager()
    }
}
