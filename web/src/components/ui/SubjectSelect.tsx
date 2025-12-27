import React, { useState, useRef, useEffect } from 'react';

interface SubjectSelectProps {
  subjects: string[];
  selectedSubject: string;
  onSelect: (subject: string) => void;
}

const subjectColors: Record<string, { bg: string; text: string; border: string }> = {
  'mathematics': { bg: 'bg-math/20', text: 'text-math', border: 'border-math/30' },
  'physics': { bg: 'bg-physics/20', text: 'text-physics', border: 'border-physics/30' },
  'chemistry': { bg: 'bg-chemistry/20', text: 'text-chemistry', border: 'border-chemistry/30' },
  'biology': { bg: 'bg-biology/20', text: 'text-biology', border: 'border-biology/30' },
};

const defaultColors = { bg: 'bg-surface-variant', text: 'text-white', border: 'border-surface-variant' };

export const SubjectSelect: React.FC<SubjectSelectProps> = ({ subjects, selectedSubject, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getSubjectColor = (subject: string) => {
    return subjectColors[subject.toLowerCase()] ?? defaultColors;
  };

  const selectedColor = getSubjectColor(selectedSubject);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center space-x-2 px-4 py-2 rounded-3xl border transition-all duration-300
          ${isOpen ? 'ring-2 ring-electric border-electric' : `${selectedColor.border} hover:border-white/30`}
          bg-surface-variant/50 backdrop-blur-sm
        `}
      >
        <span className={`font-medium text-sm ${selectedColor.text}`}>{selectedSubject}</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-surface border border-surface-variant rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="p-1 space-y-1">
            {subjects.map((subject) => {
              const colors = getSubjectColor(subject);
              const isSelected = selectedSubject === subject;
              
              return (
                <button
                  key={subject}
                  onClick={() => {
                    onSelect(subject);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors
                    ${isSelected ? 'bg-surface-variant' : 'hover:bg-surface-variant/50'}
                  `}
                >
                  <span className={`text-sm font-medium ${colors.text}`}>{subject}</span>
                  {isSelected && (
                    <div className={`w-2 h-2 rounded-full ${colors.bg.replace('/20', '')}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
