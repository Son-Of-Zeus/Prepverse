import React, { useEffect, useState, useRef } from 'react';

interface AssessmentTimerProps {
  totalSeconds: number;
  onTimeUp: () => void;
  isPaused?: boolean;
}

/**
 * AssessmentTimer - A dramatic, visually engaging countdown timer
 */
export const AssessmentTimer: React.FC<AssessmentTimerProps> = ({
  totalSeconds,
  onTimeUp,
  isPaused = false,
}) => {
  const [remainingSeconds, setRemainingSeconds] = useState(totalSeconds);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }

          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, onTimeUp]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const progress = (remainingSeconds / totalSeconds) * 100;
  const isWarning = remainingSeconds <= 60;
  const isCritical = remainingSeconds <= 30;

  // SVG circle calculations
  const size = 80;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative">
      {/* Background glow when warning */}
      {isWarning && (
        <div
          className={`
            absolute inset-0 rounded-full blur-xl
            ${isCritical ? 'animate-pulse bg-prepverse-red/30' : 'bg-solar/20'}
          `}
          style={{ transform: 'scale(1.2)' }}
        />
      )}

      {/* Timer container */}
      <div
        className={`
          relative flex items-center gap-4 px-5 py-3 rounded-2xl
          backdrop-blur-md transition-all duration-500
          ${isCritical
            ? 'bg-prepverse-red/10 border-prepverse-red/30'
            : isWarning
              ? 'bg-solar/10 border-solar/30'
              : 'bg-white/5 border-white/10'
          }
          border
        `}
      >
        {/* Circular progress */}
        <div className="relative">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="transform -rotate-90"
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth={strokeWidth}
            />

            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={
                isCritical
                  ? '#E53935'
                  : isWarning
                    ? '#FFD54F'
                    : 'url(#timerGradient)'
              }
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-linear"
            />

            <defs>
              <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E53935" />
                <stop offset="100%" stopColor="#FF6F60" />
              </linearGradient>
            </defs>
          </svg>

          {/* Clock icon in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className={`
                transition-colors duration-300
                ${isCritical ? 'text-prepverse-red' : isWarning ? 'text-solar' : 'text-gray-400'}
              `}
            >
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
              <path
                d="M12 6v6l4 2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Digital display */}
        <div className="flex flex-col">
          <span
            className={`
              font-mono text-2xl font-bold tracking-wider
              transition-colors duration-300
              ${isCritical ? 'text-prepverse-red' : isWarning ? 'text-solar' : 'text-white'}
            `}
          >
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
          <span className="font-mono text-xs text-gray-500 uppercase tracking-widest">
            {isCritical ? 'Hurry up!' : isWarning ? 'Almost done' : 'Remaining'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AssessmentTimer;
