import { useCallback, useRef, useEffect } from 'react';
import { usePeerStore } from '../store/peerStore';
import * as peerApi from '../api/peer';
import { broadcastWhiteboardOp } from '../lib/supabase';
import type { WhiteboardOperation } from '../api/peer';

/**
 * Hook for managing the collaborative whiteboard.
 * Handles drawing operations, CRDT sync, and real-time updates.
 *
 * Compatible with Android app - uses same data format:
 * - points: "x1,y1;x2,y2;x3,y3" (semicolon-separated coordinate pairs)
 * - color: stringified int (ARGB format from Android)
 * - strokeWidth: stringified float
 * - targetIds: comma-separated string
 */
export function usePeerWhiteboard() {
  const store = usePeerStore();
  const syncTimeoutRef = useRef<number | null>(null);
  const pendingOpsRef = useRef<WhiteboardOperation[]>([]);

  const {
    whiteboardOperations,
    whiteboardVersion,
    currentSession,
    realtimeChannel,
    currentUserId,
  } = store;

  /**
   * Convert hex color to ARGB int (for Android compatibility)
   */
  const hexToArgbInt = (hex: string): number => {
    // Remove # if present
    const cleanHex = hex.replace('#', '');
    // Parse as RGB and add full alpha
    const rgb = parseInt(cleanHex, 16);
    // Add alpha channel (0xFF for full opacity)
    return (0xFF << 24) | rgb;
  };

  /**
   * Convert ARGB int to hex color
   */
  const argbIntToHex = (argb: number): string => {
    // Extract RGB (ignore alpha)
    const rgb = argb & 0xFFFFFF;
    return '#' + rgb.toString(16).padStart(6, '0');
  };

  // Add a local operation and broadcast it
  const addOperation = useCallback(
    (operation: Omit<WhiteboardOperation, 'timestamp' | 'user_id'>) => {
      if (!currentSession || !currentUserId) {
        console.error('Cannot add operation: not in session');
        return;
      }

      const fullOperation: WhiteboardOperation = {
        ...operation,
        timestamp: Date.now(),
        user_id: currentUserId,
      };

      // Add to local state immediately
      store.addWhiteboardOperation(fullOperation);

      // Add to pending operations for batch sync
      pendingOpsRef.current.push(fullOperation);

      // Broadcast via Supabase Realtime for instant sync
      // Use Android-compatible format (stringified data)
      if (realtimeChannel) {
        const broadcastData = convertToAndroidFormat(fullOperation);
        broadcastWhiteboardOp(realtimeChannel, {
          sessionId: currentSession.id,
          type: fullOperation.type,
          data: broadcastData,
          timestamp: fullOperation.timestamp,
          userId: fullOperation.user_id,
        });
      }

      // Debounce sync to backend
      debouncedSync();
    },
    [currentSession, currentUserId, realtimeChannel]
  );

  /**
   * Convert operation data to Android-compatible string format
   */
  const convertToAndroidFormat = (operation: WhiteboardOperation): Record<string, string> => {
    const data = operation.data as Record<string, unknown>;

    switch (operation.type) {
      case 'draw': {
        const points = data.points as { x: number; y: number }[];
        const color = data.color as string;
        return {
          id: data.id as string,
          user_id: operation.user_id,
          points: points.map(p => `${p.x},${p.y}`).join(';'),
          color: hexToArgbInt(color).toString(),
          strokeWidth: (data.strokeWidth as number).toString(),
        };
      }
      case 'text': {
        const position = data.position as { x: number; y: number };
        const color = data.color as string;
        return {
          id: data.id as string,
          user_id: operation.user_id,
          text: data.text as string,
          x: position.x.toString(),
          y: position.y.toString(),
          fontSize: (data.fontSize as number).toString(),
          color: hexToArgbInt(color).toString(),
        };
      }
      case 'erase': {
        const targetIds = data.targetIds as string[];
        return {
          id: crypto.randomUUID(),
          user_id: operation.user_id,
          targetIds: targetIds.join(','),
        };
      }
      case 'clear': {
        return {
          id: crypto.randomUUID(),
          user_id: operation.user_id,
        };
      }
      default:
        return {};
    }
  };

  // Sync pending operations to backend
  const syncToBackend = useCallback(async () => {
    if (!currentSession || pendingOpsRef.current.length === 0) return;

    const opsToSync = [...pendingOpsRef.current];
    pendingOpsRef.current = [];

    try {
      const result = await peerApi.syncWhiteboard({
        session_id: currentSession.id,
        operations: opsToSync,
        version: whiteboardVersion,
      });
      store.setWhiteboardVersion(result.version);
    } catch (error) {
      console.error('Failed to sync whiteboard:', error);
      // Add ops back to pending on failure
      pendingOpsRef.current = [...opsToSync, ...pendingOpsRef.current];
    }
  }, [currentSession, whiteboardVersion]);

  // Debounced sync (wait for user to stop drawing)
  const debouncedSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      window.clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = window.setTimeout(syncToBackend, 1000);
  }, [syncToBackend]);

  // Force immediate sync
  const forceSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      window.clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }
    syncToBackend();
  }, [syncToBackend]);

  // Fetch whiteboard state from backend
  const fetchWhiteboardState = useCallback(async () => {
    if (!currentSession) return;

    try {
      const state = await peerApi.getWhiteboardState(currentSession.id);
      store.setWhiteboardOperations(state.operations);
      store.setWhiteboardVersion(state.version);
    } catch (error) {
      console.error('Failed to fetch whiteboard state:', error);
    }
  }, [currentSession]);

  // Drawing operations
  const drawLine = useCallback(
    (points: { x: number; y: number }[], color: string, strokeWidth: number) => {
      addOperation({
        type: 'draw',
        data: { points, color, strokeWidth, id: crypto.randomUUID() },
      });
    },
    [addOperation]
  );

  const addText = useCallback(
    (text: string, position: { x: number; y: number }, fontSize: number, color: string) => {
      addOperation({
        type: 'text',
        data: { text, position, fontSize, color, id: crypto.randomUUID() },
      });
    },
    [addOperation]
  );

  const eraseItems = useCallback(
    (itemIds: string[]) => {
      addOperation({
        type: 'erase',
        data: { targetIds: itemIds },
      });
    },
    [addOperation]
  );

  const clearAll = useCallback(() => {
    addOperation({
      type: 'clear',
      data: {},
    });
  }, [addOperation]);

  // Cleanup on unmount or session change
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        window.clearTimeout(syncTimeoutRef.current);
      }
      // Force sync any pending ops before leaving
      if (pendingOpsRef.current.length > 0 && currentSession) {
        syncToBackend();
      }
    };
  }, [currentSession, syncToBackend]);

  // Fetch initial state when session changes
  useEffect(() => {
    if (currentSession?.is_whiteboard_enabled) {
      fetchWhiteboardState();
    }
  }, [currentSession?.id]);

  return {
    // State
    operations: whiteboardOperations,
    version: whiteboardVersion,
    isEnabled: currentSession?.is_whiteboard_enabled ?? false,

    // Actions
    drawLine,
    addText,
    eraseItems,
    clearAll,
    forceSync,
    fetchWhiteboardState,
    clearWhiteboard: store.clearWhiteboard,

    // Utils for parsing Android format
    argbIntToHex,
    hexToArgbInt,
  };
}
