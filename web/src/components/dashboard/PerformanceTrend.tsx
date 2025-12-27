import React, { useMemo, useState } from 'react';
import { RecentScore } from '../../hooks/useDashboard';

interface PerformanceTrendProps {
    data: RecentScore[];
}

export const PerformanceTrend: React.FC<PerformanceTrendProps> = ({ data }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];
        // Sort by date ascending
        return [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-10); // Show last 10
    }, [data]);

    if (chartData.length === 0) {
        return (
            <div className="h-64 flex flex-col items-center justify-center text-gray-500 bg-white/5 rounded-2xl border border-dashed border-white/10">
                <div className="w-16 h-16 mb-4 opacity-50">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                </div>
                <p>No test data available</p>
                <p className="text-xs text-gray-600">Complete practice sessions to see your analysis</p>
            </div>
        );
    }

    // Helper for subject colors (Neon palette)
    const getBarColorInfo = (subject?: string | null) => {
        const s = subject?.toLowerCase() || '';
        if (s.includes('math')) return { base: '#3b82f6', glow: 'rgba(59, 130, 246, 0.5)' }; // Blue
        if (s.includes('phys')) return { base: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.5)' }; // Violet
        if (s.includes('chem')) return { base: '#10b981', glow: 'rgba(16, 185, 129, 0.5)' }; // Emerald
        if (s.includes('bio')) return { base: '#f43f5e', glow: 'rgba(244, 63, 94, 0.5)' }; // Rose
        return { base: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.5)' };
    };

    return (
        <div className="w-full h-64 relative group flex flex-col justify-end pb-8">
            {/* Tech Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] opacity-20 pointer-events-none" />

            <div className="absolute inset-0 flex items-end justify-between px-2 md:px-6 pt-8 pb-8 gap-2 md:gap-4">
                {/* Y-Axis Lines (Dashed) */}
                {[0, 25, 50, 75, 100].map((val) => (
                    <div
                        key={val}
                        className="absolute left-0 right-0 border-t border-dashed border-white/10 text-[9px] font-mono text-gray-600 pl-1 flex items-center"
                        style={{ bottom: `${val}%` }}
                    >
                        <span className="bg-bg-void px-1">{val}%</span>
                    </div>
                ))}

                {/* Bars - Holographic Pillars */}
                {chartData.map((d, i) => {
                    const height = d.score;
                    const { base, glow } = getBarColorInfo(d.subject);
                    const isHovered = hoveredIndex === i;

                    return (
                        <div
                            key={i}
                            className="relative flex-1 h-full flex items-end group/bar z-10"
                            onMouseEnter={() => setHoveredIndex(i)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            {/* Bar Container */}
                            <div
                                className={`w-full relative transition-all duration-500 ease-out`}
                                style={{
                                    height: `${height}%`,
                                    minHeight: '4px'
                                }}
                            >
                                {/* Neon Cap */}
                                <div
                                    className="absolute top-0 left-0 right-0 h-[2px] shadow-[0_0_10px_currentColor] z-20"
                                    style={{ backgroundColor: '#fff', color: base }}
                                />

                                {/* Gradient Body */}
                                <div
                                    className="absolute inset-x-1 bottom-0 top-[2px] transition-all duration-300"
                                    style={{
                                        background: `linear-gradient(180deg, ${base} 0%, transparent 100%)`,
                                        opacity: isHovered ? 0.8 : 0.4,
                                    }}
                                />

                                {/* Hover Glow Effect */}
                                {isHovered && (
                                    <div
                                        className="absolute inset-x-0 bottom-0 top-0 blur-md transition-all duration-300"
                                        style={{ background: glow, opacity: 0.3 }}
                                    />
                                )}

                                {/* Interactive Tooltip - 'Code Snippet' Style */}
                                <div
                                    className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-4 transition-all duration-300 transform ${isHovered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'}`}
                                >
                                    <div className="bg-[#0A0A0C] border border-white/20 p-3 rounded-lg shadow-2xl min-w-[120px]">
                                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-500 mb-2 border-b border-white/10 pb-1">
                                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: base }} />
                                            Reading...
                                        </div>
                                        <div className="font-mono text-sm text-white mb-0.5">
                                            SCORE: <span style={{ color: base }}>{d.score}%</span>
                                        </div>
                                        <div className="font-mono text-[10px] text-gray-400">
                                            SUBJ: {d.subject || 'N/A'}
                                        </div>
                                        <div className="font-mono text-[10px] text-gray-600 mt-1">
                                            {new Date(d.date).toLocaleDateString()}
                                        </div>
                                    </div>
                                    {/* Tooltip Connector Line */}
                                    <div className="w-[1px] h-4 bg-white/20 absolute left-1/2 -bottom-4" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* X-Axis Labels (Technical) */}
            <div className="absolute bottom-0 left-0 right-0 h-6 flex justify-between px-2 md:px-6 z-10 border-t border-white/5 pt-1">
                {chartData.map((d, i) => (
                    <div key={i} className="flex-1 text-center group-hover:text-white transition-colors duration-300">
                        <div className="font-mono text-[9px] text-gray-500 tracking-wider">
                            {new Date(d.date).getDate()}<span className="text-gray-700">/</span>{new Date(d.date).getMonth() + 1}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

