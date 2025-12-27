import React from 'react';
import { FocusStatistics as FocusStats } from '../../utils/focusHistory';

interface FocusStatisticsProps {
  statistics: FocusStats;
}

/**
 * Format duration helper
 */
const formatDuration = (milliseconds: number): string => {
  const totalSeconds = Math.round(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

/**
 * FocusStatistics - Displays focus history and statistics
 */
export const FocusStatistics: React.FC<FocusStatisticsProps> = ({ statistics }) => {
  const {
    totalFocusTime,
    totalUnfocusTime,
    focusPercentage,
    longestFocusPeriod,
    longestUnfocusPeriod,
    averageFocusPeriod,
    focusPeriods,
    unfocusPeriods,
  } = statistics;

  // Determine focus quality badge
  const getFocusQuality = () => {
    if (focusPercentage >= 90) return { label: 'Excellent', color: 'text-electric', bg: 'bg-electric/10', border: 'border-electric/20' };
    if (focusPercentage >= 75) return { label: 'Good', color: 'text-plasma', bg: 'bg-plasma/10', border: 'border-plasma/20' };
    if (focusPercentage >= 60) return { label: 'Fair', color: 'text-solar', bg: 'bg-solar/10', border: 'border-solar/20' };
    return { label: 'Needs Improvement', color: 'text-prepverse-red', bg: 'bg-prepverse-red/10', border: 'border-prepverse-red/20' };
  };

  const quality = getFocusQuality();

  return (
    <div className="glass rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cosmic/10 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cosmic">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h3 className="font-display text-xl text-white font-bold">Focus Statistics</h3>
        </div>
        <div className={`px-3 py-1 rounded-lg ${quality.bg} ${quality.border} border`}>
          <span className={`text-sm font-semibold ${quality.color}`}>{quality.label}</span>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Focus Percentage */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-electric">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="text-xs text-gray-400 uppercase font-mono">Focus Percentage</span>
          </div>
          <p className="text-3xl font-bold text-white font-mono">
            {focusPercentage.toFixed(1)}%
          </p>
          <div className="mt-2 h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-electric transition-all duration-1000"
              style={{ width: `${Math.min(focusPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Total Focus Time */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-plasma">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="text-xs text-gray-400 uppercase font-mono">Total Focus Time</span>
          </div>
          <p className="text-3xl font-bold text-white font-mono">
            {formatDuration(totalFocusTime)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Time spent focused</p>
        </div>

        {/* Longest Focus Period */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-electric">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            <span className="text-xs text-gray-400 uppercase font-mono">Longest Focus</span>
          </div>
          <p className="text-2xl font-bold text-white font-mono">
            {formatDuration(longestFocusPeriod)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Longest continuous focus</p>
        </div>

        {/* Average Focus Period */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-plasma">
              <line x1="12" y1="20" x2="12" y2="4" />
              <polyline points="6 10 12 4 18 10" />
            </svg>
            <span className="text-xs text-gray-400 uppercase font-mono">Avg Focus Period</span>
          </div>
          <p className="text-2xl font-bold text-white font-mono">
            {formatDuration(averageFocusPeriod)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Average focus duration</p>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-white/10">
        <div className="text-center">
          <p className="text-2xl font-bold text-white font-mono">{focusPeriods}</p>
          <p className="text-xs text-gray-400 mt-1">Focus Periods</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-white font-mono">{unfocusPeriods}</p>
          <p className="text-xs text-gray-400 mt-1">Interruptions</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-white font-mono">{formatDuration(totalUnfocusTime)}</p>
          <p className="text-xs text-gray-400 mt-1">Total Unfocus</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-white font-mono">{formatDuration(longestUnfocusPeriod)}</p>
          <p className="text-xs text-gray-400 mt-1">Longest Break</p>
        </div>
      </div>
    </div>
  );
};

export default FocusStatistics;

