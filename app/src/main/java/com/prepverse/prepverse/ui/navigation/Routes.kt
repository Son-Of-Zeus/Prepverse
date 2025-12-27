package com.prepverse.prepverse.ui.navigation

sealed class Routes(val route: String) {
    data object Permissions : Routes("permissions")
    data object Login : Routes("login")
    data object Onboarding : Routes("onboarding")
    data object Dashboard : Routes("dashboard")
    data object Practice : Routes("practice?subject={subject}&topic={topic}") {
        fun createRoute(subject: String? = null, topic: String? = null): String {
            val params = mutableListOf<String>()
            if (subject != null) params.add("subject=$subject")
            if (topic != null) params.add("topic=$topic")
            return if (params.isNotEmpty()) "practice?${params.joinToString("&")}" else "practice"
        }
    }
    data object Quiz : Routes("quiz/{sessionId}") {
        fun createRoute(sessionId: String) = "quiz/$sessionId"
    }
    data object Results : Routes("results/{sessionId}") {
        fun createRoute(sessionId: String) = "results/$sessionId"
    }
    data object FocusMode : Routes("focus")
    data object Progress : Routes("progress")
    data object PeerLobby : Routes("peer")
    data object PeerDiscovery : Routes("peer_discovery")
    data object StudyRoom : Routes("study_room/{roomId}") {
        fun createRoute(roomId: String) = "study_room/$roomId"
    }
    data object Battle : Routes("battle/{battleId}") {
        fun createRoute(battleId: String) = "battle/$battleId"
    }
}
