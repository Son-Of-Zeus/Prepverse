import { apiClient } from './client';

/**
 * Guru Mode API Service
 * 
 * Handles all Guru Mode (Teach AI) related API calls
 * for the Feynman Technique teaching feature.
 */

// =============================================================================
// Types
// =============================================================================

export type GuruPersona = '5-year-old' | 'peer' | 'skeptic' | 'curious_beginner';

export interface GuruSessionCreate {
  topic: string;
  subject: string;
  persona?: GuruPersona;
}

export interface GuruSessionResponse {
  session_id: string;
  topic: string;
  subject: string;
  persona: string;
  initial_message: string;
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface GuruChatRequest {
  session_id: string;
  message: string;
}

export interface GuruChatResponse {
  message: string;
  confusion_level: number; // 0-100
  is_satisfied: boolean;
  hints?: string[] | null;
}

export interface GuruReportCard {
  accuracy_score: number; // 0-10
  simplicity_score: number; // 0-10
  feedback: string;
  xp_earned: number;
  strengths?: string[] | null;
  improvements?: string[] | null;
}

export interface GuruEndSessionResponse {
  session_id: string;
  status: string;
  report_card: GuruReportCard;
  total_messages: number;
  session_duration_seconds: number;
}

export interface GuruSessionSummary {
  session_id: string;
  subject: string;
  topic: string;
  persona: string;
  status: 'active' | 'completed' | 'abandoned';
  accuracy_score?: number | null;
  simplicity_score?: number | null;
  xp_earned: number;
  created_at: string;
  message_count: number;
}

export interface GuruHistoryResponse {
  sessions: GuruSessionSummary[];
  total_sessions: number;
  total_xp_earned: number;
  average_accuracy?: number | null;
  average_simplicity?: number | null;
}

export interface GuruSessionDetailResponse {
  session_id: string;
  subject: string;
  topic: string;
  persona: string;
  status: string;
  messages: ChatMessage[];
  report_card?: GuruReportCard | null;
  xp_earned: number;
  created_at: string;
  updated_at: string;
}

export interface ActiveSessionResponse {
  has_active: boolean;
  session_id?: string;
  topic?: string;
  subject?: string;
  persona?: string;
  created_at?: string;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Start a new Guru Mode teaching session
 */
export async function startGuruSession(request: GuruSessionCreate): Promise<GuruSessionResponse> {
  const response = await apiClient.post<GuruSessionResponse>('/guru/start', request);
  return response.data;
}

/**
 * Send a teaching message in an active session
 */
export async function sendGuruMessage(request: GuruChatRequest): Promise<GuruChatResponse> {
  const response = await apiClient.post<GuruChatResponse>('/guru/chat', request);
  return response.data;
}

/**
 * End a session and get the report card
 */
export async function endGuruSession(sessionId: string): Promise<GuruEndSessionResponse> {
  const response = await apiClient.post<GuruEndSessionResponse>('/guru/end', {
    session_id: sessionId,
  });
  return response.data;
}

/**
 * Abandon a session without grading
 */
export async function abandonGuruSession(sessionId: string): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>('/guru/abandon', {
    session_id: sessionId,
  });
  return response.data;
}

/**
 * Get user's Guru session history
 */
export async function getGuruHistory(
  limit: number = 20,
  offset: number = 0
): Promise<GuruHistoryResponse> {
  const response = await apiClient.get<GuruHistoryResponse>('/guru/history', {
    params: { limit, offset },
  });
  return response.data;
}

/**
 * Get details of a specific session
 */
export async function getGuruSessionDetail(sessionId: string): Promise<GuruSessionDetailResponse> {
  const response = await apiClient.get<GuruSessionDetailResponse>(`/guru/session/${sessionId}`);
  return response.data;
}

/**
 * Check if user has an active session
 */
export async function getActiveGuruSession(): Promise<ActiveSessionResponse> {
  const response = await apiClient.get<ActiveSessionResponse>('/guru/active');
  return response.data;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get display name for persona
 */
export function getPersonaDisplayName(persona: GuruPersona | string): string {
  const names: Record<string, string> = {
    '5-year-old': '5-Year-Old Child',
    'peer': 'Fellow Student',
    'skeptic': 'Skeptical Student',
    'curious_beginner': 'Curious Beginner',
  };
  return names[persona] || persona;
}

/**
 * Get persona description
 */
export function getPersonaDescription(persona: GuruPersona | string): string {
  const descriptions: Record<string, string> = {
    '5-year-old': 'Needs very simple explanations with no big words',
    'peer': 'A classmate who missed the lesson and needs catching up',
    'skeptic': 'Questions everything and asks for proof',
    'curious_beginner': 'Excited to learn and asks thoughtful follow-ups',
  };
  return descriptions[persona] || '';
}

/**
 * Get color based on confusion level
 */
export function getConfusionColor(level: number): string {
  if (level <= 20) return 'text-green-400';
  if (level <= 40) return 'text-emerald-400';
  if (level <= 60) return 'text-yellow-400';
  if (level <= 80) return 'text-orange-400';
  return 'text-red-400';
}

/**
 * Get confusion status text
 */
export function getConfusionStatus(level: number): string {
  if (level <= 20) return 'Understands well!';
  if (level <= 40) return 'Getting there...';
  if (level <= 60) return 'Still confused';
  if (level <= 80) return 'Very confused';
  return 'Totally lost!';
}
