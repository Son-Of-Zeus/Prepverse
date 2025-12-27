package com.prepverse.prepverse.ui.screens.peer

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.prepverse.prepverse.data.realtime.SupabaseRealtimeManager
import com.prepverse.prepverse.data.remote.api.PrepVerseApi
import com.prepverse.prepverse.data.remote.api.dto.WhiteboardOperationDto
import com.prepverse.prepverse.data.remote.api.dto.WhiteboardSyncRequest
import com.prepverse.prepverse.domain.model.Point
import com.prepverse.prepverse.domain.model.WhiteboardOperation
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

@HiltViewModel
class WhiteboardViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val api: PrepVerseApi,
    private val realtimeManager: SupabaseRealtimeManager
) : ViewModel() {

    private val sessionId: String = checkNotNull(savedStateHandle["roomId"])
    private var currentUserId: String = ""
    private var currentUserName: String = "User"

    private val _uiState = MutableStateFlow(WhiteboardUiState())
    val uiState: StateFlow<WhiteboardUiState> = _uiState.asStateFlow()

    private var localVersion = 0
    private var pendingOperations = mutableListOf<WhiteboardOperation>()

    init {
        timber.log.Timber.d("Whiteboard: ViewModel created for sessionId=$sessionId")
        loadCurrentUser()
    }

    private fun loadCurrentUser() {
        viewModelScope.launch {
            try {
                timber.log.Timber.d("Whiteboard: Loading current user...")
                val userResponse = api.getCurrentUser()
                if (userResponse.isSuccessful && userResponse.body() != null) {
                    val user = userResponse.body()!!
                    currentUserId = user.id
                    currentUserName = user.fullName ?: user.email.substringBefore("@")
                    timber.log.Timber.d("Whiteboard: User loaded - id=$currentUserId, name=$currentUserName")

                    // Now load whiteboard state and setup listeners
                    loadWhiteboardState()
                    setupRealtimeListeners()
                } else {
                    timber.log.Timber.e("Whiteboard: Failed to load user - code=${userResponse.code()}")
                }
            } catch (e: Exception) {
                timber.log.Timber.e(e, "Whiteboard: Failed to load user")
            }
        }
    }

    private fun loadWhiteboardState() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            timber.log.Timber.d("Whiteboard: Loading state for session $sessionId")

            try {
                val response = api.getWhiteboardState(sessionId)
                timber.log.Timber.d("Whiteboard: API response code=${response.code()}")
                if (response.isSuccessful) {
                    response.body()?.let { state ->
                        timber.log.Timber.d("Whiteboard: Loaded ${state.operations.size} operations, version=${state.version}")
                        localVersion = state.version
                        val operations = state.operations.mapNotNull { parseOperation(it) }
                        timber.log.Timber.d("Whiteboard: Parsed ${operations.size} operations")
                        _uiState.update {
                            it.copy(
                                operations = operations,
                                isLoading = false
                            )
                        }
                    } ?: run {
                        timber.log.Timber.w("Whiteboard: Response body is null")
                        _uiState.update { it.copy(isLoading = false) }
                    }
                } else {
                    timber.log.Timber.w("Whiteboard: Failed to load state - code=${response.code()}, error=${response.errorBody()?.string()}")
                    _uiState.update { it.copy(isLoading = false) }
                }
            } catch (e: Exception) {
                timber.log.Timber.e(e, "Whiteboard: Exception loading state")
                _uiState.update {
                    it.copy(
                        error = e.message,
                        isLoading = false
                    )
                }
            }
        }
    }

    private fun setupRealtimeListeners() {
        timber.log.Timber.d("Whiteboard: Setting up realtime listeners for session $sessionId")
        viewModelScope.launch {
            realtimeManager.whiteboardFlow.collect { update ->
                timber.log.Timber.d("Whiteboard: Received realtime update - sessionId=${update.sessionId}, type=${update.type}")
                if (update.sessionId == sessionId) {
                    // Parse and apply remote operation
                    val operation = parseRealtimeOperation(update)
                    timber.log.Timber.d("Whiteboard: Parsed operation=$operation, currentUserId=$currentUserId")
                    if (operation != null && operation.userId != currentUserId) {
                        timber.log.Timber.d("Whiteboard: Applying remote operation from ${operation.userId}")
                        applyRemoteOperation(operation)
                    } else if (operation == null) {
                        timber.log.Timber.w("Whiteboard: Failed to parse operation from update")
                    }
                }
            }
        }
    }

    fun addOperation(operation: WhiteboardOperation) {
        timber.log.Timber.d("Whiteboard: Adding operation type=${operation.javaClass.simpleName}")

        // Add to local state immediately (optimistic update)
        _uiState.update { state ->
            when (operation) {
                is WhiteboardOperation.Clear -> {
                    // Clear removes all operations
                    state.copy(operations = listOf(operation))
                }
                is WhiteboardOperation.Erase -> {
                    // Erase removes targeted operations
                    timber.log.Timber.d("Whiteboard: Erasing ${operation.targetIds.size} operations locally")
                    val filtered = state.operations.filter { it.id !in operation.targetIds }
                    state.copy(operations = filtered + operation)
                }
                else -> {
                    // Draw/Text just add to the list
                    state.copy(operations = state.operations + operation)
                }
            }
        }

        // Add to pending operations for sync
        pendingOperations.add(operation)

        // Sync with server
        syncOperations()

        // Broadcast via realtime
        broadcastOperation(operation)
    }

    fun setTool(tool: WhiteboardTool) {
        _uiState.update { it.copy(currentTool = tool) }
    }

    fun setColor(color: Color) {
        _uiState.update { it.copy(currentColor = color) }
    }

    fun setStrokeWidth(width: Float) {
        _uiState.update { it.copy(currentStrokeWidth = width) }
    }

    fun clearCanvas() {
        val clearOp = WhiteboardOperation.Clear(
            id = UUID.randomUUID().toString(),
            userId = currentUserId,
            timestamp = System.currentTimeMillis()
        )

        // Clear local operations (keeping only the clear operation)
        _uiState.update { state ->
            state.copy(operations = listOf(clearOp))
        }

        // Sync and broadcast
        pendingOperations.clear()
        pendingOperations.add(clearOp)
        syncOperations()
        broadcastOperation(clearOp)
    }

    fun undo() {
        _uiState.update { state ->
            val userOperations = state.operations.filter { it.userId == currentUserId }
            if (userOperations.isNotEmpty()) {
                val lastUserOp = userOperations.last()
                val eraseOp = WhiteboardOperation.Erase(
                    id = UUID.randomUUID().toString(),
                    userId = currentUserId,
                    timestamp = System.currentTimeMillis(),
                    targetIds = listOf(lastUserOp.id)
                )
                addOperation(eraseOp)
            }
            state
        }
    }

    private fun syncOperations() {
        if (pendingOperations.isEmpty()) return

        viewModelScope.launch {
            try {
                timber.log.Timber.d("Whiteboard: Syncing ${pendingOperations.size} operations to server")
                val operationDtos = pendingOperations.map { it.toDto() }
                val response = api.syncWhiteboard(
                    WhiteboardSyncRequest(
                        sessionId = sessionId,
                        operations = operationDtos,
                        version = localVersion
                    )
                )

                if (response.isSuccessful) {
                    localVersion++
                    pendingOperations.clear()
                    timber.log.Timber.d("Whiteboard: Sync successful, new version=$localVersion")
                } else {
                    timber.log.Timber.w("Whiteboard: Sync failed with code ${response.code()}")
                }
            } catch (e: Exception) {
                timber.log.Timber.e(e, "Whiteboard: Failed to sync operations")
                _uiState.update { it.copy(error = "Failed to sync whiteboard") }
            }
        }
    }

    private fun broadcastOperation(operation: WhiteboardOperation) {
        viewModelScope.launch {
            try {
                timber.log.Timber.d("Whiteboard: Broadcasting operation type=${operation.javaClass.simpleName}")
                realtimeManager.broadcastWhiteboardUpdate(
                    sessionId = sessionId,
                    operationType = operation.javaClass.simpleName.lowercase(),
                    operationData = operation.toDataMap()
                )
                timber.log.Timber.d("Whiteboard: Broadcast sent successfully")
            } catch (e: Exception) {
                timber.log.Timber.e(e, "Whiteboard: Failed to broadcast operation")
            }
        }
    }

    private fun applyRemoteOperation(operation: WhiteboardOperation) {
        _uiState.update { state ->
            when (operation) {
                is WhiteboardOperation.Clear -> {
                    state.copy(operations = listOf(operation))
                }
                is WhiteboardOperation.Erase -> {
                    val filtered = state.operations.filter { it.id !in operation.targetIds }
                    state.copy(operations = filtered + operation)
                }
                else -> {
                    state.copy(operations = state.operations + operation)
                }
            }
        }
    }

    private fun parseOperation(data: Map<String, Any>): WhiteboardOperation? {
        return try {
            val type = data["type"] as? String ?: return null
            val id = data["id"] as? String ?: UUID.randomUUID().toString()
            val userId = data["user_id"] as? String ?: "unknown"
            val timestamp = (data["timestamp"] as? Number)?.toLong() ?: System.currentTimeMillis()

            when (type.lowercase()) {
                "draw" -> {
                    // Handle both string format (from realtime broadcast) and list format (from API)
                    val points = when (val pointsRaw = data["points"]) {
                        is String -> {
                            // Realtime broadcast format: "x1,y1;x2,y2;x3,y3"
                            timber.log.Timber.d("Whiteboard: Parsing points from string: ${pointsRaw.take(50)}...")
                            pointsRaw.split(";").mapNotNull { pointStr ->
                                val coords = pointStr.split(",")
                                if (coords.size == 2) {
                                    val x = coords[0].toFloatOrNull()
                                    val y = coords[1].toFloatOrNull()
                                    if (x != null && y != null) Point(x, y) else null
                                } else null
                            }
                        }
                        is List<*> -> {
                            // API format: List<Map<String, Double>>
                            @Suppress("UNCHECKED_CAST")
                            (pointsRaw as? List<Map<String, Double>>)?.map {
                                Point(it["x"]?.toFloat() ?: 0f, it["y"]?.toFloat() ?: 0f)
                            } ?: emptyList()
                        }
                        else -> {
                            timber.log.Timber.w("Whiteboard: Unknown points format: ${pointsRaw?.javaClass?.simpleName}")
                            emptyList()
                        }
                    }
                    timber.log.Timber.d("Whiteboard: Parsed ${points.size} points")
                    // Handle both String (from realtime) and Number (from API) for color/strokeWidth
                    val color = when (val c = data["color"]) {
                        is Number -> c.toInt()
                        is String -> c.toIntOrNull() ?: Color.Black.toArgb()
                        else -> Color.Black.toArgb()
                    }
                    val strokeWidth = when (val sw = data["strokeWidth"]) {
                        is Number -> sw.toFloat()
                        is String -> sw.toFloatOrNull() ?: 5f
                        else -> 5f
                    }

                    WhiteboardOperation.Draw(id, userId, timestamp, points, color, strokeWidth)
                }
                "text" -> {
                    val text = data["text"] as? String ?: ""
                    val x = when (val xVal = data["x"]) {
                        is Number -> xVal.toFloat()
                        is String -> xVal.toFloatOrNull() ?: 0f
                        else -> 0f
                    }
                    val y = when (val yVal = data["y"]) {
                        is Number -> yVal.toFloat()
                        is String -> yVal.toFloatOrNull() ?: 0f
                        else -> 0f
                    }
                    val fontSize = when (val fs = data["fontSize"]) {
                        is Number -> fs.toFloat()
                        is String -> fs.toFloatOrNull() ?: 16f
                        else -> 16f
                    }
                    val color = when (val c = data["color"]) {
                        is Number -> c.toInt()
                        is String -> c.toIntOrNull() ?: Color.Black.toArgb()
                        else -> Color.Black.toArgb()
                    }

                    WhiteboardOperation.Text(id, userId, timestamp, text, Point(x, y), fontSize, color)
                }
                "erase" -> {
                    // Handle both string format (from realtime) and list format (from API)
                    val targetIds = when (val targetsRaw = data["targetIds"]) {
                        is String -> targetsRaw.split(",").filter { it.isNotBlank() }
                        is List<*> -> {
                            @Suppress("UNCHECKED_CAST")
                            (targetsRaw as? List<String>) ?: emptyList()
                        }
                        else -> emptyList()
                    }
                    WhiteboardOperation.Erase(id, userId, timestamp, targetIds)
                }
                "clear" -> {
                    WhiteboardOperation.Clear(id, userId, timestamp)
                }
                else -> null
            }
        } catch (e: Exception) {
            null
        }
    }

    private fun parseRealtimeOperation(update: SupabaseRealtimeManager.WhiteboardUpdate): WhiteboardOperation? {
        return try {
            val data = update.data.toMutableMap()
            data["type"] = update.type
            data["timestamp"] = update.timestamp.toString()
            parseOperation(data.mapValues { it.value as Any })
        } catch (e: Exception) {
            null
        }
    }

    private fun WhiteboardOperation.toDto(): WhiteboardOperationDto {
        return WhiteboardOperationDto(
            type = this.javaClass.simpleName.lowercase(),
            data = this.toDataMap(),
            timestamp = this.timestamp,
            userId = this.userId
        )
    }

    private fun WhiteboardOperation.toDataMap(): Map<String, String> {
        return when (this) {
            is WhiteboardOperation.Draw -> mapOf(
                "id" to id,
                "user_id" to userId,
                "points" to points.joinToString(";") { "${it.x},${it.y}" },
                "color" to color.toString(),
                "strokeWidth" to strokeWidth.toString()
            )
            is WhiteboardOperation.Text -> mapOf(
                "id" to id,
                "user_id" to userId,
                "text" to text,
                "x" to position.x.toString(),
                "y" to position.y.toString(),
                "fontSize" to fontSize.toString(),
                "color" to color.toString()
            )
            is WhiteboardOperation.Erase -> mapOf(
                "id" to id,
                "user_id" to userId,
                "targetIds" to targetIds.joinToString(",")
            )
            is WhiteboardOperation.Clear -> mapOf(
                "id" to id,
                "user_id" to userId
            )
        }
    }

    fun dismissError() {
        _uiState.update { it.copy(error = null) }
    }
}

data class WhiteboardUiState(
    val operations: List<WhiteboardOperation> = emptyList(),
    val currentTool: WhiteboardTool = WhiteboardTool.DRAW,
    val currentColor: Color = Color.Black,
    val currentStrokeWidth: Float = 5f,
    val isLoading: Boolean = false,
    val isSyncing: Boolean = false,
    val error: String? = null
)
