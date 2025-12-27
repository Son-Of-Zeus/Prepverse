import { useCallback, useEffect, useRef } from 'react';
import { usePeerStore, type ChatMessage } from '../store/peerStore';
import * as peerApi from '../api/peer';
import { broadcastMessage } from '../lib/supabase';

/**
 * Hook for managing chat in a peer session.
 * Messages are sent as plain text (no E2E encryption for simplicity).
 */
export function usePeerChat() {
  const store = usePeerStore();
  const pollingIntervalRef = useRef<number | null>(null);
  const hasFetchedInitialMessages = useRef(false);

  const {
    messages,
    currentSession,
    realtimeChannel,
    currentUserId,
    currentUserName,
  } = store;

  // Send a message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!currentSession || !currentUserId || !currentUserName) {
        console.error('Cannot send message: not in session or user not set');
        return;
      }

      try {
        // Create message ID
        const messageId = crypto.randomUUID();
        const timestamp = new Date().toISOString();

        // Base64 encode content for cross-platform compatibility (Android uses Base64)
        const encodedContent = btoa(unescape(encodeURIComponent(content)));

        // Add to local state immediately (optimistic update)
        const localMessage: ChatMessage = {
          id: messageId,
          sessionId: currentSession.id,
          senderId: currentUserId,
          senderName: currentUserName,
          content, // Store original content locally
          messageType: 'text',
          createdAt: timestamp,
          isFromMe: true,
        };
        store.addMessage(localMessage);

        // Broadcast via Supabase Realtime for instant delivery
        if (realtimeChannel) {
          broadcastMessage(realtimeChannel, {
            id: messageId,
            sessionId: currentSession.id, // Required for Android to filter messages
            senderId: currentUserId,
            senderName: currentUserName,
            encryptedContent: encodedContent, // Base64 encoded for Android compatibility
            messageType: 'text',
            timestamp,
          });
        }

        // Also persist to backend (for message history)
        await peerApi.sendMessage({
          session_id: currentSession.id,
          encrypted_content: { all: encodedContent }, // Base64 encoded
          message_type: 'text',
        });
      } catch (error) {
        console.error('Failed to send message:', error);
        throw error;
      }
    },
    [currentSession, currentUserId, currentUserName, realtimeChannel]
  );

  // Fetch message history (only for initial load, not real-time updates)
  const fetchMessages = useCallback(async () => {
    const { currentSession, currentUserId } = usePeerStore.getState();
    if (!currentSession) return;

    try {
      const apiMessages = await peerApi.getMessages(currentSession.id);

      // Parse messages and decode Base64 content
      const parsedMessages: ChatMessage[] = [];
      for (const msg of apiMessages) {
        // Get the content from 'all' field or first available field
        const encodedContent =
          msg.encrypted_content.all ||
          Object.values(msg.encrypted_content)[0] ||
          '';

        if (!encodedContent) continue;

        // Decode Base64 content (cross-platform compatibility)
        let decodedContent: string;
        try {
          decodedContent = decodeURIComponent(escape(atob(encodedContent as string)));
        } catch {
          // Fallback for plain text (backwards compatibility)
          decodedContent = encodedContent as string;
        }

        parsedMessages.push({
          id: msg.id,
          sessionId: msg.session_id,
          senderId: msg.sender_id,
          senderName: msg.sender_name,
          content: decodedContent,
          messageType: msg.message_type as 'text' | 'system',
          createdAt: msg.created_at,
          isFromMe: msg.sender_id === currentUserId,
        });
      }

      // Replace messages entirely (this is initial load)
      store.setMessages(parsedMessages);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }, []); // No dependencies - uses getState() for fresh values

  // Start polling for new messages (fallback if realtime fails)
  const startPolling = useCallback((intervalMs = 5000) => {
    if (pollingIntervalRef.current) {
      window.clearInterval(pollingIntervalRef.current);
    }
    pollingIntervalRef.current = window.setInterval(fetchMessages, intervalMs);
  }, [fetchMessages]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      window.clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // Fetch initial messages ONCE when session changes
  useEffect(() => {
    if (currentSession && !hasFetchedInitialMessages.current) {
      hasFetchedInitialMessages.current = true;
      fetchMessages();
    }

    // Reset the flag when session changes
    return () => {
      hasFetchedInitialMessages.current = false;
    };
  }, [currentSession?.id, fetchMessages]);

  return {
    messages,
    sendMessage,
    fetchMessages,
    startPolling,
    stopPolling,
    clearMessages: store.clearMessages,
  };
}
