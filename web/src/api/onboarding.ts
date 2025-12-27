import { apiClient } from './client';

/**
 * Onboarding API
 *
 * API functions for handling user onboarding flow
 */

/**
 * Onboarding status response
 */
export interface OnboardingStatus {
  completed: boolean;
  currentStep?: number;
  totalSteps?: number;
}

/**
 * Student class type
 */
export type StudentClass = '10' | '12';

/**
 * Onboarding question
 */
export interface OnboardingQuestion {
  id: string;
  question: string;
  type: 'single' | 'multiple' | 'text';
  options?: string[];
  required: boolean;
}

/**
 * Onboarding answer
 */
export interface OnboardingAnswer {
  questionId: string;
  answer: string | string[];
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
 * @param studentClass - The student's class (10 or 12)
 * @returns Promise resolving to array of onboarding questions
 * @throws ApiError if request fails
 */
export const getOnboardingQuestions = async (
  studentClass: StudentClass
): Promise<OnboardingQuestion[]> => {
  try {
    const response = await apiClient.get<OnboardingQuestion[]>(
      `/onboarding/questions`,
      {
        params: { class: studentClass },
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
 * @returns Promise resolving when submission is successful
 * @throws ApiError if submission fails
 */
export const submitOnboardingAnswers = async (
  answers: OnboardingAnswer[]
): Promise<void> => {
  try {
    await apiClient.post('/onboarding/submit', { answers });
  } catch (error) {
    console.error('Failed to submit onboarding answers:', error);
    throw error;
  }
};

/**
 * Skip onboarding (if allowed)
 *
 * @returns Promise resolving when skip is successful
 * @throws ApiError if skip fails
 */
export const skipOnboarding = async (): Promise<void> => {
  try {
    await apiClient.post('/onboarding/skip');
  } catch (error) {
    console.error('Failed to skip onboarding:', error);
    throw error;
  }
};
