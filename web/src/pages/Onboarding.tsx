import React, { useState, useCallback, useEffect, useRef } from 'react';
import { CosmicBackground } from '../components/ui/CosmicBackground';
import { WelcomeScreen } from '../components/onboarding/WelcomeScreen';
import { ClassSelector } from '../components/onboarding/ClassSelector';
import { QuestionCard } from '../components/onboarding/QuestionCard';
import { AssessmentTimer } from '../components/onboarding/AssessmentTimer';
import { ProgressIndicator, QuestionDots } from '../components/onboarding/ProgressIndicator';
import { ResultsScreen } from '../components/onboarding/ResultsScreen';
import { FocusViolationModal } from '../components/focus/FocusViolationModal';

// Backend API imports (from main)
import {
  getOnboardingQuestions,
  submitOnboardingAnswers,
  OnboardingQuestion,
  OnboardingAnswer,
  OnboardingResponse,
} from '../api/onboarding';
import { School, setUserSchool } from '../api/schools';
import { useAuth } from '../hooks/useAuth';
import { SchoolSelector } from '../components/onboarding/SchoolSelector';

// Types for QuestionCard component (options with id/text format)
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
}

// Combined step type (includes loading/submitting from main)
type OnboardingStep = 'welcome' | 'class-select' | 'school-select' | 'loading' | 'quiz' | 'submitting' | 'results';

// Session tracking types (from sanghu)
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
}

interface OnboardingPageProps {
  onComplete?: () => void;
}

/**
 * Convert backend question format to QuestionCard format
 * Backend returns options as string[], QuestionCard expects {id, text}[]
 */
const convertToQuestionCardFormat = (backendQuestions: OnboardingQuestion[]): Question[] => {
  const optionIds = ['a', 'b', 'c', 'd'];
  return backendQuestions.map((q) => ({
    id: q.id,
    subject: q.subject,
    topic: q.topic,
    text: q.question,
    options: q.options.map((optText, idx) => ({
      id: optionIds[idx] ?? 'a',
      text: optText,
    })),
  }));
};

/**
 * Onboarding Page - The complete onboarding assessment flow
 *
 * Design Philosophy:
 * - Multi-step wizard with smooth transitions between states
 * - Combines all onboarding components into a cohesive experience
 * - Keyboard navigation support throughout
 * - Responsive design that works on all screen sizes
 * - Focus mode with session tracking for better learning
 * - Backend integration for question fetching and answer submission
 */
export const OnboardingPage: React.FC<OnboardingPageProps> = ({ onComplete }) => {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [selectedClass, setSelectedClass] = useState<10 | 12 | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isTimerPaused] = useState(false);



  // Session tracking state (from sanghu)
  const [sessionTracking, setSessionTracking] = useState<SessionTracking>({
    startTime: null,
    endTime: null,
    actualDuration: 0,
    totalElapsed: 0,
    interruptions: [],
    isActive: false,
    lastInterruptionStart: null,
  });

  // Backend data state (from main)
  const [backendQuestions, setBackendQuestions] = useState<OnboardingQuestion[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [evaluationResult, setEvaluationResult] = useState<OnboardingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Proctoring state
  const [violations, setViolations] = useState(0);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const maxViolations = 3;

  // Refs for tracking (from sanghu)
  const sessionStartRef = useRef<number | null>(null);
  const lastActiveTimeRef = useRef<number | null>(null);
  const interruptionStartRef = useRef<number | null>(null);
  const durationUpdateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mock user name - would come from auth
  const { user } = useAuth();
  const userName = user?.full_name?.split(' ')[0] || user?.full_name || 'Student';

  // Initialize session tracking when component mounts
  useEffect(() => {
    const startTime = Date.now();
    sessionStartRef.current = startTime;
    lastActiveTimeRef.current = startTime;

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

  const handleClassContinue = () => {
    setStep('school-select');
  };

  const handleSchoolSelect = (_schoolId: string | null, school: School | null) => {
    setSelectedSchool(school);
  };

  // Combined handleStartAssessment: fetches from backend AND initializes focus tracking
  const handleStartAssessment = async () => {
    if (!selectedClass) return;

    setStep('loading');
    setError(null);

    // Save selected school if any
    if (selectedSchool) {
      try {
        await setUserSchool(selectedSchool.id);
      } catch (err) {
        console.warn('Failed to save school selection:', err);
        // Continue anyway as this is optional/secondary
      }
    }



    try {
      // Fetch questions from backend (from main)
      const fetchedQuestions = await getOnboardingQuestions(selectedClass);
      setBackendQuestions(fetchedQuestions);
      setQuestions(convertToQuestionCardFormat(fetchedQuestions));
      setStep('quiz');
    } catch (err) {
      console.error('Failed to fetch questions:', err);
      setError('Failed to load questions. Please try again.');
      setStep('class-select');
    }
  };

  const handleSelectAnswer = (optionId: string) => {
    const question = questions[currentQuestion - 1];
    if (question) {
      setAnswers((prev) => ({
        ...prev,
        [question.id]: optionId,
      }));
    }
  };

  // Submit answers to backend (from main)
  const handleSubmitAnswers = async () => {
    setStep('submitting');
    setError(null);

    try {
      // Convert answers to backend format
      const optionIds = ['a', 'b', 'c', 'd'];
      const submissionAnswers: OnboardingAnswer[] = backendQuestions.map((q) => {
        const selectedOptionId = answers[q.id] || 'a'; // Default to 'a' if not answered
        const optionIndex = optionIds.indexOf(selectedOptionId);
        const selectedAnswer = q.options[optionIndex] ?? q.options[0] ?? '';
        return {
          question_id: q.id,
          selected_answer: selectedAnswer,
        };
      });

      const result = await submitOnboardingAnswers(submissionAnswers);
      setEvaluationResult(result);
      setStep('results');
    } catch (err) {
      console.error('Failed to submit answers:', err);
      setError('Failed to submit answers. Please try again.');
      setStep('quiz');
    }
  };

  // Helper to finalize session tracking (from sanghu)
  const finalizeSessionTracking = useCallback(() => {
    const endTime = Date.now();
    if (sessionStartRef.current) {
      const totalElapsed = endTime - sessionStartRef.current;
      const finalInterruptionDuration = interruptionStartRef.current
        ? endTime - interruptionStartRef.current
        : 0;

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

    // Clear interval
    if (durationUpdateIntervalRef.current) {
      clearInterval(durationUpdateIntervalRef.current);
    }
  }, [sessionTracking.interruptions]);

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      // Assessment complete - finalize session tracking and submit answers
      finalizeSessionTracking();
      handleSubmitAnswers();
    }
  };

  const handleTimeUp = useCallback(() => {
    // End session tracking (from sanghu)
    finalizeSessionTracking();
    // Submit answers to backend (from main)
    handleSubmitAnswers();
  }, [finalizeSessionTracking]);

  const handleGoToDashboard = () => {
    onComplete?.();
  };

  // Proctoring handlers
  const handleResumeFromViolation = () => {
    setShowViolationModal(false);
  };

  const handleEndSessionFromViolation = () => {
    // Terminated due to violations - don't save any stats, restart onboarding
    setShowViolationModal(false);
    setStep('class-select');
    setCurrentQuestion(1);
    setAnswers({});
    setViolations(0);
    setQuestions([]);
    setBackendQuestions([]);
    // Don't reset selectedSchool or selectedClass to allow quick restart? 
    // Actually, usually it resets everything. Let's keep class selected maybe.
    // User logic: setStep('class-select') means they have to click Continue again.
  };

  // Session tracking: Update actual duration periodically (from sanghu)
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
      }, 1000);

      return () => {
        if (durationUpdateIntervalRef.current) {
          clearInterval(durationUpdateIntervalRef.current);
        }
      };
    }
  }, [sessionTracking.isActive]);

  // Session tracking & Proctoring: Handle visibility changes
  useEffect(() => {
    // Only enable proctoring during quiz step
    if (step !== 'quiz') return;

    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      const now = Date.now();

      if (!isVisible && !interruptionStartRef.current) {
        interruptionStartRef.current = now;

        // Proctoring: Add violation
        setViolations((prev) => {
          const newCount = prev + 1;
          setShowViolationModal(true);
          return newCount;
        });

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
        const interruptionDuration = now - interruptionStartRef.current;
        interruptionStartRef.current = null;
        lastActiveTimeRef.current = now;

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
      if (document.hidden) return; // Already handled by visibility change
      const now = Date.now();

      if (!interruptionStartRef.current) {
        interruptionStartRef.current = now;

        // Proctoring: Add violation
        setViolations((prev) => {
          const newCount = prev + 1;
          setShowViolationModal(true);
          return newCount;
        });

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
      const now = Date.now();

      if (interruptionStartRef.current) {
        const interruptionDuration = now - interruptionStartRef.current;
        interruptionStartRef.current = null;
        lastActiveTimeRef.current = now;

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

    // Prevent right-click during quiz
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [step]);

  // Store session data to localStorage (from sanghu)
  useEffect(() => {
    if (sessionTracking.isActive && sessionTracking.startTime) {
      const sessionData = {
        ...sessionTracking,
        startTime: sessionTracking.startTime,
        endTime: sessionTracking.endTime,
      };
      localStorage.setItem('onboarding_session_tracking', JSON.stringify(sessionData));
    } else if (step === 'results' && sessionTracking.endTime) {
      localStorage.setItem('onboarding_session_tracking', JSON.stringify(sessionTracking));

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

  // Keyboard navigation (combined - uses backend questions)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (step === 'quiz' && questions.length > 0) {
        const question = questions[currentQuestion - 1];
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
  }, [step, currentQuestion, answers, questions]);

  // Calculate results for display (from main - uses backend evaluation)
  const calculateResults = () => {
    if (evaluationResult) {
      const subjectScores: Record<string, { correct: number; total: number }> = {};

      evaluationResult.results.forEach((result) => {
        const subject = result.subject.toLowerCase();
        if (!subjectScores[subject]) {
          subjectScores[subject] = { correct: 0, total: 0 };
        }
        subjectScores[subject].total++;
        if (result.is_correct) {
          subjectScores[subject].correct++;
        }
      });

      const subjectScoresArray = Object.entries(subjectScores).map(([subject, scores]) => ({
        subject,
        correct: scores.correct,
        total: scores.total,
        percentage: (scores.correct / scores.total) * 100,
      }));

      return {
        score: evaluationResult.correct_answers,
        total: evaluationResult.total_questions,
        strengths: evaluationResult.strong_topics,
        weaknesses: evaluationResult.weak_topics,
        subjectScores: subjectScoresArray,
        xpEarned: 100 + evaluationResult.correct_answers * 10,
        level:
          evaluationResult.score_percentage >= 80
            ? 'Scholar'
            : evaluationResult.score_percentage >= 50
              ? 'Learner'
              : 'Beginner',
      };
    }

    // Fallback (should not happen with backend evaluation)
    return {
      score: 0,
      total: 10,
      strengths: [],
      weaknesses: [],
      subjectScores: [],
      xpEarned: 100,
      level: 'Beginner',
    };
  };

  const answeredQuestions = new Set(
    Object.keys(answers).map((id) => questions.findIndex((q) => q.id === id) + 1)
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

              {/* Focus Mode Settings (from sanghu) */}


              {/* Error message (from main) */}
              {error && (
                <div className="px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                  {error}
                </div>
              )}

              {/* Continue button */}
              <div
                className={`
                  transition-all duration-500
                  ${selectedClass ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
                `}
              >
                <button
                  onClick={handleClassContinue}
                  className="group relative w-full px-8 py-4 bg-prepverse-red text-white font-semibold text-lg rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-prepverse-red focus:ring-offset-4 focus:ring-offset-void"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <span className="relative flex items-center justify-center gap-3">
                    Continue to School Selection
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'school-select' && (
          <div className="min-h-screen flex flex-col items-center justify-center p-8">
            <div className="w-full max-w-xl space-y-8">
              {/* Header */}
              <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                  <span className="w-2 h-2 rounded-full bg-prepverse-red animate-pulse" />
                  <span className="font-mono text-xs text-gray-400 uppercase tracking-widest">
                    Step 2 of 2
                  </span>
                </div>
                <h2 className="font-display text-display-md text-white">
                  Find your school
                </h2>
                <p className="text-gray-400 text-body-lg max-w-md mx-auto">
                  Connect with your school community and compete in leaderboards.
                </p>
              </div>

              {/* School Selector */}
              <div className="bg-surface/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-card">
                <SchoolSelector
                  value={selectedSchool?.id || null}
                  onChange={handleSchoolSelect}
                  placeholder="Search by name, district, or city..."
                />
              </div>

              {/* Navigation */}
              <div className="flex flex-col gap-4">
                <button
                  onClick={handleStartAssessment}
                  disabled={!selectedSchool}
                  className={`
                    group relative w-full px-8 py-4 
                    bg-prepverse-red text-white font-semibold text-lg 
                    rounded-2xl overflow-hidden 
                    transition-all duration-300 
                    focus:outline-none focus:ring-2 focus:ring-prepverse-red focus:ring-offset-4 focus:ring-offset-void
                    ${!selectedSchool
                      ? 'opacity-50 cursor-not-allowed grayscale'
                      : 'hover:scale-105'
                    }
                  `}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <span className="relative flex items-center justify-center gap-3">
                    Start Assessment
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </span>
                </button>

                <button
                  onClick={handleStartAssessment}
                  className="text-gray-500 hover:text-white text-sm transition-colors py-2"
                >
                  Skip for now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading/Submitting states (from main) */}
        {(step === 'loading' || step === 'submitting') && (
          <div className="min-h-screen flex flex-col items-center justify-center p-8">
            <div className="text-center">
              {/* Loading spinner */}
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-white/10" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-prepverse-red animate-spin" />
              </div>
              <p className="text-lg text-gray-300">
                {step === 'loading' ? 'Loading questions...' : 'Submitting your answers...'}
              </p>
            </div>
          </div>
        )}

        {step === 'quiz' && questions.length > 0 && (
          <div className="min-h-screen flex flex-col p-4 md:p-8">
            {/* Proctoring Violation Modal */}
            {showViolationModal && (
              <FocusViolationModal
                violationCount={violations}
                maxViolations={maxViolations}
                onResume={handleResumeFromViolation}
                onEndSession={handleEndSessionFromViolation}
              />
            )}

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
                  total={questions.length}
                  answeredQuestions={answeredQuestions}
                />
              </div>

              {/* Class badge */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                <span className="font-mono text-xs text-gray-500 uppercase">Class</span>
                <span className="font-display font-bold text-white">{selectedClass}</span>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm text-center">
                {error}
              </div>
            )}

            {/* Progress bar for mobile */}
            <div className="md:hidden mb-8">
              <ProgressIndicator
                current={currentQuestion}
                total={questions.length}
                answeredQuestions={answeredQuestions}
              />
            </div>

            {/* Question card */}
            <div className="flex-1 flex items-center justify-center">
              {(() => {
                const currentQuestionData = questions[currentQuestion - 1];
                if (!currentQuestionData) return null;
                return (
                  <QuestionCard
                    question={currentQuestionData}
                    questionNumber={currentQuestion}
                    totalQuestions={questions.length}
                    selectedAnswer={answers[currentQuestionData.id] || null}
                    onSelectAnswer={handleSelectAnswer}
                    onNext={handleNextQuestion}
                    isLastQuestion={currentQuestion === questions.length}
                  />
                );
              })()}
            </div>

            {/* Bottom progress for desktop */}
            <div className="hidden md:block mt-8">
              <ProgressIndicator
                current={currentQuestion}
                total={questions.length}
                answeredQuestions={answeredQuestions}
              />
            </div>
          </div>
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
