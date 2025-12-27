import { useNavigate, useLocation } from 'react-router-dom';
import { Trophy, Home, RotateCcw, Clock, Target, CheckCircle2, XCircle } from 'lucide-react';
import { CosmicBackground } from '../components/ui/CosmicBackground';
import { CelebrationModal } from '../components/ui/CelebrationModal';
import { SessionResult } from '../types/practice';
import { useState } from 'react';


interface LocationState {
    results?: SessionResult;
    topic?: {
        display_name: string;
    };
    celebration?: {
        oldMastery: number;
        newMastery: number;
    };
}


export const PracticeResults = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state as LocationState;
    const { results, topic, celebration } = state || {}; // celebration passed from session
    const [showCelebration, setShowCelebration] = useState(!!celebration);


    if (!results) {
        return (
            <div className="min-h-screen bg-void flex items-center justify-center text-white">
                <div className="text-center">
                    <h1 className="text-2xl font-display mb-4">No Results Found</h1>
                    <button onClick={() => navigate('/practice')} className="btn-primary">
                        Return to Practice
                    </button>
                </div>
            </div>
        );
    }

    const { accuracy, score, totalQuestions, timeTaken } = results;

    // Helper to format time
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    return (
        <div className="min-h-screen bg-void text-white p-6 md:p-12 flex flex-col items-center justify-center relative overflow-hidden">
            <CosmicBackground starCount={60} showOrbs={true} />

            <div className="relative z-10 text-center max-w-lg w-full animate-scale-in">
                {/* Score Circle */}
                <div className="mb-10 relative inline-block">
                    <div className="absolute inset-0 bg-prepverse-red blur-3xl opacity-20 animate-pulse-glow" />
                    <div className="relative w-32 h-32 bg-gradient-to-br from-prepverse-red to-orange-500 rounded-full flex items-center justify-center mx-auto shadow-glow-lg border-4 border-white/10">
                        <Trophy size={48} className="text-white drop-shadow-md" />
                    </div>
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-surface border border-white/10 px-4 py-1 rounded-full text-sm font-mono text-solar whitespace-nowrap">
                        {topic?.display_name || 'Practice Session'}
                    </div>
                </div>

                <h1 className="text-5xl font-display font-bold mb-2 text-transparent bg-clip-text bg-gradient-brand">
                    Session Complete!
                </h1>
                <p className="text-gray-400 mb-10 font-sans text-lg">Excellence is a habit, not an act.</p>

                {/* Grid of Stats */}
                <div className="grid grid-cols-2 gap-4 mb-10">
                    <div className="glass p-6 rounded-2xl flex flex-col items-center hover-lift animate-slide-up delay-100">
                        <Target className="w-8 h-8 text-electric mb-2" />
                        <div className="text-4xl font-mono font-bold text-white mb-1">{accuracy}%</div>
                        <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">Accuracy</div>
                    </div>
                    <div className="glass p-6 rounded-2xl flex flex-col items-center hover-lift animate-slide-up delay-200">
                        <CheckCircle2 className="w-8 h-8 text-prepverse-red-light mb-2" />
                        <div className="text-4xl font-mono font-bold text-white mb-1">{score}<span className="text-lg text-gray-500">/{totalQuestions}</span></div>
                        <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">Score</div>
                    </div>
                    <div className="glass p-6 rounded-2xl flex flex-col items-center hover-lift animate-slide-up delay-300">
                        <Clock className="w-8 h-8 text-solar mb-2" />
                        <div className="text-2xl font-mono font-bold text-white mb-1 mt-2">{formatTime(timeTaken)}</div>
                        <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">Time</div>
                    </div>
                    <div className="glass p-6 rounded-2xl flex flex-col items-center hover-lift animate-slide-up delay-400">
                        <XCircle className="w-8 h-8 text-gray-500 mb-2" />
                        <div className="text-4xl font-mono font-bold text-white mb-1">{results.incorrectCount}</div>
                        <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">Incorrect</div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4 justify-center animate-fade-in delay-500">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex-1 px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all font-bold flex items-center justify-center gap-2 border border-white/5 hover:border-white/20"
                    >
                        <Home size={20} />
                        Home
                    </button>
                    <button
                        onClick={() => navigate('/practice')}
                        className="flex-1 px-6 py-4 bg-prepverse-red hover:bg-prepverse-red-light text-white rounded-xl transition-all font-bold flex items-center justify-center gap-2 shadow-glow-md hover:shadow-glow-lg hover:-translate-y-1"
                    >
                        <RotateCcw size={20} />
                        New Session
                    </button>
                </div>
            </div>

            {/* Celebration Overlay */}
            {
                celebration && (
                    <CelebrationModal
                        isOpen={showCelebration}
                        onClose={() => setShowCelebration(false)}
                        subject={topic?.display_name || 'Subject'}
                        oldMastery={celebration.oldMastery}
                        newMastery={celebration.newMastery}
                    />
                )
            }
        </div >
    );
};


