import React, { useEffect, useState } from 'react';
import { AlertTriangle, XCircle, RefreshCw, LogOut } from 'lucide-react';

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
        setIsVisible(true);
    }, []);

    const handleResume = async () => {
        // Attempt to restore fullscreen
        try {
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            } else if ((document.documentElement as any).webkitRequestFullscreen) {
                await (document.documentElement as any).webkitRequestFullscreen();
            }
        } catch (err) {
            console.warn("Could not auto-restore fullscreen:", err);
        }

        setIsVisible(false);
        setTimeout(onResume, 300);
    };

    const handleExit = () => {
        setIsVisible(false);
        setTimeout(onEndSession, 300);
    };

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${isVisible ? 'bg-black/90 backdrop-blur-xl' : 'bg-transparent pointer-events-none'}`}>
            <div
                className={`
           w-full max-w-md glass rounded-3xl p-8 border border-white/10
           shadow-[0_0_50px_rgba(229,57,53,0.15)] transform transition-all duration-300 relative overflow-hidden
           ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
        `}
            >
                {/* Background red pulse */}
                <div className="absolute inset-0 bg-gradient-to-br from-prepverse-red/5 to-transparent animate-pulse pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center text-center">
                    {/* Icon */}
                    <div className="w-24 h-24 mb-6 relative">
                        <div className="absolute inset-0 bg-red-500/10 rounded-full animate-ping opacity-75" />
                        <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center border border-red-500/30 backdrop-blur-sm">
                            {isFinal ? (
                                <XCircle className="text-red-500" size={48} />
                            ) : (
                                <AlertTriangle className="text-amber-500" size={48} />
                            )}
                        </div>
                    </div>

                    <h2 className="text-2xl font-display font-bold text-white mb-2">
                        {isFinal ? "Session Terminated" : "Focus Violation"}
                    </h2>

                    <p className="text-gray-400 mb-6 leading-relaxed">
                        {isFinal
                            ? "Max violations reached. To maintain integrity, this session has been ended. No progress will be saved."
                            : "You left the focus window. Switching tabs or exiting fullscreen is not allowed."
                        }
                    </p>

                    {!isFinal && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 text-sm font-bold mb-8 uppercase tracking-wider">
                            <AlertTriangle size={14} />
                            <span>Warning {violationCount} of {maxViolations}</span>
                        </div>
                    )}

                    <div className="w-full space-y-3">
                        {isFinal ? (
                            <button
                                onClick={handleExit}
                                className="group relative w-full px-8 py-4 bg-[#E53935] text-white font-sans font-semibold text-lg rounded-2xl shadow-[0_10px_30px_rgba(229,57,53,0.3)] hover:shadow-[0_20px_40px_rgba(229,57,53,0.5)] hover:-translate-y-1 hover:bg-[#D32F2F] transition-all duration-300 ease-out flex items-center justify-center gap-3 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                <LogOut className="text-white" size={20} />
                                <span className="relative">Exit Session</span>
                            </button>
                        ) : (
                            <button
                                onClick={handleResume}
                                className="group relative w-full px-8 py-4 bg-[#E53935] text-white font-sans font-semibold text-lg rounded-2xl shadow-[0_10px_30px_rgba(229,57,53,0.3)] hover:shadow-[0_20px_40px_rgba(229,57,53,0.5)] hover:-translate-y-1 hover:bg-[#D32F2F] transition-all duration-300 ease-out flex items-center justify-center gap-3"
                            >
                                <RefreshCw size={20} className="text-white group-hover:rotate-180 transition-transform duration-500" />
                                <span className="relative">I'm Back</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
