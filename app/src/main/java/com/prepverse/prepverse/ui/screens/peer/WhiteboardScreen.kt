package com.prepverse.prepverse.ui.screens.peer

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import com.prepverse.prepverse.domain.model.Point
import com.prepverse.prepverse.domain.model.WhiteboardOperation
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * Whiteboard Canvas for collaborative drawing.
 * Supports: Draw, Text, Erase, Clear operations.
 */
@Composable
fun WhiteboardCanvas(
    operations: List<WhiteboardOperation>,
    currentTool: WhiteboardTool,
    currentColor: Color,
    currentStrokeWidth: Float,
    onOperationAdded: (WhiteboardOperation) -> Unit,
    modifier: Modifier = Modifier
) {
    var currentPath by remember { mutableStateOf<MutableList<Point>>(mutableListOf()) }
    var currentUserId by remember { mutableStateOf("current-user") } // Get from auth

    Canvas(
        modifier = modifier
            .fillMaxSize()
            .background(Color.White)
            .pointerInput(currentTool) {
                detectDragGestures(
                    onDragStart = { offset ->
                        when (currentTool) {
                            WhiteboardTool.DRAW, WhiteboardTool.ERASE -> {
                                currentPath = mutableListOf(
                                    Point(offset.x, offset.y)
                                )
                            }
                            else -> {}
                        }
                    },
                    onDrag = { change, _ ->
                        when (currentTool) {
                            WhiteboardTool.DRAW, WhiteboardTool.ERASE -> {
                                currentPath.add(Point(change.position.x, change.position.y))
                            }
                            else -> {}
                        }
                    },
                    onDragEnd = {
                        when (currentTool) {
                            WhiteboardTool.DRAW -> {
                                if (currentPath.isNotEmpty()) {
                                    val operation = WhiteboardOperation.Draw(
                                        id = java.util.UUID.randomUUID().toString(),
                                        userId = currentUserId,
                                        timestamp = System.currentTimeMillis(),
                                        points = currentPath.toList(),
                                        color = currentColor.toArgb(),
                                        strokeWidth = currentStrokeWidth
                                    )
                                    onOperationAdded(operation)
                                    currentPath = mutableListOf()
                                }
                            }
                            WhiteboardTool.ERASE -> {
                                // Simplified erase: find operations to remove
                                // In real implementation, would check intersection
                                currentPath = mutableListOf()
                            }
                            else -> {}
                        }
                    }
                )
            }
    ) {
        // Draw all completed operations
        operations.forEach { operation ->
            when (operation) {
                is WhiteboardOperation.Draw -> {
                    if (operation.points.size >= 2) {
                        val path = Path()
                        path.moveTo(operation.points[0].x, operation.points[0].y)
                        for (i in 1 until operation.points.size) {
                            path.lineTo(operation.points[i].x, operation.points[i].y)
                        }
                        drawPath(
                            path = path,
                            color = Color(operation.color),
                            style = Stroke(
                                width = operation.strokeWidth,
                                cap = StrokeCap.Round,
                                join = StrokeJoin.Round
                            )
                        )
                    }
                }
                is WhiteboardOperation.Text -> {
                    // Text rendering would require more complex setup
                    // For now, just show a placeholder
                }
                is WhiteboardOperation.Erase -> {
                    // Erase operations are handled by removing other operations
                }
                is WhiteboardOperation.Clear -> {
                    // Clear operations reset the canvas
                }
            }
        }

        // Draw current path being drawn
        if (currentPath.size >= 2 && currentTool == WhiteboardTool.DRAW) {
            val path = Path()
            path.moveTo(currentPath[0].x, currentPath[0].y)
            for (i in 1 until currentPath.size) {
                path.lineTo(currentPath[i].x, currentPath[i].y)
            }
            drawPath(
                path = path,
                color = currentColor,
                style = Stroke(
                    width = currentStrokeWidth,
                    cap = StrokeCap.Round,
                    join = StrokeJoin.Round
                )
            )
        }
    }
}

@Composable
fun WhiteboardControls(
    currentTool: WhiteboardTool,
    currentColor: Color,
    currentStrokeWidth: Float,
    onToolChanged: (WhiteboardTool) -> Unit,
    onColorChanged: (Color) -> Unit,
    onStrokeWidthChanged: (Float) -> Unit,
    onClear: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface)
            .padding(8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Tool selection
        WhiteboardTool.values().forEach { tool ->
            IconButton(
                onClick = { onToolChanged(tool) },
                modifier = Modifier
                    .size(48.dp)
                    .background(
                        if (currentTool == tool)
                            MaterialTheme.colorScheme.primaryContainer
                        else
                            Color.Transparent,
                        CircleShape
                    )
            ) {
                Icon(
                    imageVector = when (tool) {
                        WhiteboardTool.DRAW -> Icons.Default.Edit
                        WhiteboardTool.ERASE -> Icons.Default.Clear
                        WhiteboardTool.TEXT -> Icons.Default.Favorite // Using placeholder icon
                    },
                    contentDescription = tool.name
                )
            }
        }

        Divider(
            modifier = Modifier
                .width(1.dp)
                .height(32.dp)
        )

        // Color palette
        val colors = listOf(
            Color.Black,
            Color.Red,
            Color.Blue,
            Color.Green,
            Color.Yellow,
            Color.Magenta
        )
        colors.forEach { color ->
            Surface(
                onClick = { onColorChanged(color) },
                modifier = Modifier.size(32.dp),
                shape = CircleShape,
                color = color,
                border = if (currentColor == color)
                    androidx.compose.foundation.BorderStroke(3.dp, MaterialTheme.colorScheme.primary)
                else null
            ) {}
        }

        Spacer(modifier = Modifier.weight(1f))

        // Stroke width
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Warning, // Using as placeholder
                contentDescription = "Stroke Width",
                modifier = Modifier.size(16.dp)
            )
            Text(
                text = currentStrokeWidth.toInt().toString(),
                style = MaterialTheme.typography.bodySmall
            )
        }

        // Clear button
        IconButton(
            onClick = onClear
        ) {
            Icon(
                imageVector = Icons.Default.Delete,
                contentDescription = "Clear All",
                tint = MaterialTheme.colorScheme.error
            )
        }
    }
}

@Composable
fun CollaborativeWhiteboardScreen(
    sessionId: String,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    var operations by remember { mutableStateOf<List<WhiteboardOperation>>(emptyList()) }
    var currentTool by remember { mutableStateOf(WhiteboardTool.DRAW) }
    var currentColor by remember { mutableStateOf(Color.Black) }
    var currentStrokeWidth by remember { mutableStateOf(5f) }

    Column(modifier = modifier.fillMaxSize()) {
        // Controls
        WhiteboardControls(
            currentTool = currentTool,
            currentColor = currentColor,
            currentStrokeWidth = currentStrokeWidth,
            onToolChanged = { currentTool = it },
            onColorChanged = { currentColor = it },
            onStrokeWidthChanged = { currentStrokeWidth = it },
            onClear = {
                val clearOp = WhiteboardOperation.Clear(
                    id = java.util.UUID.randomUUID().toString(),
                    userId = "current-user",
                    timestamp = System.currentTimeMillis()
                )
                operations = listOf(clearOp)
            }
        )

        // Canvas
        WhiteboardCanvas(
            operations = operations,
            currentTool = currentTool,
            currentColor = currentColor,
            currentStrokeWidth = currentStrokeWidth,
            onOperationAdded = { operation ->
                operations = operations + operation
                // TODO: Sync to server and broadcast via Supabase Realtime
            },
            modifier = Modifier.weight(1f)
        )
    }
}

enum class WhiteboardTool {
    DRAW,
    ERASE,
    TEXT
}
