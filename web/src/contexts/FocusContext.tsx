import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

// Types
export interface FocusSettings {
    pomodoroMinutes: number;
    breakMinutes: number;
    enabled: boolean;
}

interface FocusContextType {
    isActive: boolean;
    isPaused: boolean;
    isOnBreak: boolean;
    timeRemaining: number;
    totalTime: number; // For progress calculation
    settings: FocusSettings;
    violations: number;
    maxViolations: number;
    showViolationModal: boolean;
    updateSettings: (newSettings: FocusSettings) => void;
    startSession: () => void;
    pauseSession: () => void;
    resumeSession: () => void;
    stopSession: () => void;
    resumeFromViolation: () => void;
    skipBreak: () => void;
    minimizeSession: () => void; // Unused in logic but semantic
}

const FocusContext = createContext<FocusContextType | undefined>(undefined);

export const useFocus = () => {
    const context = useContext(FocusContext);
    if (!context) {
        throw new Error('useFocus must be used within a FocusProvider');
    }
    return context;
};

export const FocusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isActive, setIsActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isOnBreak, setIsOnBreak] = useState(false);
    const [settings, setSettings] = useState<FocusSettings>({
        pomodoroMinutes: 25,
        breakMinutes: 5,
        enabled: true,
    });

    const [timeRemaining, setTimeRemaining] = useState(settings.pomodoroMinutes * 60);
    const [totalTime, setTotalTime] = useState(settings.pomodoroMinutes * 60);

    // Proctoring State
    const [violations, setViolations] = useState(0);
    const [showViolationModal, setShowViolationModal] = useState(false);
    const maxViolations = 3;

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Update timer when settings change (if not active)
    useEffect(() => {
        if (!isActive) {
            const seconds = settings.pomodoroMinutes * 60;
            setTimeRemaining(seconds);
            setTotalTime(seconds);
        }
    }, [settings.pomodoroMinutes, isActive]);

    const updateSettings = (newSettings: FocusSettings) => {
        setSettings(newSettings);
    };

    const startSession = () => {
        setIsActive(true);
        setIsPaused(false);
        setIsOnBreak(false);
        setViolations(0);
        setShowViolationModal(false);
        const seconds = settings.pomodoroMinutes * 60;
        setTimeRemaining(seconds);
        setTotalTime(seconds);
    };

    const pauseSession = () => setIsPaused(true);
    const resumeSession = () => setIsPaused(false);

    const stopSession = () => {
        setIsActive(false);
        setIsPaused(false);
        setIsOnBreak(false);
        setShowViolationModal(false);
        const seconds = settings.pomodoroMinutes * 60;
        setTimeRemaining(seconds);
    };

    // Resume tracking after violation modal acknowledge
    const resumeFromViolation = () => {
        setShowViolationModal(false);
    };

    const minimizeSession = () => {
        // Logic handled by the UI/router (navigating away)
    };

    // Proctoring Logic: Monitor Tab Switching & Window Blur
    useEffect(() => {
        if (!isActive || isPaused || showViolationModal) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Violation Detected
                setViolations(prev => {
                    const newCount = prev + 1;
                    setShowViolationModal(true);
                    return newCount;
                });
            }
        };

        const handleBlur = () => {
            if (document.hidden) return;
            // Also treat full window blur as violation
            setViolations(prev => {
                const newCount = prev + 1;
                setShowViolationModal(true);
                return newCount;
            });
        };

        // Prevent Context Menu (Right Click)
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleBlur);
        document.addEventListener("contextmenu", handleContextMenu);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleBlur);
            document.removeEventListener("contextmenu", handleContextMenu);
        };
    }, [isActive, isPaused, showViolationModal]);

    // Timer Tick
    useEffect(() => {
        if (isActive && !isPaused && !showViolationModal) {
            intervalRef.current = setInterval(() => {
                setTimeRemaining((prev) => {
                    if (prev <= 1) {
                        clearInterval(intervalRef.current!);

                        if (isOnBreak) {
                            // Break Ended -> Start next Focus Session
                            setIsOnBreak(false);
                            const nextSessionTime = settings.pomodoroMinutes * 60;
                            setTimeRemaining(nextSessionTime);
                            setTotalTime(nextSessionTime);
                            // Auto-start next session or pause? 
                            // Standard Pomodoro usually auto-starts or waits.
                            // Let's keep it active for continuous flow as requested "not terminated".
                            return nextSessionTime;
                        } else {
                            // Focus Session Ended -> Start Break
                            setIsOnBreak(true);
                            const breakTime = settings.breakMinutes * 60;
                            setTimeRemaining(breakTime);
                            setTotalTime(breakTime);
                            // It is still "Active" (the session is active), but state swiched to break.
                            return breakTime;
                        }
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isActive, isPaused, showViolationModal, isOnBreak, settings]);

    // Manually skip break
    const skipBreak = () => {
        if (isOnBreak) {
            setIsOnBreak(false);
            const nextSessionTime = settings.pomodoroMinutes * 60;
            setTimeRemaining(nextSessionTime);
            setTotalTime(nextSessionTime);
        }
    };

    return (
        <FocusContext.Provider
            value={{
                isActive,
                isPaused,
                isOnBreak,
                timeRemaining,
                totalTime,
                settings,
                violations,
                maxViolations,
                showViolationModal,
                updateSettings,
                startSession,
                pauseSession,
                resumeSession,
                stopSession,
                resumeFromViolation,
                minimizeSession,
                skipBreak,
            }}
        >
            {children}
        </FocusContext.Provider>
    );
};
