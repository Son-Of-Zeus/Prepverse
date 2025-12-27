import { createClient, RealtimeChannel } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Real-time features will be disabled.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

/**
 * Subscribe to a peer session channel for real-time updates.
 * Used for chat messages, whiteboard sync, and presence.
 *
 * Channel name format: "session:{sessionId}" - matches Android implementation
 */
export function subscribeToSession(
  sessionId: string,
  callbacks: {
    onMessage?: (payload: MessagePayload) => void;
    onWhiteboardUpdate?: (payload: WhiteboardPayload) => void;
    onPresenceSync?: (state: PresenceState) => void;
    onPresenceJoin?: (payload: PresenceJoinPayload) => void;
    onPresenceLeave?: (payload: PresenceLeavePayload) => void;
  }
): RealtimeChannel {
  const channel = supabase.channel(`session:${sessionId}`, {
    config: {
      presence: { key: sessionId },
    },
  });

  // Handle broadcast messages (chat)
  // Android format: { sessionId, messageId, senderId, senderName, encryptedContent, timestamp }
  if (callbacks.onMessage) {
    channel.on('broadcast', { event: 'message' }, (payload) => {
      const data = payload.payload as Record<string, unknown>;
      callbacks.onMessage?.({
        id: (data.messageId as string) || (data.id as string) || crypto.randomUUID(),
        sessionId: data.sessionId as string,
        senderId: data.senderId as string,
        senderName: data.senderName as string,
        encryptedContent: data.encryptedContent as string,
        messageType: (data.messageType as 'text' | 'system') || 'text',
        timestamp: (data.timestamp as string) || new Date().toISOString(),
      });
    });
  }

  // Handle whiteboard updates
  // Android format: { sessionId, type, data: Map<String, String>, timestamp }
  if (callbacks.onWhiteboardUpdate) {
    channel.on('broadcast', { event: 'whiteboard' }, (payload) => {
      const data = payload.payload as Record<string, unknown>;
      callbacks.onWhiteboardUpdate?.({
        sessionId: data.sessionId as string,
        type: data.type as 'draw' | 'text' | 'erase' | 'clear',
        data: data.data as Record<string, string>,
        timestamp: data.timestamp as number,
        userId: data.userId as string,
      });
    });
  }

  // Handle presence for participant list
  if (callbacks.onPresenceSync || callbacks.onPresenceJoin || callbacks.onPresenceLeave) {
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const typedState: PresenceState = {};
        for (const [key, presences] of Object.entries(state)) {
          typedState[key] = presences.map((p) => ({
            // Android uses userId/userName, web uses id/name
            id: (p as Record<string, unknown>).userId as string || (p as Record<string, unknown>).id as string,
            name: (p as Record<string, unknown>).userName as string || (p as Record<string, unknown>).name as string,
            joinedAt: (p as Record<string, unknown>).onlineAt as string || (p as Record<string, unknown>).joinedAt as string,
          }));
        }
        callbacks.onPresenceSync?.(typedState);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        const typed = newPresences.map((p) => ({
          id: (p as Record<string, unknown>).userId as string || (p as Record<string, unknown>).id as string,
          name: (p as Record<string, unknown>).userName as string || (p as Record<string, unknown>).name as string,
          joinedAt: (p as Record<string, unknown>).onlineAt as string || (p as Record<string, unknown>).joinedAt as string,
        }));
        callbacks.onPresenceJoin?.({ key, newPresences: typed });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        const typed = leftPresences.map((p) => ({
          id: (p as Record<string, unknown>).userId as string || (p as Record<string, unknown>).id as string,
          name: (p as Record<string, unknown>).userName as string || (p as Record<string, unknown>).name as string,
          joinedAt: (p as Record<string, unknown>).onlineAt as string || (p as Record<string, unknown>).joinedAt as string,
        }));
        callbacks.onPresenceLeave?.({ key, leftPresences: typed });
      });
  }

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('Successfully subscribed to session channel:', sessionId);
    } else if (status === 'CHANNEL_ERROR') {
      console.error('Failed to subscribe to session channel:', sessionId);
    }
  });

  return channel;
}

/**
 * Broadcast a message to a session channel.
 * Uses Android-compatible format.
 */
export function broadcastMessage(
  channel: RealtimeChannel,
  message: MessagePayload
): void {
  // Send in Android-compatible format
  channel.send({
    type: 'broadcast',
    event: 'message',
    payload: {
      sessionId: message.sessionId, // Required for Android to filter messages
      messageId: message.id,
      senderId: message.senderId,
      senderName: message.senderName,
      encryptedContent: message.encryptedContent,
      timestamp: typeof message.timestamp === 'string'
        ? new Date(message.timestamp).getTime()
        : Date.now(),
    },
  });
}

/**
 * Broadcast a whiteboard operation to a session channel.
 * Uses Android-compatible format with stringified data.
 */
export function broadcastWhiteboardOp(
  channel: RealtimeChannel,
  operation: WhiteboardBroadcastPayload
): void {
  // Send in exact Android format
  channel.send({
    type: 'broadcast',
    event: 'whiteboard',
    payload: {
      sessionId: operation.sessionId,
      type: operation.type,
      data: operation.data, // Already stringified by caller
      timestamp: operation.timestamp,
      userId: operation.userId,
    },
  });
}

/**
 * Track user presence in a session.
 */
export async function trackPresence(
  channel: RealtimeChannel,
  user: PresenceUser
): Promise<void> {
  // Use both web and Android field names for compatibility
  await channel.track({
    id: user.id,
    name: user.name,
    joinedAt: user.joinedAt,
    // Android-compatible fields
    userId: user.id,
    userName: user.name,
    onlineAt: new Date(user.joinedAt).getTime(),
  });
}

/**
 * Untrack user presence (when leaving).
 */
export async function untrackPresence(channel: RealtimeChannel): Promise<void> {
  await channel.untrack();
}

/**
 * Unsubscribe from a channel.
 */
export function unsubscribeFromSession(channel: RealtimeChannel): void {
  supabase.removeChannel(channel);
}

// Types for real-time payloads

export interface MessagePayload {
  id: string;
  sessionId: string; // Required for Android to filter messages by session
  senderId: string;
  senderName: string;
  encryptedContent: string; // Base64 encoded for Android compatibility
  messageType: 'text' | 'system';
  timestamp: string;
}

/**
 * Whiteboard payload for receiving updates.
 * Data may be in string format (from Android) or structured (from web).
 */
export interface WhiteboardPayload {
  sessionId: string;
  type: 'draw' | 'text' | 'erase' | 'clear';
  data: Record<string, string>; // Android sends stringified data
  timestamp: number;
  userId: string;
}

/**
 * Whiteboard payload for broadcasting (always stringified for Android compatibility).
 */
export interface WhiteboardBroadcastPayload {
  sessionId: string;
  type: 'draw' | 'text' | 'erase' | 'clear';
  data: Record<string, string>;
  timestamp: number;
  userId: string;
}

export interface PresenceUser {
  id: string;
  name: string;
  joinedAt: string;
}

export type PresenceState = Record<string, PresenceUser[]>;

export interface PresenceJoinPayload {
  key: string;
  newPresences: PresenceUser[];
}

export interface PresenceLeavePayload {
  key: string;
  leftPresences: PresenceUser[];
}
