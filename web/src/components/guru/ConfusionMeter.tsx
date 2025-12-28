import React from 'react';
import { motion } from 'framer-motion';
import { Brain, HelpCircle, Lightbulb, CheckCircle } from 'lucide-react';

interface ConfusionMeterProps {
  /** Confusion level from 0 (understood) to 100 (totally confused) */
  level: number;
  /** Whether the AI is satisfied with the explanation */
  isSatisfied?: boolean;
  /** Optional className for styling */
  className?: string;
}

/**
 * ConfusionMeter - Visual indicator of AI student's understanding
 * 
 * Shows a progress bar that goes from red (confused) to green (understood)
 * Inverts the display so users see "Understanding" progress
 */
export const ConfusionMeter: React.FC<ConfusionMeterProps> = ({
  level,
  isSatisfied = false,
  className = '',
}) => {
  // Invert: 100% confusion = 0% understanding, 0% confusion = 100% understanding
  const understandingLevel = 100 - level;
  
  // Determine color based on understanding level
  const getGradient = () => {
    if (isSatisfied || understandingLevel >= 80) {
      return 'from-green-500 to-emerald-400';
    }
    if (understandingLevel >= 60) {
      return 'from-emerald-500 to-yellow-400';
    }
    if (understandingLevel >= 40) {
      return 'from-yellow-500 to-orange-400';
    }
    if (understandingLevel >= 20) {
      return 'from-orange-500 to-red-400';
    }
    return 'from-red-500 to-red-600';
  };

  const getStatusText = () => {
    if (isSatisfied) return "Got it! 🎉";
    if (understandingLevel >= 80) return "Almost there!";
    if (understandingLevel >= 60) return "Getting clearer...";
    if (understandingLevel >= 40) return "Still confused";
    if (understandingLevel >= 20) return "Very confused";
    return "Totally lost!";
  };

  const getIcon = () => {
    if (isSatisfied || understandingLevel >= 80) {
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    }
    if (understandingLevel >= 50) {
      return <Lightbulb className="w-5 h-5 text-yellow-400" />;
    }
    return <HelpCircle className="w-5 h-5 text-red-400" />;
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-slate-300">
            Student Understanding
          </span>
        </div>
        <div className="flex items-center gap-2">
          {getIcon()}
          <span className="text-sm font-semibold text-white">
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="relative h-4 bg-slate-800/50 rounded-full overflow-hidden border border-slate-700/50">
        {/* Background pattern for visual interest */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-yellow-500/20 to-green-500/20" />
        </div>

        {/* Animated Progress Bar */}
        <motion.div
          className={`absolute left-0 top-0 bottom-0 bg-gradient-to-r ${getGradient()} rounded-full`}
          initial={{ width: '0%' }}
          animate={{ width: `${understandingLevel}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20 rounded-full" />
        </motion.div>

        {/* Markers at 25%, 50%, 75% */}
        <div className="absolute inset-0 flex">
          {[25, 50, 75].map((mark) => (
            <div
              key={mark}
              className="absolute top-0 bottom-0 w-px bg-slate-600/50"
              style={{ left: `${mark}%` }}
            />
          ))}
        </div>
      </div>

      {/* Percentage Label */}
      <div className="flex justify-between mt-1 text-xs text-slate-500">
        <span>Confused</span>
        <span className="font-mono font-bold text-slate-400">
          {understandingLevel.toFixed(0)}%
        </span>
        <span>Understood</span>
      </div>
    </div>
  );
};

export default ConfusionMeter;
