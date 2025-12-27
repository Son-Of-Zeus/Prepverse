import { apiClient } from './client';

/**
 * Dashboard API Types
 */

export interface RecentScore {
  date: string;
  score: number; // percentage
  subject: string | null;
  topic: string | null;
  attempts: number;
}

export interface PerformanceSummary {
  recent_scores: RecentScore[];
  overall_accuracy: number;
  total_questions: number;
  correct_answers: number;
}

export interface SuggestedTopic {
  subject: string;
  topic: string;
  progress: number; // 0.0 to 1.0
  mastery_level: string; // "beginner", "learning", "proficient", "mastered"
  accuracy: number;
}

export interface StreakInfo {
  current_streak: number;
  longest_streak: number;
  total_xp: number;
}

export interface DashboardResponse {
  performance_summary: PerformanceSummary;
  suggested_topics: SuggestedTopic[];
  streak_info: StreakInfo;
  daily_xp: number;
}

/**
 * Get dashboard data
 *
 * @returns Promise resolving to dashboard data
 * @throws ApiError if request fails
 */
export const getDashboard = async (): Promise<DashboardResponse> => {
  try {
    const response = await apiClient.get<DashboardResponse>('/dashboard');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch dashboard:', error);
    throw error;
  }
};

