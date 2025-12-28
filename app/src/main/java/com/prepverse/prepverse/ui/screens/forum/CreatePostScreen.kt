package com.prepverse.prepverse.ui.screens.forum

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.prepverse.prepverse.domain.model.ForumCategory
import com.prepverse.prepverse.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreatePostScreen(
    onNavigateBack: () -> Unit,
    onPostCreated: (postId: String) -> Unit,
    viewModel: CreatePostViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val focusManager = LocalFocusManager.current

    // Handle post creation success
    LaunchedEffect(uiState.createdPost) {
        uiState.createdPost?.let { post ->
            onPostCreated(post.id)
        }
    }

    // Show error snackbar
    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(uiState.error) {
        uiState.error?.let { error ->
            snackbarHostState.showSnackbar(error)
            viewModel.clearError()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "New Discussion",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Cancel",
                            tint = TextPrimary
                        )
                    }
                },
                actions = {
                    TextButton(
                        onClick = {
                            focusManager.clearFocus()
                            viewModel.submitPost()
                        },
                        enabled = uiState.isValid && !uiState.isSubmitting
                    ) {
                        if (uiState.isSubmitting) {
                            CircularProgressIndicator(
                                color = PrepVerseRed,
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text(
                                text = "Post",
                                style = MaterialTheme.typography.titleMedium,
                                color = if (uiState.isValid) PrepVerseRed else TextMuted,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Void
                )
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = Void
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            // Category Selection
            CategorySection(
                categories = uiState.categories,
                selectedCategory = uiState.selectedCategory,
                onCategorySelected = viewModel::selectCategory
            )

            // Title Input
            TitleInput(
                title = uiState.title,
                onTitleChange = viewModel::updateTitle
            )

            // Content Input
            ContentInput(
                content = uiState.content,
                onContentChange = viewModel::updateContent
            )

            // Tags Section
            TagsSection(
                tags = uiState.tags,
                tagInput = uiState.tagInput,
                onTagInputChange = viewModel::updateTagInput,
                onAddTag = viewModel::addTag,
                onRemoveTag = viewModel::removeTag
            )

            // Tips
            TipsCard()
        }
    }
}

@Composable
private fun CategorySection(
    categories: List<ForumCategory>,
    selectedCategory: ForumCategory,
    onCategorySelected: (ForumCategory) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = "Category",
            style = MaterialTheme.typography.labelLarge,
            color = TextSecondary
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            categories.forEach { category ->
                val isSelected = selectedCategory == category
                val categoryColor = getCategoryColor(category)

                FilterChip(
                    selected = isSelected,
                    onClick = { onCategorySelected(category) },
                    label = {
                        Text(
                            text = category.displayName,
                            style = MaterialTheme.typography.labelMedium
                        )
                    },
                    leadingIcon = if (isSelected) {
                        {
                            Icon(
                                imageVector = Icons.Default.Check,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    } else null,
                    colors = FilterChipDefaults.filterChipColors(
                        containerColor = Surface,
                        labelColor = TextSecondary,
                        selectedContainerColor = categoryColor.copy(alpha = 0.2f),
                        selectedLabelColor = categoryColor,
                        selectedLeadingIconColor = categoryColor
                    ),
                    border = FilterChipDefaults.filterChipBorder(
                        enabled = true,
                        selected = isSelected,
                        borderColor = SurfaceVariant,
                        selectedBorderColor = categoryColor
                    )
                )
            }
        }
    }
}

@Composable
private fun TitleInput(
    title: String,
    onTitleChange: (String) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                text = "Title",
                style = MaterialTheme.typography.labelLarge,
                color = TextSecondary
            )
            Text(
                text = "${title.length}/100",
                style = MaterialTheme.typography.labelSmall,
                color = if (title.length > 100) Error else TextMuted
            )
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(Surface, RoundedCornerShape(12.dp))
                .border(
                    width = 1.dp,
                    color = if (title.isNotEmpty()) ElectricCyan.copy(alpha = 0.5f) else SurfaceVariant,
                    shape = RoundedCornerShape(12.dp)
                )
                .padding(16.dp)
        ) {
            if (title.isEmpty()) {
                Text(
                    text = "What's your question or topic?",
                    style = MaterialTheme.typography.bodyLarge,
                    color = TextMuted
                )
            }
            BasicTextField(
                value = title,
                onValueChange = { if (it.length <= 100) onTitleChange(it) },
                textStyle = MaterialTheme.typography.bodyLarge.copy(
                    color = TextPrimary,
                    fontWeight = FontWeight.Medium
                ),
                singleLine = true,
                cursorBrush = SolidColor(ElectricCyan),
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Composable
private fun ContentInput(
    content: String,
    onContentChange: (String) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = "Content",
            style = MaterialTheme.typography.labelLarge,
            color = TextSecondary
        )

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 150.dp, max = 300.dp)
                .background(Surface, RoundedCornerShape(12.dp))
                .border(
                    width = 1.dp,
                    color = if (content.isNotEmpty()) ElectricCyan.copy(alpha = 0.5f) else SurfaceVariant,
                    shape = RoundedCornerShape(12.dp)
                )
                .padding(16.dp)
        ) {
            if (content.isEmpty()) {
                Text(
                    text = "Share your thoughts, questions, or insights...",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextMuted
                )
            }
            BasicTextField(
                value = content,
                onValueChange = onContentChange,
                textStyle = MaterialTheme.typography.bodyMedium.copy(
                    color = TextPrimary
                ),
                cursorBrush = SolidColor(ElectricCyan),
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Composable
private fun TagsSection(
    tags: List<String>,
    tagInput: String,
    onTagInputChange: (String) -> Unit,
    onAddTag: () -> Unit,
    onRemoveTag: (String) -> Unit
) {
    val focusRequester = remember { FocusRequester() }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = "Tags (optional)",
                style = MaterialTheme.typography.labelLarge,
                color = TextSecondary
            )
            Text(
                text = "${tags.size}/5",
                style = MaterialTheme.typography.labelSmall,
                color = TextMuted
            )
        }

        // Tags display
        if (tags.isNotEmpty()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                tags.forEach { tag ->
                    InputChip(
                        selected = false,
                        onClick = { },
                        label = {
                            Text(
                                text = "#$tag",
                                style = MaterialTheme.typography.labelMedium
                            )
                        },
                        trailingIcon = {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Remove",
                                modifier = Modifier
                                    .size(16.dp)
                                    .clickable { onRemoveTag(tag) }
                            )
                        },
                        colors = InputChipDefaults.inputChipColors(
                            containerColor = SurfaceVariant,
                            labelColor = TextPrimary
                        )
                    )
                }
            }
        }

        // Tag input
        if (tags.size < 5) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Surface, RoundedCornerShape(12.dp))
                    .border(1.dp, SurfaceVariant, RoundedCornerShape(12.dp))
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Tag,
                    contentDescription = null,
                    tint = TextMuted,
                    modifier = Modifier.size(20.dp)
                )

                Box(modifier = Modifier.weight(1f)) {
                    if (tagInput.isEmpty()) {
                        Text(
                            text = "Add a tag...",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextMuted
                        )
                    }
                    BasicTextField(
                        value = tagInput,
                        onValueChange = { input ->
                            // Only allow alphanumeric and hyphens
                            val filtered = input.filter { it.isLetterOrDigit() || it == '-' }
                            onTagInputChange(filtered.lowercase())
                        },
                        textStyle = MaterialTheme.typography.bodyMedium.copy(
                            color = TextPrimary
                        ),
                        singleLine = true,
                        cursorBrush = SolidColor(ElectricCyan),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(onDone = { onAddTag() }),
                        modifier = Modifier
                            .fillMaxWidth()
                            .focusRequester(focusRequester)
                    )
                }

                if (tagInput.isNotEmpty()) {
                    IconButton(
                        onClick = onAddTag,
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Add,
                            contentDescription = "Add tag",
                            tint = ElectricCyan
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun TipsCard() {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = ElectricCyan.copy(alpha = 0.1f)
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Lightbulb,
                contentDescription = null,
                tint = ElectricCyan,
                modifier = Modifier.size(24.dp)
            )

            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = "Tips for a great post",
                    style = MaterialTheme.typography.labelLarge,
                    color = ElectricCyan,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = "• Be specific and clear in your question\n" +
                            "• Add relevant context or examples\n" +
                            "• Use appropriate category and tags\n" +
                            "• Be respectful and follow community guidelines",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
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
