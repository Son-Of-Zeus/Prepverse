import java.util.Properties
import java.io.FileInputStream

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
    kotlin("plugin.serialization") version "1.9.20"
}

// Load Supabase config from local.properties
val localProperties = Properties().apply {
    val propsFile = rootProject.file("app/local.properties")
    if (propsFile.exists()) {
        load(FileInputStream(propsFile))
    }
}

android {
    namespace = "com.prepverse.prepverse"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.prepverse.prepverse"
        minSdk = 28
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    // Build flavors for different device types
    flavorDimensions += "device"
    productFlavors {
        create("emulator") {
            dimension = "device"
            // Production backend URL
            buildConfigField("String", "API_BASE_URL", "\"https://prepverse-production.up.railway.app\"")
        }
        create("physical") {
            dimension = "device"
            // Production backend URL
            buildConfigField("String", "API_BASE_URL", "\"https://prepverse-production.up.railway.app\"")
        }
    }

    buildTypes {
        debug {
            // Supabase credentials from local.properties
            buildConfigField("String", "SUPABASE_URL", "\"${localProperties.getProperty("supabase.url", "")}\"")
            buildConfigField("String", "SUPABASE_ANON_KEY", "\"${localProperties.getProperty("supabase.anon.key", "")}\"")
        }
        release {
            // Production: Replace with your deployed backend URL
            // Note: For release builds, you may want a production API URL
            // Override in each flavor if needed

            // Supabase credentials from local.properties
            buildConfigField("String", "SUPABASE_URL", "\"${localProperties.getProperty("supabase.url", "")}\"")
            buildConfigField("String", "SUPABASE_ANON_KEY", "\"${localProperties.getProperty("supabase.anon.key", "")}\"")

            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    // AndroidX Core
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    implementation(libs.androidx.activity.compose)

    // Compose
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.bundles.compose)
    debugImplementation(libs.bundles.compose.debug)

    // Lifecycle
    implementation(libs.bundles.lifecycle)

    // Navigation
    implementation(libs.androidx.navigation.compose)

    // Hilt
    implementation(libs.hilt.android)
    ksp(libs.hilt.android.compiler)
    implementation(libs.hilt.navigation.compose)

    // Room
    implementation(libs.bundles.room)
    ksp(libs.room.compiler)

    // Network
    implementation(libs.bundles.network)
    ksp(libs.moshi.kotlin.codegen)

    // Browser (Chrome Custom Tabs for OAuth)
    implementation(libs.androidx.browser)

    // Security (EncryptedSharedPreferences)
    implementation(libs.androidx.security.crypto)

    // Coroutines
    implementation(libs.bundles.coroutines)

    // DataStore
    implementation(libs.androidx.datastore.preferences)

    // Image Loading
    implementation(libs.coil.compose)

    // Logging
    implementation(libs.timber)

    // Testing
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)

    // Supabase Realtime
    implementation("io.github.jan-tennert.supabase:realtime-kt:2.0.4")
    implementation("io.ktor:ktor-client-okhttp:2.3.7")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.0")

    // WebRTC for voice calls
    implementation("io.getstream:stream-webrtc-android:1.1.1")
}
