import React, { useMemo } from 'react';
import { ConceptMastery } from '../../hooks/useDashboard';

interface SWOTAnalysisProps {
    concepts: ConceptMastery[];
    streak?: number;
}

const SWOTCard: React.FC<{
    title: string;
    type: 'strength' | 'weakness' | 'opportunity' | 'threat';
    children: React.ReactNode;
}> = ({ title, type, children }) => {
    const styles = {
        strength: {
            bg: 'bg-accent-emerald/10',
            border: 'border-accent-emerald/20',
            text: 'text-accent-emerald',
            icon: 'bg-accent-emerald text-black',
            iconSvg: (
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            )
        },
        weakness: {
            bg: 'bg-accent-rose/10',
            border: 'border-accent-rose/20',
            text: 'text-accent-rose',
            icon: 'bg-accent-rose text-white',
            iconSvg: (
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            )
        },
        opportunity: {
            bg: 'bg-accent-cyan/10',
            border: 'border-accent-cyan/20',
            text: 'text-accent-cyan',
            icon: 'bg-accent-cyan text-black',
            iconSvg: (
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
            )
        },
        threat: {
            bg: 'bg-accent-amber/10',
            border: 'border-accent-amber/20',
            text: 'text-accent-amber',
            icon: 'bg-accent-amber text-black',
            iconSvg: (
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        }
    };

    const style = styles[type];

    return (
        <div className={`p-6 rounded-2xl border ${style.border} ${style.bg} hover:bg-opacity-20 transition-all duration-300 group`}>
            <div className="flex items-center gap-4 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${style.icon} shadow-lg shadow-black/20 group-hover:scale-110 transition-transform`}>
                    <div className="w-5 h-5">{style.iconSvg}</div>
                </div>
                <h3 className={`font-display font-medium text-lg ${style.text}`}>{title}</h3>
            </div>
            <div className="space-y-3 pl-1">
                {children}
            </div>
        </div>
    );
};

export const SWOTAnalysis: React.FC<SWOTAnalysisProps> = ({ concepts, streak = 0 }) => {
    const analysis = useMemo(() => {
        // 1. Calculate overall metrics for this set of concepts (which might be filtered by subject)
        const totalConcepts = concepts?.length ?? 0;
        if (totalConcepts === 0) return null;

        const avgAccuracy = concepts.reduce((sum, c) => sum + c.accuracy, 0) / totalConcepts;

        // 2. Identify Strong/Weak Topics
        const strongTopics = concepts.filter(c => c.accuracy >= 70);
        const weakTopics = concepts.filter(c => c.accuracy < 60);

        // 3. Generate Insights

        // Strengths
        const strengths = [];
        if (avgAccuracy > 75) {
            strengths.push({ label: 'Excellent Mastery', desc: `Performing at top tier (${Math.round(avgAccuracy)}%)` });
        } else if (avgAccuracy > 50) {
            strengths.push({ label: 'Solid Foundation', desc: `Good baseline accuracy (${Math.round(avgAccuracy)}%)` });
        }
        if (strongTopics.length > 0) {
            strengths.push({ label: 'Power Topics', desc: `${strongTopics.length} concepts mastered` });
        }

        // Weaknesses
        const weaknesses = [];
        if (weakTopics.length > 0) {
            const weakest = [...weakTopics].sort((a, b) => a.accuracy - b.accuracy)[0];
            if (weakest) {
                weaknesses.push({ label: weakest.display_name, desc: `Critical focus needed (${Math.round(weakest.accuracy)}%)` });
            }
            if (weakTopics.length > 1) {
                weaknesses.push({ label: 'Growth Areas', desc: `${weakTopics.length} topics need review` });
            }
        } else {
            weaknesses.push({ label: 'No Critical Weaknesses', desc: 'Maintaining high standards' });
        }

        // Opportunities
        const opportunities = [];
        if (weakTopics.length > 0) {
            opportunities.push({ label: 'Score Booster', desc: `Reviewing weak topics boosts total score` });
        }
        const unpracticed = concepts.filter(c => c.total_attempts === 0);
        if (unpracticed.length > 0) {
            opportunities.push({ label: 'Uncharted Territory', desc: `${unpracticed.length} new topics to explore` });
        } else {
            opportunities.push({ label: 'Consistency', desc: 'Maintain your daily streak' });
        }

        // Threats
        const threats = [];
        if (streak < 2) {
            threats.push({ label: 'Momentum Loss', desc: 'Try to practice daily' });
        }
        const critical = concepts.filter(c => c.accuracy < 40 && c.total_attempts > 5);
        if (critical.length > 0) {
            threats.push({ label: 'Concept Gaps', desc: `${critical.length} topics showing struggle` });
        }
        if (threats.length === 0) {
            threats.push({ label: 'All Clear', desc: 'No immediate risks detected' });
        }

        return { strengths, weaknesses, opportunities, threats };

    }, [concepts, streak]);

    if (!analysis) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
                <div className="w-16 h-16 mb-4 text-gray-500 opacity-50">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                    </svg>
                </div>
                <h3 className="text-white font-medium mb-1">Select a Subject</h3>
                <p className="text-gray-500 text-sm">Choose a subject above to generate your SWOT matrix.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths */}
            <SWOTCard title="Strengths" type="strength">
                {analysis.strengths.slice(0, 2).map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent-emerald mt-2" />
                        <div>
                            <p className="text-white font-medium text-sm">{item.label}</p>
                            <p className="text-gray-400 text-xs">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </SWOTCard>

            {/* Weaknesses */}
            <SWOTCard title="Weaknesses" type="weakness">
                {analysis.weaknesses.slice(0, 2).map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent-rose mt-2" />
                        <div>
                            <p className="text-white font-medium text-sm">{item.label}</p>
                            <p className="text-gray-400 text-xs">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </SWOTCard>

            {/* Opportunities */}
            <SWOTCard title="Opportunities" type="opportunity">
                {analysis.opportunities.slice(0, 2).map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan mt-2" />
                        <div>
                            <p className="text-white font-medium text-sm">{item.label}</p>
                            <p className="text-gray-400 text-xs">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </SWOTCard>

            {/* Threats */}
            <SWOTCard title="Threats" type="threat">
                {analysis.threats.slice(0, 2).map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent-amber mt-2" />
                        <div>
                            <p className="text-white font-medium text-sm">{item.label}</p>
                            <p className="text-gray-400 text-xs">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </SWOTCard>
        </div>
    );
};
