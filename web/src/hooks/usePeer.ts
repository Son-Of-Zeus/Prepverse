import { useCallback, useEffect, useState } from 'react';
import { usePeerStore } from '../store/peerStore';
import * as peerApi from '../api/peer';
import {
  subscribeToSession,
  unsubscribeFromSession,
  trackPresence,
  untrackPresence,
  type MessagePayload,
  type PresenceState,
} from '../lib/supabase';
import type { WhiteboardOperation } from '../api/peer';

/**
 * Hook for managing peer study sessions.
 * Handles session CRUD, real-time subscriptions, and participant tracking.
 */
export function usePeer() {
  const store = usePeerStore();

  // Fetch available sessions
  const fetchSessions = useCallback(async (topic?: string, subject?: string) => {
    store.setLoading(true);
    store.setError(null);
    try {
      const sessions = await peerApi.listSessions(topic, subject);
      store.setSessions(sessions);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      store.setError('Failed to load study rooms');
    } finally {
      store.setLoading(false);
    }
  }, []);

  // Create a new session
  const createSession = useCallback(
    async (request: peerApi.CreateSessionRequest) => {
      store.setLoading(true);
      store.setError(null);
      try {
        const session = await peerApi.createSession(request);

        store.setCurrentSession(session);
        store.setIsInSession(true);

        // Fetch participants (includes the creator)
        const participants = await peerApi.getParticipants(session.id);
        store.setParticipants(participants);

        // Subscribe to real-time updates
        await subscribeToSessionUpdates(session.id);

        return session;
      } catch (error) {
        console.error('Failed to create session:', error);
        store.setError('Failed to create study room');
        throw error;
      } finally {
        store.setLoading(false);
      }
    },
    []
  );

  // Join an existing session
  const joinSession = useCallback(
    async (sessionId: string) => {
      store.setLoading(true);
      store.setError(null);
      try {
        await peerApi.joinSession(sessionId);

        // Get session details directly (not from list which may filter)
        const session = await peerApi.getSession(sessionId);
        store.setCurrentSession(session);

        store.setIsInSession(true);

        // Fetch participants
        const participants = await peerApi.getParticipants(sessionId);
        store.setParticipants(participants);

        // Subscribe to real-time updates
        await subscribeToSessionUpdates(sessionId);

        // Fetch whiteboard state if enabled
        if (session?.is_whiteboard_enabled) {
          try {
            const whiteboardState = await peerApi.getWhiteboardState(sessionId);
            store.setWhiteboardOperations(whiteboardState.operations);
            store.setWhiteboardVersion(whiteboardState.version);
          } catch {
            // Whiteboard might not exist yet
          }
        }

        return session;
      } catch (error) {
        console.error('Failed to join session:', error);
        store.setError('Failed to join study room');
        throw error;
      } finally {
        store.setLoading(false);
      }
    },
    []
  );

  // Leave the current session
  const leaveSession = useCallback(async () => {
    const { currentSession, realtimeChannel } = usePeerStore.getState();
    if (!currentSession) return;

    const sessionId = currentSession.id;

    try {
      // Untrack presence and unsubscribe from channel
      if (realtimeChannel) {
        try {
          await untrackPresence(realtimeChannel);
        } catch (e) {
          console.warn('Failed to untrack presence:', e);
        }
        unsubscribeFromSession(realtimeChannel);
        store.setRealtimeChannel(null);
      }

      // Call API to leave - await to ensure it completes before navigation
      try {
        await peerApi.leaveSession(sessionId);
      } catch (e) {
        console.warn('Failed to notify server of leave:', e);
      }
    } catch (error) {
      console.error('Error during leave session cleanup:', error);
    } finally {
      // Always reset session state, even if cleanup fails
      store.resetSessionState();
    }
  }, []);

  // Fetch participants for current session
  const fetchParticipants = useCallback(async () => {
    const { currentSession } = usePeerStore.getState();
    if (!currentSession) return;

    try {
      const participants = await peerApi.getParticipants(currentSession.id);
      store.setParticipants(participants);
    } catch (error) {
      console.error('Failed to fetch participants:', error);
    }
  }, []);

  // Subscribe to real-time session updates
  const subscribeToSessionUpdates = useCallback(async (sessionId: string) => {
    const channel = subscribeToSession(sessionId, {
      onMessage: (payload: MessagePayload) => {
        // Get current user ID dynamically (might not be set at subscription time)
        const { currentUserId } = usePeerStore.getState();

        // Skip messages from self - we already added them optimistically
        if (payload.senderId === currentUserId) {
          return;
        }

        // Decode Base64 content (cross-platform compatibility)
        let decodedContent: string;
        try {
          decodedContent = decodeURIComponent(escape(atob(payload.encryptedContent)));
        } catch {
          // Fallback for plain text (backwards compatibility)
          decodedContent = payload.encryptedContent;
        }

        const message = {
          id: payload.id,
          sessionId,
          senderId: payload.senderId,
          senderName: payload.senderName,
          content: decodedContent,
          messageType: payload.messageType,
          createdAt: payload.timestamp,
          isFromMe: false, // We already filtered out own messages above
        };
        usePeerStore.getState().addMessage(message);
      },
      onWhiteboardUpdate: (payload) => {
        // Get current user to filter out own operations
        const { currentUserId } = usePeerStore.getState();

        // Skip operations from self (we already added them locally)
        if (payload.userId === currentUserId) {
          return;
        }

        // Store operation with data as-is (Whiteboard component handles parsing)
        // Android sends stringified data, web sends structured data
        const operation: WhiteboardOperation = {
          type: payload.type,
          data: payload.data as Record<string, unknown>,
          timestamp: payload.timestamp,
          user_id: payload.userId,
        };
        usePeerStore.getState().addWhiteboardOperation(operation);
      },
      onPresenceSync: (state: PresenceState) => {
        // Update participants from presence state
        const presenceUsers = Object.values(state).flat();
        console.log('Presence sync:', presenceUsers);
      },
      onPresenceJoin: ({ newPresences }) => {
        console.log('User joined:', newPresences);
        // Refresh participants list
        fetchParticipants();
      },
      onPresenceLeave: ({ leftPresences }) => {
        console.log('User left:', leftPresences);
        // Refresh participants list
        fetchParticipants();
      },
    });

    store.setRealtimeChannel(channel);

    // Track our presence
    const { currentUserId, currentUserName } = usePeerStore.getState();
    if (currentUserId && currentUserName) {
      await trackPresence(channel, {
        id: currentUserId,
        name: currentUserName,
        joinedAt: new Date().toISOString(),
      });
    }
  }, [fetchParticipants]);

  // Set current user info (should be called after auth)
  const setCurrentUser = useCallback((userId: string, userName: string) => {
    store.setCurrentUser(userId, userName);
  }, []);

  return {
    // State
    sessions: store.sessions,
    currentSession: store.currentSession,
    participants: store.participants,
    isInSession: store.isInSession,
    isLoading: store.isLoading,
    error: store.error,

    // Actions
    fetchSessions,
    createSession,
    joinSession,
    leaveSession,
    fetchParticipants,
    setCurrentUser,
  };
}

/**
 * Hook for peer availability and discovery.
 */
export function usePeerDiscovery() {
  const store = usePeerStore();

  // Fetch available peers
  const fetchAvailablePeers = useCallback(async () => {
    store.setLoading(true);
    try {
      const peers = await peerApi.getAvailablePeers();
      store.setAvailablePeers(peers);
    } catch (error) {
      console.error('Failed to fetch available peers:', error);
      store.setError('Failed to load available peers');
    } finally {
      store.setLoading(false);
    }
  }, []);

  // Find peers by topic
  const findPeersByTopic = useCallback(async (topic: string) => {
    store.setLoading(true);
    try {
      const peers = await peerApi.findPeersByTopic(topic);
      store.setAvailablePeers(peers);
    } catch (error) {
      console.error('Failed to find peers:', error);
      store.setError('Failed to find peers');
    } finally {
      store.setLoading(false);
    }
  }, []);

  // Set availability
  const setAvailability = useCallback(
    async (
      isAvailable: boolean,
      options?: {
        statusMessage?: string;
        strongTopics?: string[];
        seekingHelpTopics?: string[];
      }
    ) => {
      try {
        await peerApi.setAvailability({
          is_available: isAvailable,
          status_message: options?.statusMessage,
          strong_topics: options?.strongTopics,
          seeking_help_topics: options?.seekingHelpTopics,
        });
        store.setIsAvailable(isAvailable);
        if (options?.statusMessage !== undefined) {
          store.setStatusMessage(options.statusMessage);
        }
        if (options?.strongTopics) {
          store.setStrongTopics(options.strongTopics);
        }
        if (options?.seekingHelpTopics) {
          store.setSeekingHelpTopics(options.seekingHelpTopics);
        }
      } catch (error) {
        console.error('Failed to set availability:', error);
        store.setError('Failed to update availability');
      }
    },
    []
  );

  return {
    // State
    availablePeers: store.availablePeers,
    isAvailable: store.isAvailable,
    statusMessage: store.statusMessage,
    strongTopics: store.strongTopics,
    seekingHelpTopics: store.seekingHelpTopics,
    isLoading: store.isLoading,
    error: store.error,

    // Actions
    fetchAvailablePeers,
    findPeersByTopic,
    setAvailability,
  };
}

/**
 * Hook for blocking and reporting users.
 */
export function usePeerSafety() {
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);

  const fetchBlockedUsers = useCallback(async () => {
    try {
      const blocked = await peerApi.getBlockedUsers();
      setBlockedUsers(blocked);
    } catch (error) {
      console.error('Failed to fetch blocked users:', error);
    }
  }, []);

  const blockUser = useCallback(async (userId: string, reason?: string) => {
    try {
      await peerApi.blockUser({ user_id: userId, reason });
      setBlockedUsers((prev) => [...prev, userId]);
    } catch (error) {
      console.error('Failed to block user:', error);
      throw error;
    }
  }, []);

  const unblockUser = useCallback(async (userId: string) => {
    try {
      await peerApi.unblockUser(userId);
      setBlockedUsers((prev) => prev.filter((id) => id !== userId));
    } catch (error) {
      console.error('Failed to unblock user:', error);
      throw error;
    }
  }, []);

  const reportUser = useCallback(
    async (
      userId: string,
      reason: peerApi.ReportUserRequest['reason'],
      description?: string,
      sessionId?: string
    ) => {
      try {
        await peerApi.reportUser({
          user_id: userId,
          reason,
          description,
          session_id: sessionId,
        });
      } catch (error) {
        console.error('Failed to report user:', error);
        throw error;
      }
    },
    []
  );

  useEffect(() => {
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  return {
    blockedUsers,
    blockUser,
    unblockUser,
    reportUser,
    fetchBlockedUsers,
  };
}

