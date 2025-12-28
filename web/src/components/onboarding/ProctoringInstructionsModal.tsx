import React from 'react';
import { Shield, Maximize, AlertTriangle, Ban, Check } from 'lucide-react';

interface ProctoringInstructionsModalProps {
    onConfirm: () => void;
    onCancel: () => void;
}

export const ProctoringInstructionsModal: React.FC<ProctoringInstructionsModalProps> = ({
    onConfirm,
    onCancel,
}) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl transition-all duration-300">
            <div className="w-full max-w-md glass rounded-3xl p-8 border border-white/10 shadow-[0_0_50px_rgba(229,57,53,0.1)] animate-scale-in relative overflow-hidden">

                {/* Decorative Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center text-center">
                    {/* Icon */}
                    <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-prepverse-red/20 to-orange-500/20 flex items-center justify-center border border-prepverse-red/30">
                        <Shield className="text-prepverse-red" size={40} />
                    </div>

                    <h2 className="text-2xl font-display font-bold text-white mb-2">
                        Proctoring Enabled
                    </h2>

                    <p className="text-gray-400 mb-8 leading-relaxed">
                        This assessment is monitored to ensure fairness. Please review the rules below:
                    </p>

                    <div className="w-full space-y-4 mb-8 text-left">
                        <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                <Maximize size={20} />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-white font-medium text-sm mb-1">Fullscreen Mode</h4>
                                <p className="text-xs text-gray-400">The test will automatically enter and enforce fullscreen.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                                <AlertTriangle size={20} />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-white font-medium text-sm mb-1">Focus Tracking</h4>
                                <p className="text-xs text-gray-400">Switching tabs or exiting fullscreen counts as a violation.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                            <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                                <Ban size={20} />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-white font-medium text-sm mb-1">Zero Tolerance</h4>
                                <p className="text-xs text-gray-400"><span className="text-red-500 font-semibold">3 violations</span> result in immediate disqualification.</p>
                            </div>
                        </div>
                    </div>

                    <div className="w-full flex flex-col gap-4">
                        <button
                            onClick={onConfirm}
                            className="group relative w-full px-8 py-4 bg-[#E53935] text-white font-sans font-semibold text-lg rounded-2xl shadow-[0_10px_30px_rgba(229,57,53,0.3)] hover:shadow-[0_20px_40px_rgba(229,57,53,0.5)] hover:-translate-y-1 hover:bg-[#D32F2F] transition-all duration-300 ease-out flex items-center justify-center gap-3 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <span className="relative flex items-center gap-2">
                                I Understand & Start
                                <Check size={20} className="text-white group-hover:stroke-[3px] transition-all" />
                            </span>
                        </button>
                        <button
                            onClick={onCancel}
                            className="text-gray-500 hover:text-white text-sm transition-colors py-2 uppercase tracking-wider font-medium"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
