import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { apiClient } from '../api/client';
import { CosmicBackground } from '../components/ui/CosmicBackground';
import {
    Code, Cpu, Database, Globe,
    Layout, Server, Smartphone, Terminal,
    BookOpen, AlertCircle, Calculator, Atom,
    ArrowRight, Clock, Layers, Sparkles, X, ChevronLeft,
    Monitor, Box, Zap
} from 'lucide-react';
import { getProgress } from '../utils/progress';
import { useAuth } from '../hooks/useAuth';



// --- Interfaces ---

interface TopicInfo { // Renamed from Topic to TopicInfo as per instruction's implied type
    id: string;
    subject: string;
    topic: string;
    display_name: string;
    description?: string;
    icon?: string;
    question_count: number;
}

interface TopicsResponse {
    class_level: number;
    subjects: string[];
    topics: TopicInfo[];
}

interface PracticeConfig {
    difficulty: 'easy' | 'medium' | 'hard' | null;
    questionCount: number | null;
    timer: string | null;
}


// --- Icons & Helpers ---

const getIconForSubject = (subject: string | undefined) => {
    if (!subject) return BookOpen;
    const normalized = subject.toLowerCase();

    if (normalized.includes('operating') || normalized.includes('os')) return Cpu;
    if (normalized.includes('database') || normalized.includes('sql')) return Database;
    if (normalized.includes('algo') || normalized.includes('data structure')) return Code;
    if (normalized.includes('web') || normalized.includes('html')) return Globe;
    if (normalized.includes('network')) return Server;
    if (normalized.includes('mobile') || normalized.includes('android')) return Smartphone;
    if (normalized.includes('linux') || normalized.includes('bash')) return Terminal;
    if (normalized.includes('design') || normalized.includes('ui')) return Layout;
    if (normalized.includes('math')) return Calculator;
    if (normalized.includes('physics') || normalized.includes('chemistry')) return Atom;
    if (normalized.includes('computer')) return Monitor;
    if (normalized.includes('java')) return Box;

    return BookOpen;
};

// --- Internal Components ---

const RocketIcon = ({ className, size }: { className?: string; size?: number }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size || 24}
        height={size || 24}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
        <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
);

// --- Memoized Components ---

const TabProgress = React.memo(({ subject }: { subject: string }) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const data = getProgress();
        const stats = data[subject.toLowerCase()];
        if (stats && stats.totalSessions > 0) {
            setProgress(stats.averageAccuracy);
        }
    }, [subject]);

    if (progress === 0) return null;

    const isComplete = progress === 100;
    const color = isComplete ? "text-emerald-400" : "text-blue-400";

    return (
        <div className="flex items-center gap-1.5 ml-2">
            <span className={`text-[10px] font-mono ${color}`}>{progress}%</span>
            <svg className="w-3 h-3 -rotate-90">
                <circle cx="6" cy="6" r="5" fill="none" stroke="#1e293b" strokeWidth="2" />
                <circle
                    cx="6" cy="6" r="5" fill="none"
                    stroke={isComplete ? "#34d399" : "#60a5fa"}
                    strokeWidth="2"
                    strokeDasharray="31.4"
                    strokeDashoffset={31.4 - (31.4 * progress) / 100}
                    className="transition-all duration-1000"
                />
            </svg>
        </div>
    );
});

const SubjectTab = React.memo(({
    active,
    subject,
    onClick
}: {
    active: boolean;
    subject: string;
    onClick: () => void
}) => {
    const Icon = getIconForSubject(subject);

    return (
        <button
            onClick={onClick}
            className={`
                flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300 border font-medium text-sm whitespace-nowrap
                ${active
                    ? 'bg-prepverse-red text-white border-prepverse-red shadow-glow-sm'
                    : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20'
                }
            `}
        >
            <Icon size={16} />
            <span className="uppercase tracking-wide">{subject}</span>
            <TabProgress subject={subject} />
        </button>
    );
});

const ChapterCard = React.memo(({ topic, onClick }: { topic: TopicInfo; onClick: () => void }) => {
    const Icon = getIconForSubject(topic.subject);

    return (
        <div
            className="glass p-6 hover-lift cursor-pointer animate-fade-in group relative overflow-hidden flex flex-col h-full"
            onClick={onClick}
        >
            <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="p-3 bg-white/5 rounded-xl text-gray-300 group-hover:text-prepverse-red group-hover:bg-prepverse-red/10 transition-colors">
                    <Icon size={24} />
                </div>
                <span className="text-xs font-mono text-gray-500 bg-void px-2 py-1 rounded border border-white/5">
                    {topic.question_count} Qs
                </span>
            </div>

            <h3 className="text-lg font-display text-white mb-2 group-hover:text-prepverse-red-light transition-colors relative z-10">
                {topic.display_name}
            </h3>

            <p className="text-sm text-gray-400 line-clamp-2 mb-6 font-sans relative z-10 flex-grow">
                {topic.description || "Master these concepts through adaptive practice questions."}
            </p>

            <div className="mt-auto flex items-center text-xs text-prepverse-red font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 relative z-10">
                Start Practice <ArrowRight size={14} className="ml-1" />
            </div>

            {/* Subtle Gradient Overlay on Hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-prepverse-red/0 to-prepverse-red/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>
    );
});




// --- Config Wizard Modal ---

const ConfigWizard = ({
    topic,
    onClose,
    onLaunch
}: {
    topic: TopicInfo;

    onClose: () => void;
    onLaunch: (config: PracticeConfig) => void;
}) => {
    const [step, setStep] = useState(1);
    const [config, setConfig] = useState<PracticeConfig>({
        difficulty: null,
        questionCount: null,
        timer: null
    });

    const handleNext = (key: keyof PracticeConfig, value: any) => {
        setConfig(prev => ({ ...prev, [key]: value }));
        if (step < 3) {
            setStep(step + 1);
        }
    };

    const handleTimerSelect = (time: string) => {
        const finalConfig = { ...config, timer: time };
        setConfig(finalConfig);
        onLaunch(finalConfig);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="glass w-full max-w-2xl rounded-2xl overflow-hidden shadow-card relative animate-scale-in border border-white/10">
                {/* Modal Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <div>
                        <h2 className="text-xl font-display text-white flex items-center gap-2">
                            <Sparkles size={18} className="text-solar" />
                            Configure Session
                        </h2>
                        <p className="text-sm text-gray-400 font-sans">Target: <span className="text-prepverse-red-light">{topic.display_name}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="h-1 bg-surface w-full">
                    <div
                        className="h-full bg-gradient-brand transition-all duration-500 ease-smooth"
                        style={{ width: `${step * 33.33}%` }}
                    />
                </div>

                {/* Wizard Content */}
                <div className="p-8 min-h-[350px] flex flex-col justify-center">
                    {step === 1 && (
                        <div className="space-y-8 animate-slide-in">
                            <h3 className="text-center text-xl text-white font-display">Select Difficulty</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    { id: 'easy', label: 'Easy', color: 'bg-green-500', desc: 'Warm up' },
                                    { id: 'medium', label: 'Medium', color: 'bg-solar', desc: 'Standard' },
                                    { id: 'hard', label: 'Hard', color: 'bg-prepverse-red', desc: 'Challenge' }
                                ].map((level) => (
                                    <button
                                        key={level.id}
                                        onClick={() => handleNext('difficulty', level.id)}
                                        className="group relative p-6 rounded-xl border border-white/5 bg-surface hover:bg-elevated transition-all hover:-translate-y-1 hover:shadow-lg flex flex-col items-center gap-3"
                                    >
                                        <div className={`w-12 h-12 rounded-full ${level.color} bg-opacity-20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                                            <Zap size={20} className={level.color.replace('bg-', 'text-')} />
                                        </div>
                                        <span className="font-display text-lg text-white">{level.label}</span>
                                        <span className="text-xs text-gray-500 uppercase tracking-widest">{level.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-8 animate-slide-in">
                            <h3 className="text-center text-xl text-white font-display">Number of Questions</h3>
                            <div className="grid grid-cols-4 gap-4">
                                {[5, 10, 15, 20].map((count) => (
                                    <button
                                        key={count}
                                        onClick={() => handleNext('questionCount', count)}
                                        className="py-6 rounded-xl border border-white/5 bg-surface hover:bg-elevated hover:border-prepverse-red/50 transition-all group"
                                    >
                                        <span className="font-mono text-3xl font-bold text-white group-hover:text-prepverse-red transition-colors">{count}</span>
                                        <p className="text-xs text-gray-500 mt-1">Questions</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-8 animate-slide-in">
                            <h3 className="text-center text-xl text-white font-display">Set a Timer</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {['No Timer', '15 Mins', '30 Mins', '45 Mins'].map((time) => (
                                    <button
                                        key={time}
                                        onClick={() => handleTimerSelect(time)}
                                        className="p-4 rounded-xl border border-white/5 bg-surface hover:bg-elevated hover:border-cosmic transition-all flex items-center justify-between group"
                                    >
                                        <span className="font-display text-lg text-white group-hover:text-cosmic transition-colors">{time}</span>
                                        <Clock size={20} className="text-gray-500 group-hover:text-cosmic" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Page Component ---

// --- Loading Skeleton ---

const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="glass h-64 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                <div className="flex justify-between mb-4">
                    <div className="w-12 h-12 bg-white/5 rounded-xl" />
                    <div className="w-16 h-6 bg-white/5 rounded" />
                </div>
                <div className="w-3/4 h-8 bg-white/5 rounded mb-4" />
                <div className="w-full h-16 bg-white/5 rounded" />
            </div>
        ))}
    </div>
);

// --- Page Component ---

export const PracticePage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Data State
    const [activeSubject, setActiveSubject] = useState<string>('mathematics');
    const [selectedTopic, setSelectedTopic] = useState<TopicInfo | null>(null);
    const [topics, setTopics] = useState<TopicInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [subjects, setSubjects] = useState<string[]>([]);

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await apiClient.get<TopicsResponse>('/practice/topics');

                const topicsList = response.data.topics;
                setTopics(topicsList);

                // Extract unique subjects
                const uniqueSubjects = Array.from(new Set(topicsList.map(t => t.subject)));
                setSubjects(uniqueSubjects);

                if (uniqueSubjects.length > 0) {
                    setActiveSubject(uniqueSubjects[0] as string);
                }
            } catch (err: any) {
                console.error('Failed fetch:', err);
                setError(err.response?.data?.detail || 'Connection failed');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Filtered Content - Memoized
    const activeChapters = useMemo(() =>
        topics.filter(t => t.subject === activeSubject),
        [topics, activeSubject]);

    // Launch Handler
    const handleLaunch = (config: PracticeConfig) => {
        if (selectedTopic) {
            console.log('Launching with config:', config);
            navigate(`/practice/session/${selectedTopic.id}`, {
                state: {
                    config,
                    topic: selectedTopic
                }
            });
        }
    };

    return (
        <div className="relative min-h-screen w-full bg-void flex flex-col">
            <CosmicBackground starCount={60} showGrid={false} />

            {selectedTopic && (
                <ConfigWizard
                    topic={selectedTopic}
                    onClose={() => setSelectedTopic(null)}
                    onLaunch={handleLaunch}
                />
            )}

            {/* Sticky Header */}
            <header className="sticky top-0 z-50 backdrop-blur-xl bg-void/80 border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    {/* Top Row: Brand & Profile */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Layers className="text-prepverse-red" size={24} />
                                <h1 className="font-display text-2xl text-white">PrepVerse</h1>
                            </div>
                            <div className="h-6 w-px bg-white/10 mx-2" />
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-all border border-white/5 hover:border-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                            >
                                <ChevronLeft size={16} />
                                <span className="text-xs font-medium uppercase tracking-wide">Dashboard</span>
                            </button>
                        </div>

                        {/* User Profile */}
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-white">{user?.full_name || 'Student'}</p>
                            </div>

                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-prepverse-red to-cosmic p-0.5">
                                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                                    <span className="font-display font-bold text-white">{user?.full_name?.charAt(0) || 'U'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Horizontal Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar mask-fade-right">
                        {subjects.map(subject => (
                            <SubjectTab
                                key={subject}
                                active={activeSubject === subject}
                                subject={subject}
                                onClick={() => setActiveSubject(subject)}
                            />
                        ))}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 relative z-10">
                <div className="mb-6 flex items-end justify-between">
                    <div>
                        <h2 className="text-3xl font-display text-white mb-2 flex items-center gap-3 animate-slide-in">
                            {(() => {
                                if (!activeSubject) return null;
                                const Icon = getIconForSubject(activeSubject);
                                return Icon ? <Icon size={32} className="text-prepverse-red" /> : null;
                            })()}
                            <span className="capitalize">{activeSubject}</span>
                        </h2>
                        <p className="text-gray-400 font-sans">
                            {activeChapters.length} Chapters available
                        </p>
                    </div>
                </div>

                {error ? (
                    <div className="flex flex-col items-center justify-center h-64 text-prepverse-red border-2 border-dashed border-prepverse-red/30 rounded-3xl bg-prepverse-red/5">
                        <AlertCircle className="mb-4" size={48} />
                        <p className="text-xl font-display">Failed to load content</p>
                        <p className="text-sm font-mono mt-2 opacity-80">{error}</p>
                    </div>
                ) : loading ? (
                    <LoadingSkeleton />
                ) : activeChapters.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {activeChapters.map((topic, index) => (
                            <div key={topic.id} style={{ animationDelay: `${index * 50}ms` }} className="animate-fade-in">
                                <ChapterCard
                                    topic={topic}
                                    onClick={() => setSelectedTopic(topic)}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="glass flex flex-col items-center justify-center h-80 text-gray-500 rounded-3xl p-10 text-center">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                            <RocketIcon className="text-gray-600" size={40} />
                        </div>
                        <h3 className="text-2xl font-display text-white mb-2">Coming Soon</h3>
                        <p className="text-gray-400 max-w-sm">No chapters available for this subject yet. Check back later for updates!</p>
                    </div>
                )}
            </main>
        </div>
    );
};

