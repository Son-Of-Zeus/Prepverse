import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';

/**
 * Topic information for dashboard cards
 */
export interface TopicInfo {
  subject: string;
  topic: string;
  display_name: string;
}

/**
 * Progress summary response from /api/v1/practice/progress/summary
 */
export interface ProgressSummary {
  user_id: string;
  class_level: number;
  total_sessions: number;
  total_questions_attempted: number;
  overall_accuracy: number;
  total_study_time_minutes: number;
  subject_scores: Record<string, number>;
  weak_areas: string[];
  continue_learning: TopicInfo[];
  suggested_topics: TopicInfo[];
}

/**
 * Dashboard UI state
 */
export interface DashboardState {
  isLoading: boolean;
  error: string | null;
  currentStreak: number;
  totalXP: number;
  continueLearning: SuggestedTopic[];
  suggestedTopics: SuggestedTopic[];
  totalSessions: number;
  overallAccuracy: number;
  totalStudyTimeMinutes: number;
  subjectScores: Record<string, number>;
}

/**
 * Suggested topic with progress
 */
export interface SuggestedTopic {
  subject: string;
  topic: string;
  displayName: string;
  progress: number; // 0.0 to 1.0
}

/**
 * Concept mastery data for SWOT analysis
 */
export interface ConceptMastery {
  subject: string;
  topic: string;
  subtopic?: string | null;
  display_name: string;
  mastery_score: number;
  total_attempts: number;
  correct_attempts: number;
  accuracy: number;
  current_streak: number;
  best_streak: number;
  recommended_difficulty: string;
  last_practiced_at?: string | null;
}

/**
 * Recent score for performance trend
 */
export interface RecentScore {
  date: string;
  score: number; // percentage
  subject: string | null;
  topic: string | null;
  attempts: number;
}

/**
 * Dashboard response from /dashboard endpoint (for streak/XP)
 */
interface DashboardApiResponse {
  performance_summary: {
    recent_scores: RecentScore[];
    overall_accuracy: number;
    total_questions: number;
    correct_answers: number;
  };
  streak_info: {
    current_streak: number;
    longest_streak: number;
    total_xp: number;
  };
  daily_xp: number;
}

/**
 * Map topic info to suggested topic with progress
 */
function mapTopics(
  topics: TopicInfo[],
  subjectScores: Record<string, number> | undefined
): SuggestedTopic[] {
  return topics.map((topic) => {
    const score = subjectScores?.[topic.subject];
    const subjectProgress = score ? score / 100 : 0;

    return {
      subject: topic.subject,
      topic: topic.topic,
      displayName: topic.display_name,
      progress: Math.max(0, Math.min(1, subjectProgress)),
    };
  });
}

/**
 * Hook to fetch and manage dashboard data
 * Mirrors the Android DashboardViewModel logic
 */
export function useDashboard() {
  const [state, setState] = useState<DashboardState>({
    isLoading: true,
    error: null,
    currentStreak: 0,
    totalXP: 0,
    continueLearning: [],
    suggestedTopics: [],
    totalSessions: 0,
    overallAccuracy: 0,
    totalStudyTimeMinutes: 0,
    subjectScores: {},
  });

  const loadDashboardData = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Fetch both endpoints in parallel for real data
      const [progressResponse, dashboardResponse] = await Promise.all([
        apiClient.get<ProgressSummary>('/practice/progress/summary'),
        apiClient.get<DashboardApiResponse>('/dashboard').catch(() => null), // Don't fail if dashboard endpoint fails
      ]);

      const progressData = progressResponse.data;

      // Get real streak and XP from dashboard endpoint, fallback to 0 if unavailable
      const streakInfo = dashboardResponse?.data?.streak_info;
      const currentStreak = streakInfo?.current_streak ?? 0;
      const totalXP = streakInfo?.total_xp ?? 0;

      setState({
        isLoading: false,
        error: null,
        currentStreak,
        totalXP,
        continueLearning: mapTopics(progressData.continue_learning, progressData.subject_scores),
        suggestedTopics: mapTopics(progressData.suggested_topics, progressData.subject_scores),
        totalSessions: progressData.total_sessions,
        overallAccuracy: progressData.overall_accuracy,
        totalStudyTimeMinutes: progressData.total_study_time_minutes,
        subjectScores: progressData.subject_scores,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return {
    ...state,
    refresh: loadDashboardData,
  };
}

/**
 * Fetch concept mastery data for a specific subject
 */
export async function fetchConceptMastery(subject?: string): Promise<ConceptMastery[]> {
  try {
    const params = subject ? { subject } : {};
    const response = await apiClient.get<{ concepts: ConceptMastery[]; total_concepts: number }>(
      '/practice/progress/concepts',
      { params }
    );
    return response.data.concepts;
  } catch (err) {
    console.error('Failed to fetch concept mastery:', err);
    return [];
  }
}

/**
 * Fetch performance trend data (recent scores)
 */
export async function fetchPerformanceTrend(): Promise<RecentScore[]> {
  try {
    const response = await apiClient.get<{ performance_summary: { recent_scores: RecentScore[] } }>(
      '/dashboard'
    );
    return response.data.performance_summary.recent_scores || [];
  } catch (err) {
    console.error('Failed to fetch performance trend:', err);
    return [];
  }
}
