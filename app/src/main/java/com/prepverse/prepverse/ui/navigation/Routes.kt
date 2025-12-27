package com.prepverse.prepverse.ui.navigation

sealed class Routes(val route: String) {
    data object Login : Routes("login")
    data object Onboarding : Routes("onboarding")
    data object Dashboard : Routes("dashboard")
    data object Practice : Routes("practice")
    data object Quiz : Routes("quiz/{topicId}") {
        fun createRoute(topicId: String) = "quiz/$topicId"
    }
    data object FocusMode : Routes("focus")
    data object Progress : Routes("progress")
    data object PeerLobby : Routes("peer")
    data object StudyRoom : Routes("study_room/{roomId}") {
        fun createRoute(roomId: String) = "study_room/$roomId"
    }
    data object Battle : Routes("battle/{battleId}") {
        fun createRoute(battleId: String) = "battle/$battleId"
    }
}
