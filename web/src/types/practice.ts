export interface QuestionOption {
    id: string;
    text: string;
}

export interface Question {
    id: string;
    question: string;
    options: QuestionOption[];
    correct_answer: string;
    explanation?: string;
    subject: string;
    topic: string;
    difficulty: 'easy' | 'medium' | 'hard';
    mark?: number;
}

// --- Backend Session Types ---

export interface StartSessionResponse {
    session_id: string;
    subject: string;
    topic?: string;
    question_count: number;
    time_limit_seconds?: number;
    started_at: string;
}

export interface QuestionForSession {
    id: string;
    question_order: number;
    question: string;
    options: string[]; // Backend returns simple strings
    subject: string;
    topic: string;
    difficulty: string;
    time_estimate_seconds: number;
}

export interface NextQuestionResponse {
    session_id: string;
    question: QuestionForSession;
    current_question_number: number;
    total_questions: number;
    time_remaining_seconds?: number;
    session_elapsed_seconds: number;
}

export interface SubmitAnswerResponse {
    is_correct: boolean;
    correct_answer: string;
    explanation: string;
    time_taken_seconds: number;
    points_earned: number;
    questions_answered: number;
    questions_remaining: number;
    current_score: number;
    current_accuracy: number;
}

export interface SessionSummary {
    session_id: string;
    status: string;
    subject: string;
    topic?: string;
    total_questions: number;
    correct_answers: number;
    wrong_answers: number;
    skipped: number;
    score_percentage: number;
    total_time_seconds: number;
    avg_time_per_question: number;
    time_limit_seconds?: number;
    started_at: string;
    ended_at: string;
}

// Maintaining for legacy/PracticeResults compatibility
export interface SessionResult {
    score: number;
    totalQuestions: number;
    correctCount: number;
    incorrectCount: number;
    unansweredCount: number;
    timeTaken: number;
    accuracy: number;
    timestamp: string;
}

