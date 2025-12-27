import { apiClient } from './client';

/**
 * Practice API Service
 * 
 * Handles all practice-related API calls
 */

export interface TopicInfo {
  id: string;
  subject: string;
  topic: string;
  display_name: string;
  description?: string | null;
  subtopics: string[];
  icon?: string | null;
  question_count: number;
}

export interface TopicsResponse {
  class_level: number;
  subjects: string[];
  topics: TopicInfo[];
}

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface StartSessionRequest {
  subject: string;
  topic?: string | null;
  difficulty?: DifficultyLevel | null;
  question_count?: number;
  time_limit_seconds?: number | null;
}

export interface StartSessionResponse {
  session_id: string;
  subject: string;
  topic: string | null;
  difficulty: string | null;
  question_count: number;
  time_limit_seconds: number | null;
  started_at: string;
}

export interface QuestionForSession {
  id: string;
  question_order: number;
  question: string;
  options: string[];
  subject: string;
  topic: string;
  difficulty: string;
  time_estimate_seconds: number;
}

export interface NextQuestionResponse {
  session_id: string;
  question: QuestionForSession;
  current_question_number: number;
  total_questions: number;
  time_remaining_seconds: number | null;
  session_elapsed_seconds: number;
}

export interface SubmitAnswerRequest {
  answer: string;
  time_taken_seconds: number;
}

export interface SubmitAnswerResponse {
  is_correct: boolean;
  correct_answer: string;
  explanation: string;
  time_taken_seconds: number;
  points_earned: number;
  questions_answered: number;
  questions_remaining: number;
  current_score: number;
  current_accuracy: number;
}

export interface QuestionReview {
  question_order: number;
  question: string;
  options: string[];
  correct_answer: string;
  user_answer: string | null;
  is_correct: boolean | null;
  explanation: string;
  time_taken_seconds: number | null;
  subject: string;
  topic: string;
  difficulty: string;
}

export interface SessionSummary {
  session_id: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  subject: string;
  topic: string | null;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  skipped: number;
  score_percentage: number;
  total_time_seconds: number;
  avg_time_per_question: number;
  time_limit_seconds: number | null;
  easy_correct: number;
  easy_total: number;
  medium_correct: number;
  medium_total: number;
  hard_correct: number;
  hard_total: number;
  weak_topics: string[];
  strong_topics: string[];
  started_at: string;
  ended_at: string;
}

export interface EndSessionResponse {
  summary: SessionSummary;
  questions_review: QuestionReview[];
}

export interface SessionHistoryItem {
  session_id: string;
  subject: string;
  topic: string | null;
  score_percentage: number;
  total_questions: number;
  correct_answers: number;
  total_time_seconds: number;
  started_at: string;
  status: 'in_progress' | 'completed' | 'abandoned';
}

export interface SessionHistoryResponse {
  sessions: SessionHistoryItem[];
  total_count: number;
  page: number;
  page_size: number;
}

/**
 * Get available topics for practice
 */
export async function getTopics(subject?: string): Promise<TopicsResponse> {
  const params = subject ? { subject } : {};
  const response = await apiClient.get<TopicsResponse>('/practice/topics', { params });
  return response.data;
}

/**
 * Start a new practice session
 */
export async function startSession(request: StartSessionRequest): Promise<StartSessionResponse> {
  const response = await apiClient.post<StartSessionResponse>('/practice/session/start', request);
  return response.data;
}

/**
 * Get the next question in a session
 */
export async function getNextQuestion(sessionId: string): Promise<NextQuestionResponse> {
  const response = await apiClient.get<NextQuestionResponse>(`/practice/session/${sessionId}/next`);
  return response.data;
}

/**
 * Submit an answer for the current question
 */
export async function submitAnswer(
  sessionId: string,
  request: SubmitAnswerRequest
): Promise<SubmitAnswerResponse> {
  const response = await apiClient.post<SubmitAnswerResponse>(
    `/practice/session/${sessionId}/submit`,
    request
  );
  return response.data;
}

/**
 * End a practice session
 */
export async function endSession(sessionId: string, reason?: string): Promise<EndSessionResponse> {
  const response = await apiClient.post<EndSessionResponse>(
    `/practice/session/${sessionId}/end`,
    reason ? { reason } : {}
  );
  return response.data;
}

/**
 * Get session review (for completed sessions)
 */
export async function getSessionReview(sessionId: string): Promise<EndSessionResponse> {
  const response = await apiClient.get<EndSessionResponse>(`/practice/session/${sessionId}/review`);
  return response.data;
}

/**
 * Get session history
 */
export async function getSessionHistory(
  page: number = 1,
  pageSize: number = 10
): Promise<SessionHistoryResponse> {
  const response = await apiClient.get<SessionHistoryResponse>('/practice/history', {
    params: { page, page_size: pageSize },
  });
  return response.data;
}

