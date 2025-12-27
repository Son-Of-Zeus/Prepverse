import React, { useState, useCallback, useEffect, useRef } from 'react';
import { CosmicBackground } from '../components/ui/CosmicBackground';
import { WelcomeScreen } from '../components/onboarding/WelcomeScreen';
import { ClassSelector } from '../components/onboarding/ClassSelector';
import { QuestionCard } from '../components/onboarding/QuestionCard';
import { AssessmentTimer } from '../components/onboarding/AssessmentTimer';
import { ProgressIndicator, QuestionDots } from '../components/onboarding/ProgressIndicator';
import { ResultsScreen } from '../components/onboarding/ResultsScreen';
import { FocusHistoryTracker, FocusStatistics } from '../utils/focusHistory';
import { FocusModeSettings, FocusModeSettings as FocusModeSettingsType } from '../components/onboarding/FocusModeSettings';
import { FocusModeSession } from '../components/onboarding/FocusModeSession';

// Types
interface Option {
  id: string;
  text: string;
}

interface Question {
  id: string;
  subject: string;
  topic: string;
  text: string;
  options: Option[];
  correctAnswer: string;
}

type OnboardingStep = 'welcome' | 'class-select' | 'quiz' | 'results';

interface InterruptionEvent {
  type: 'tab_switch' | 'window_blur' | 'visibility_change';
  timestamp: number;
  duration?: number; // Duration in milliseconds if interruption ended
}

interface SessionTracking {
  startTime: number | null;
  endTime: number | null;
  actualDuration: number; // Actual time spent in milliseconds (excluding interruptions)
  totalElapsed: number; // Total elapsed time in milliseconds
  interruptions: InterruptionEvent[];
  isActive: boolean;
  lastInterruptionStart: number | null;
  focusStatistics?: FocusStatistics; // Focus history statistics
}

// Mock data for demonstration
const mockQuestions: Question[] = [
  {
    id: 'q1',
    subject: 'Mathematics',
    topic: 'Quadratic Equations',
    text: 'What is the degree of the polynomial x\u00B2 + 3x + 2?',
    options: [
      { id: 'a', text: '1' },
      { id: 'b', text: '2' },
      { id: 'c', text: '3' },
      { id: 'd', text: '0' },
    ],
    correctAnswer: 'b',
  },
  {
    id: 'q2',
    subject: 'Physics',
    topic: 'Electricity',
    text: 'What is the SI unit of electric current?',
    options: [
      { id: 'a', text: 'Volt' },
      { id: 'b', text: 'Ampere' },
      { id: 'c', text: 'Ohm' },
      { id: 'd', text: 'Watt' },
    ],
    correctAnswer: 'b',
  },
  {
    id: 'q3',
    subject: 'Chemistry',
    topic: 'Chemical Reactions',
    text: 'Which gas is evolved when zinc reacts with dilute hydrochloric acid?',
    options: [
      { id: 'a', text: 'Oxygen' },
      { id: 'b', text: 'Chlorine' },
      { id: 'c', text: 'Hydrogen' },
      { id: 'd', text: 'Nitrogen' },
    ],
    correctAnswer: 'c',
  },
  {
    id: 'q4',
    subject: 'Mathematics',
    topic: 'Trigonometry',
    text: 'What is the value of sin 30\u00B0?',
    options: [
      { id: 'a', text: '0' },
      { id: 'b', text: '1/2' },
      { id: 'c', text: '\u221A3/2' },
      { id: 'd', text: '1' },
    ],
    correctAnswer: 'b',
  },
  {
    id: 'q5',
    subject: 'Physics',
    topic: 'Light',
    text: 'What type of mirror is used in a car headlight?',
    options: [
      { id: 'a', text: 'Plane mirror' },
      { id: 'b', text: 'Concave mirror' },
      { id: 'c', text: 'Convex mirror' },
      { id: 'd', text: 'Cylindrical mirror' },
    ],
    correctAnswer: 'b',
  },
  {
    id: 'q6',
    subject: 'Biology',
    topic: 'Human Body',
    text: 'Which organ is responsible for filtering blood in the human body?',
    options: [
      { id: 'a', text: 'Heart' },
      { id: 'b', text: 'Liver' },
      { id: 'c', text: 'Kidney' },
      { id: 'd', text: 'Lungs' },
    ],
    correctAnswer: 'c',
  },
  {
    id: 'q7',
    subject: 'Mathematics',
    topic: 'Statistics',
    text: 'What is the mode of the data set: 2, 3, 3, 4, 5, 5, 5, 6?',
    options: [
      { id: 'a', text: '3' },
      { id: 'b', text: '4' },
      { id: 'c', text: '5' },
      { id: 'd', text: '6' },
    ],
    correctAnswer: 'c',
  },
  {
    id: 'q8',
    subject: 'Chemistry',
    topic: 'Periodic Table',
    text: 'Which element has the atomic number 6?',
    options: [
      { id: 'a', text: 'Nitrogen' },
      { id: 'b', text: 'Carbon' },
      { id: 'c', text: 'Oxygen' },
      { id: 'd', text: 'Boron' },
    ],
    correctAnswer: 'b',
  },
  {
    id: 'q9',
    subject: 'Physics',
    topic: 'Motion',
    text: 'What is the acceleration due to gravity on Earth (approximate)?',
    options: [
      { id: 'a', text: '8.9 m/s\u00B2' },
      { id: 'b', text: '9.8 m/s\u00B2' },
      { id: 'c', text: '10.8 m/s\u00B2' },
      { id: 'd', text: '11.8 m/s\u00B2' },
    ],
    correctAnswer: 'b',
  },
  {
    id: 'q10',
    subject: 'Mathematics',
    topic: 'Geometry',
    text: 'What is the sum of all interior angles of a hexagon?',
    options: [
      { id: 'a', text: '540\u00B0' },
      { id: 'b', text: '720\u00B0' },
      { id: 'c', text: '900\u00B0' },
      { id: 'd', text: '1080\u00B0' },
    ],
    correctAnswer: 'b',
  },
];

interface OnboardingPageProps {
  onComplete?: () => void;
}

/**
 * Onboarding Page - The complete onboarding assessment flow
 *
 * Design Philosophy:
 * - Multi-step wizard with smooth transitions between states
 * - Combines all onboarding components into a cohesive experience
 * - Keyboard navigation support throughout
 * - Responsive design that works on all screen sizes
 */
export const OnboardingPage: React.FC<OnboardingPageProps> = ({ onComplete }) => {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [selectedClass, setSelectedClass] = useState<10 | 12 | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isTimerPaused] = useState(false);

  // Focus mode settings
  const [focusModeSettings, setFocusModeSettings] = useState<FocusModeSettingsType>({
    pomodoroMinutes: 25,
    breakMinutes: 5,
    enabled: false,
  });

  // Session tracking state
  const [sessionTracking, setSessionTracking] = useState<SessionTracking>({
    startTime: null,
    endTime: null,
    actualDuration: 0,
    totalElapsed: 0,
    interruptions: [],
    isActive: false,
    lastInterruptionStart: null,
  });

  // Refs for tracking
  const sessionStartRef = useRef<number | null>(null);
  const lastActiveTimeRef = useRef<number | null>(null);
  const interruptionStartRef = useRef<number | null>(null);
  const durationUpdateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const focusHistoryTrackerRef = useRef<FocusHistoryTracker | null>(null);

  // Mock user name - would come from auth
  const userName = 'Student';

  // Initialize session tracking when component mounts
  useEffect(() => {
    const startTime = Date.now();
    sessionStartRef.current = startTime;
    lastActiveTimeRef.current = startTime;
    
    // Initialize focus history tracker only if focus mode is enabled
    // (Will be initialized when quiz starts if focus mode is enabled)
    
    setSessionTracking({
      startTime,
      endTime: null,
      actualDuration: 0,
      totalElapsed: 0,
      interruptions: [],
      isActive: true,
      lastInterruptionStart: null,
    });

    return () => {
      // Cleanup on unmount
      if (durationUpdateIntervalRef.current) {
        clearInterval(durationUpdateIntervalRef.current);
      }
    };
  }, []);

  const handleWelcomeContinue = () => {
    setStep('class-select');
  };

  const handleClassSelect = (classLevel: 10 | 12) => {
    setSelectedClass(classLevel);
  };

  const handleStartAssessment = () => {
    if (selectedClass) {
      // Initialize focus history tracker only if focus mode is enabled
      if (focusModeSettings.enabled && !focusHistoryTrackerRef.current) {
        const startTime = sessionStartRef.current || Date.now();
        focusHistoryTrackerRef.current = new FocusHistoryTracker(startTime);
      }
      setStep('quiz');
    }
  };

  const handleSelectAnswer = (optionId: string) => {
    const question = mockQuestions[currentQuestion - 1];
    if (question) {
      setAnswers((prev) => ({
        ...prev,
        [question.id]: optionId,
      }));
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion < mockQuestions.length) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      // Assessment complete - end session tracking
      const endTime = Date.now();
      if (sessionStartRef.current) {
        const totalElapsed = endTime - sessionStartRef.current;
        const finalInterruptionDuration = interruptionStartRef.current
          ? endTime - interruptionStartRef.current
          : 0;
        
        // Finalize focus history tracking only if focus mode was enabled
        if (focusModeSettings.enabled && focusHistoryTrackerRef.current) {
          focusHistoryTrackerRef.current.finalize(endTime);
          const focusStats = focusHistoryTrackerRef.current.calculateStatistics(
            endTime,
            sessionTracking.interruptions
          );
          
          setSessionTracking((prev) => {
            const actualDuration = prev.actualDuration - finalInterruptionDuration;
            return {
              ...prev,
              endTime,
              totalElapsed,
              actualDuration: Math.max(0, actualDuration),
              isActive: false,
              focusStatistics: focusStats,
            };
          });
        } else {
          setSessionTracking((prev) => {
            const actualDuration = prev.actualDuration - finalInterruptionDuration;
            return {
              ...prev,
              endTime,
              totalElapsed,
              actualDuration: Math.max(0, actualDuration),
              isActive: false,
            };
          });
        }
      }
      
      // Clear interval
      if (durationUpdateIntervalRef.current) {
        clearInterval(durationUpdateIntervalRef.current);
      }
      
      setStep('results');
    }
  };

  const handleTimeUp = useCallback(() => {
    // End session tracking
    const endTime = Date.now();
    if (sessionStartRef.current) {
      const totalElapsed = endTime - sessionStartRef.current;
      const finalInterruptionDuration = interruptionStartRef.current
        ? endTime - interruptionStartRef.current
        : 0;
      
      // Finalize focus history tracking only if focus mode was enabled
      if (focusModeSettings.enabled && focusHistoryTrackerRef.current) {
        focusHistoryTrackerRef.current.finalize(endTime);
        const focusStats = focusHistoryTrackerRef.current.calculateStatistics(
          endTime,
          sessionTracking.interruptions
        );
        
        setSessionTracking((prev) => {
          const actualDuration = prev.actualDuration - finalInterruptionDuration;
          return {
            ...prev,
            endTime,
            totalElapsed,
            actualDuration: Math.max(0, actualDuration),
            isActive: false,
            focusStatistics: focusStats,
          };
        });
      } else {
        setSessionTracking((prev) => {
          const actualDuration = prev.actualDuration - finalInterruptionDuration;
          return {
            ...prev,
            endTime,
            totalElapsed,
            actualDuration: Math.max(0, actualDuration),
            isActive: false,
          };
        });
      }
    }
    
    // Clear interval
    if (durationUpdateIntervalRef.current) {
      clearInterval(durationUpdateIntervalRef.current);
    }
    
    setStep('results');
  }, [sessionTracking.interruptions, focusModeSettings.enabled]);

  const handleGoToDashboard = () => {
    onComplete?.();
  };

  // Handle break start


  // Session tracking: Update actual duration periodically (works for all steps)
  useEffect(() => {
    if (sessionTracking.isActive && !interruptionStartRef.current) {
      durationUpdateIntervalRef.current = setInterval(() => {
        if (sessionStartRef.current && lastActiveTimeRef.current && !interruptionStartRef.current) {
          const now = Date.now();
          const elapsed = now - lastActiveTimeRef.current;
          lastActiveTimeRef.current = now;
          
          setSessionTracking((prev) => ({
            ...prev,
            actualDuration: prev.actualDuration + elapsed,
            totalElapsed: now - (sessionStartRef.current || now),
          }));
        }
      }, 1000); // Update every second
      
      return () => {
        if (durationUpdateIntervalRef.current) {
          clearInterval(durationUpdateIntervalRef.current);
        }
      };
    }
  }, [sessionTracking.isActive]);

  // Session tracking: Handle visibility changes (tab switch, minimize, etc.) - works for all steps
  useEffect(() => {
    if (!sessionTracking.isActive) return;

    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      const now = Date.now();

      if (!isVisible && !interruptionStartRef.current) {
        // Interruption started - record unfocus only if focus mode is enabled
        interruptionStartRef.current = now;
        if (focusModeSettings.enabled) {
          focusHistoryTrackerRef.current?.recordUnfocus(now);
        }
        
        setSessionTracking((prev) => ({
          ...prev,
          interruptions: [
            ...prev.interruptions,
            {
              type: 'visibility_change',
              timestamp: now,
            },
          ],
          lastInterruptionStart: now,
        }));
      } else if (isVisible && interruptionStartRef.current) {
        // Interruption ended - record focus only if focus mode is enabled
        const interruptionDuration = now - interruptionStartRef.current;
        interruptionStartRef.current = null;
        lastActiveTimeRef.current = now;
        if (focusModeSettings.enabled) {
          focusHistoryTrackerRef.current?.recordFocus(now);
        }
        
        setSessionTracking((prev) => {
          const updatedInterruptions = [...prev.interruptions];
          const lastInterruption = updatedInterruptions[updatedInterruptions.length - 1];
          if (lastInterruption && lastInterruption.type === 'visibility_change') {
            lastInterruption.duration = interruptionDuration;
          }
          
          return {
            ...prev,
            interruptions: updatedInterruptions,
            lastInterruptionStart: null,
          };
        });
      }
    };

    const handleBlur = () => {
      if (!sessionTracking.isActive) return;
      const now = Date.now();
      
      if (!interruptionStartRef.current) {
        interruptionStartRef.current = now;
        if (focusModeSettings.enabled) {
          focusHistoryTrackerRef.current?.recordUnfocus(now);
        }
        
        setSessionTracking((prev) => ({
          ...prev,
          interruptions: [
            ...prev.interruptions,
            {
              type: 'window_blur',
              timestamp: now,
            },
          ],
          lastInterruptionStart: now,
        }));
      }
    };

    const handleFocus = () => {
      if (!sessionTracking.isActive) return;
      const now = Date.now();
      
      if (interruptionStartRef.current) {
        const interruptionDuration = now - interruptionStartRef.current;
        interruptionStartRef.current = null;
        lastActiveTimeRef.current = now;
        if (focusModeSettings.enabled) {
          focusHistoryTrackerRef.current?.recordFocus(now);
        }
        
        setSessionTracking((prev) => {
          const updatedInterruptions = [...prev.interruptions];
          const lastInterruption = updatedInterruptions[updatedInterruptions.length - 1];
          if (lastInterruption && (lastInterruption.type === 'window_blur' || lastInterruption.type === 'tab_switch')) {
            lastInterruption.duration = interruptionDuration;
          }
          
          return {
            ...prev,
            interruptions: updatedInterruptions,
            lastInterruptionStart: null,
          };
        });
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
  }, [sessionTracking.isActive, focusModeSettings.enabled]);

  // Store session data to localStorage for persistence
  useEffect(() => {
    if (sessionTracking.isActive && sessionTracking.startTime) {
      const sessionData = {
        ...sessionTracking,
        startTime: sessionTracking.startTime,
        endTime: sessionTracking.endTime,
      };
      localStorage.setItem('onboarding_session_tracking', JSON.stringify(sessionData));
    } else if (step === 'results' && sessionTracking.endTime) {
      // Final save when results are shown
      localStorage.setItem('onboarding_session_tracking', JSON.stringify(sessionTracking));
      
      // Log session summary to console (for debugging/verification)
      console.log('Session Tracking Summary:', {
        totalElapsed: `${Math.round(sessionTracking.totalElapsed / 1000)}s`,
        actualDuration: `${Math.round(sessionTracking.actualDuration / 1000)}s`,
        interruptions: sessionTracking.interruptions.length,
        interruptionDetails: sessionTracking.interruptions.map((i) => ({
          type: i.type,
          duration: i.duration ? `${Math.round(i.duration / 1000)}s` : 'ongoing',
          timestamp: new Date(i.timestamp).toISOString(),
        })),
      });
    }
  }, [step, sessionTracking]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (step === 'quiz') {
        const question = mockQuestions[currentQuestion - 1];
        if (!question) return;
        
        const keyMap: Record<string, string> = { a: 'a', b: 'b', c: 'c', d: 'd' };
        const selectedOption = keyMap[e.key.toLowerCase()];

        if (selectedOption && question.options.find((o) => o.id === selectedOption)) {
          handleSelectAnswer(selectedOption);
        }

        if (e.key === 'Enter' && answers[question.id]) {
          handleNextQuestion();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, currentQuestion, answers]);

  // Calculate results
  const calculateResults = () => {
    let correct = 0;
    const subjectScores: Record<string, { correct: number; total: number }> = {};

    mockQuestions.forEach((question) => {
      const subject = question.subject.toLowerCase();
      if (!subjectScores[subject]) {
        subjectScores[subject] = { correct: 0, total: 0 };
      }
      subjectScores[subject].total++;

      if (answers[question.id] === question.correctAnswer) {
        correct++;
        subjectScores[subject].correct++;
      }
    });

    const subjectScoresArray = Object.entries(subjectScores).map(([subject, scores]) => ({
      subject,
      correct: scores.correct,
      total: scores.total,
      percentage: (scores.correct / scores.total) * 100,
    }));

    // Determine strengths and weaknesses
    const sortedSubjects = subjectScoresArray.sort((a, b) => b.percentage - a.percentage);
    const strengths = sortedSubjects.slice(0, 2).map((s) => s.subject);
    const weaknesses = sortedSubjects.slice(-2).map((s) => s.subject);

    return {
      score: correct,
      total: mockQuestions.length,
      strengths,
      weaknesses,
      subjectScores: subjectScoresArray,
      xpEarned: 100 + correct * 10,
      level: correct >= 8 ? 'Scholar' : correct >= 5 ? 'Learner' : 'Beginner',
    };
  };

  const answeredQuestions = new Set(
    Object.keys(answers).map((id) => mockQuestions.findIndex((q) => q.id === id) + 1)
  );

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Animated cosmic background */}
      <CosmicBackground starCount={60} showGrid showOrbs />

      {/* Content */}
      <div className="relative z-10">
        {step === 'welcome' && (
          <WelcomeScreen userName={userName} onContinue={handleWelcomeContinue} />
        )}

        {step === 'class-select' && (
          <div className="min-h-screen flex flex-col items-center justify-center p-8">
            <div className="w-full max-w-2xl space-y-8">
              <ClassSelector onSelect={handleClassSelect} selectedClass={selectedClass} />

              {/* Focus Mode Settings */}
              <FocusModeSettings
                onSettingsChange={setFocusModeSettings}
                initialSettings={focusModeSettings}
              />

              {/* Continue button */}
              <div
                className={`
                  transition-all duration-500
                  ${selectedClass ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
                `}
              >
                <button
                  onClick={handleStartAssessment}
                  className="group relative w-full px-8 py-4 bg-prepverse-red text-white font-semibold text-lg rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-prepverse-red focus:ring-offset-4 focus:ring-offset-void"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <span className="relative flex items-center justify-center gap-3">
                    Start Assessment
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'quiz' && (
          <FocusModeSession settings={focusModeSettings}>
            <div className="min-h-screen flex flex-col p-4 md:p-8">
            {/* Top bar with timer and progress */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
              {/* Timer */}
              <AssessmentTimer
                totalSeconds={600}
                onTimeUp={handleTimeUp}
                isPaused={isTimerPaused}
              />

              {/* Question dots for desktop */}
              <div className="hidden md:block">
                <QuestionDots
                  current={currentQuestion}
                  total={mockQuestions.length}
                  answeredQuestions={answeredQuestions}
                />
              </div>

              {/* Class badge */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                <span className="font-mono text-xs text-gray-500 uppercase">Class</span>
                <span className="font-display font-bold text-white">{selectedClass}</span>
              </div>
            </div>

            {/* Progress bar for mobile */}
            <div className="md:hidden mb-8">
              <ProgressIndicator
                current={currentQuestion}
                total={mockQuestions.length}
                answeredQuestions={answeredQuestions}
              />
            </div>

            {/* Question card */}
            <div className="flex-1 flex items-center justify-center">
              {(() => {
                const question = mockQuestions[currentQuestion - 1];
                if (!question) return null;
                return (
                  <QuestionCard
                    question={question}
                    questionNumber={currentQuestion}
                    totalQuestions={mockQuestions.length}
                    selectedAnswer={answers[question.id] || null}
                    onSelectAnswer={handleSelectAnswer}
                    onNext={handleNextQuestion}
                    isLastQuestion={currentQuestion === mockQuestions.length}
                  />
                );
              })()}
            </div>

            {/* Bottom progress for desktop */}
            <div className="hidden md:block mt-8">
              <ProgressIndicator
                current={currentQuestion}
                total={mockQuestions.length}
                answeredQuestions={answeredQuestions}
              />
            </div>
          </div>
          </FocusModeSession>
        )}

        {step === 'results' && (
          <ResultsScreen
            profile={calculateResults()}
            userName={userName}
            onContinue={handleGoToDashboard}
            sessionTracking={sessionTracking}
          />
        )}
      </div>
    </div>
  );
};

export default OnboardingPage;
