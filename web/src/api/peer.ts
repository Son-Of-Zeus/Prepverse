import { apiClient } from './client';

/**
 * Peer Mentoring API Service
 *
 * Handles study sessions, chat, whiteboard, peer discovery, and safety features.
 */

// ============================================
// Types
// ============================================

export interface PeerSession {
  id: string;
  name: string | null;
  topic: string;
  subject: string;
  school_id: string;
  class_level: number;
  max_participants: number;
  is_voice_enabled: boolean;
  is_whiteboard_enabled: boolean;
  status: 'waiting' | 'active' | 'closed';
  created_by: string;
  created_at: string;
  participant_count: number;
}

export interface CreateSessionRequest {
  name?: string | null;
  topic: string;
  subject: string;
  max_participants?: number;
  is_voice_enabled?: boolean;
  is_whiteboard_enabled?: boolean;
}

export interface Participant {
  user_id: string;
  user_name: string;
  role: 'host' | 'participant';
  is_muted: boolean;
  is_voice_active: boolean;
  joined_at: string;
}

export interface PeerMessage {
  id: string;
  session_id: string;
  sender_id: string;
  sender_name: string;
  encrypted_content: Record<string, string>;
  message_type: 'text' | 'system' | 'whiteboard_sync';
  created_at: string;
}

export interface SendMessageRequest {
  session_id: string;
  encrypted_content: Record<string, string>;
  message_type?: 'text' | 'system';
}

export interface AvailablePeer {
  user_id: string;
  user_name: string;
  strong_topics: string[];
  seeking_help_topics: string[];
  status_message: string | null;
  last_seen_at: string | null;
}

export interface SetAvailabilityRequest {
  is_available: boolean;
  status_message?: string | null;
  strong_topics?: string[];
  seeking_help_topics?: string[];
}

export interface WhiteboardOperation {
  type: 'draw' | 'text' | 'erase' | 'clear';
  data: Record<string, unknown>;
  timestamp: number;
  user_id: string;
}

export interface WhiteboardState {
  session_id: string;
  operations: WhiteboardOperation[];
  version: number;
}

export interface WhiteboardSyncRequest {
  session_id: string;
  operations: WhiteboardOperation[];
  version: number;
}

export interface BlockUserRequest {
  user_id: string;
  reason?: string | null;
}

export interface ReportUserRequest {
  user_id: string;
  session_id?: string | null;
  reason: 'inappropriate_content' | 'harassment' | 'spam' | 'impersonation' | 'other';
  description?: string | null;
}

// ============================================
// Session Management
// ============================================

/**
 * Create a new study room.
 */
export async function createSession(request: CreateSessionRequest): Promise<PeerSession> {
  const response = await apiClient.post<PeerSession>('/peer/sessions', request);
  return response.data;
}

/**
 * List available study rooms from same school and class.
 */
export async function listSessions(
  topic?: string,
  subject?: string
): Promise<PeerSession[]> {
  const params: Record<string, string> = {};
  if (topic) params.topic = topic;
  if (subject) params.subject = subject;

  const response = await apiClient.get<PeerSession[]>('/peer/sessions', { params });
  return response.data;
}

/**
 * Get a specific session.
 */
export async function getSession(sessionId: string): Promise<PeerSession> {
  const response = await apiClient.get<PeerSession>(`/peer/sessions/${sessionId}`);
  return response.data;
}

/**
 * Join a study room.
 */
export async function joinSession(sessionId: string): Promise<{ status: string; session_id: string }> {
  const response = await apiClient.post<{ status: string; session_id: string }>(
    `/peer/sessions/${sessionId}/join`
  );
  return response.data;
}

/**
 * Leave a study room.
 */
export async function leaveSession(sessionId: string): Promise<{ status: string; session_id: string }> {
  const response = await apiClient.post<{ status: string; session_id: string }>(
    `/peer/sessions/${sessionId}/leave`
  );
  return response.data;
}

/**
 * Get list of participants in a session.
 */
export async function getParticipants(sessionId: string): Promise<Participant[]> {
  const response = await apiClient.get<Participant[]>(
    `/peer/sessions/${sessionId}/participants`
  );
  return response.data;
}

// ============================================
// Messaging
// ============================================

/**
 * Send an encrypted message to a session.
 */
export async function sendMessage(
  request: SendMessageRequest
): Promise<{ status: string; message_id: string }> {
  const response = await apiClient.post<{ status: string; message_id: string }>(
    '/peer/messages',
    request
  );
  return response.data;
}

/**
 * Get messages from a session.
 */
export async function getMessages(
  sessionId: string,
  since?: string
): Promise<PeerMessage[]> {
  const params: Record<string, string> = {};
  if (since) params.since = since;

  const response = await apiClient.get<PeerMessage[]>(
    `/peer/messages/${sessionId}`,
    { params }
  );
  return response.data;
}

// ============================================
// Whiteboard
// ============================================

/**
 * Sync whiteboard operations.
 */
export async function syncWhiteboard(
  request: WhiteboardSyncRequest
): Promise<{ status: string; version: number }> {
  const response = await apiClient.post<{ status: string; version: number }>(
    '/peer/whiteboard/sync',
    request
  );
  return response.data;
}

/**
 * Get current whiteboard state.
 */
export async function getWhiteboardState(sessionId: string): Promise<WhiteboardState> {
  const response = await apiClient.get<WhiteboardState>(
    `/peer/whiteboard/${sessionId}`
  );
  return response.data;
}

// ============================================
// Peer Discovery
// ============================================

/**
 * Set user's availability for peer sessions.
 */
export async function setAvailability(
  request: SetAvailabilityRequest
): Promise<{ status: string }> {
  const response = await apiClient.post<{ status: string }>(
    '/peer/availability',
    request
  );
  return response.data;
}

/**
 * Get list of available peers from same school and class.
 */
export async function getAvailablePeers(): Promise<AvailablePeer[]> {
  const response = await apiClient.get<AvailablePeer[]>('/peer/available');
  return response.data;
}

/**
 * Find peers who are strong in a specific topic.
 */
export async function findPeersByTopic(topic: string): Promise<AvailablePeer[]> {
  const response = await apiClient.post<AvailablePeer[]>('/peer/find-by-topic', {
    topic,
  });
  return response.data;
}

// ============================================
// Safety: Block & Report
// ============================================

/**
 * Block a user.
 */
export async function blockUser(request: BlockUserRequest): Promise<{ status: string }> {
  const response = await apiClient.post<{ status: string }>('/peer/block', request);
  return response.data;
}

/**
 * Unblock a user.
 */
export async function unblockUser(userId: string): Promise<{ status: string }> {
  const response = await apiClient.delete<{ status: string }>(`/peer/block/${userId}`);
  return response.data;
}

/**
 * Get list of blocked users.
 */
export async function getBlockedUsers(): Promise<string[]> {
  const response = await apiClient.get<string[]>('/peer/blocked');
  return response.data;
}

/**
 * Report a user for inappropriate behavior.
 */
export async function reportUser(request: ReportUserRequest): Promise<{ status: string }> {
  const response = await apiClient.post<{ status: string }>('/peer/report', request);
  return response.data;
}
