import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PomodoroBreakModal } from './PomodoroBreakModal';
import { FocusModeSettings } from './FocusModeSettings';

interface FocusModeSessionProps {
  settings: FocusModeSettings;
  children: React.ReactNode;
  onSessionEnd?: () => void;
}

/**
 * FocusModeSession - Wraps content with focus mode and pomodoro functionality
 */
export const FocusModeSession: React.FC<FocusModeSessionProps> = ({
  settings,
  children,
}) => {
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [_pomodoroFocusTime, setPomodoroFocusTime] = useState(0);
  const [_sessionPausedTime, setSessionPausedTime] = useState<number | null>(null);

  const pomodoroIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPomodoroFocusRef = useRef<number | null>(null);
  const interruptionStartRef = useRef<number | null>(null);

  // FocusMode class removed to prevent "Secure Exam Mode" popup/lockdown.
  // Proctoring logic is now handled globally in FocusContext.tsx

  // We still track interruptions locally for Pomodoro accuracy if needed, 
  // but we don't force fullscreen or show the modal.
  useEffect(() => {
    // Optional: We could trigger a simpler "Focus Started" toast here if we wanted
    // but the UI context handles state.
  }, [settings.enabled]);

  // Handle break start
  const handleBreakStart = useCallback(() => {
    setIsOnBreak(true);
    setSessionPausedTime(Date.now());
    setPomodoroFocusTime(0);
    lastPomodoroFocusRef.current = null;
  }, []);

  // Handle break complete
  const handleBreakComplete = useCallback(() => {
    setIsOnBreak(false);
    setShowBreakModal(false);
    setSessionPausedTime((pausedTime) => {
      if (pausedTime) {
        lastPomodoroFocusRef.current = Date.now();
      }
      return null;
    });
  }, []);

  // Pomodoro timer: Track focus time (only when focused, not interrupted, not on break)
  useEffect(() => {
    if (
      settings.enabled &&
      !interruptionStartRef.current &&
      !isOnBreak &&
      !showBreakModal
    ) {
      // Start tracking Pomodoro focus time
      if (!lastPomodoroFocusRef.current) {
        lastPomodoroFocusRef.current = Date.now();
      }

      pomodoroIntervalRef.current = setInterval(() => {
        if (
          lastPomodoroFocusRef.current &&
          !interruptionStartRef.current &&
          !isOnBreak &&
          !showBreakModal
        ) {
          const now = Date.now();
          const elapsed = now - lastPomodoroFocusRef.current;
          lastPomodoroFocusRef.current = now;

          setPomodoroFocusTime((prev) => {
            const pomodoroMs = settings.pomodoroMinutes * 60 * 1000;
            const newFocusTime = prev + elapsed;

            // Check if pomodoro time reached
            if (newFocusTime >= pomodoroMs && !showBreakModal) {
              // Trigger break outside of state update
              setTimeout(() => {
                setShowBreakModal(true);
                handleBreakStart();
              }, 0);
              return prev; // Don't update if break is starting
            }

            return newFocusTime;
          });
        }
      }, 1000);

      return () => {
        if (pomodoroIntervalRef.current) {
          clearInterval(pomodoroIntervalRef.current);
        }
      };
    } else {
      // Pause Pomodoro tracking during interruptions or breaks
      if (pomodoroIntervalRef.current) {
        clearInterval(pomodoroIntervalRef.current);
      }
      if (interruptionStartRef.current || isOnBreak || showBreakModal) {
        lastPomodoroFocusRef.current = null;
      }
    }
  }, [
    settings.enabled,
    settings.pomodoroMinutes,
    isOnBreak,
    showBreakModal,
    handleBreakStart,
  ]);

  // Track interruptions (tab switch, window blur, etc.)
  useEffect(() => {
    if (!settings.enabled) return;

    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      const now = Date.now();

      if (!isVisible && !interruptionStartRef.current) {
        // Interruption started - reset pomodoro
        interruptionStartRef.current = now;
        setPomodoroFocusTime(0);
        lastPomodoroFocusRef.current = null;
      } else if (isVisible && interruptionStartRef.current) {
        // Interruption ended
        interruptionStartRef.current = null;
        lastPomodoroFocusRef.current = now;
      }
    };

    const handleBlur = () => {
      if (!interruptionStartRef.current) {
        const now = Date.now();
        interruptionStartRef.current = now;
        setPomodoroFocusTime(0);
        lastPomodoroFocusRef.current = null;
      }
    };

    const handleFocus = () => {
      if (interruptionStartRef.current) {
        interruptionStartRef.current = null;
        lastPomodoroFocusRef.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [settings.enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pomodoroIntervalRef.current) {
        clearInterval(pomodoroIntervalRef.current);
      }
    };
  }, []);

  return (
    <>
      {children}
      {showBreakModal && (
        <PomodoroBreakModal
          onBreakComplete={handleBreakComplete}
          breakMinutes={settings.breakMinutes}
        />
      )}
    </>
  );
};

export default FocusModeSession;

