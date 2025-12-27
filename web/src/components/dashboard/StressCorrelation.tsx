import React from 'react';

export const StressCorrelation: React.FC = () => {
    return (
        <div className="w-full h-48 flex flex-col items-center justify-center text-gray-500 glass rounded-2xl p-6">
            <h3 className="text-white font-medium mb-4 self-start">Stress Correlation</h3>
            <div className="flex-1 w-full flex items-center justify-center relative">
                {/* Placeholder chart or empty state */}
                <div className="absolute inset-0 flex items-end px-4 pb-4">
                    <div className="w-full border-b border-gray-700 h-px mb-6 relative">
                        <span className="absolute -bottom-6 left-0 text-xs">Dec 27</span>
                        <span className="absolute -bottom-6 left-0 mt-4 text-[10px] text-gray-600">Low Stress</span>
                        <span className="absolute -bottom-6 right-0 mt-4 text-[10px] text-gray-600">High Stress</span>
                    </div>
                </div>
                {/* Single data point as seen in screenshot */}
                <div className="absolute left-4 bottom-10 w-3 h-1 bg-green-500 rounded-full" />
            </div>
        </div>
    );
};
