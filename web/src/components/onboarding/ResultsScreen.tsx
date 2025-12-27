import React, { useEffect, useState } from 'react';

interface SubjectScore {
  subject: string;
  correct: number;
  total: number;
  percentage: number;
}

interface ProfileData {
  score: number;
  total: number;
  strengths: string[];
  weaknesses: string[];
  subjectScores: SubjectScore[];
  xpEarned: number;
  level: string;
}

interface InterruptionEvent {
  type: 'tab_switch' | 'window_blur' | 'visibility_change';
  timestamp: number;
  duration?: number;
}

interface SessionTracking {
  startTime: number | null;
  endTime: number | null;
  actualDuration: number;
  totalElapsed: number;
  interruptions: InterruptionEvent[];
  isActive: boolean;
  lastInterruptionStart: number | null;
  focusStatistics?: {
    totalFocusTime: number;
    totalUnfocusTime: number;
    focusPercentage: number;
    longestFocusPeriod: number;
    longestUnfocusPeriod: number;
    averageFocusPeriod: number;
    focusPeriods: number;
    unfocusPeriods: number;
    totalInterruptions: number;
  };
}

interface ResultsScreenProps {
  profile: ProfileData;
  userName: string;
  onContinue: () => void;
  sessionTracking?: SessionTracking;
}

/**
 * ResultsScreen - Dramatic reveal of assessment results
 *
 * Design Philosophy:
 * - Builds anticipation with staggered animations
 * - Score revealed with dramatic counter animation
 * - Strengths/weaknesses presented as visual cards
 * - Gamification elements (XP, level) prominently featured
 * - Subject breakdown with progress bars
 */
export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  profile,
  userName,
  onContinue,
  sessionTracking,
}) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    // Animate score counter
    const targetScore = profile.score;
    const duration = 1500;
    const steps = 30;
    const increment = targetScore / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= targetScore) {
        setAnimatedScore(targetScore);
        clearInterval(timer);
        // Show details after score animation
        setTimeout(() => setShowDetails(true), 500);
        setTimeout(() => setShowProfile(true), 1000);
      } else {
        setAnimatedScore(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [profile.score]);

  const percentage = (profile.score / profile.total) * 100;
  const scoreGrade = percentage >= 80 ? 'Excellent!' : percentage >= 60 ? 'Good job!' : percentage >= 40 ? 'Keep going!' : 'Let\'s improve!';

  const subjectColors: Record<string, string> = {
    mathematics: 'bg-math',
    math: 'bg-math',
    physics: 'bg-physics',
    chemistry: 'bg-chemistry',
    biology: 'bg-biology',
    science: 'bg-cosmic',
  };

  const getSubjectColor = (subject: string) => {
    return subjectColors[subject.toLowerCase()] || 'bg-cosmic';
  };

  // Format duration helper
  const formatDuration = (milliseconds: number): string => {
    const totalSeconds = Math.round(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-4xl space-y-12">
        {/* Header */}
        <div className="text-center space-y-4 opacity-0 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-prepverse-red/10 border border-prepverse-red/20">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-prepverse-red">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span className="text-prepverse-red text-sm font-medium">Assessment Complete</span>
          </div>
          <h1 className="font-display text-display-md text-white">
            Great work, <span className="text-gradient-brand">{userName}</span>!
          </h1>
        </div>

        {/* Main Score Card */}
        <div
          className="relative glass rounded-3xl p-8 overflow-hidden opacity-0 animate-scale-in"
          style={{ animationDelay: '0.3s' }}
        >
          {/* Background decoration */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-prepverse-red/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-cosmic/10 rounded-full blur-3xl" />

          <div className="relative flex flex-col md:flex-row items-center gap-8">
            {/* Score circle */}
            <div className="relative">
              {/* Outer glow ring */}
              <div className="absolute inset-0 rounded-full bg-prepverse-red/20 blur-xl animate-pulse" style={{ transform: 'scale(1.2)' }} />

              {/* Score ring */}
              <div className="relative w-48 h-48">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background ring */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.05)"
                    strokeWidth="8"
                  />
                  {/* Progress ring */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="url(#scoreGradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${percentage * 2.83} ${283 - percentage * 2.83}`}
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#E53935" />
                      <stop offset="50%" stopColor="#FF6F60" />
                      <stop offset="100%" stopColor="#FFD54F" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Score text in center */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-5xl font-bold text-white">
                    {animatedScore}
                  </span>
                  <span className="text-gray-500 font-mono text-sm">/ {profile.total}</span>
                </div>
              </div>
            </div>

            {/* Score details */}
            <div className="flex-1 text-center md:text-left space-y-4">
              <div>
                <h2 className="font-display text-3xl text-white font-bold">{scoreGrade}</h2>
                <p className="text-gray-400 mt-2">
                  You scored {Math.round(percentage)}% in your assessment
                </p>
              </div>

              {/* XP and Level badges */}
              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-solar/10 border border-solar/20">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-solar">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <span className="font-mono text-solar font-bold">+{profile.xpEarned} XP</span>
                </div>

                <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-plasma/10 border border-plasma/20">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-plasma">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                  <span className="font-mono text-plasma font-bold">{profile.level}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subject breakdown */}
        {showDetails && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-0 animate-fade-in" style={{ animationDelay: '0s' }}>
            {profile.subjectScores.map((subject, index) => (
              <div
                key={subject.subject}
                className="glass rounded-2xl p-5 opacity-0 animate-slide-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getSubjectColor(subject.subject)}`} />
                    <span className="font-medium text-white capitalize">{subject.subject}</span>
                  </div>
                  <span className="font-mono text-sm text-gray-400">
                    {subject.correct}/{subject.total}
                  </span>
                </div>

                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${getSubjectColor(subject.subject)} transition-all duration-1000 ease-out`}
                    style={{ width: `${subject.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Session Duration Stats */}
        {showProfile && sessionTracking && sessionTracking.endTime && (
          <div className="glass rounded-2xl p-6 opacity-0 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-cosmic/10 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cosmic">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h3 className="font-display text-xl text-white font-bold">Session Duration</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Actual Duration */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-electric">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span className="text-xs text-gray-400 uppercase font-mono">Active Time</span>
                </div>
                <p className="text-2xl font-bold text-white font-mono">
                  {formatDuration(sessionTracking.actualDuration)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Time spent on quiz</p>
              </div>

              {/* Total Elapsed */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-plasma">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span className="text-xs text-gray-400 uppercase font-mono">Total Time</span>
                </div>
                <p className="text-2xl font-bold text-white font-mono">
                  {formatDuration(sessionTracking.totalElapsed)}
                </p>
                <p className="text-xs text-gray-500 mt-1">From start to finish</p>
              </div>

              {/* Interruptions */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-solar">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  <span className="text-xs text-gray-400 uppercase font-mono">Interruptions</span>
                </div>
                <p className="text-2xl font-bold text-white font-mono">
                  {sessionTracking.interruptions.length}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {sessionTracking.interruptions.length > 0 
                    ? `${formatDuration(sessionTracking.interruptions.reduce((acc, i) => acc + (i.duration || 0), 0))} total`
                    : 'No interruptions'}
                </p>
              </div>
            </div>

            {/* Interruption Details */}
            {sessionTracking.interruptions.length > 0 && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <h4 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Interruption Details</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {sessionTracking.interruptions.map((interruption, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-solar/50" />
                        <span className="text-gray-300 capitalize">
                          {interruption.type.replace('_', ' ')}
                        </span>
                        <span className="text-gray-500 text-xs">
                          {new Date(interruption.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {interruption.duration && (
                        <span className="text-gray-400 font-mono text-xs">
                          {formatDuration(interruption.duration)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Strengths and Weaknesses */}
        {showProfile && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-0 animate-slide-up" style={{ animationDelay: '0s' }}>
            {/* Strengths */}
            <div className="glass rounded-2xl p-6 border-l-4 border-electric">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-electric/10 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-electric">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <h3 className="font-display text-xl text-white font-bold">Your Strengths</h3>
              </div>
              <ul className="space-y-2">
                {profile.strengths.map((strength, index) => (
                  <li
                    key={strength}
                    className="flex items-center gap-3 text-gray-300 opacity-0 animate-slide-in"
                    style={{ animationDelay: `${index * 100 + 200}ms` }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-electric" />
                    <span className="capitalize">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Areas to improve */}
            <div className="glass rounded-2xl p-6 border-l-4 border-solar">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-solar/10 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-solar">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <h3 className="font-display text-xl text-white font-bold">Areas to Improve</h3>
              </div>
              <ul className="space-y-2">
                {profile.weaknesses.map((weakness, index) => (
                  <li
                    key={weakness}
                    className="flex items-center gap-3 text-gray-300 opacity-0 animate-slide-in"
                    style={{ animationDelay: `${index * 100 + 300}ms` }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-solar" />
                    <span className="capitalize">{weakness}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* CTA Button */}
        {showProfile && (
          <div className="flex justify-center pt-4 opacity-0 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <button
              onClick={onContinue}
              className="group relative px-10 py-4 bg-prepverse-red text-white font-semibold text-lg rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-prepverse-red focus:ring-offset-4 focus:ring-offset-void"
            >
              {/* Gradient shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

              <span className="relative flex items-center gap-3">
                Go to Dashboard
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsScreen;
