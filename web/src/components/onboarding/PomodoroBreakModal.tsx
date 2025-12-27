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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/90 backdrop-blur-xl">
      <div className="relative w-full max-w-lg mx-4 group">

        {/* Atmosphere: Grainy Texture & Glow */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20 pointer-events-none" />
        <div className="absolute -inset-0.5 bg-gradient-to-br from-solar via-plasma to-electric rounded-[2rem] blur opacity-40 group-hover:opacity-60 transition-opacity duration-1000" />

        {/* Modal content */}
        <div className="relative bg-[#0F0F12] rounded-[2rem] p-10 border border-white/5 overflow-hidden shadow-2xl">

          {/* subtle moving background sheen */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

          <div className="relative z-10 flex flex-col items-center text-center space-y-8">

            {/* Typography: Distinctive Layout */}
            <div className="space-y-2 animate-slide-up">
              <span className="font-mono text-xs tracking-[0.2em] text-solar uppercase opacity-80">
                {isComplete ? 'Session Resumed' : 'Restoration Phase'}
              </span>
              <h2 className="font-display text-4xl md:text-5xl text-white leading-tight">
                {isComplete ? (
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">Ready?</span>
                ) : (
                  <span className="italic">Breathe.</span>
                )}
              </h2>
            </div>

            {/* Timer: The Centerpiece */}
            <div className="relative w-64 h-64 animate-scale-in delay-100">
              {/* Decorative rings */}
              <div className="absolute inset-0 rounded-full border border-white/5 animate-spin-slow" />
              <div className="absolute inset-4 rounded-full border border-white/5 animate-reverse-spin" />

              <svg className="w-full h-full transform -rotate-90 drop-shadow-[0_0_15px_rgba(255,213,79,0.3)]" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#1F1F2E" // bg-elevated
                  strokeWidth="2"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="url(#breakGradient)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${progress * 2.83} ${283 - progress * 2.83}`}
                  className="transition-all duration-1000 ease-linear"
                />
                <defs>
                  <linearGradient id="breakGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FFD54F" />
                    <stop offset="50%" stopColor="#FF6F60" />
                    <stop offset="100%" stopColor="#B388FF" />
                  </linearGradient>
                </defs>
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="font-mono text-6xl font-light text-white tracking-tighter">
                  {String(minutes).padStart(2, '0')}
                  <span className="animate-pulse text-white/50">:</span>
                  {String(seconds).padStart(2, '0')}
                </div>
              </div>
            </div>

            <div className="space-y-4 w-full animate-slide-up delay-200">
              {/* Action button */}
              {!isComplete ? (
                <button
                  onClick={onBreakComplete}
                  className="group/btn relative w-full overflow-hidden rounded-xl bg-white/5 hover:bg-white/10 px-6 py-4 transition-all duration-300 border border-white/10"
                >
                  <span className="relative z-10 font-mono text-sm tracking-widest uppercase text-gray-300 group-hover/btn:text-white transition-colors">
                    Skip / Resume Focus
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-solar/0 via-solar/10 to-solar/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 text-solar font-medium">
                  <span className="w-2 h-2 rounded-full bg-solar animate-ping" />
                  Initializing next session...
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default PomodoroBreakModal;

