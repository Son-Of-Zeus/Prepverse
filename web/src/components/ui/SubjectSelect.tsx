import React, { useState, useRef, useEffect } from 'react';

interface SubjectSelectProps {
    subjects: string[];
    selectedSubject: string;
    onSelect: (subject: string) => void;
}

export const SubjectSelect: React.FC<SubjectSelectProps> = ({
    subjects,
    selectedSubject,
    onSelect,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-sm font-medium text-white"
            >
                <span>{selectedSubject}</span>
                <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[#0F1115] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in origin-top-right">
                    <div className="py-1">
                        {subjects.map((subject) => (
                            <button
                                key={subject}
                                onClick={() => {
                                    onSelect(subject);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedSubject === subject
                                        ? 'bg-prepverse-red/10 text-prepverse-red'
                                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                {subject}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <polyline points="6 9 12 15 18 9" />
    </svg>
);
