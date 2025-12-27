import React, { useState, useEffect } from 'react';
import { getDashboard, DashboardResponse } from '../api/dashboard';
import { getOnboardingStatus, OnboardingStatus } from '../api/onboarding';
import { CosmicBackground } from '../components/ui/CosmicBackground';

interface SubjectDetailProps {
  subject: string;
  onBack: () => void;
}

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

export const SubjectDetailPage: React.FC<SubjectDetailProps> = ({ subject, onBack }) => {
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashboard, onboarding] = await Promise.all([
        getDashboard(),
        getOnboardingStatus().catch(() => null)
      ]);
      setDashboardData(dashboard);
      setOnboardingStatus(onboarding);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !dashboardData) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-prepverse-red border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  const subjectTopics = dashboardData.suggested_topics.filter(t => t.subject === subject);
  const avgAccuracy = subjectTopics.length > 0 
    ? subjectTopics.reduce((sum, t) => sum + t.accuracy, 0) / subjectTopics.length 
    : 0;
  
  // Get subject-specific performance data
  const subjectRecentScores = dashboardData.performance_summary.recent_scores.filter(
    s => s.subject && s.subject.toLowerCase() === subject.toLowerCase()
  );
  
  // Calculate performance trend from recent scores
  const performanceTrend = subjectRecentScores.length > 0
    ? subjectRecentScores.map(s => s.score)
    : [avgAccuracy];
  
  // Get SWOT data from onboarding and practice
  const onboardingWeakTopics = onboardingStatus?.weak_topics || [];
  const onboardingStrongTopics = onboardingStatus?.strong_topics || [];
  
  // Filter topics by subject for SWOT
  const subjectWeakTopics = onboardingWeakTopics.filter(topic => 
    topic.toLowerCase().includes(subject.toLowerCase()) || 
    subjectTopics.some(st => st.topic.toLowerCase().includes(topic.toLowerCase()))
  );
  const subjectStrongTopics = onboardingStrongTopics.filter(topic => 
    topic.toLowerCase().includes(subject.toLowerCase()) || 
    subjectTopics.some(st => st.topic.toLowerCase().includes(topic.toLowerCase()) && st.accuracy >= 70)
  );
  
  // Practice-based weaknesses (topics with low accuracy)
  const practiceWeakTopics = subjectTopics.filter(t => t.accuracy < 70);
  const practiceStrongTopics = subjectTopics.filter(t => t.accuracy >= 70);
  
  const subjectColors: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
    'mathematics': { bg: 'bg-math/20', text: 'text-math', border: 'border-math/30', gradient: 'from-math/20 to-math/10' },
    'physics': { bg: 'bg-physics/20', text: 'text-physics', border: 'border-physics/30', gradient: 'from-physics/20 to-physics/10' },
    'chemistry': { bg: 'bg-chemistry/20', text: 'text-chemistry', border: 'border-chemistry/30', gradient: 'from-chemistry/20 to-chemistry/10' },
    'biology': { bg: 'bg-biology/20', text: 'text-biology', border: 'border-biology/30', gradient: 'from-biology/20 to-biology/10' },
  };
  const defaultColors = { bg: 'bg-math/20', text: 'text-math', border: 'border-math/30', gradient: 'from-math/20 to-math/10' };
  const colors = subjectColors[subject.toLowerCase()] ?? defaultColors;

  // Prioritized revision paths - sorted by accuracy (lowest first)
  const prioritizedPaths = [...subjectTopics].sort((a, b) => a.accuracy - b.accuracy);

  // Generate smooth curve path
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

  // Performance analysis metrics
  const totalAttempts = subjectRecentScores.reduce((sum, s) => sum + s.attempts, 0);
  const avgScore = performanceTrend.length > 0
    ? performanceTrend.reduce((a, b) => a + b, 0) / performanceTrend.length
    : avgAccuracy;
  const scoreVariance = performanceTrend.length > 0
    ? performanceTrend.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / performanceTrend.length
    : 0;

  return (
    <div className="min-h-screen bg-void relative">
      <CosmicBackground />
      <div className="relative z-10">
        {/* Header */}
        <div className="bg-surface/80 backdrop-blur-sm border-b border-surface-variant">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">Back to Dashboard</span>
            </button>
            <div className="flex items-center space-x-4">
              <div className={`${colors.bg} ${colors.border} border-2 rounded-2xl px-4 py-2`}>
                <h1 className={`${colors.text} font-bold text-xl`}>{subject}</h1>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Average Accuracy</p>
                <p className={`${colors.text} text-2xl font-bold`}>{avgAccuracy.toFixed(0)}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-4 space-y-6">
          {/* SWOT Analysis - Enhanced UI */}
          <div className="bg-surface/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <svg className="w-6 h-6 text-electric" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>SWOT Analysis</span>
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {/* Strengths */}
              <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-3xl p-5 border-2 border-green-500/30 backdrop-blur-sm hover:border-green-500/50 transition-all">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center">
                    <StrengthsIcon />
                  </div>
                  <h3 className="font-bold text-green-400 text-lg">Strengths</h3>
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
                        <p className="text-green-400/70 text-xs mt-1">Overall accuracy: {avgAccuracy.toFixed(0)}%</p>
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
                  <h3 className="font-bold text-red-400 text-lg">Weaknesses</h3>
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
                  <h3 className="font-bold text-blue-400 text-lg">Opportunities</h3>
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
                        {totalAttempts > 0 
                          ? `${totalAttempts} attempts made - maintain consistency`
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
                  <h3 className="font-bold text-yellow-400 text-lg">Threats</h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <p className="text-yellow-300 font-medium text-sm">
                        {scoreVariance > 100 ? 'Inconsistent Performance' : 'Performance Stability'}
                      </p>
                      <p className="text-yellow-400/70 text-xs mt-1">
                        {scoreVariance > 100 
                          ? 'High variance in scores - focus on consistency'
                          : 'Maintain current performance level'}
                      </p>
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

          {/* Detailed Study Plan / Revision Paths */}
          <div className="bg-surface/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <svg className="w-6 h-6 text-electric" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>Detailed Study Plan</span>
            </h2>

            {/* Performance Analysis */}
            <div className="mb-6 bg-surface-variant/50 rounded-3xl p-4">
              <h3 className="text-sm font-semibold text-white mb-4">Performance Analysis</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Average Score</p>
                  <p className={`text-2xl font-bold ${colors.text}`}>{avgScore.toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Total Attempts</p>
                  <p className="text-2xl font-bold text-white">{totalAttempts}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Consistency</p>
                  <p className={`text-2xl font-bold ${scoreVariance < 100 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {scoreVariance < 100 ? 'High' : 'Low'}
                  </p>
                </div>
              </div>
            </div>

            {/* Performance Trend */}
            <div className="mb-6 bg-surface-variant/50 rounded-3xl p-4">
              <h3 className="text-sm font-semibold text-white mb-4">Performance Trend</h3>
              <div className="h-48">
                <svg width="100%" height="100%" viewBox="0 0 400 150" preserveAspectRatio="none" className="overflow-visible">
                  <defs>
                    <linearGradient id={`gradient-${subject}`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={subject.toLowerCase() === 'mathematics' ? '#FF6B6B' : 
                                                      subject.toLowerCase() === 'physics' ? '#4ECDC4' :
                                                      subject.toLowerCase() === 'chemistry' ? '#9B59B6' : '#27AE60'} stopOpacity="0.3" />
                      <stop offset="100%" stopColor={subject.toLowerCase() === 'mathematics' ? '#FF6B6B' : 
                                                      subject.toLowerCase() === 'physics' ? '#4ECDC4' :
                                                      subject.toLowerCase() === 'chemistry' ? '#9B59B6' : '#27AE60'} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {performanceTrend.length > 0 && (
                    <>
                      <path
                        d={`${generateCurvePath(performanceTrend, 400, 150)} L 400 150 L 0 150 Z`}
                        fill={`url(#gradient-${subject})`}
                      />
                      <path
                        d={generateCurvePath(performanceTrend, 400, 150)}
                        stroke={subject.toLowerCase() === 'mathematics' ? '#FF6B6B' : 
                                subject.toLowerCase() === 'physics' ? '#4ECDC4' :
                                subject.toLowerCase() === 'chemistry' ? '#9B59B6' : '#27AE60'}
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {performanceTrend.map((value, index) => {
                        if (value === 0) return null;
                        const max = Math.max(...performanceTrend.filter(v => v > 0));
                        const min = Math.min(...performanceTrend.filter(v => v > 0));
                        const range = max - min || 1;
                        const x = (index / (performanceTrend.length - 1)) * 400;
                        const y = 150 - ((value - min) / range) * 150;
                        return (
                          <circle
                            key={index}
                            cx={x}
                            cy={y}
                            r="4"
                            fill={subject.toLowerCase() === 'mathematics' ? '#FF6B6B' : 
                                  subject.toLowerCase() === 'physics' ? '#4ECDC4' :
                                  subject.toLowerCase() === 'chemistry' ? '#9B59B6' : '#27AE60'}
                          />
                        );
                      })}
                    </>
                  )}
                </svg>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                {subjectRecentScores.length > 0 ? (
                  subjectRecentScores.map((score, i) => (
                    <span key={i}>{new Date(score.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  ))
                ) : (
                  <span className="text-gray-500">No recent data</span>
                )}
              </div>
            </div>

            {/* Prioritized Revision Paths */}
            <h3 className="text-sm font-semibold text-white mb-4">Prioritized Revision Paths</h3>
            <div className="space-y-3">
              {prioritizedPaths.length > 0 ? prioritizedPaths.map((topic, index) => {
                const priority = topic.accuracy < 50 ? 'High' : topic.accuracy < 70 ? 'Medium' : 'Low';
                const targetAccuracy = Math.min(100, topic.accuracy + (100 - topic.accuracy) * 0.3);
                return (
                  <div key={index} className="bg-surface-variant/50 rounded-3xl p-4 border border-surface-variant hover:border-electric/30 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 ${colors.bg} ${colors.border} border-2 rounded-2xl flex items-center justify-center font-bold ${colors.text}`}>
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-semibold text-white text-sm">{topic.topic}</h4>
                          <p className="text-xs text-gray-400">{topic.subject}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        priority === 'High' ? 'bg-red-500/20 text-red-400' :
                        priority === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {priority} Priority
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Current Accuracy</p>
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-surface-variant rounded-full h-2">
                            <div
                              className={`h-full ${colors.bg.replace('/20', '')} rounded-full transition-all`}
                              style={{ width: `${topic.accuracy}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${colors.text}`}>{topic.accuracy.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Target Accuracy</p>
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-surface-variant rounded-full h-2">
                            <div
                              className="h-full bg-electric rounded-full transition-all"
                              style={{ width: `${targetAccuracy}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-electric">{targetAccuracy.toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Progress: {(topic.progress * 100).toFixed(0)}%</span>
                      <span className="text-gray-400">Mastery: {topic.mastery_level}</span>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">No revision paths available yet</p>
                  <p className="text-xs mt-1">Start practicing to see prioritized topics</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

