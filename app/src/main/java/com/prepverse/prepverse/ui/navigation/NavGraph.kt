package com.prepverse.prepverse.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.platform.LocalContext
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.prepverse.prepverse.ui.screens.auth.LoginScreen
import com.prepverse.prepverse.ui.screens.auth.LoginViewModel
import com.prepverse.prepverse.ui.screens.dashboard.DashboardScreen
import com.prepverse.prepverse.ui.screens.focus.FocusModeScreen
import com.prepverse.prepverse.ui.screens.onboarding.OnboardingScreen
import com.prepverse.prepverse.ui.screens.onboarding.OnboardingViewModel
import com.prepverse.prepverse.ui.screens.permission.PermissionScreen

@Composable
fun PrepVerseNavGraph(
    navController: NavHostController,
    startDestination: String = Routes.Permissions.route
) {
    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        // Permission screen - must be completed before accessing the app
        composable(Routes.Permissions.route) {
            PermissionScreen(
                onAllPermissionsGranted = {
                    navController.navigate(Routes.Login.route) {
                        popUpTo(Routes.Permissions.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Routes.Login.route) {
            val viewModel: LoginViewModel = hiltViewModel()
            val uiState by viewModel.uiState.collectAsState()
            val context = LocalContext.current

            // Set activity context for OAuth login
            LaunchedEffect(Unit) {
                viewModel.setActivityContext(context)
            }

            LoginScreen(
                uiState = uiState,
                onGoogleSignIn = { viewModel.signInWithGoogle() },
                onNavigateToOnboarding = {
                    navController.navigate(Routes.Onboarding.route) {
                        popUpTo(Routes.Login.route) { inclusive = true }
                    }
                },
                onNavigateToDashboard = {
                    navController.navigate(Routes.Dashboard.route) {
                        popUpTo(Routes.Login.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Routes.Onboarding.route) {
            val viewModel: OnboardingViewModel = hiltViewModel()
            val uiState by viewModel.uiState.collectAsState()

            OnboardingScreen(
                uiState = uiState,
                onSelectClass = viewModel::selectClass,
                onStartAssessment = viewModel::startAssessment,
                onSelectAnswer = viewModel::selectAnswer,
                onNextQuestion = viewModel::nextQuestion,
                onFinishOnboarding = {
                    navController.navigate(Routes.Dashboard.route) {
                        popUpTo(Routes.Onboarding.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Routes.Dashboard.route) {
            DashboardScreen(
                onNavigateToPractice = { navController.navigate(Routes.Practice.route) },
                onNavigateToFocus = { navController.navigate(Routes.FocusMode.route) },
                onNavigateToBattle = { navController.navigate(Routes.PeerLobby.route) }
            )
        }

        // Placeholder routes - to be implemented
        composable(Routes.Practice.route) {
            // PracticeScreen()
        }

        composable(Routes.FocusMode.route) {
            FocusModeScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Routes.Progress.route) {
            // ProgressScreen()
        }

        composable(Routes.PeerLobby.route) {
            // PeerLobbyScreen()
        }
    }
}
