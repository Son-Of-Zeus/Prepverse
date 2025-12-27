plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
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

        // Auth0 Configuration - Replace with your actual values
        manifestPlaceholders["auth0Domain"] = "YOUR_AUTH0_DOMAIN"
        manifestPlaceholders["auth0Scheme"] = "prepverse"

        buildConfigField("String", "AUTH0_DOMAIN", "\"YOUR_AUTH0_DOMAIN\"")
        buildConfigField("String", "AUTH0_CLIENT_ID", "\"YOUR_AUTH0_CLIENT_ID\"")
        buildConfigField("String", "AUTH0_SCHEME", "\"prepverse\"")
        // For development, use 10.0.2.2 (Android emulator localhost) or your local IP
        // For production, use: "https://api.prepverse.app"
        buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2:8000\"")
    }

    buildTypes {
        release {
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

    // Auth0
    implementation(libs.auth0)

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
}
