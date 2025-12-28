import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { 
  Award, 
  Target, 
  Lightbulb, 
  Star, 
  TrendingUp, 
  TrendingDown,
  X,
  Sparkles,
  Trophy
} from 'lucide-react';
import { GuruReportCard } from '../../api/guru';

interface ReportCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportCard: GuruReportCard | null;
  topic: string;
  subject: string;
  sessionDuration?: number;
}

/**
 * ReportCardModal - Displays the final teaching evaluation
 * 
 * Shows:
 * - Accuracy and Simplicity scores with visual gauges
 * - XP earned with celebration animation
 * - Strengths and areas for improvement
 * - Constructive feedback
 */
export const ReportCardModal: React.FC<ReportCardModalProps> = ({
  isOpen,
  onClose,
  reportCard,
  topic,
  subject,
  sessionDuration = 0,
}) => {
  // Trigger confetti on open
  useEffect(() => {
    if (isOpen && reportCard) {
      const totalScore = (reportCard.accuracy_score + reportCard.simplicity_score) / 2;
      
      // Only celebrate if score is good (6+ out of 10)
      if (totalScore >= 6) {
        const duration = 2500;
        const end = Date.now() + duration;

        const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#A855F7', '#FFFFFF'];

        const frame = () => {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.7 },
            colors,
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.7 },
            colors,
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };
        frame();
      }
    }
  }, [isOpen, reportCard]);

  if (!isOpen || !reportCard) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-400';
    if (score >= 6) return 'text-emerald-400';
    if (score >= 4) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 8) return 'from-green-500 to-emerald-400';
    if (score >= 6) return 'from-emerald-500 to-yellow-400';
    if (score >= 4) return 'from-yellow-500 to-orange-400';
    return 'from-orange-500 to-red-400';
  };

  const totalScore = (reportCard.accuracy_score + reportCard.simplicity_score) / 2;
  const isExcellent = totalScore >= 8;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg bg-slate-900 border border-purple-500/30 rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Glow Effect */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />

          {/* Content */}
          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                  isExcellent
                    ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
                    : 'bg-gradient-to-br from-purple-500 to-blue-500'
                }`}
              >
                {isExcellent ? (
                  <Trophy className="w-8 h-8 text-white" />
                ) : (
                  <Award className="w-8 h-8 text-white" />
                )}
              </motion.div>
              <h2 className="text-2xl font-display font-bold text-white mb-1">
                Teaching Report Card
              </h2>
              <p className="text-slate-400 text-sm">
                {topic} • {subject}
              </p>
            </div>

            {/* XP Earned */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-2xl p-4 mb-6 text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <span className="text-3xl font-bold text-white">
                  +{reportCard.xp_earned} XP
                </span>
                <Sparkles className="w-5 h-5 text-yellow-400" />
              </div>
              {sessionDuration > 0 && (
                <p className="text-xs text-slate-400">
                  Session Duration: {formatDuration(sessionDuration)}
                </p>
              )}
            </motion.div>

            {/* Scores */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Accuracy Score */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-slate-300">Accuracy</span>
                </div>
                <div className={`text-3xl font-bold ${getScoreColor(reportCard.accuracy_score)}`}>
                  {reportCard.accuracy_score}/10
                </div>
                <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${reportCard.accuracy_score * 10}%` }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className={`h-full bg-gradient-to-r ${getScoreGradient(reportCard.accuracy_score)} rounded-full`}
                  />
                </div>
              </motion.div>

              {/* Simplicity Score */}
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-slate-300">Simplicity</span>
                </div>
                <div className={`text-3xl font-bold ${getScoreColor(reportCard.simplicity_score)}`}>
                  {reportCard.simplicity_score}/10
                </div>
                <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${reportCard.simplicity_score * 10}%` }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className={`h-full bg-gradient-to-r ${getScoreGradient(reportCard.simplicity_score)} rounded-full`}
                  />
                </div>
              </motion.div>
            </div>

            {/* Feedback */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-4"
            >
              <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Star className="w-4 h-4 text-purple-400" />
                Feedback
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed">
                {reportCard.feedback}
              </p>
            </motion.div>

            {/* Strengths & Improvements */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Strengths */}
              {reportCard.strengths && reportCard.strengths.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-green-500/10 border border-green-500/20 rounded-xl p-3"
                >
                  <h4 className="text-xs font-semibold text-green-400 mb-2 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Strengths
                  </h4>
                  <ul className="space-y-1">
                    {reportCard.strengths.map((s, i) => (
                      <li key={i} className="text-xs text-green-200">
                        • {s}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* Improvements */}
              {reportCard.improvements && reportCard.improvements.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3"
                >
                  <h4 className="text-xs font-semibold text-orange-400 mb-2 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" />
                    Areas to Improve
                  </h4>
                  <ul className="space-y-1">
                    {reportCard.improvements.map((s, i) => (
                      <li key={i} className="text-xs text-orange-200">
                        • {s}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl text-white font-semibold transition-all"
            >
              Continue
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ReportCardModal;
