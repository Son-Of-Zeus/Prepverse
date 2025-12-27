import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TimerProps {
    durationSeconds: number; // total duration
    onComplete: () => void;
}

export const Timer = ({ durationSeconds, onComplete }: TimerProps) => {
    const [timeLeft, setTimeLeft] = useState(durationSeconds);

    useEffect(() => {
        if (timeLeft <= 0) {
            onComplete();
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, onComplete]);

    const formatTime = (seconds: number) => {
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${min}:${sec.toString().padStart(2, '0')}`;
    };

    const percentage = (timeLeft / durationSeconds) * 100;

    // Color logic for urgency
    const colorClass = percentage < 20 ? 'text-prepverse-red' : percentage < 50 ? 'text-solar' : 'text-primary';

    return (
        <div className="flex items-center gap-2 font-mono text-xl font-bold bg-surface/50 px-4 py-2 rounded-lg border border-white/5">
            <Clock className={`w-5 h-5 ${colorClass} ${timeLeft < 60 ? 'animate-pulse' : ''}`} />
            <span className={colorClass}>{formatTime(timeLeft)}</span>
        </div>
    );
};
