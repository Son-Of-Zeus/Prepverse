import React, { useState, useEffect } from 'react';

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

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer: string | null;
  onSelectAnswer: (optionId: string) => void;
  onNext: () => void;
  isLastQuestion: boolean;
}

/**
 * QuestionCard - Gamified MCQ component with bold visual design
 *
 * Design Philosophy:
 * - Options are large, interactive tiles with magnetic hover effects
 * - Selection creates satisfying visual feedback with scale and glow
 * - Subject/Topic metadata uses accent colors for easy identification
 * - Keyboard navigation fully supported
 * - Answer selection triggers micro-animations
 */
export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  onSelectAnswer,
  onNext,
  isLastQuestion,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);

  useEffect(() => {
    setIsVisible(false);
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, [question.id]);

  const defaultColor = { bg: 'bg-cosmic/10', text: 'text-cosmic', border: 'border-cosmic/30' };

  const subjectColors: Record<string, typeof defaultColor> = {
    mathematics: { bg: 'bg-math/10', text: 'text-math', border: 'border-math/30' },
    math: { bg: 'bg-math/10', text: 'text-math', border: 'border-math/30' },
    physics: { bg: 'bg-physics/10', text: 'text-physics', border: 'border-physics/30' },
    chemistry: { bg: 'bg-chemistry/10', text: 'text-chemistry', border: 'border-chemistry/30' },
    biology: { bg: 'bg-biology/10', text: 'text-biology', border: 'border-biology/30' },
    science: defaultColor,
  };

  const getSubjectColor = (subject: string) => {
    const key = subject.toLowerCase();
    return subjectColors[key] ?? defaultColor;
  };

  const colors = getSubjectColor(question.subject);
  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <div
      className={`
        w-full max-w-3xl mx-auto space-y-8
        transition-all duration-500 ease-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
      `}
    >
      {/* Question header with metadata */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Subject/Topic badge */}
        <div className="flex items-center gap-2">
          <span
            className={`
              px-3 py-1.5 rounded-lg
              font-mono text-xs uppercase tracking-wider
              ${colors.bg} ${colors.text} border ${colors.border}
            `}
          >
            {question.subject}
          </span>
          <span className="text-gray-600">/</span>
          <span className="font-mono text-xs text-gray-500 uppercase">
            {question.topic}
          </span>
        </div>

        {/* Question counter */}
        <div className="flex items-center gap-3">
          <span className="font-display text-lg text-white font-bold">
            {questionNumber}
          </span>
          <span className="text-gray-600">/</span>
          <span className="font-mono text-sm text-gray-500">
            {totalQuestions}
          </span>
        </div>
      </div>

      {/* Question text */}
      <div className="glass rounded-2xl p-8 border border-white/5">
        <h2 className="font-display text-heading-lg text-white leading-relaxed">
          {question.text}
        </h2>
      </div>

      {/* Options grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === option.id;
          const isHovered = hoveredOption === option.id;
          const label = optionLabels[index];

          return (
            <button
              key={option.id}
              onClick={() => onSelectAnswer(option.id)}
              onMouseEnter={() => setHoveredOption(option.id)}
              onMouseLeave={() => setHoveredOption(null)}
              className={`
                group relative overflow-hidden
                p-6 rounded-2xl text-left
                transition-all duration-300 ease-out
                focus:outline-none focus:ring-2 focus:ring-prepverse-red focus:ring-offset-2 focus:ring-offset-void
                ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}
              `}
              style={{
                transitionDelay: `${index * 75}ms`,
                background: isSelected
                  ? 'rgba(229, 57, 53, 0.1)'
                  : 'rgba(26, 26, 36, 0.6)',
                border: isSelected
                  ? '2px solid rgba(229, 57, 53, 0.5)'
                  : '1px solid rgba(255, 255, 255, 0.05)',
                transform: isHovered && !isSelected ? 'scale(1.02)' : 'scale(1)',
                boxShadow: isSelected
                  ? '0 0 30px rgba(229, 57, 53, 0.15)'
                  : isHovered
                    ? '0 10px 40px rgba(0, 0, 0, 0.2)'
                    : 'none',
              }}
            >
              {/* Hover gradient */}
              <div
                className={`
                  absolute inset-0 bg-gradient-to-br from-prepverse-red/5 to-transparent
                  transition-opacity duration-300
                  ${isHovered && !isSelected ? 'opacity-100' : 'opacity-0'}
                `}
              />

              {/* Content */}
              <div className="relative flex items-start gap-4">
                {/* Option label */}
                <div
                  className={`
                    flex-shrink-0 w-10 h-10 rounded-xl
                    flex items-center justify-center
                    font-display font-bold text-lg
                    transition-all duration-300
                    ${isSelected
                      ? 'bg-prepverse-red text-white scale-110'
                      : 'bg-white/5 text-gray-400 group-hover:bg-white/10 group-hover:text-white'
                    }
                  `}
                >
                  {label}
                </div>

                {/* Option text */}
                <span
                  className={`
                    flex-1 pt-2 text-body-md
                    transition-colors duration-300
                    ${isSelected ? 'text-white' : 'text-gray-300 group-hover:text-white'}
                  `}
                >
                  {option.text}
                </span>

                {/* Selection indicator */}
                <div
                  className={`
                    absolute right-4 top-1/2 -translate-y-1/2
                    w-6 h-6 rounded-full
                    flex items-center justify-center
                    transition-all duration-300
                    ${isSelected
                      ? 'bg-prepverse-red scale-100 opacity-100'
                      : 'bg-white/10 scale-75 opacity-0 group-hover:opacity-50'
                    }
                  `}
                >
                  {isSelected && (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Ripple effect on selection */}
              {isSelected && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 rounded-full bg-prepverse-red/20 animate-ping" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Next button */}
      <div className="flex justify-end pt-4">
        <button
          onClick={onNext}
          disabled={!selectedAnswer}
          className={`
            group relative px-8 py-4 rounded-2xl
            font-semibold text-lg
            transition-all duration-300
            focus:outline-none focus:ring-2 focus:ring-prepverse-red focus:ring-offset-2 focus:ring-offset-void
            ${selectedAnswer
              ? 'bg-prepverse-red text-white hover:scale-105 hover:shadow-glow-md'
              : 'bg-white/5 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          <span className="relative flex items-center gap-3">
            {isLastQuestion ? 'Finish Assessment' : 'Next Question'}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`
                transition-transform duration-300
                ${selectedAnswer ? 'group-hover:translate-x-1' : ''}
              `}
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </span>
        </button>
      </div>

      {/* Keyboard hint */}
      <div className="text-center">
        <p className="text-gray-600 text-sm">
          <span className="font-mono text-xs px-2 py-1 rounded bg-white/5 text-gray-500 mr-2">A-D</span>
          to select
          <span className="mx-2 text-gray-700">|</span>
          <span className="font-mono text-xs px-2 py-1 rounded bg-white/5 text-gray-500 mr-2">Enter</span>
          to continue
        </p>
      </div>
    </div>
  );
};

export default QuestionCard;
