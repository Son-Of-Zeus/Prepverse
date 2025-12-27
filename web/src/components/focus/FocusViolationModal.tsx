import React, { useEffect, useState } from 'react';

interface FocusViolationModalProps {
    violationCount: number;
    maxViolations: number;
    onResume: () => void;
    onEndSession: () => void;
}

export const FocusViolationModal: React.FC<FocusViolationModalProps> = ({
    violationCount,
    maxViolations,
    onResume,
    onEndSession,
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const isFinal = violationCount >= maxViolations;

    useEffect(() => {
        // Small delay to allow animation
        setIsVisible(true);
    }, []);

    const handleResume = () => {
        setIsVisible(false);
        setTimeout(onResume, 300); // Wait for transition
    };

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${isVisible ? 'bg-black/80 backdrop-blur-sm' : 'bg-transparent pointer-events-none'}`}>
            <div
                className={`
           w-full max-w-md bg-[#0F1116] border border-red-500/20 rounded-2xl p-8 
           shadow-[0_0_50px_rgba(229,57,53,0.15)] transform transition-all duration-300
           ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
        `}
            >
                <div className="flex flex-col items-center text-center">
                    {/* Icon */}
                    <div className="w-20 h-20 mb-6 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 relative">
                        <div className="absolute inset-0 rounded-full animate-ping bg-red-500/5"></div>
                        <span className="text-4xl">⚠️</span>
                    </div>

                    <h2 className="text-2xl font-display font-bold text-white mb-2">
                        {isFinal ? "Session Terminated" : "Focus Alert"}
                    </h2>

                    <p className="text-gray-400 mb-6 leading-relaxed">
                        {isFinal
                            ? "Max violations reached. To maintain integrity, this session has been ended."
                            : "You left the focus window. Switching tabs or minimizing is disallowed during Focus Mode."
                        }
                    </p>

                    {!isFinal && (
                        <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm font-bold mb-8 uppercase tracking-wider">
                            Warning {violationCount} of {maxViolations}
                        </div>
                    )}

                    <div className="flex gap-3 w-full">
                        {!isFinal && (
                            <button
                                onClick={handleResume}
                                className="flex-1 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                I'm Back
                            </button>
                        )}
                        <button
                            onClick={onEndSession}
                            className={`flex-1 py-3 border border-white/10 text-white rounded-xl hover:bg-white/5 transition-colors ${isFinal ? 'bg-red-600 border-red-500 hover:bg-red-700 w-full' : ''}`}
                        >
                            Start Over
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
