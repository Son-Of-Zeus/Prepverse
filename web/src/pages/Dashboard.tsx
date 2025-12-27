import React from 'react';
import { CosmicBackground } from '../components/ui/CosmicBackground';
import { useDashboard, SuggestedTopic } from '../hooks/useDashboard';
import { useAuth } from '../hooks/useAuth';

/**
 * Dashboard Page - The home base of the PrepVerse
 *
 * Shows user progress, streak, XP, and suggested topics.
 * Mirrors the Android dashboard data fetching using /api/v1/practice/progress/summary
 */
export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const {
    isLoading,
    error,
    currentStreak,
    totalXP,
    continueLearning,
    suggestedTopics,
    totalSessions,
    overallAccuracy,
    totalStudyTimeMinutes,
    subjectScores,
    refresh,
  } = useDashboard();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <CosmicBackground starCount={50} />
        <div className="relative z-10 text-center space-y-4">
          <div className="w-16 h-16 border-4 border-prepverse-red border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <CosmicBackground starCount={50} />
        <div className="relative z-10 text-center space-y-4 max-w-md mx-auto p-8">
          <div className="text-prepverse-red text-4xl">!</div>
          <h2 className="font-display text-2xl text-white">Something went wrong</h2>
          <p className="text-gray-400">{error}</p>
          <button
            onClick={refresh}
            className="px-6 py-3 bg-prepverse-red hover:bg-prepverse-red-light transition-colors rounded-xl text-white font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-void">
      <CosmicBackground starCount={80} showGrid />

      {/* Header */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-prepverse-red flex items-center justify-center">
            <span className="font-display text-white font-bold">P</span>
          </div>
          <div>
            <h1 className="font-display text-xl text-white">PrepVerse</h1>
            <p className="text-gray-500 text-sm">Welcome back, {user?.full_name || 'Student'}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="text-gray-400 hover:text-white transition-colors text-sm"
        >
          Sign out
        </button>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-6 py-8 max-w-7xl mx-auto">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<FireIcon />}
            value={currentStreak}
            label="Day Streak"
            color="text-prepverse-red"
          />
          <StatCard
            icon={<StarIcon />}
            value={totalXP}
            label="Total XP"
            color="text-solar"
          />
          <StatCard
            icon={<BookIcon />}
            value={totalSessions}
            label="Sessions"
            color="text-physics"
          />
          <StatCard
            icon={<TargetIcon />}
            value={`${overallAccuracy.toFixed(0)}%`}
            label="Accuracy"
            color="text-biology"
          />
        </div>

        {/* Study Time */}
        <div className="glass rounded-2xl p-6 mb-8 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Study Time</p>
              <p className="font-display text-3xl text-white">
                {formatStudyTime(totalStudyTimeMinutes)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cosmic/20 flex items-center justify-center">
              <ClockIcon className="w-6 h-6 text-cosmic" />
            </div>
          </div>
        </div>

        {/* Subject Progress */}
        {Object.keys(subjectScores).length > 0 && (
          <section className="mb-8">
            <h2 className="font-display text-xl text-white mb-4">Subject Progress</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(subjectScores).map(([subject, score]) => (
                <SubjectProgressCard key={subject} subject={subject} score={score} />
              ))}
            </div>
          </section>
        )}

        {/* Continue Learning */}
        {continueLearning.length > 0 && (
          <section className="mb-8">
            <h2 className="font-display text-xl text-white mb-4">Continue Learning</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {continueLearning.map((topic, index) => (
                <TopicCard key={`${topic.subject}-${topic.topic}`} topic={topic} index={index} />
              ))}
            </div>
          </section>
        )}

        {/* Suggested Topics */}
        {suggestedTopics.length > 0 && (
          <section className="mb-8">
            <h2 className="font-display text-xl text-white mb-4">Suggested for You</h2>
            <p className="text-gray-400 text-sm mb-4">Topics you might need more practice on</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suggestedTopics.map((topic, index) => (
                <TopicCard
                  key={`${topic.subject}-${topic.topic}`}
                  topic={topic}
                  index={index}
                  suggested
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {totalSessions === 0 && (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-prepverse-red/20 flex items-center justify-center mx-auto mb-6">
              <RocketIcon className="w-10 h-10 text-prepverse-red" />
            </div>
            <h2 className="font-display text-2xl text-white mb-3">Start Your Journey</h2>
            <p className="text-gray-400 max-w-md mx-auto mb-6">
              Begin practicing to see your progress here. Pick a subject and topic to start learning!
            </p>
            <button className="px-8 py-4 bg-prepverse-red hover:bg-prepverse-red-light transition-colors rounded-xl text-white font-medium shadow-glow-sm hover:shadow-glow-md">
              Start Practice
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

// Helper Functions

/**
 * Format subject name for display (capitalize first letter of each word)
 */
function formatSubjectName(subject: string): string {
  return subject
    .split(/[\s_]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get subject color class (handles lowercase subject names from API)
 */
function getSubjectBgColor(subject: string): string {
  const colors: Record<string, string> = {
    mathematics: 'bg-math',
    physics: 'bg-physics',
    chemistry: 'bg-chemistry',
    biology: 'bg-biology',
    science: 'bg-science', // Class 10 combined science
  };
  return colors[subject.toLowerCase()] || 'bg-cosmic';
}

/**
 * Get subject border/text color class (handles lowercase subject names from API)
 */
function getSubjectBorderColor(subject: string): string {
  const colors: Record<string, string> = {
    mathematics: 'border-math text-math',
    physics: 'border-physics text-physics',
    chemistry: 'border-chemistry text-chemistry',
    biology: 'border-biology text-biology',
    science: 'border-science text-science', // Class 10 combined science
  };
  return colors[subject.toLowerCase()] || 'border-cosmic text-cosmic';
}

// Helper Components

interface StatCardProps {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, value, label, color }) => (
  <div className="glass rounded-2xl p-4 animate-fade-in">
    <div className={`${color} mb-2`}>{icon}</div>
    <p className="font-display text-2xl text-white">{value}</p>
    <p className="text-gray-400 text-sm">{label}</p>
  </div>
);

interface SubjectProgressCardProps {
  subject: string;
  score: number;
}

const SubjectProgressCard: React.FC<SubjectProgressCardProps> = ({ subject, score }) => {
  const bgColor = getSubjectBgColor(subject);
  const displayName = formatSubjectName(subject);

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-3 h-3 rounded-full ${bgColor}`} />
        <span className="text-white font-medium">{displayName}</span>
      </div>
      <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 ${bgColor} rounded-full transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-gray-400 text-sm mt-2">{score.toFixed(0)}% accuracy</p>
    </div>
  );
};

interface TopicCardProps {
  topic: SuggestedTopic;
  index: number;
  suggested?: boolean;
}

const TopicCard: React.FC<TopicCardProps> = ({ topic, index, suggested }) => {
  const borderColor = getSubjectBorderColor(topic.subject);
  const displaySubject = formatSubjectName(topic.subject);

  return (
    <div
      className={`glass rounded-xl p-5 border-l-4 ${borderColor.split(' ')[0]} hover:bg-hover/50 transition-colors cursor-pointer animate-fade-in`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <span className={`text-xs font-mono uppercase ${borderColor.split(' ')[1]}`}>
          {displaySubject}
        </span>
        {suggested && (
          <span className="text-xs bg-prepverse-red/20 text-prepverse-red px-2 py-1 rounded-full">
            Needs work
          </span>
        )}
      </div>
      <h3 className="font-medium text-white mb-2">{topic.displayName}</h3>
      <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-white/40 rounded-full"
          style={{ width: `${topic.progress * 100}%` }}
        />
      </div>
    </div>
  );
};

// Utility Functions

function formatStudyTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours} hours`;
}

// Icons

const FireIcon: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2c.5 4-1.5 6-3 8 2 0 4 1 4 4 0 2-2 4-5 4-2 0-4-1-4-4 0-4 4-6 4-10 0-1 2-2 4-2z" />
  </svg>
);

const StarIcon: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const BookIcon: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const TargetIcon: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const RocketIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </svg>
);

export default DashboardPage;
