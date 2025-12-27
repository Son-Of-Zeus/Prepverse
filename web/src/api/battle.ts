import { apiClient } from './client';

/**
 * Battle/Peer API Service
 * 
 * Handles battle mode and study room features
 */

export interface Battle {
  battle_id: string;
  subject: string;
  topic: string | null;
  difficulty: string;
  question_count: number;
  max_participants: number;
  current_participants: number;
  status: 'waiting' | 'in_progress' | 'completed';
  created_by: string;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

export interface CreateBattleRequest {
  subject: string;
  topic?: string | null;
  difficulty?: 'easy' | 'medium' | 'hard';
  question_count?: number;
  max_participants?: number;
}

export interface BattleParticipant {
  user_id: string;
  full_name: string;
  score: number;
  accuracy: number;
  questions_answered: number;
  rank: number;
}

export interface BattleDetails extends Battle {
  participants: BattleParticipant[];
  questions: Array<{
    question_id: string;
    question_order: number;
    question: string;
    options: string[];
  }>;
}

export interface StudyRoom {
  room_id: string;
  name: string;
  subject: string;
  topic: string | null;
  created_by: string;
  current_participants: number;
  max_participants: number;
  created_at: string;
}

/**
 * List available battles
 */
export async function listBattles(subject?: string): Promise<Battle[]> {
  const params = subject ? { subject } : {};
  const response = await apiClient.get<{ battles: Battle[] }>('/peer/battles', { params });
  return response.data.battles || [];
}

/**
 * Create a new battle
 */
export async function createBattle(request: CreateBattleRequest): Promise<Battle> {
  const response = await apiClient.post<Battle>('/peer/battles', request);
  return response.data;
}

/**
 * Join a battle
 */
export async function joinBattle(battleId: string): Promise<BattleDetails> {
  const response = await apiClient.post<BattleDetails>(`/peer/battles/${battleId}/join`);
  return response.data;
}

/**
 * Get battle details
 */
export async function getBattleDetails(battleId: string): Promise<BattleDetails> {
  const response = await apiClient.get<BattleDetails>(`/peer/battles/${battleId}`);
  return response.data;
}

/**
 * List available study rooms
 */
export async function listStudyRooms(subject?: string): Promise<StudyRoom[]> {
  const params = subject ? { subject } : {};
  const response = await apiClient.get<{ rooms: StudyRoom[] }>('/peer/rooms', { params });
  return response.data.rooms || [];
}

/**
 * Create a study room
 */
export async function createStudyRoom(
  name: string,
  subject: string,
  topic?: string | null
): Promise<StudyRoom> {
  const response = await apiClient.post<StudyRoom>('/peer/rooms', {
    name,
    subject,
    topic,
  });
  return response.data;
}

/**
 * Join a study room
 */
export async function joinStudyRoom(roomId: string): Promise<StudyRoom> {
  const response = await apiClient.post<StudyRoom>(`/peer/rooms/${roomId}/join`);
  return response.data;
}

