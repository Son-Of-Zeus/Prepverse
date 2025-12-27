package com.prepverse.prepverse.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.platform.LocalContext
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.prepverse.prepverse.ui.screens.auth.LoginScreen
import com.prepverse.prepverse.ui.screens.auth.LoginViewModel
import com.prepverse.prepverse.ui.screens.dashboard.DashboardScreen
import com.prepverse.prepverse.ui.screens.focus.FocusModeScreen
import com.prepverse.prepverse.ui.screens.onboarding.OnboardingScreen
import com.prepverse.prepverse.ui.screens.onboarding.OnboardingViewModel
import com.prepverse.prepverse.ui.screens.permission.PermissionScreen
import com.prepverse.prepverse.ui.screens.practice.PracticeScreen
import com.prepverse.prepverse.ui.screens.practice.QuizScreen
import com.prepverse.prepverse.ui.screens.practice.ResultsScreen

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
                onProceedToSchool = viewModel::proceedToSchoolSelection,
                onSearchSchool = viewModel::searchSchools,
                onSelectSchool = viewModel::selectSchool,
                onClearSchool = viewModel::clearSchool,
                onSkipSchool = viewModel::skipSchoolSelection,
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
                onNavigateToPractice = { navController.navigate(Routes.Practice.createRoute()) },
                onNavigateToPracticeWithTopic = { subject, topic ->
                    navController.navigate(Routes.Practice.createRoute(subject, topic))
                },
                onNavigateToFocus = { navController.navigate(Routes.FocusMode.route) },
                onNavigateToProgress = { navController.navigate(Routes.Progress.route) },
                onNavigateToPeer = { navController.navigate(Routes.PeerLobby.route) }
            )
        }

        // Practice Mode screens
        composable(
            route = Routes.Practice.route,
            arguments = listOf(
                navArgument("subject") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                },
                navArgument("topic") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                }
            )
        ) { backStackEntry ->
            val initialSubject = backStackEntry.arguments?.getString("subject")
            val initialTopic = backStackEntry.arguments?.getString("topic")

            PracticeScreen(
                onNavigateBack = { navController.popBackStack() },
                onNavigateToQuiz = { sessionId ->
                    navController.navigate(Routes.Quiz.createRoute(sessionId))
                },
                initialSubject = initialSubject,
                initialTopic = initialTopic
            )
        }

        composable(
            route = Routes.Quiz.route,
            arguments = listOf(navArgument("sessionId") { type = NavType.StringType })
        ) {
            QuizScreen(
                onNavigateToResults = { sessionId ->
                    navController.navigate(Routes.Results.createRoute(sessionId)) {
                        // Pop quiz from back stack so user can't go back to it
                        popUpTo(Routes.Practice.route)
                    }
                },
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Routes.Results.route,
            arguments = listOf(navArgument("sessionId") { type = NavType.StringType })
        ) {
            ResultsScreen(
                onNavigateBack = {
                    navController.navigate(Routes.Dashboard.route) {
                        popUpTo(Routes.Dashboard.route) { inclusive = true }
                    }
                },
                onNavigateToPractice = {
                    navController.navigate(Routes.Practice.createRoute()) {
                        popUpTo(Routes.Dashboard.route)
                    }
                }
            )
        }

        composable(Routes.FocusMode.route) {
            FocusModeScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Routes.Progress.route) {
            // ProgressScreen() - TODO
        }

        composable(Routes.PeerLobby.route) {
            com.prepverse.prepverse.ui.screens.peer.PeerLobbyScreen(
                onNavigateToSession = { sessionId ->
                    navController.navigate(Routes.StudyRoom.createRoute(sessionId))
                },
                onNavigateBack = { navController.popBackStack() },
                onNavigateToPeerDiscovery = {
                    navController.navigate(Routes.PeerDiscovery.route)
                }
            )
        }

        composable(Routes.PeerDiscovery.route) {
            com.prepverse.prepverse.ui.screens.peer.PeerDiscoveryScreen(
                onNavigateToSession = { sessionId ->
                    navController.navigate(Routes.StudyRoom.createRoute(sessionId))
                },
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Routes.StudyRoom.route,
            arguments = listOf(navArgument("roomId") { type = NavType.StringType })
        ) { backStackEntry ->
            // Pass sessionId to ViewModel via SavedStateHandle
            com.prepverse.prepverse.ui.screens.peer.StudyRoomScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }
    }
}
