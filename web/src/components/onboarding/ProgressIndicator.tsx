import React from 'react';

interface ProgressIndicatorProps {
  current: number;
  total: number;
  answeredQuestions: Set<number>;
}

/**
 * ProgressIndicator - Visual representation of quiz progress
 *
 * Design Philosophy:
 * - Segmented bar showing individual question status
 * - Each segment is interactive (shows question number on hover)
 * - Completed, current, and upcoming states clearly distinguished
 * - Gradient fill for completed portion creates sense of achievement
 */
export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  current,
  total,
  answeredQuestions,
}) => {
  const percentage = (current / total) * 100;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {/* Segmented progress */}
      <div className="flex gap-1.5">
        {Array.from({ length: total }, (_, index) => {
          const questionNum = index + 1;
          const isCompleted = answeredQuestions.has(questionNum);
          const isCurrent = questionNum === current;
          const isUpcoming = questionNum > current;

          return (
            <div
              key={questionNum}
              className={`
                group relative flex-1 h-2 rounded-full
                transition-all duration-300 cursor-pointer
                ${isCompleted
                  ? 'bg-prepverse-red'
                  : isCurrent
                    ? 'bg-prepverse-red/50 animate-pulse'
                    : 'bg-white/10'
                }
                ${isCurrent ? 'scale-y-150' : 'hover:scale-y-125'}
              `}
            >
              {/* Tooltip */}
              <div
                className={`
                  absolute -top-10 left-1/2 -translate-x-1/2
                  px-2 py-1 rounded-lg
                  bg-elevated border border-white/10
                  font-mono text-xs
                  opacity-0 group-hover:opacity-100
                  transition-opacity duration-200
                  pointer-events-none whitespace-nowrap
                  ${isCompleted ? 'text-prepverse-red' : isCurrent ? 'text-white' : 'text-gray-500'}
                `}
              >
                Q{questionNum}
                {isCompleted && ' - Done'}
                {isCurrent && ' - Current'}
              </div>

              {/* Glow for current */}
              {isCurrent && (
                <div className="absolute inset-0 rounded-full bg-prepverse-red/30 blur-sm" />
              )}
            </div>
          );
        })}
      </div>

      {/* Text progress */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-mono text-gray-500">
          {answeredQuestions.size} of {total} answered
        </span>

        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-prepverse-red to-prepverse-red-light transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="font-mono text-prepverse-red font-bold">
            {Math.round(percentage)}%
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * QuestionDots - Alternative minimal progress indicator
 * Shows dots for each question with status
 */
export const QuestionDots: React.FC<{
  current: number;
  total: number;
  answeredQuestions: Set<number>;
  onJump?: (questionNum: number) => void;
}> = ({ current, total, answeredQuestions, onJump }) => {
  return (
    <div className="flex items-center gap-2 flex-wrap justify-center">
      {Array.from({ length: total }, (_, index) => {
        const questionNum = index + 1;
        const isCompleted = answeredQuestions.has(questionNum);
        const isCurrent = questionNum === current;

        return (
          <button
            key={questionNum}
            onClick={() => onJump?.(questionNum)}
            disabled={!onJump}
            className={`
              relative w-8 h-8 rounded-lg
              font-mono text-xs font-bold
              transition-all duration-300
              focus:outline-none focus:ring-2 focus:ring-prepverse-red focus:ring-offset-2 focus:ring-offset-void
              ${isCompleted
                ? 'bg-prepverse-red text-white'
                : isCurrent
                  ? 'bg-prepverse-red/20 text-prepverse-red border-2 border-prepverse-red'
                  : 'bg-white/5 text-gray-500 hover:bg-white/10'
              }
              ${onJump ? 'cursor-pointer' : 'cursor-default'}
            `}
          >
            {questionNum}

            {/* Current indicator ring */}
            {isCurrent && (
              <span className="absolute inset-0 rounded-lg border-2 border-prepverse-red animate-ping opacity-50" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ProgressIndicator;
