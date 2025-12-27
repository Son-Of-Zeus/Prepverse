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
 * Calculate streak from total sessions (simplified)
 */
function calculateStreak(totalSessions: number): number {
  return Math.min(totalSessions, 30); // Cap at 30 for display
}

/**
 * Calculate XP from progress data
 * - Base: 10 XP per correct answer
 * - Bonus: 5 XP per session completed
 */
function calculateXP(totalQuestions: number, accuracy: number, totalSessions: number): number {
  const totalCorrect = Math.floor((totalQuestions * accuracy) / 100);
  const baseXP = totalCorrect * 10;
  const sessionBonus = totalSessions * 5;
  return baseXP + sessionBonus;
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
      const response = await apiClient.get<ProgressSummary>('/practice/progress/summary');
      const data = response.data;

      setState({
        isLoading: false,
        error: null,
        currentStreak: calculateStreak(data.total_sessions),
        totalXP: calculateXP(
          data.total_questions_attempted,
          data.overall_accuracy,
          data.total_sessions
        ),
        continueLearning: mapTopics(data.continue_learning, data.subject_scores),
        suggestedTopics: mapTopics(data.suggested_topics, data.subject_scores),
        totalSessions: data.total_sessions,
        overallAccuracy: data.overall_accuracy,
        totalStudyTimeMinutes: data.total_study_time_minutes,
        subjectScores: data.subject_scores,
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
