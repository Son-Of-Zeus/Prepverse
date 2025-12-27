import { useState, useEffect, useRef } from 'react';

import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../api/client';
import { CosmicBackground } from '../components/ui/CosmicBackground';
import { AlertCircle, CheckCircle2, Clock, ShieldAlert, X, LogOut } from 'lucide-react';

import { FocusViolationModal } from '../components/focus/FocusViolationModal';

import { StartSessionResponse, NextQuestionResponse, QuestionForSession, SubmitAnswerResponse, SessionResult } from '../types/practice';
import { saveProgress, getProgress } from '../utils/progress';



// --- Icons ---
// Re-importing specific icons needed
import { ArrowLeft, ArrowRight } from 'lucide-react';


// --- Interfaces ---


interface LocationState {
    config: {
        difficulty: 'easy' | 'medium' | 'hard' | 'adaptive' | null;

        questionCount: number | null;
        timer: string | null;
    };
    topic: {
        id: string; // This might be the Unit ID or Topic ID based on DB
        subject: string;
        topic: string; // The topic NAME
        display_name: string;
    };
}

// --- Components ---
const PomodoroTimer = ({ duration, onComplete }: { duration: number; onComplete: () => void }) => {
    const [timeLeft, setTimeLeft] = useState(duration);

    // Sync with prop updates if backend sends new remaining time, but prioritize smooth local countdown
    useEffect(() => {
        setTimeLeft(duration);
    }, [duration]);

    useEffect(() => {
        if (timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft((p) => {
                if (p <= 1) {
                    clearInterval(timer);
                    onComplete();
                    return 0;
                }
                return p - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft, onComplete]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const isUrgent = timeLeft < 60;

    if (duration <= 0) return null;

    return (
        <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur border border-slate-700/50 rounded-full px-4 py-2 shadow-lg hover:border-slate-600 transition-colors">
            <Clock size={16} className={isUrgent ? "text-prepverse-red animate-pulse" : "text-blue-400"} />
            <span className={`font-mono text-xl font-bold ${isUrgent ? "text-prepverse-red" : "text-white"}`}>
                {formatTime(timeLeft)}
            </span>
        </div>
    );
};

// --- Page Component ---
export const PracticeSession = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state as LocationState;

    // Session State
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [currentQ, setCurrentQ] = useState<QuestionForSession | null>(null);
    const [sessionStats, setSessionStats] = useState<{
        totalQuestions: number;
        currentNumber: number;
        score: number;
        accuracy: number;
    }>({ totalQuestions: 0, currentNumber: 0, score: 0, accuracy: 0 });

    // UI State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ isCorrect: boolean; correct: string; explanation: string } | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<number>(0);

    // Proctoring State
    const [violations, setViolations] = useState(0);
    const [showViolationModal, setShowViolationModal] = useState(false);
    const [showPreSessionWarning, setShowPreSessionWarning] = useState(true);
    const [showQuitConfirm, setShowQuitConfirm] = useState(false);
    const maxViolations = 3;

    const interruptionStartRef = useRef<number | null>(null);


    // Title Effect
    useEffect(() => {
        if (state?.topic?.display_name) {
            document.title = `${state.topic.display_name} - Practice`;
        }
        return () => { document.title = 'PrepVerse'; };
    }, [state]);

    // Start Session (only after warning is acknowledged)
    useEffect(() => {
        if (!state?.config || !state?.topic) {
            navigate('/practice');
            return;
        }

        // Don't start until warning is dismissed
        if (showPreSessionWarning) return;

        const initSession = async () => {
            // Avoid double init
            if (sessionId) return;

            try {
                setLoading(true);
                // 1. Create Session
                const startPayload = {
                    subject: state.topic.subject,
                    topic: state.topic.topic,
                    difficulty: state.config.difficulty === 'adaptive' ? null : state.config.difficulty,

                    question_count: state.config.questionCount || 10,
                    time_limit_seconds: state.config.timer === 'No Timer' ? null :
                        (state.config.timer === '15 Mins' ? 900 :
                            state.config.timer === '30 Mins' ? 1800 :
                                state.config.timer === '45 Mins' ? 2700 : null)
                };

                const startRes = await apiClient.post<StartSessionResponse>('/practice/session/start', startPayload);
                const sid = startRes.data.session_id;
                setSessionId(sid);

                if (startRes.data.time_limit_seconds) {
                    setTimeRemaining(startRes.data.time_limit_seconds);
                }

                // 2. Fetch First Question
                await fetchNextQuestion(sid);

            } catch (err: any) {
                console.error("Session Init Error:", err);
                const details = err.response?.data?.detail
                    ? (typeof err.response.data.detail === 'object' ? JSON.stringify(err.response.data.detail) : err.response.data.detail)
                    : err.message || "Connection Failed";
                setError(`Failed to Start Session: ${details}`);
                setLoading(false);
            }
        };

        if (!sessionId) initSession();

    }, [state, navigate, showPreSessionWarning]);

    const fetchNextQuestion = async (sid: string) => {
        try {
            setLoading(true);
            setFeedback(null);
            setSelectedOption(null);

            const nextRes = await apiClient.get<NextQuestionResponse>(`/practice/session/${sid}/next`);

            setCurrentQ(nextRes.data.question);
            setSessionStats(prev => ({
                ...prev,
                currentNumber: nextRes.data.current_question_number,
                totalQuestions: nextRes.data.total_questions,
            }));

            if (nextRes.data.time_remaining_seconds) {
                setTimeRemaining(nextRes.data.time_remaining_seconds);
            }

            setLoading(false);
        } catch (err: any) {
            // 404 on 'next' usually means session over or no more questions
            if (err.response?.status === 404) {
                console.log("No more questions. Ending session.");
                await handleEndSession(sid);
            } else {
                setError("Failed to load next question");
                setLoading(false);
            }
        }
    };

    const handleOptionSelect = (option: string) => {
        if (isSubmitting || feedback) return; // Prevent change after submit
        setSelectedOption(option);
    };

    const handleSubmitAnswer = async () => {
        if (!selectedOption || !sessionId || !currentQ) return;

        setIsSubmitting(true);
        try {
            // Assuming approximate time taken for this question implies current time slice
            // Backend tracks robustly, frontend just sends local estimate or 0
            const res = await apiClient.post<SubmitAnswerResponse>(`/practice/session/${sessionId}/submit`, {
                answer: selectedOption,
                time_taken_seconds: 30 // hardcoded estimate or calc delta
            });

            setFeedback({
                isCorrect: res.data.is_correct,
                correct: res.data.correct_answer,
                explanation: res.data.explanation
            });

            setSessionStats(prev => ({
                ...prev,
                score: res.data.current_score,
                accuracy: res.data.current_accuracy
            }));

        } catch (err) {
            console.error("Submit Error:", err);
            // If submit fails, maybe retry or alert
            alert("Failed to submit answer. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNext = async () => {
        if (sessionId) {
            await fetchNextQuestion(sessionId);
        }
    };

    const handleEndSession = async (sid = sessionId) => {
        if (!sid) return;
        try {
            // Use /review endpoint or /end to get summary
            const endRes = await apiClient.post(`/practice/session/${sid}/end`);
            const summary = endRes.data.summary;

            // 1. Get Old Progress
            const allProgress = getProgress();
            const subjectKey = state.topic.subject.toLowerCase();
            const oldAccuracy = allProgress[subjectKey]?.averageAccuracy || 0;

            // 2. Save New Progress
            saveProgress(state.topic.subject, summary.correct_answers, summary.total_questions);

            // 3. Get New Progress
            const updatedProgress = getProgress();
            const newAccuracy = updatedProgress[subjectKey]?.averageAccuracy || 0;
            const hasImproved = newAccuracy > oldAccuracy;

            // Map to SessionResult for ResultsPage
            const result: SessionResult = {
                score: summary.correct_answers,
                totalQuestions: summary.total_questions,
                correctCount: summary.correct_answers,
                incorrectCount: summary.wrong_answers,
                unansweredCount: summary.skipped,
                timeTaken: summary.total_time_seconds,
                accuracy: summary.score_percentage,
                timestamp: summary.ended_at
            };

            navigate('/practice/results', {
                state: {
                    results: result,
                    topic: state.topic,
                    celebration: hasImproved ? {
                        oldMastery: oldAccuracy,
                        newMastery: newAccuracy
                    } : null
                }
            });


        } catch (err) {
            console.error("End Session Error:", err);
            navigate('/practice'); // Fallback
        }
    };

    const handleQuit = () => {
        // Show custom modal instead of window.confirm
        setShowQuitConfirm(true);
    };

    const confirmQuit = () => {
        handleEndSession();
    };

    const cancelQuit = () => {
        setShowQuitConfirm(false);
    };


    // Proctoring handlers
    const handleResumeFromViolation = () => {
        setShowViolationModal(false);
    };

    const handleEndSessionFromViolation = () => {
        // Terminated due to violations - don't save any stats, just exit
        setShowViolationModal(false);
        navigate('/practice');
    };

    // Proctoring: Monitor tab switching & window blur
    useEffect(() => {
        if (!sessionId || loading || showViolationModal) return;

        const handleVisibilityChange = () => {
            if (document.hidden && !interruptionStartRef.current) {
                interruptionStartRef.current = Date.now();
                setViolations((prev) => {
                    const newCount = prev + 1;
                    setShowViolationModal(true);
                    return newCount;
                });
            } else if (!document.hidden && interruptionStartRef.current) {
                interruptionStartRef.current = null;
            }
        };

        const handleBlur = () => {
            if (document.hidden) return;
            if (!interruptionStartRef.current) {
                interruptionStartRef.current = Date.now();
                setViolations((prev) => {
                    const newCount = prev + 1;
                    setShowViolationModal(true);
                    return newCount;
                });
            }
        };

        const handleFocus = () => {
            if (interruptionStartRef.current) {
                interruptionStartRef.current = null;
            }
        };

        // Prevent right-click
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
    }, [sessionId, loading, showViolationModal]);

    // --- Render Logic ---

    // Pre-Session Warning
    if (showPreSessionWarning) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center font-sans p-4">
                <CosmicBackground starCount={40} />
                <div className="relative z-10 w-full max-w-lg">
                    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
                        {/* Icon */}
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                            <ShieldAlert size={40} className="text-amber-500" />
                        </div>

                        <h2 className="text-2xl font-display font-bold text-white text-center mb-4">
                            Focus Mode Active
                        </h2>

                        <div className="space-y-4 mb-8">
                            <p className="text-gray-400 text-center leading-relaxed">
                                This session is proctored. Please stay focused on this window.
                            </p>

                            <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <X size={14} className="text-red-400" />
                                    </div>
                                    <p className="text-sm text-gray-300">
                                        <span className="font-semibold text-white">Don't switch tabs</span> - Changing tabs or windows will count as a violation
                                    </p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <X size={14} className="text-red-400" />
                                    </div>
                                    <p className="text-sm text-gray-300">
                                        <span className="font-semibold text-white">Don't minimize</span> - Minimizing the browser will also be detected
                                    </p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <AlertCircle size={14} className="text-amber-400" />
                                    </div>
                                    <p className="text-sm text-gray-300">
                                        <span className="font-semibold text-white">3 violations = termination</span> - Session ends with no progress saved
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => navigate('/practice')}
                                className="flex-1 py-3 border border-slate-600 text-slate-300 font-medium rounded-xl hover:bg-slate-800 transition-colors"
                            >
                                Go Back
                            </button>
                            <button
                                onClick={() => setShowPreSessionWarning(false)}
                                className="flex-1 py-3 bg-prepverse-red text-white font-bold rounded-xl hover:bg-prepverse-red/90 transition-colors shadow-lg shadow-prepverse-red/20"
                            >
                                I Understand
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Safety Loading State
    if (loading && !currentQ) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center font-sans">
                <CosmicBackground starCount={30} />
                <div className="flex flex-col items-center gap-4 animate-pulse">
                    <div className="w-16 h-16 rounded-full border-4 border-t-prepverse-red border-slate-800 animate-spin" />
                    <p className="text-white text-lg font-display tracking-wide">Initializing Arena...</p>
                </div>
            </div>
        );
    }

    // Error State
    if (error) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-sans">
                <CosmicBackground starCount={20} />
                <div className="glass p-8 rounded-2xl max-w-lg w-full text-center border border-red-500/30 bg-slate-900/80 backdrop-blur-xl shadow-2xl">
                    <ShieldAlert size={64} className="mx-auto text-red-500 mb-6 drop-shadow-lg" />
                    <h2 className="text-2xl font-display mb-2 text-white">Subject Content Issues</h2>
                    <p className="text-slate-400 mb-8 leading-relaxed">
                        Unable to stabilize the simulation.
                        <br /><span className="text-xs opacity-50 mt-2 block font-mono bg-black/30 p-2 rounded">{error}</span>
                    </p>
                    <button
                        onClick={() => navigate('/practice')}
                        className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all font-bold border border-slate-700 hover:border-slate-600 text-white"
                    >
                        Return to Base
                    </button>
                </div>
            </div>
        );
    }

    // Loaded State (currentQ exists)
    if (!currentQ) return null; // Should be handled by loading state

    const progressPercent = (sessionStats.currentNumber / (sessionStats.totalQuestions || 1)) * 100;

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-prepverse-red/30 overflow-hidden flex flex-col">
            <CosmicBackground starCount={40} showGrid={false} />

            {/* Proctoring Violation Modal */}
            {showViolationModal && (
                <FocusViolationModal
                    violationCount={violations}
                    maxViolations={maxViolations}
                    onResume={handleResumeFromViolation}
                    onEndSession={handleEndSessionFromViolation}
                />
            )}

            {/* Quit Confirmation Modal */}
            {showQuitConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl relative animate-scale-in">
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                            <LogOut size={32} className="text-red-500" />
                        </div>

                        <h3 className="text-2xl font-display font-bold text-white text-center mb-2">
                            End Session?
                        </h3>

                        <p className="text-slate-400 text-center mb-8 leading-relaxed">
                            Are you sure you want to quit? Your progress will be saved but the session will end.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={cancelQuit}
                                className="flex-1 py-3 px-4 rounded-xl font-medium border border-white/10 text-slate-300 hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmQuit}
                                className="flex-1 py-3 px-4 rounded-xl font-bold bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-900/20 transition-all transform hover:scale-[1.02]"
                            >
                                Quit Session
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Top Progress Bar */}
            <div className="fixed top-0 left-0 right-0 h-1 bg-slate-900 z-50">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="h-full bg-gradient-brand shadow-glow-sm"
                />
            </div>

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 p-6 flex items-center justify-between z-50 pointer-events-none">
                {/* Left: Quit - Pointer Events Auto */}
                <button
                    onClick={handleQuit}
                    className="pointer-events-auto p-3 rounded-full bg-slate-900/50 backdrop-blur border border-white/10 text-slate-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/50 transition-all group"
                >
                    <X size={24} className="group-hover:text-red-400 transition-colors" />
                </button>

                {/* Right: Status - Pointer Events Auto */}
                <div className="pointer-events-auto flex items-center gap-4">
                    <span className="px-3 py-1 rounded-full bg-slate-900/50 border border-slate-700 text-xs font-mono text-slate-400">
                        {sessionStats.currentNumber} / {sessionStats.totalQuestions}
                    </span>
                    {timeRemaining > 0 && (
                        <PomodoroTimer duration={timeRemaining} onComplete={handleEndSession} />
                    )}
                </div>
            </header>


            {/* Main Arena */}
            <main className="flex-1 flex flex-col justify-center items-center px-4 md:px-6 relative z-10 max-w-4xl mx-auto w-full pb-20">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentQ.id}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.3, ease: "circOut" }}
                        className="w-full"
                    >
                        {/* Question Card */}
                        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 md:p-12 rounded-3xl shadow-2xl relative overflow-hidden group hover:border-slate-700 transition-colors">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-prepverse-red/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                            <h2 className="text-2xl md:text-3xl font-display leading-relaxed mb-8 relative z-10 text-white/90">
                                {currentQ.question}
                            </h2>

                            <div className="grid gap-3 relative z-10">
                                {currentQ.options.map((optText, idx) => {
                                    // Mapping: If logic needs Option Object, we treat optText as ID here.
                                    // Backend sends simple string list.
                                    const isSelected = selectedOption === optText;
                                    const isCorrect = feedback?.correct === optText;
                                    const isWrong = feedback && isSelected && !feedback.isCorrect;

                                    let borderClass = "border-transparent";
                                    let bgClass = "bg-slate-800/40 hover:bg-slate-800 hover:border-slate-700";
                                    let textClass = "text-slate-300";

                                    if (feedback) {
                                        if (isCorrect) {
                                            borderClass = "border-green-500";
                                            bgClass = "bg-green-500/10";
                                            textClass = "text-white";
                                        } else if (isWrong) {
                                            borderClass = "border-red-500";
                                            bgClass = "bg-red-500/10";
                                            textClass = "text-white";
                                        } else {
                                            bgClass = "opacity-50";
                                        }
                                    } else if (isSelected) {
                                        borderClass = "border-blue-500";
                                        bgClass = "bg-blue-600/10 shadow-[0_0_15px_rgba(59,130,246,0.2)]";
                                        textClass = "text-white font-medium";
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleOptionSelect(optText)}
                                            disabled={!!feedback}
                                            className={`
                                                relative w-full text-left p-4 rounded-xl border-2 transition-all duration-200 group/opt
                                                ${borderClass} ${bgClass}
                                            `}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`
                                                    w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold border transition-colors
                                                    ${isSelected || isCorrect ? "border-transparent bg-white/10 text-white" : "border-slate-700 text-slate-500"}
                                                `}>
                                                    {String.fromCharCode(65 + idx)}
                                                </div>
                                                <span className={`text-lg flex-1 ${textClass}`}>
                                                    {optText}
                                                </span>
                                                {isCorrect && <CheckCircle2 className="text-green-500" />}
                                                {isWrong && <AlertCircle className="text-red-500" />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Feedback Area */}
                            {feedback && (
                                <div className="mt-8 p-6 bg-white/5 rounded-xl border-l-4 border-l-prepverse-red animate-slide-in">
                                    <h4 className="font-display text-lg mb-2 text-white">Explanation</h4>
                                    <p className="text-slate-300 leading-relaxed">
                                        {feedback.explanation}
                                    </p>
                                </div>
                            )}

                        </div>
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Bottom Nav */}
            <div className="fixed bottom-0 inset-x-0 p-6 z-50 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent pointer-events-none">
                <div className="max-w-4xl mx-auto flex items-center justify-between pointer-events-auto">

                    {/* Previous Button (Visual Only) */}
                    <button
                        disabled
                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-slate-500 opacity-50 cursor-not-allowed hover:bg-white/5 transition-colors border border-transparent"
                    >
                        <ArrowLeft size={18} />
                        <span>Previous</span>
                    </button>

                    {/* Action Button */}
                    {!feedback ? (
                        <button
                            onClick={handleSubmitAnswer}
                            disabled={!selectedOption || isSubmitting}
                            className={`
                                flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all transform hover:-translate-y-1 active:translate-y-0
                                ${!selectedOption || isSubmitting
                                    ? 'bg-slate-800 cursor-not-allowed opacity-50 border border-white/5'
                                    : 'bg-blue-600 hover:bg-blue-500 hover:shadow-blue-500/25 shadow-blue-900/20 border border-transparent'
                                }
                            `}
                        >
                            <span>Submit Answer</span>
                            {isSubmitting ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <ArrowRight size={18} />
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-900/20 transition-all transform hover:-translate-y-1 active:translate-y-0"
                        >
                            <span>
                                {sessionStats.currentNumber === sessionStats.totalQuestions ? 'Finish Session' : 'Next Question'}
                            </span>
                            <ArrowRight size={18} />
                        </button>
                    )}
                </div>
            </div>

        </div>
    );
};
