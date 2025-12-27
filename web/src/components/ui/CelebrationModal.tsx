import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowRight } from 'lucide-react';

interface CelebrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    subject: string;
    oldMastery: number;
    newMastery: number;
}

export const CelebrationModal: React.FC<CelebrationModalProps> = ({ isOpen, onClose, subject, oldMastery, newMastery }) => {

    useEffect(() => {
        if (isOpen) {
            // Trigger Confetti
            const duration = 3000;
            const end = Date.now() + duration;

            const frame = () => {
                confetti({
                    particleCount: 5,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: ['#FFD700', '#FFA500', '#FFFFFF']
                });
                confetti({
                    particleCount: 5,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: ['#FFD700', '#FFA500', '#FFFFFF']
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            };
            frame();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            >
                <motion.div
                    initial={{ scale: 0.8, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.8, opacity: 0, y: 20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="relative w-full max-w-md bg-slate-900 border border-yellow-500/30 rounded-3xl p-8 shadow-2xl overflow-hidden"
                >
                    {/* Golden Glow Background */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-yellow-500/10 blur-3xl rounded-full pointer-events-none" />

                    <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mb-6 shadow-glow-gold animate-bounce-slow">
                            <Trophy size={40} className="text-white drop-shadow-md" />
                        </div>

                        <h2 className="text-3xl font-display font-bold text-white mb-2">
                            New Record!
                        </h2>
                        <p className="text-slate-300 mb-8">
                            You've improved your mastery in <span className="text-yellow-400 font-bold">{subject}</span>!
                        </p>

                        <div className="w-full bg-slate-800/50 rounded-2xl p-6 border border-white/5 mb-8">
                            <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
                                <span>Previous Best</span>
                                <span>New Record</span>
                            </div>
                            <div className="flex items-center justify-between font-mono font-bold text-2xl">
                                <span className="text-slate-500">{oldMastery.toFixed(0)}%</span>
                                <ArrowRight size={24} className="text-yellow-500" />
                                <span className="text-yellow-400">{newMastery.toFixed(0)}%</span>
                            </div>

                            {/* Comparison Bar */}
                            <div className="mt-4 relative h-3 bg-slate-700/50 rounded-full overflow-hidden">
                                {/* Old Progress */}
                                <div
                                    className="absolute top-0 bottom-0 left-0 bg-slate-500/30"
                                    style={{ width: `${oldMastery}%` }}
                                />
                                {/* New Progress (Animated) */}
                                <motion.div
                                    initial={{ width: `${oldMastery}%` }}
                                    animate={{ width: `${newMastery}%` }}
                                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                                    className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-yellow-500 to-orange-500"
                                />
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-white font-bold rounded-xl shadow-lg transition-all transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-2"
                        >
                            <span>Continue Journey</span>
                            <ArrowRight size={20} />
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
