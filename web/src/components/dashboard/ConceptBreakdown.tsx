import React from 'react';
import { ConceptMastery } from '../../hooks/useDashboard';

interface ConceptBreakdownProps {
    concepts: ConceptMastery[];
}

export const ConceptBreakdown: React.FC<ConceptBreakdownProps> = ({ concepts }) => {
    // Take top 5 concepts or sort by some criteria?
    // Let's sort by accuracy (lowest first to highlight weak areas) or just list them.
    // The image shows "Concept Breakdown" with progress bars. 

    // Let's show up to 5 concepts
    const displayConcepts = concepts.slice(0, 5);

    const getBarColor = (accuracy: number) => {
        if (accuracy >= 80) return 'bg-purple-500';
        if (accuracy >= 60) return 'bg-blue-500';
        return 'bg-pink-500'; // Using the gradient look from image later if possible, for now solid colors
    };

    return (
        <div className="w-full space-y-4">
            {displayConcepts.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No concept data available yet.</p>
            ) : (
                displayConcepts.map((concept) => (
                    <div key={`${concept.subject}-${concept.topic}`} className="space-y-1">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-300 font-medium">{concept.display_name}</span>
                            <span className="text-gray-400">{Math.round(concept.accuracy)}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${getBarColor(concept.accuracy)}`}
                                style={{ width: `${concept.accuracy}%` }}
                            />
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};
