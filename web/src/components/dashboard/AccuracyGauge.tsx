import React from 'react';

interface AccuracyGaugeProps {
    accuracy: number;
}

export const AccuracyGauge: React.FC<AccuracyGaugeProps> = ({ accuracy }) => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (accuracy / 100) * circumference;

    const getColor = (value: number) => {
        if (value >= 70) return '#10B981'; // emerald-500
        if (value >= 50) return '#F59E0B'; // amber-500
        return '#EF4444'; // red-500
    };

    const color = getColor(accuracy);

    return (
        <div className="relative flex items-center justify-center w-32 h-32">
            <svg className="transform -rotate-90 w-full h-full">
                {/* Track */}
                <circle
                    cx="64"
                    cy="64"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-white/10"
                />
                {/* Progress */}
                <circle
                    cx="64"
                    cy="64"
                    r={radius}
                    stroke={color}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-bold text-white">{Math.round(accuracy)}%</span>
                <span className="text-xs text-gray-400">Accuracy</span>
            </div>
        </div>
    );
};
