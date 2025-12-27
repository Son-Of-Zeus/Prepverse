import { apiClient } from './client';

/**
 * Onboarding API
 *
 * API functions for handling user onboarding flow
 */

/**
 * Student class type
 */
export type StudentClass = 10 | 12;

/**
 * Onboarding question from backend (matches QuestionResponse schema)
 */
export interface OnboardingQuestion {
  id: string;
  question: string;
  options: string[];
  subject: string;
  topic: string;
  difficulty: string;
  time_estimate_seconds: number;
}

/**
 * Onboarding answer for submission
 */
export interface OnboardingAnswer {
  question_id: string;
  selected_answer: string;
}

/**
 * Onboarding submission request
 */
export interface OnboardingSubmission {
  answers: OnboardingAnswer[];
}

/**
 * Single question result after evaluation
 */
export interface OnboardingResult {
  question_id: string;
  question: string;
  selected_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
  subject: string;
  topic: string;
}

/**
 * Onboarding evaluation response
 */
export interface OnboardingResponse {
  total_questions: number;
  correct_answers: number;
  score_percentage: number;
  results: OnboardingResult[];
  weak_topics: string[];
  strong_topics: string[];
  recommendations: string;
}

/**
 * Onboarding status response
 */
export interface OnboardingStatus {
  completed: boolean;
  score: number | null;
  completed_at: string | null;
  weak_topics: string[];
  strong_topics: string[];
}

/**
 * Get onboarding status for the current user
 *
 * @returns Promise resolving to onboarding status
 * @throws ApiError if request fails
 */
export const getOnboardingStatus = async (): Promise<OnboardingStatus> => {
  try {
    const response = await apiClient.get<OnboardingStatus>('/onboarding/status');
    return response.data;
  } catch (error) {
    console.error('Failed to get onboarding status:', error);
    throw error;
  }
};

/**
 * Get onboarding questions for a specific student class
 *
 * @param classLevel - The student's class (10 or 12)
 * @returns Promise resolving to array of onboarding questions
 * @throws ApiError if request fails
 */
export const getOnboardingQuestions = async (
  classLevel: StudentClass
): Promise<OnboardingQuestion[]> => {
  try {
    const response = await apiClient.get<OnboardingQuestion[]>(
      `/onboarding/questions`,
      {
        params: { class_level: classLevel },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Failed to get onboarding questions:', error);
    throw error;
  }
};

/**
 * Submit onboarding answers
 *
 * @param answers - Array of question answers
 * @returns Promise resolving to evaluation response
 * @throws ApiError if submission fails
 */
export const submitOnboardingAnswers = async (
  answers: OnboardingAnswer[]
): Promise<OnboardingResponse> => {
  try {
    const response = await apiClient.post<OnboardingResponse>(
      '/onboarding/submit',
      { answers }
    );
    return response.data;
  } catch (error) {
    console.error('Failed to submit onboarding answers:', error);
    throw error;
  }
};
