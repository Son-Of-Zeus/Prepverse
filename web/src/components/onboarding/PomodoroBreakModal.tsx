import React, { useEffect, useState } from 'react';

interface PomodoroBreakModalProps {
  onBreakComplete: () => void;
  breakMinutes?: number; // Custom break duration in minutes
}

/**
 * PomodoroBreakModal - Break timer popup after pomodoro focus time
 */
export const PomodoroBreakModal: React.FC<PomodoroBreakModalProps> = ({
  onBreakComplete,
  breakMinutes = 2,
}) => {
  const breakSecondsTotal = breakMinutes * 60;
  const [breakSeconds, setBreakSeconds] = useState(breakSecondsTotal);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (breakSeconds <= 0) {
      setIsComplete(true);
      // Auto-close after 1 second
      setTimeout(() => {
        onBreakComplete();
      }, 1000);
      return;
    }

    const interval = setInterval(() => {
      setBreakSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [breakSeconds, onBreakComplete, breakSecondsTotal]);

  const minutes = Math.floor(breakSeconds / 60);
  const seconds = breakSeconds % 60;
  const progress = ((breakSecondsTotal - breakSeconds) / breakSecondsTotal) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/95 backdrop-blur-md">
      <div className="relative w-full max-w-md mx-4">
        {/* Background glow */}
        <div className="absolute -inset-4 bg-solar/20 rounded-3xl blur-2xl animate-pulse" />
        
        {/* Modal content */}
        <div className="relative glass rounded-3xl p-8 border border-solar/30 overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-br from-solar/10 via-plasma/10 to-electric/10" />
          
          <div className="relative z-10 text-center space-y-6">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-solar/20 flex items-center justify-center animate-bounce">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-solar">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <div>
              <h2 className="font-display text-3xl text-white font-bold mb-2">
                {isComplete ? 'Break Complete!' : 'Time for a Break'}
              </h2>
              <p className="text-gray-400">
                {isComplete 
                  ? 'Ready to continue?'
                  : `You've completed a focus session. Take a ${breakMinutes}-minute break!`}
              </p>
            </div>

            {/* Timer Display */}
            <div className="relative">
              {/* Circular progress */}
              <div className="relative w-48 h-48 mx-auto">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth="8"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="url(#breakGradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${progress * 2.83} ${283 - progress * 2.83}`}
                    className="transition-all duration-1000 ease-linear"
                  />
                  <defs>
                    <linearGradient id="breakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FFD54F" />
                      <stop offset="100%" stopColor="#FF6F60" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Timer text in center */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono text-4xl font-bold text-white">
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                  </span>
                  <span className="text-sm text-gray-400 mt-1">Break Time</span>
                </div>
              </div>
            </div>

            {/* Action button (only show if not complete) */}
            {!isComplete && (
              <div className="pt-4">
                <button
                  onClick={onBreakComplete}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all duration-300 border border-white/20"
                >
                  Skip Break
                </button>
              </div>
            )}

            {/* Completion message */}
            {isComplete && (
              <div className="pt-4 animate-fade-in">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-electric/20 border border-electric/30">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-electric">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span className="text-electric text-sm font-medium">Returning to session...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PomodoroBreakModal;

