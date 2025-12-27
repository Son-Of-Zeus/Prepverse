import { create } from 'zustand';
import { RealtimeChannel } from '@supabase/supabase-js';
import type {
  PeerSession,
  Participant,
  AvailablePeer,
  WhiteboardOperation,
} from '../api/peer';

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  senderName: string;
  content: string; // Decrypted content
  messageType: 'text' | 'system';
  createdAt: string;
  isFromMe: boolean;
}

interface PeerState {
  // Session state
  sessions: PeerSession[];
  currentSession: PeerSession | null;
  participants: Participant[];
  isInSession: boolean;

  // Chat state
  messages: ChatMessage[];
  lastMessageTimestamp: string | null;

  // Whiteboard state
  whiteboardOperations: WhiteboardOperation[];
  whiteboardVersion: number;

  // Peer discovery state
  availablePeers: AvailablePeer[];
  isAvailable: boolean;
  statusMessage: string;
  strongTopics: string[];
  seekingHelpTopics: string[];

  // Real-time channel
  realtimeChannel: RealtimeChannel | null;

  // Current user info (set when joining session)
  currentUserId: string | null;
  currentUserName: string | null;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  setSessions: (sessions: PeerSession[]) => void;
  setCurrentSession: (session: PeerSession | null) => void;
  setParticipants: (participants: Participant[]) => void;
  setIsInSession: (isInSession: boolean) => void;

  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;
  setLastMessageTimestamp: (timestamp: string | null) => void;

  setWhiteboardOperations: (operations: WhiteboardOperation[]) => void;
  addWhiteboardOperation: (operation: WhiteboardOperation) => void;
  setWhiteboardVersion: (version: number) => void;
  clearWhiteboard: () => void;

  setAvailablePeers: (peers: AvailablePeer[]) => void;
  setIsAvailable: (isAvailable: boolean) => void;
  setStatusMessage: (message: string) => void;
  setStrongTopics: (topics: string[]) => void;
  setSeekingHelpTopics: (topics: string[]) => void;

  setRealtimeChannel: (channel: RealtimeChannel | null) => void;

  setCurrentUser: (userId: string, userName: string) => void;
  clearCurrentUser: () => void;

  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Reset state (when leaving session)
  resetSessionState: () => void;
  resetAll: () => void;
}

export const usePeerStore = create<PeerState>((set) => ({
  // Initial state
  sessions: [],
  currentSession: null,
  participants: [],
  isInSession: false,

  messages: [],
  lastMessageTimestamp: null,

  whiteboardOperations: [],
  whiteboardVersion: 0,

  availablePeers: [],
  isAvailable: false,
  statusMessage: '',
  strongTopics: [],
  seekingHelpTopics: [],

  realtimeChannel: null,

  currentUserId: null,
  currentUserName: null,

  isLoading: false,
  error: null,

  // Session actions
  setSessions: (sessions) => set({ sessions }),
  setCurrentSession: (session) => set({ currentSession: session }),
  setParticipants: (participants) => set({ participants }),
  setIsInSession: (isInSession) => set({ isInSession }),

  // Message actions
  addMessage: (message) =>
    set((state) => {
      // Check for duplicate by ID to prevent double-adding
      if (state.messages.some((m) => m.id === message.id)) {
        return state; // Skip duplicate
      }
      return {
        messages: [...state.messages, message],
        lastMessageTimestamp: message.createdAt,
      };
    }),
  setMessages: (messages) =>
    set({
      messages,
      lastMessageTimestamp: messages.length > 0 ? messages[messages.length - 1]?.createdAt ?? null : null,
    }),
  clearMessages: () => set({ messages: [], lastMessageTimestamp: null }),
  setLastMessageTimestamp: (timestamp) => set({ lastMessageTimestamp: timestamp }),

  // Whiteboard actions
  setWhiteboardOperations: (operations) => set({ whiteboardOperations: operations }),
  addWhiteboardOperation: (operation) =>
    set((state) => ({
      whiteboardOperations: [...state.whiteboardOperations, operation],
    })),
  setWhiteboardVersion: (version) => set({ whiteboardVersion: version }),
  clearWhiteboard: () => set({ whiteboardOperations: [], whiteboardVersion: 0 }),

  // Peer discovery actions
  setAvailablePeers: (peers) => set({ availablePeers: peers }),
  setIsAvailable: (isAvailable) => set({ isAvailable }),
  setStatusMessage: (message) => set({ statusMessage: message }),
  setStrongTopics: (topics) => set({ strongTopics: topics }),
  setSeekingHelpTopics: (topics) => set({ seekingHelpTopics: topics }),

  // Real-time channel
  setRealtimeChannel: (channel) => set({ realtimeChannel: channel }),

  // Current user
  setCurrentUser: (userId, userName) =>
    set({ currentUserId: userId, currentUserName: userName }),
  clearCurrentUser: () => set({ currentUserId: null, currentUserName: null }),

  // Loading/error
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Reset session state (when leaving)
  resetSessionState: () =>
    set({
      currentSession: null,
      participants: [],
      isInSession: false,
      messages: [],
      lastMessageTimestamp: null,
      whiteboardOperations: [],
      whiteboardVersion: 0,
      realtimeChannel: null,
    }),

  // Reset all state (on logout)
  resetAll: () =>
    set({
      sessions: [],
      currentSession: null,
      participants: [],
      isInSession: false,
      messages: [],
      lastMessageTimestamp: null,
      whiteboardOperations: [],
      whiteboardVersion: 0,
      availablePeers: [],
      isAvailable: false,
      statusMessage: '',
      strongTopics: [],
      seekingHelpTopics: [],
      realtimeChannel: null,
      currentUserId: null,
      currentUserName: null,
      isLoading: false,
      error: null,
    }),
}));
