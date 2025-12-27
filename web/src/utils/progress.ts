
export interface SubjectProgress {
    subjectId: string;
    totalSessions: number;
    totalQuestions: number;
    lastScore: number;
    averageAccuracy: number;
    lastPracticedAt: string;
}

const STORAGE_KEY = 'prepverse_progress';

export const getProgress = (): Record<string, SubjectProgress> => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        console.error("Failed to read progress", e);
        return {};
    }
};

export const saveProgress = (subjectId: string, score: number, totalQuestions: number) => {
    const currentData = getProgress();
    const subjectKey = subjectId.toLowerCase(); // Normalize key
    const existing = currentData[subjectKey] || {
        subjectId: subjectKey,
        totalSessions: 0,
        totalQuestions: 0,
        lastScore: 0,
        averageAccuracy: 0,
        lastPracticedAt: new Date().toISOString()
    };

    // Calculate new stats
    const newSessions = existing.totalSessions + 1;
    const newTotalQuestions = existing.totalQuestions + totalQuestions;

    // Running average for accuracy
    const sessionAccuracy = (score / totalQuestions) * 100;
    const newAccuracy = ((existing.averageAccuracy * existing.totalSessions) + sessionAccuracy) / newSessions;

    const updated: SubjectProgress = {
        subjectId: subjectKey,
        totalSessions: newSessions,
        totalQuestions: newTotalQuestions,
        lastScore: score,
        averageAccuracy: Math.round(newAccuracy),
        lastPracticedAt: new Date().toISOString()
    };

    currentData[subjectKey] = updated;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentData));
    } catch (e) {
        console.error("Failed to save progress", e);
    }
};

export const getRecentPractice = (): SubjectProgress[] => {
    const data = getProgress();
    return Object.values(data)
        .sort((a, b) => new Date(b.lastPracticedAt).getTime() - new Date(a.lastPracticedAt).getTime())
        .slice(0, 3);
};
