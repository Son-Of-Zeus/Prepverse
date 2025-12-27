import { apiClient } from './client';

/**
 * Focus Mode API Service
 * 
 * Handles Pomodoro timer and focus session management
 */

export interface StartFocusSessionRequest {
  focus_duration_minutes?: number; // Default: 25
  break_duration_minutes?: number; // Default: 5
  is_quiz_mode?: boolean; // If true, integrates with practice sessions
}

export interface FocusSession {
  session_id: string;
  focus_duration_minutes: number;
  break_duration_minutes: number;
  is_quiz_mode: boolean;
  started_at: string;
  state: 'focusing' | 'break' | 'completed' | 'paused';
  time_remaining_seconds: number;
}

export interface FocusSessionHistoryItem {
  session_id: string;
  focus_duration_minutes: number;
  break_duration_minutes: number;
  total_focus_time_seconds: number;
  started_at: string;
  ended_at: string;
  is_quiz_mode: boolean;
}

export interface FocusHistoryResponse {
  sessions: FocusSessionHistoryItem[];
  total_count: number;
  total_focus_time_minutes: number;
}

/**
 * Start a new focus session (Pomodoro timer)
 */
export async function startFocusSession(
  request: StartFocusSessionRequest = {}
): Promise<FocusSession> {
  const response = await apiClient.post<FocusSession>('/focus/start', request);
  return response.data;
}

/**
 * End the current focus session
 */
export async function endFocusSession(sessionId: string): Promise<{ success: boolean }> {
  const response = await apiClient.post<{ success: boolean }>(`/focus/end`, {
    session_id: sessionId,
  });
  return response.data;
}

/**
 * Get focus session history
 */
export async function getFocusHistory(): Promise<FocusHistoryResponse> {
  const response = await apiClient.get<FocusHistoryResponse>('/focus/history');
  return response.data;
}

