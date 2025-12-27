import { apiClient } from './client';

/**
 * Questions API
 *
 * API functions for generating and submitting questions
 */

/**
 * Subject types for questions
 */
export type Subject = 'mathematics' | 'physics' | 'chemistry' | 'biology';

/**
 * Difficulty levels
 */
export type Difficulty = 'easy' | 'medium' | 'hard';

/**
 * Generated question from backend
 */
export interface Question {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  subject: string;
  topic: string;
  subtopic?: string;
  difficulty: string;
  class_level: number;
  question_type: string;
  time_estimate_seconds: number;
  concept_tags: string[];
}

/**
 * Request to generate questions
 */
export interface GenerateQuestionsRequest {
  subject: string;
  topic: string;
  difficulty?: Difficulty;
  class_level: number;
  count?: number;
}

/**
 * Response from question generation
 */
export interface GenerateQuestionsResponse {
  questions: Question[];
  count: number;
  source: string;
}

/**
 * Question attempt submission
 */
export interface QuestionAttempt {
  question_id: string;
  selected_answer: string;
  is_correct: boolean;
  subject: string;
  topic: string;
  time_taken_seconds?: number;
}

/**
 * Topics available for a subject
 */
export interface SubjectTopics {
  subject: string;
  topics: string[];
}

/**
 * Generate questions using Gemini AI
 *
 * @param request - Question generation parameters
 * @returns Promise resolving to generated questions
 * @throws ApiError if request fails
 */
export const generateQuestions = async (
  request: GenerateQuestionsRequest
): Promise<GenerateQuestionsResponse> => {
  try {
    const response = await apiClient.post<GenerateQuestionsResponse>(
      '/questions/generate',
      request
    );
    return response.data;
  } catch (error) {
    console.error('Failed to generate questions:', error);
    throw error;
  }
};

/**
 * Submit a question attempt
 *
 * @param attempt - The attempt data to submit
 * @returns Promise resolving when submission is successful
 * @throws ApiError if submission fails
 */
export const submitQuestionAttempt = async (
  attempt: QuestionAttempt
): Promise<void> => {
  try {
    await apiClient.post('/questions/attempt', attempt);
  } catch (error) {
    console.error('Failed to submit question attempt:', error);
    throw error;
  }
};

/**
 * Submit multiple question attempts (batch)
 *
 * @param attempts - Array of attempts to submit
 * @returns Promise resolving when submission is successful
 * @throws ApiError if submission fails
 */
export const submitQuestionAttempts = async (
  attempts: QuestionAttempt[]
): Promise<void> => {
  try {
    await apiClient.post('/questions/attempts/batch', { attempts });
  } catch (error) {
    console.error('Failed to submit question attempts:', error);
    throw error;
  }
};

/**
 * Get available topics for a subject and class
 *
 * @param subject - The subject to get topics for
 * @param classLevel - The class level (10 or 12)
 * @returns Promise resolving to available topics
 * @throws ApiError if request fails
 */
export const getTopicsForSubject = async (
  subject: string,
  classLevel: number
): Promise<string[]> => {
  try {
    const response = await apiClient.get<{ topics: string[] }>('/questions/topics', {
      params: { subject, class_level: classLevel },
    });
    return response.data.topics;
  } catch (error) {
    console.error('Failed to get topics:', error);
    throw error;
  }
};
