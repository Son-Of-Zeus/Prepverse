package com.prepverse.prepverse.ui.screens.forum

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.ThumbUp
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.prepverse.prepverse.domain.model.ForumCategory
import com.prepverse.prepverse.domain.model.ForumComment
import com.prepverse.prepverse.domain.model.ForumPostDetail
import com.prepverse.prepverse.domain.model.VoteType
import com.prepverse.prepverse.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PostDetailScreen(
    postId: String,
    currentUserId: String?,
    onNavigateBack: () -> Unit,
    viewModel: PostDetailViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var showDeleteDialog by remember { mutableStateOf(false) }

    // Handle delete success
    LaunchedEffect(uiState.deleteSuccess) {
        if (uiState.deleteSuccess) {
            onNavigateBack()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Discussion",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = "Back",
                            tint = TextPrimary
                        )
                    }
                },
                actions = {
                    // Show delete button if user is the author
                    if (currentUserId != null && uiState.post?.userId == currentUserId) {
                        IconButton(onClick = { showDeleteDialog = true }) {
                            Icon(
                                imageVector = Icons.Default.Delete,
                                contentDescription = "Delete",
                                tint = Error
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Void
                )
            )
        },
        bottomBar = {
            // Comment input bar
            CommentInputBar(
                text = uiState.commentText,
                onTextChange = viewModel::updateCommentText,
                onSubmit = viewModel::submitComment,
                isLoading = uiState.isCommenting,
                replyingTo = uiState.replyingToComment,
                onCancelReply = viewModel::cancelReply
            )
        },
        containerColor = Void
    ) { paddingValues ->
        when {
            uiState.isLoading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = ElectricCyan)
                }
            }

            uiState.error != null && uiState.post == null -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Error,
                            contentDescription = null,
                            tint = Error,
                            modifier = Modifier.size(48.dp)
                        )
                        Text(
                            text = uiState.error ?: "Failed to load post",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextSecondary
                        )
                        Button(
                            onClick = viewModel::loadPost,
                            colors = ButtonDefaults.buttonColors(containerColor = ElectricCyan)
                        ) {
                            Text("Retry", color = Void)
                        }
                    }
                }
            }

            uiState.post != null -> {
                PostContent(
                    post = uiState.post!!,
                    onVote = viewModel::voteOnPost,
                    onCommentVote = viewModel::voteOnComment,
                    onReply = viewModel::startReplyingTo,
                    getCommentUpvotes = viewModel::getCommentUpvotes,
                    getCommentVoteStatus = viewModel::getCommentVoteStatus,
                    isVoting = uiState.isVoting,
                    modifier = Modifier.padding(paddingValues)
                )
            }
        }
    }

    // Delete confirmation dialog
    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Delete Post?", color = TextPrimary) },
            text = {
                Text(
                    "This will permanently delete your post and all comments. This action cannot be undone.",
                    color = TextSecondary
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDeleteDialog = false
                        viewModel.deletePost()
                    },
                    colors = ButtonDefaults.textButtonColors(contentColor = Error)
                ) {
                    Text("Delete")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) {
                    Text("Cancel", color = TextSecondary)
                }
            },
            containerColor = Surface
        )
    }
}

@Composable
private fun PostContent(
    post: ForumPostDetail,
    onVote: (VoteType) -> Unit,
    onCommentVote: (String, VoteType) -> Unit,
    onReply: (ForumComment) -> Unit,
    getCommentUpvotes: (ForumComment) -> Int,
    getCommentVoteStatus: (ForumComment) -> VoteType?,
    isVoting: Boolean,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Post Header
        item {
            PostHeader(post = post)
        }

        // Post Content
        item {
            PostBody(
                post = post,
                onVote = onVote,
                isVoting = isVoting
            )
        }

        // Comments Section
        item {
            Text(
                text = "Comments (${post.commentCount})",
                style = MaterialTheme.typography.titleMedium,
                color = TextPrimary,
                fontWeight = FontWeight.SemiBold
            )
        }

        if (post.comments.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.ChatBubbleOutline,
                            contentDescription = null,
                            tint = TextMuted,
                            modifier = Modifier.size(40.dp)
                        )
                        Text(
                            text = "No comments yet",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextSecondary
                        )
                        Text(
                            text = "Be the first to comment!",
                            style = MaterialTheme.typography.bodySmall,
                            color = TextMuted
                        )
                    }
                }
            }
        } else {
            // Top-level comments
            items(
                items = post.getTopLevelComments(),
                key = { it.id }
            ) { comment ->
                CommentItem(
                    comment = comment,
                    replies = post.getReplies(comment.id),
                    allComments = post.comments,
                    onVote = { voteType -> onCommentVote(comment.id, voteType) },
                    onReply = { onReply(comment) },
                    onReplyVote = onCommentVote,
                    getCommentUpvotes = getCommentUpvotes,
                    getCommentVoteStatus = getCommentVoteStatus
                )
            }
        }

        // Bottom padding for input bar
        item {
            Spacer(modifier = Modifier.height(60.dp))
        }
    }
}

@Composable
private fun PostHeader(post: ForumPostDetail) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        // Author and time
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Avatar
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(
                        getCategoryColor(ForumCategory.fromApiName(post.category)).copy(alpha = 0.2f),
                        CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = post.authorName.firstOrNull()?.uppercase() ?: "?",
                    style = MaterialTheme.typography.titleMedium,
                    color = getCategoryColor(ForumCategory.fromApiName(post.category)),
                    fontWeight = FontWeight.Bold
                )
            }

            Column {
                Text(
                    text = post.authorName,
                    style = MaterialTheme.typography.titleSmall,
                    color = TextPrimary,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = post.getTimeAgo(),
                    style = MaterialTheme.typography.bodySmall,
                    color = TextMuted
                )
            }

            Spacer(modifier = Modifier.weight(1f))

            // Category chip
            Box(
                modifier = Modifier
                    .background(
                        getCategoryColor(ForumCategory.fromApiName(post.category)).copy(alpha = 0.15f),
                        RoundedCornerShape(12.dp)
                    )
                    .padding(horizontal = 10.dp, vertical = 6.dp)
            ) {
                Text(
                    text = post.getCategoryDisplay(),
                    style = MaterialTheme.typography.labelMedium,
                    color = getCategoryColor(ForumCategory.fromApiName(post.category))
                )
            }
        }

        // Title
        Text(
            text = post.title,
            style = MaterialTheme.typography.headlineSmall,
            color = TextPrimary,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
private fun PostBody(
    post: ForumPostDetail,
    onVote: (VoteType) -> Unit,
    isVoting: Boolean
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Surface),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Content
            Text(
                text = post.content,
                style = MaterialTheme.typography.bodyLarge,
                color = TextPrimary
            )

            // Tags
            if (post.tags.isNotEmpty()) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    post.tags.forEach { tag ->
                        Box(
                            modifier = Modifier
                                .background(SurfaceVariant, RoundedCornerShape(8.dp))
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = "#$tag",
                                style = MaterialTheme.typography.labelMedium,
                                color = TextSecondary
                            )
                        }
                    }
                }
            }

            HorizontalDivider(color = SurfaceVariant)

            // Actions: Vote, Views
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Vote buttons
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Upvote button
                    IconButton(
                        onClick = { onVote(VoteType.UP) },
                        enabled = !isVoting
                    ) {
                        Icon(
                            imageVector = if (post.userVoteStatus == VoteType.UP)
                                Icons.Filled.ThumbUp else Icons.Outlined.ThumbUp,
                            contentDescription = "Upvote",
                            tint = if (post.userVoteStatus == VoteType.UP) NeonGreen else TextSecondary
                        )
                    }

                    Text(
                        text = "${post.upvotes}",
                        style = MaterialTheme.typography.titleMedium,
                        color = when (post.userVoteStatus) {
                            VoteType.UP -> NeonGreen
                            VoteType.DOWN -> Error
                            null -> TextPrimary
                        },
                        fontWeight = FontWeight.SemiBold
                    )

                    // Downvote button
                    IconButton(
                        onClick = { onVote(VoteType.DOWN) },
                        enabled = !isVoting
                    ) {
                        Icon(
                            imageVector = if (post.userVoteStatus == VoteType.DOWN)
                                Icons.Filled.ThumbDown else Icons.Default.ThumbDownOffAlt,
                            contentDescription = "Downvote",
                            tint = if (post.userVoteStatus == VoteType.DOWN) Error else TextSecondary
                        )
                    }
                }

                // Views
                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Visibility,
                        contentDescription = null,
                        tint = TextMuted,
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = "${post.viewCount} views",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextMuted
                    )
                }
            }
        }
    }
}

@Composable
private fun CommentItem(
    comment: ForumComment,
    replies: List<ForumComment>,
    allComments: List<ForumComment>,
    onVote: (VoteType) -> Unit,
    onReply: () -> Unit,
    onReplyVote: (String, VoteType) -> Unit,
    getCommentUpvotes: (ForumComment) -> Int,
    getCommentVoteStatus: (ForumComment) -> VoteType?,
    depth: Int = 0
) {
    val startPadding = (depth * 16).dp

    Column(
        modifier = Modifier.padding(start = startPadding)
    ) {
        Card(
            colors = CardDefaults.cardColors(
                containerColor = if (depth == 0) Surface else SurfaceVariant.copy(alpha = 0.5f)
            ),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Author and time
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(24.dp)
                            .background(PlasmaPurple.copy(alpha = 0.2f), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = comment.authorName.firstOrNull()?.uppercase() ?: "?",
                            style = MaterialTheme.typography.labelSmall,
                            color = PlasmaPurple,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Text(
                        text = comment.authorName,
                        style = MaterialTheme.typography.labelMedium,
                        color = TextPrimary,
                        fontWeight = FontWeight.Medium
                    )

                    Text(
                        text = "•",
                        color = TextMuted
                    )

                    Text(
                        text = comment.getTimeAgo(),
                        style = MaterialTheme.typography.labelSmall,
                        color = TextMuted
                    )
                }

                // Content
                Text(
                    text = comment.content,
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextPrimary
                )

                // Actions
                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Upvote
                    Row(
                        modifier = Modifier.clickable { onVote(VoteType.UP) },
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        val voteStatus = getCommentVoteStatus(comment)
                        val upvotes = getCommentUpvotes(comment)

                        Icon(
                            imageVector = if (voteStatus == VoteType.UP)
                                Icons.Filled.ThumbUp else Icons.Outlined.ThumbUp,
                            contentDescription = "Upvote",
                            tint = if (voteStatus == VoteType.UP) NeonGreen else TextMuted,
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = "$upvotes",
                            style = MaterialTheme.typography.labelMedium,
                            color = if (voteStatus == VoteType.UP) NeonGreen else TextMuted
                        )
                    }

                    // Reply (only for top-level or first-level replies)
                    if (depth < 2) {
                        Row(
                            modifier = Modifier.clickable(onClick = onReply),
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Reply,
                                contentDescription = "Reply",
                                tint = TextMuted,
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = "Reply",
                                style = MaterialTheme.typography.labelMedium,
                                color = TextMuted
                            )
                        }
                    }
                }
            }
        }

        // Nested replies
        if (replies.isNotEmpty()) {
            Spacer(modifier = Modifier.height(8.dp))
            replies.forEach { reply ->
                CommentItem(
                    comment = reply,
                    replies = allComments.filter { it.parentCommentId == reply.id },
                    allComments = allComments,
                    onVote = { voteType -> onReplyVote(reply.id, voteType) },
                    onReply = { /* Handle nested reply */ },
                    onReplyVote = onReplyVote,
                    getCommentUpvotes = getCommentUpvotes,
                    getCommentVoteStatus = getCommentVoteStatus,
                    depth = depth + 1
                )
                Spacer(modifier = Modifier.height(8.dp))
            }
        }
    }
}

@Composable
private fun CommentInputBar(
    text: String,
    onTextChange: (String) -> Unit,
    onSubmit: () -> Unit,
    isLoading: Boolean,
    replyingTo: ForumComment?,
    onCancelReply: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface)
    ) {
        // Reply indicator
        AnimatedVisibility(
            visible = replyingTo != null,
            enter = expandVertically(),
            exit = shrinkVertically()
        ) {
            replyingTo?.let { comment ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(SurfaceVariant)
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Reply,
                            contentDescription = null,
                            tint = ElectricCyan,
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = "Replying to ${comment.authorName}",
                            style = MaterialTheme.typography.labelMedium,
                            color = ElectricCyan
                        )
                    }
                    IconButton(
                        onClick = onCancelReply,
                        modifier = Modifier.size(24.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Cancel",
                            tint = TextMuted,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }
        }

        // Input field
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(44.dp)
                    .background(SurfaceVariant, RoundedCornerShape(22.dp))
                    .padding(horizontal = 16.dp),
                contentAlignment = Alignment.CenterStart
            ) {
                if (text.isEmpty()) {
                    Text(
                        text = if (replyingTo != null) "Write a reply..." else "Add a comment...",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextMuted
                    )
                }
                BasicTextField(
                    value = text,
                    onValueChange = onTextChange,
                    textStyle = MaterialTheme.typography.bodyMedium.copy(
                        color = TextPrimary
                    ),
                    singleLine = true,
                    cursorBrush = SolidColor(ElectricCyan),
                    modifier = Modifier.fillMaxWidth()
                )
            }

            IconButton(
                onClick = onSubmit,
                enabled = text.isNotBlank() && !isLoading,
                modifier = Modifier
                    .size(44.dp)
                    .background(
                        if (text.isNotBlank()) PrepVerseRed else SurfaceVariant,
                        CircleShape
                    )
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        color = TextPrimary,
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp
                    )
                } else {
                    Icon(
                        imageVector = Icons.Default.Send,
                        contentDescription = "Send",
                        tint = if (text.isNotBlank()) TextPrimary else TextMuted,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}

private fun getCategoryColor(category: ForumCategory): androidx.compose.ui.graphics.Color {
    return when (category) {
        ForumCategory.MATH -> MathColor
        ForumCategory.PHYSICS -> PhysicsColor
        ForumCategory.CHEMISTRY -> ChemistryColor
        ForumCategory.BIOLOGY -> BiologyColor
        ForumCategory.EXAM_TIPS -> SolarGold
        ForumCategory.STUDY_GROUPS -> PlasmaPurple
        ForumCategory.RESOURCES -> ElectricCyan
        ForumCategory.GENERAL -> TextSecondary
    }
}
