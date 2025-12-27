import React, { useState } from 'react';

interface ClassSelectorProps {
  onSelect: (classLevel: 10 | 12) => void;
  selectedClass?: 10 | 12 | null;
}

/**
 * ClassSelector - Bold, unconventional class selection UI
 *
 * Design Philosophy:
 * - Large, dramatic cards that break from typical radio button patterns
 * - Each class has its own personality through color and typography
 * - Hover states create "magnetic" pull effect
 * - Selection triggers satisfying visual feedback
 */
export const ClassSelector: React.FC<ClassSelectorProps> = ({
  onSelect,
  selectedClass = null,
}) => {
  const [hoveredClass, setHoveredClass] = useState<10 | 12 | null>(null);

  const classes = [
    {
      level: 10 as const,
      label: 'Class X',
      subtitle: 'CBSE Board',
      description: 'Foundation mastery for board excellence',
      subjects: ['Mathematics', 'Science', 'Social Studies'],
      color: 'from-electric/20 to-cosmic/20',
      accentColor: 'bg-electric',
      textColor: 'text-electric',
      icon: '10',
    },
    {
      level: 12 as const,
      label: 'Class XII',
      subtitle: 'CBSE Board',
      description: 'Advanced prep for competitive edge',
      subjects: ['Mathematics', 'Physics', 'Chemistry'],
      color: 'from-prepverse-red/20 to-solar/20',
      accentColor: 'bg-prepverse-red',
      textColor: 'text-prepverse-red',
      icon: '12',
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12 space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
          <span className="w-2 h-2 rounded-full bg-prepverse-red animate-pulse" />
          <span className="font-mono text-xs text-gray-400 uppercase tracking-widest">
            Step 1 of 2
          </span>
        </div>
        <h2 className="font-display text-display-md text-white">
          Which class are you in?
        </h2>
        <p className="text-gray-400 text-body-lg max-w-md mx-auto">
          We will personalize your learning journey based on your current grade.
        </p>
      </div>

      {/* Class Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {classes.map((classOption, index) => {
          const isSelected = selectedClass === classOption.level;
          const isHovered = hoveredClass === classOption.level;

          return (
            <button
              key={classOption.level}
              onClick={() => onSelect(classOption.level)}
              onMouseEnter={() => setHoveredClass(classOption.level)}
              onMouseLeave={() => setHoveredClass(null)}
              className={`
                group relative overflow-hidden
                p-8 rounded-3xl
                text-left
                transition-all duration-500 ease-out
                focus:outline-none focus:ring-2 focus:ring-prepverse-red focus:ring-offset-4 focus:ring-offset-void
                opacity-0 animate-slide-up
              `}
              style={{
                animationDelay: `${index * 150}ms`,
                transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                background: isSelected
                  ? `linear-gradient(135deg, ${classOption.level === 10 ? 'rgba(0, 255, 209, 0.1)' : 'rgba(229, 57, 53, 0.1)'} 0%, rgba(26, 26, 36, 0.8) 100%)`
                  : 'rgba(26, 26, 36, 0.6)',
                backdropFilter: 'blur(20px)',
                border: isSelected
                  ? `2px solid ${classOption.level === 10 ? 'rgba(0, 255, 209, 0.5)' : 'rgba(229, 57, 53, 0.5)'}`
                  : '1px solid rgba(255, 255, 255, 0.05)',
                boxShadow: isSelected
                  ? `0 0 40px ${classOption.level === 10 ? 'rgba(0, 255, 209, 0.15)' : 'rgba(229, 57, 53, 0.15)'}`
                  : isHovered
                    ? '0 20px 60px rgba(0, 0, 0, 0.3)'
                    : '0 4px 24px rgba(0, 0, 0, 0.2)',
              }}
            >
              {/* Background gradient on hover */}
              <div
                className={`
                  absolute inset-0 bg-gradient-to-br ${classOption.color}
                  opacity-0 group-hover:opacity-100
                  transition-opacity duration-500
                `}
              />

              {/* Large background number */}
              <div
                className="absolute -right-4 -bottom-8 font-display font-black text-[12rem] leading-none opacity-[0.03] select-none"
                style={{
                  transform: isHovered ? 'translate(-10px, -10px)' : 'translate(0, 0)',
                  transition: 'transform 0.5s ease-out',
                }}
              >
                {classOption.icon}
              </div>

              {/* Content */}
              <div className="relative z-10 space-y-6">
                {/* Class number badge */}
                <div className="flex items-center justify-between">
                  <div
                    className={`
                      px-4 py-2 rounded-xl ${classOption.accentColor}
                      font-display font-bold text-xl text-white
                      transition-transform duration-300
                      ${isHovered ? 'scale-110' : 'scale-100'}
                    `}
                  >
                    {classOption.icon}
                  </div>

                  {/* Selection indicator */}
                  <div
                    className={`
                      w-6 h-6 rounded-full border-2
                      flex items-center justify-center
                      transition-all duration-300
                      ${isSelected
                        ? `${classOption.accentColor} border-transparent`
                        : 'border-white/20 bg-transparent'
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
                        className="animate-scale-in"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Label */}
                <div>
                  <h3 className="font-display text-2xl text-white font-bold">
                    {classOption.label}
                  </h3>
                  <p className="font-mono text-sm text-gray-500 uppercase tracking-wider">
                    {classOption.subtitle}
                  </p>
                </div>

                {/* Description */}
                <p className="text-gray-400 text-body-md">
                  {classOption.description}
                </p>

                {/* Subject pills */}
                <div className="flex flex-wrap gap-2">
                  {classOption.subjects.map((subject, i) => (
                    <span
                      key={subject}
                      className={`
                        px-3 py-1 rounded-full
                        text-xs font-mono
                        bg-white/5 text-gray-400
                        border border-white/5
                        transition-all duration-300
                        ${isHovered ? `${classOption.textColor} border-current/20` : ''}
                      `}
                      style={{
                        transitionDelay: `${i * 50}ms`,
                      }}
                    >
                      {subject}
                    </span>
                  ))}
                </div>

                {/* Arrow indicator */}
                <div
                  className={`
                    flex items-center gap-2 ${classOption.textColor}
                    transition-all duration-300
                    ${isHovered ? 'translate-x-2 opacity-100' : 'translate-x-0 opacity-0'}
                  `}
                >
                  <span className="text-sm font-medium">Select this class</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ClassSelector;
