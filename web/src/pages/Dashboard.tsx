import React, { useState, useEffect } from 'react';
import { getDashboard, DashboardResponse } from '../api/dashboard';
import { getOnboardingStatus, OnboardingStatus } from '../api/onboarding';
import { useAuth } from '../hooks/useAuth';
import { FocusModeSession } from '../components/onboarding/FocusModeSession';
import { FocusModeSettings, FocusModeSettings as FocusModeSettingsType } from '../components/onboarding/FocusModeSettings';
import { CosmicBackground } from '../components/ui/CosmicBackground';
import { SubjectSelect } from '../components/ui/SubjectSelect';

interface DashboardPageProps {
  onNavigateToPractice?: () => void;
  onNavigateToFocus?: () => void;
  onNavigateToBattle?: () => void;
}

// Custom SVG Icons
const FlameIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C12 2 8 6 8 10C8 12.5 9.5 14 12 14C14.5 14 16 12.5 16 10C16 6 12 2 12 2Z" fill="#FF6B35" />
    <path d="M12 14C12 16 10 18 8 20C8 22 10 24 12 24C14 24 16 22 16 20C14 18 12 16 12 14Z" fill="#FF8C42" />
    <path d="M10 8C10 8 9 9 9 10C9 10.5 9.5 11 10 11C10.5 11 11 10.5 11 10C11 9 10 8 10 8Z" fill="#FFB347" />
  </svg>
);

const SparkleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" fill="#FFD700" />
    <circle cx="12" cy="10" r="2" fill="#FFF9C4" />
  </svg>
);

const FocusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
    <circle cx="10" cy="10" r="3" fill="currentColor" />
  </svg>
);

const PracticeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
    <path d="M7 7H13M7 10H13M7 13H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const BattleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 2L12 7L17 8L13 12L14 17L10 14L6 17L7 12L3 8L8 7L10 2Z" fill="currentColor" />
  </svg>
);

const StrengthsIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 4L20 12L28 13L22 19L23 27L16 23L9 27L10 19L4 13L12 12L16 4Z" fill="#10B981" />
    <circle cx="16" cy="16" r="4" fill="#D1FAE5" />
  </svg>
);

const WeaknessesIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 6C10.5 6 6 10.5 6 16C6 21.5 10.5 26 16 26C21.5 26 26 21.5 26 16C26 10.5 21.5 6 16 6Z" fill="#EF4444" />
    <path d="M12 12L20 20M20 12L12 20" stroke="#FEE2E2" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const OpportunitiesIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 2L18 10L26 12L18 14L16 22L14 14L6 12L14 10L16 2Z" fill="#3B82F6" />
    <circle cx="16" cy="12" r="3" fill="#DBEAFE" />
  </svg>
);

const ThreatsIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 4L20 8L24 6L22 10L26 14L22 14L20 18L16 16L12 18L10 14L6 14L10 10L8 6L12 8L16 4Z" fill="#F59E0B" />
    <path d="M16 12L18 16L22 18L18 20L16 24L14 20L10 18L14 16L16 12Z" fill="#FEF3C7" />
  </svg>
);



export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateToPractice,
  onNavigateToFocus,
  onNavigateToBattle,
}) => {
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { logout } = useAuth();
  const [showFocusSettings, setShowFocusSettings] = useState(false);
  const [focusModeSettings, setFocusModeSettings] = useState<FocusModeSettingsType>({
    pomodoroMinutes: 25,
    breakMinutes: 5,
    enabled: false,
  });
  const [tempFocusSettings, setTempFocusSettings] = useState<FocusModeSettingsType>({
    pomodoroMinutes: 25,
    breakMinutes: 5,
    enabled: false,
  });
  const [activeNav, setActiveNav] = useState('dashboard');
  const [selectedSubject, setSelectedSubject] = useState<string>('Mathematics');
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [dashboard, onboarding] = await Promise.all([
        getDashboard(),
        getOnboardingStatus().catch(() => null)
      ]);
      setDashboardData(dashboard);
      setOnboardingStatus(onboarding);
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
      const errorMessage = err?.response?.data?.detail || err?.message || 'Failed to load dashboard. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };


  const handleFocusSettingsChange = (settings: FocusModeSettingsType) => {
    setTempFocusSettings(settings);
  };

  const handleStartFocusMode = () => {
    setFocusModeSettings({
      ...tempFocusSettings,
      enabled: true,
    });
    setShowFocusSettings(false);
  };

  const handleOpenFocusSettings = () => {
    setTempFocusSettings({
      ...focusModeSettings,
      enabled: false,
    });
    setShowFocusSettings(true);
    if (onNavigateToFocus) {
      onNavigateToFocus();
    }
  };

  const handleEndFocusSession = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => { });
    }
    setFocusModeSettings({
      ...focusModeSettings,
      enabled: false,
    });
  };

  // Generate smooth curve path for performance trend
  const generateCurvePath = (data: number[], width: number, height: number) => {
    if (data.length === 0) return '';
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const stepX = data.length > 1 ? width / (data.length - 1) : 0;

    const firstValue = data[0] ?? 0;
    let path = `M 0 ${height - ((firstValue - min) / range) * height}`;

    for (let i = 1; i < data.length; i++) {
      const currentValue = data[i] ?? 0;
      const prevValue = data[i - 1] ?? 0;
      const x = i * stepX;
      const y = height - ((currentValue - min) / range) * height;
      const prevX = (i - 1) * stepX;
      const prevY = height - ((prevValue - min) / range) * height;

      const cp1x = prevX + stepX / 2;
      const cp1y = prevY;
      const cp2x = x - stepX / 2;
      const cp2y = y;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x} ${y}`;
    }

    return path;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-prepverse-red border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-gray-400">{error || 'Failed to load dashboard'}</p>
          <button
            onClick={loadData}
            className="px-6 py-2 bg-prepverse-red text-white rounded-3xl hover:bg-prepverse-red-dark transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Extract actual data from backend
  const recentScore = dashboardData.performance_summary.recent_scores?.[0] ?? { score: 0, date: 'N/A', attempts: 0 };
  const streak = dashboardData.streak_info?.current_streak ?? 0;
  const dailyXP = dashboardData.daily_xp ?? 0;
  const overallAccuracy = dashboardData.performance_summary.overall_accuracy ?? 0;

  // Generate performance trend from recent_scores (last 7 days)
  const recentScores = dashboardData.performance_summary.recent_scores || [];
  const performanceData = recentScores.slice(0, 7).map(score => score.score);
  // Pad with zeros if less than 7 days
  while (performanceData.length < 7) {
    performanceData.unshift(0);
  }

  // Use suggested_topics for concept breakdown
  const conceptData = dashboardData.suggested_topics.slice(0, 4).map(topic => ({
    name: topic.topic,
    percentage: topic.accuracy,
    subject: topic.subject,
  }));

  // Calculate efficiency from accuracy
  const efficiencyPercentage = Math.round(overallAccuracy);

  // Calculate SWOT analysis for selected subject
  const subjectTopics = dashboardData.suggested_topics.filter(t => t.subject === selectedSubject);
  const onboardingWeakTopics = onboardingStatus?.weak_topics || [];
  const onboardingStrongTopics = onboardingStatus?.strong_topics || [];

  const subjectWeakTopics = onboardingWeakTopics.filter(topic =>
    topic.toLowerCase().includes(selectedSubject.toLowerCase()) ||
    subjectTopics.some(st => st.topic.toLowerCase().includes(topic.toLowerCase()))
  );
  const subjectStrongTopics = onboardingStrongTopics.filter(topic =>
    topic.toLowerCase().includes(selectedSubject.toLowerCase()) ||
    subjectTopics.some(st => st.topic.toLowerCase().includes(topic.toLowerCase()) && st.accuracy >= 70)
  );

  const practiceWeakTopics = subjectTopics.filter(t => t.accuracy < 70);
  const practiceStrongTopics = subjectTopics.filter(t => t.accuracy >= 70);
  const subjectAvgAccuracy = subjectTopics.length > 0
    ? subjectTopics.reduce((sum, t) => sum + t.accuracy, 0) / subjectTopics.length
    : 0;

  // Generate stress correlation line graph data from recent scores
  // Stress = inverse of performance (lower score = higher stress)
  const stressData: number[] = [];
  const stressDates: string[] = [];
  if (recentScores.length > 0) {
    recentScores.slice(0, 10).forEach(score => {
      // Lower score = higher stress (normalized to 1-10)
      const stress = Math.max(1, Math.min(10, 10 - (score.score / 10)));
      stressData.push(stress);
      stressDates.push(score.date);
    });
  } else {
    // Default data if no scores
    for (let i = 0; i < 10; i++) {
      stressData.push(5);
      const dateStr = new Date(Date.now() - (9 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      stressDates.push(dateStr || new Date().toISOString().split('T')[0] || '');
    }
  }

  // Get user initials
  const getUserInitials = (): string => {
    if (user?.full_name) {
      const names = user.full_name.split(' ');
      return names.map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email[0]?.toUpperCase() || 'U';
    }
    return 'U';
  };

  const userName = user?.full_name || user?.email || 'User';
  const userClass = user?.class_level ? `Class ${user.class_level}` : '';

  const dashboardContent = (
    <div className="min-h-screen bg-void flex relative">
      <CosmicBackground />
      {/* Left Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-surface/80 backdrop-blur-sm border-r border-surface-variant relative z-10">
        <div className="p-4 border-b border-surface-variant">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cosmic to-plasma flex items-center justify-center text-white font-semibold text-sm">
              {getUserInitials()}
            </div>
            <div>
              <h2 className="font-semibold text-white text-sm">{userName}</h2>
              <p className="text-xs text-gray-400">{userClass}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <button
            onClick={() => {
              setActiveNav('practice');
              if (onNavigateToPractice) onNavigateToPractice();
            }}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-3xl transition-colors ${activeNav === 'practice' ? 'bg-elevated text-electric' : 'text-gray-400 hover:bg-elevated'
              }`}
          >
            <PracticeIcon />
            <span className="font-medium text-sm">Start Practice</span>
          </button>
          <button
            onClick={() => {
              setActiveNav('focus');
              handleOpenFocusSettings();
            }}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-3xl transition-colors ${activeNav === 'focus' ? 'bg-elevated text-electric' : 'text-gray-400 hover:bg-elevated'
              }`}
          >
            <FocusIcon />
            <span className="font-medium text-sm">Focus Mode</span>
          </button>
          <button
            onClick={() => {
              setActiveNav('battle');
              if (onNavigateToBattle) onNavigateToBattle();
            }}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-3xl transition-colors ${activeNav === 'battle' ? 'bg-elevated text-electric' : 'text-gray-400 hover:bg-elevated'
              }`}
          >
            <BattleIcon />
            <span className="font-medium text-sm">Join Battle</span>
          </button>
        </nav>
        <div className="p-3 border-t border-surface-variant">
          <button
            onClick={logout}
            className="w-full px-3 py-2 text-gray-400 hover:bg-elevated rounded-3xl transition-colors text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative z-10">
        <div className="h-screen overflow-y-auto pb-20 lg:pb-4">
          <div className="max-w-7xl mx-auto p-4 space-y-4">
            {/* Top Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Recent Score Card */}
              <div className="bg-surface rounded-3xl p-4 shadow-sm">
                <h3 className="text-xs font-medium text-gray-400 mb-1">Recent Score</h3>
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-bold text-white">{recentScore.score.toFixed(0)}%</span>
                  <span className="text-xs text-gray-400">{recentScore.date}</span>
                </div>
              </div>

              {/* Streak Card */}
              <div className="bg-surface rounded-3xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-medium text-gray-400 mb-1">Streak</h3>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-3xl font-bold text-orange-400">{streak}</span>
                      <span className="text-xs text-gray-400">days</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 bg-orange-500/20 rounded-2xl flex items-center justify-center">
                    <FlameIcon />
                  </div>
                </div>
              </div>

              {/* Daily XP Card */}
              <div className="bg-surface rounded-3xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-medium text-gray-400 mb-1">Daily XP</h3>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-3xl font-bold text-solar">+{dailyXP}</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 bg-solar/20 rounded-2xl flex items-center justify-center">
                    <SparkleIcon />
                  </div>
                </div>
              </div>
            </div>



            {/* SWOT Analysis */}
            <div className="bg-surface/80 backdrop-blur-sm rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">SWOT Analysis</h3>
                <SubjectSelect
                  subjects={['Mathematics', 'Physics', 'Chemistry', 'Biology']}
                  selectedSubject={selectedSubject}
                  onSelect={setSelectedSubject}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-3xl p-5 border-2 border-green-500/30 backdrop-blur-sm hover:border-green-500/50 transition-all">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center">
                      <StrengthsIcon />
                    </div>
                    <h4 className="font-bold text-green-400 text-lg">Strengths</h4>
                  </div>
                  <ul className="space-y-3">
                    {subjectStrongTopics.length > 0 ? (
                      subjectStrongTopics.slice(0, 2).map((topic, i) => (
                        <li key={i} className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0" />
                          <div>
                            <p className="text-green-300 font-medium text-sm">{topic}</p>
                            <p className="text-green-400/70 text-xs mt-1">Identified as strength in assessment</p>
                          </div>
                        </li>
                      ))
                    ) : practiceStrongTopics.length > 0 ? (
                      practiceStrongTopics.slice(0, 2).map((topic, i) => (
                        <li key={i} className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0" />
                          <div>
                            <p className="text-green-300 font-medium text-sm">{topic.topic}</p>
                            <p className="text-green-400/70 text-xs mt-1">Accuracy: {topic.accuracy.toFixed(0)}% - Strong performance</p>
                          </div>
                        </li>
                      ))
                    ) : (
                      <li className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0" />
                        <div>
                          <p className="text-green-300 font-medium text-sm">Average Performance</p>
                          <p className="text-green-400/70 text-xs mt-1">Overall accuracy: {subjectAvgAccuracy.toFixed(0)}%</p>
                        </div>
                      </li>
                    )}
                  </ul>
                </div>

                {/* Weaknesses */}
                <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 rounded-3xl p-5 border-2 border-red-500/30 backdrop-blur-sm hover:border-red-500/50 transition-all">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center">
                      <WeaknessesIcon />
                    </div>
                    <h4 className="font-bold text-red-400 text-lg">Weaknesses</h4>
                  </div>
                  <ul className="space-y-3">
                    {subjectWeakTopics.length > 0 ? (
                      subjectWeakTopics.slice(0, 2).map((topic, i) => (
                        <li key={i} className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0" />
                          <div>
                            <p className="text-red-300 font-medium text-sm">{topic}</p>
                            <p className="text-red-400/70 text-xs mt-1">Identified as weakness in assessment</p>
                          </div>
                        </li>
                      ))
                    ) : practiceWeakTopics.length > 0 ? (
                      practiceWeakTopics.slice(0, 2).map((topic, i) => (
                        <li key={i} className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0" />
                          <div>
                            <p className="text-red-300 font-medium text-sm">{topic.topic}</p>
                            <p className="text-red-400/70 text-xs mt-1">Accuracy: {topic.accuracy.toFixed(0)}% - Needs improvement</p>
                          </div>
                        </li>
                      ))
                    ) : (
                      <li className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0" />
                        <div>
                          <p className="text-red-300 font-medium text-sm">No major weaknesses</p>
                          <p className="text-red-400/70 text-xs mt-1">Keep up the excellent work!</p>
                        </div>
                      </li>
                    )}
                  </ul>
                </div>

                {/* Opportunities */}
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-3xl p-5 border-2 border-blue-500/30 backdrop-blur-sm hover:border-blue-500/50 transition-all">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                      <OpportunitiesIcon />
                    </div>
                    <h4 className="font-bold text-blue-400 text-lg">Opportunities</h4>
                  </div>
                  <ul className="space-y-3">
                    <li className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                      <div>
                        <p className="text-blue-300 font-medium text-sm">Focus on Weak Topics</p>
                        <p className="text-blue-400/70 text-xs mt-1">
                          {practiceWeakTopics.length > 0
                            ? `Improve accuracy in ${practiceWeakTopics.length} topics`
                            : subjectWeakTopics.length > 0
                              ? `Work on ${subjectWeakTopics.length} identified weak areas`
                              : 'Continue building on strengths'}
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                      <div>
                        <p className="text-blue-300 font-medium text-sm">Practice Regularly</p>
                        <p className="text-blue-400/70 text-xs mt-1">
                          {subjectTopics.length > 0
                            ? `${subjectTopics.length} topics available for practice`
                            : 'Start practicing to see improvements'}
                        </p>
                      </div>
                    </li>
                  </ul>
                </div>

                {/* Threats */}
                <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 rounded-3xl p-5 border-2 border-yellow-500/30 backdrop-blur-sm hover:border-yellow-500/50 transition-all">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-yellow-500/20 rounded-2xl flex items-center justify-center">
                      <ThreatsIcon />
                    </div>
                    <h4 className="font-bold text-yellow-400 text-lg">Threats</h4>
                  </div>
                  <ul className="space-y-3">
                    <li className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0" />
                      <div>
                        <p className="text-yellow-300 font-medium text-sm">Inconsistent Practice</p>
                        <p className="text-yellow-400/70 text-xs mt-1">Maintain regular study schedule</p>
                      </div>
                    </li>
                    <li className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0" />
                      <div>
                        <p className="text-yellow-300 font-medium text-sm">Multiple Weak Areas</p>
                        <p className="text-yellow-400/70 text-xs mt-1">
                          {practiceWeakTopics.length > 0
                            ? `${practiceWeakTopics.length} topics need attention`
                            : 'Balance practice across all topics'}
                        </p>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Performance Trend Chart */}
            <div className="bg-surface rounded-3xl p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-white mb-3">Performance Trend (7 Days)</h3>
              <div className="h-32">
                <svg width="100%" height="100%" viewBox="0 0 400 150" preserveAspectRatio="none" className="overflow-visible">
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#536DFE" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#536DFE" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`${generateCurvePath(performanceData, 400, 120)} L 400 120 L 0 120 Z`}
                    fill="url(#gradient)"
                  />
                  <path
                    d={generateCurvePath(performanceData, 400, 120)}
                    stroke="#536DFE"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {performanceData.map((value, index) => {
                    if (value === 0) return null;
                    const max = Math.max(...performanceData.filter(v => v > 0));
                    const min = Math.min(...performanceData.filter(v => v > 0));
                    const range = max - min || 1;
                    const x = (index / (performanceData.length - 1)) * 400;
                    const y = 120 - ((value - min) / range) * 120;
                    return (
                      <circle
                        key={index}
                        cx={x}
                        cy={y}
                        r="3"
                        fill="#536DFE"
                      />
                    );
                  })}
                </svg>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                  <span key={i}>{day}</span>
                ))}
              </div>
            </div>

            {/* Concept Breakdown & Efficiency Gauge Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Concept Breakdown */}
              <div className="bg-surface rounded-3xl p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-white mb-3">Concept Breakdown</h3>
                <div className="space-y-3">
                  {conceptData.length > 0 ? conceptData.map((concept, index) => (
                    <div key={index}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-medium text-gray-300">{concept.name}</span>
                        <span className="text-xs text-gray-400">{concept.percentage.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-surface-variant rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cosmic to-plasma rounded-full transition-all duration-500"
                          style={{ width: `${concept.percentage}%` }}
                        />
                      </div>
                    </div>
                  )) : (
                    <p className="text-xs text-gray-400">No topic data available</p>
                  )}
                </div>
              </div>

              {/* Efficiency Gauge */}
              <div className="bg-surface rounded-3xl p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-white mb-3">Accuracy</h3>
                <div className="flex items-center justify-center">
                  <div className="relative w-32 h-32">
                    <svg width="128" height="128" viewBox="0 0 128 128" className="transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="#252532"
                        strokeWidth="8"
                        fill="none"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="#10B981"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 56}`}
                        strokeDashoffset={`${2 * Math.PI * 56 * (1 - efficiencyPercentage / 100)}`}
                        strokeLinecap="round"
                        className="transition-all duration-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">{efficiencyPercentage}%</div>
                        <div className="text-xs text-gray-400">Accuracy</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stress Correlation Line Graph */}
            <div className="bg-surface/80 backdrop-blur-sm rounded-3xl p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-white mb-4">Stress Correlation</h3>
              <div className="h-48">
                <svg width="100%" height="100%" viewBox="0 0 400 150" preserveAspectRatio="none" className="overflow-visible">
                  <defs>
                    <linearGradient id="stressGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#EF4444" stopOpacity="0.3" />
                      <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.1" />
                    </linearGradient>
                  </defs>
                  {/* Grid lines */}
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                    <line
                      key={level}
                      x1="0"
                      y1={150 - (level - 1) * 15}
                      x2="400"
                      y2={150 - (level - 1) * 15}
                      stroke="#252532"
                      strokeWidth="0.5"
                      strokeDasharray="2,2"
                    />
                  ))}
                  {/* Area fill */}
                  <path
                    d={`${generateCurvePath(stressData, 400, 150)} L 400 150 L 0 150 Z`}
                    fill="url(#stressGradient)"
                  />
                  {/* Line */}
                  <path
                    d={generateCurvePath(stressData, 400, 150)}
                    stroke="#EF4444"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Data points */}
                  {stressData.map((value, index) => {
                    const max = Math.max(...stressData);
                    const min = Math.min(...stressData);
                    const range = max - min || 1;
                    const x = (index / (stressData.length - 1)) * 400;
                    const y = 150 - ((value - min) / range) * 150;
                    const color = value > 7 ? '#EF4444' : value > 4 ? '#F59E0B' : '#10B981';
                    return (
                      <circle
                        key={index}
                        cx={x}
                        cy={y}
                        r="4"
                        fill={color}
                        stroke="#1A1A24"
                        strokeWidth="2"
                      />
                    );
                  })}
                </svg>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                {stressDates.length > 0 ? (
                  stressDates.map((date, i) => (
                    <span key={i}>{new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  ))
                ) : (
                  <span>No data available</span>
                )}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Low Stress</span>
                <span>High Stress</span>
              </div>
            </div>


          </div>
        </div>
      </main>

      {/* Bottom Navigation - Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface/80 backdrop-blur-sm border-t border-surface-variant shadow-lg z-40">
        <div className="flex justify-around items-center h-16">
          <button
            onClick={() => {
              setActiveNav('practice');
              if (onNavigateToPractice) onNavigateToPractice();
            }}
            className={`flex flex-col items-center justify-center space-y-1 px-4 py-2 rounded-3xl transition-colors ${activeNav === 'practice' ? 'text-electric' : 'text-gray-400'
              }`}
          >
            <PracticeIcon />
            <span className="text-xs font-medium">Practice</span>
          </button>
          <button
            onClick={() => {
              setActiveNav('focus');
              handleOpenFocusSettings();
            }}
            className={`flex flex-col items-center justify-center space-y-1 px-4 py-2 rounded-3xl transition-colors ${activeNav === 'focus' ? 'text-electric' : 'text-gray-400'
              }`}
          >
            <FocusIcon />
            <span className="text-xs font-medium">Focus</span>
          </button>
          <button
            onClick={() => {
              setActiveNav('battle');
              if (onNavigateToBattle) onNavigateToBattle();
            }}
            className={`flex flex-col items-center justify-center space-y-1 px-4 py-2 rounded-3xl transition-colors ${activeNav === 'battle' ? 'text-electric' : 'text-gray-400'
              }`}
          >
            <BattleIcon />
            <span className="text-xs font-medium">Battle</span>
          </button>
        </div>
      </nav>

      {/* Focus Mode Settings Modal */}
      {showFocusSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-3xl p-6 max-w-2xl w-full border border-surface-variant max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Configure Focus Mode</h2>
                <p className="text-gray-400 text-sm">Set your pomodoro timer and break preferences</p>
              </div>
              <button
                onClick={() => setShowFocusSettings(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <FocusModeSettings
              onSettingsChange={handleFocusSettingsChange}
              initialSettings={tempFocusSettings}
            />
            <div className="mt-6 flex items-center justify-between pt-6 border-t border-surface-variant">
              <button
                onClick={() => setShowFocusSettings(false)}
                className="px-6 py-2 text-gray-400 hover:text-white transition-colors rounded-3xl"
              >
                Cancel
              </button>
              <button
                onClick={handleStartFocusMode}
                className="px-6 py-2 bg-prepverse-red hover:bg-prepverse-red-dark text-white rounded-3xl transition-colors font-semibold flex items-center space-x-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Start Focus Mode</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Wrap content with FocusModeSession if enabled
  if (focusModeSettings.enabled) {
    return (
      <FocusModeSession
        settings={focusModeSettings}
        onSessionEnd={handleEndFocusSession}
      >
        {dashboardContent}
      </FocusModeSession>
    );
  }

  return dashboardContent;
};
