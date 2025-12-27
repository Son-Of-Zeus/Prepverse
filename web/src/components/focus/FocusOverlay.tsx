import React from 'react';
import { useFocus } from '../../contexts/FocusContext';

interface FocusOverlayProps {
    onExpand: () => void;
}

export const FocusOverlay: React.FC<FocusOverlayProps> = ({ onExpand }) => {
    const { isActive, timeRemaining, totalTime, isPaused, pauseSession, resumeSession, stopSession } = useFocus();

    if (!isActive) return null;

    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const progress = (timeRemaining / totalTime) * 100;

    // Tiny circular progress calc
    const size = 40;
    const strokeWidth = 3;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in shadow-glow-lg">
            <div className="bg-surface/90 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-4 shadow-2xl">

                {/* Timer Circle */}
                <div className="relative w-10 h-10 flex items-center justify-center cursor-pointer" onClick={onExpand}>
                    <svg width={size} height={size} className="transform -rotate-90">
                        <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth={strokeWidth} fill="none" />
                        <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            stroke="#E53935"
                            strokeWidth={strokeWidth}
                            fill="none"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute text-[10px] font-mono text-white">
                        {minutes}
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-white font-mono leading-none mb-1">
                        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                        {isPaused ? 'Paused' : 'Focusing'}
                    </span>
                </div>

                <div className="flex items-center gap-2 border-l border-white/10 pl-4 ml-1">
                    <button
                        onClick={isPaused ? resumeSession : pauseSession}
                        className="p-2 hover:bg-white/10 rounded-lg text-white transition-colors"
                    >
                        {isPaused ? (
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        ) : (
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                        )}
                    </button>
                    <button
                        onClick={stopSession}
                        className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                    >
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z" /></svg>
                    </button>
                </div>

                {/* Expand Button */}
                <button onClick={onExpand} className="absolute -top-2 -right-2 w-6 h-6 bg-surface border border-white/10 rounded-full flex items-center justify-center text-xs text-gray-400 hover:text-white hover:border-white/30 transition-all">
                    ⤢
                </button>
            </div>
        </div>
    );
};
