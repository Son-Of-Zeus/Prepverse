import React, { useState, useEffect } from 'react';
import { CosmicBackground } from '../components/ui/CosmicBackground';
import { getTopics, TopicsResponse, startSession, StartSessionRequest } from '../api/practice';

/**
 * Practice Selection Page
 * 
 * Allows users to select subject and topic to start a practice session
 */
interface PracticeSelectionPageProps {
  onNavigateBack?: () => void;
  onStartSession?: (sessionId: string) => void;
}

export const PracticeSelectionPage: React.FC<PracticeSelectionPageProps> = ({
  onNavigateBack,
  onStartSession,
}) => {
  const [topics, setTopics] = useState<TopicsResponse | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | null>(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadTopics();
  }, []);

  useEffect(() => {
    if (topics && topics.subjects.length > 0 && !selectedSubject) {
      const firstSubject = topics.subjects[0];
      if (firstSubject) {
        setSelectedSubject(firstSubject);
      }
    }
  }, [topics, selectedSubject]);

  const loadTopics = async () => {
    setIsLoading(true);
    try {
      const data = await getTopics();
      setTopics(data);
    } catch (error) {
      console.error('Failed to load topics:', error);
      alert('Failed to load topics. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartPractice = async () => {
    if (!selectedSubject) {
      alert('Please select a subject');
      return;
    }

    setIsLoading(true);
    try {
      const request: StartSessionRequest = {
        subject: selectedSubject,
        topic: selectedTopic || null,
        difficulty: difficulty || null,
        question_count: questionCount,
      };
      const session = await startSession(request);
      if (onStartSession) {
        onStartSession(session.session_id);
      } else {
        alert(`Practice session started! Session ID: ${session.session_id}`);
      }
    } catch (error) {
      console.error('Failed to start practice session:', error);
      alert('Failed to start practice session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTopics = topics?.topics.filter((t) => t.subject === selectedSubject) || [];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-void">
      <CosmicBackground starCount={80} showGrid />

      {/* Header */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-4">
          <button
            onClick={onNavigateBack}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Dashboard
          </button>
          <div>
            <h1 className="font-display text-xl text-white">Start Practice</h1>
            <p className="text-gray-500 text-sm">Choose your subject and topic</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-6 py-8 max-w-4xl mx-auto">
        {isLoading && !topics ? (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="w-16 h-16 border-4 border-prepverse-red border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading topics...</p>
          </div>
        ) : (
          <div className="glass rounded-2xl p-8">
            <h2 className="font-display text-2xl text-white mb-6">Practice Settings</h2>

            <div className="space-y-6">
              {/* Subject Selection */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Subject</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => {
                    setSelectedSubject(e.target.value);
                    setSelectedTopic('');
                  }}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-prepverse-red"
                >
                  {topics?.subjects.map((subject) => (
                    <option key={subject} value={subject} className="bg-void">
                      {subject.charAt(0).toUpperCase() + subject.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Topic Selection */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Topic (Optional)</label>
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-prepverse-red"
                >
                  <option value="" className="bg-void">All Topics</option>
                  {filteredTopics.map((topic) => (
                    <option key={topic.id} value={topic.topic} className="bg-void">
                      {topic.display_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Difficulty Selection */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Difficulty (Optional)</label>
                <select
                  value={difficulty || ''}
                  onChange={(e) =>
                    setDifficulty(
                      e.target.value ? (e.target.value as 'easy' | 'medium' | 'hard') : null
                    )
                  }
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-prepverse-red"
                >
                  <option value="" className="bg-void">Adaptive (Recommended)</option>
                  <option value="easy" className="bg-void">Easy</option>
                  <option value="medium" className="bg-void">Medium</option>
                  <option value="hard" className="bg-void">Hard</option>
                </select>
              </div>

              {/* Question Count */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Number of Questions</label>
                <input
                  type="number"
                  min="5"
                  max="50"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value) || 10)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-prepverse-red"
                />
              </div>

              {/* Start Button */}
              <button
                onClick={handleStartPractice}
                disabled={isLoading || !selectedSubject}
                className="w-full px-6 py-4 bg-prepverse-red hover:bg-prepverse-red-light transition-colors rounded-xl text-white font-medium disabled:opacity-50"
              >
                {isLoading ? 'Starting...' : 'Start Practice Session'}
              </button>
            </div>
          </div>
        )}

        {/* Quick Start Options */}
        {topics && topics.subjects.length > 0 && (
          <div className="mt-8 glass rounded-2xl p-6">
            <h3 className="font-display text-xl text-white mb-4">Quick Start</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {topics.subjects.map((subject) => (
                <button
                  key={subject}
                  onClick={() => {
                    setSelectedSubject(subject);
                    setSelectedTopic('');
                    setDifficulty(null);
                    setQuestionCount(10);
                  }}
                  className="px-4 py-3 bg-white/5 hover:bg-white/10 transition-colors rounded-xl text-white font-medium"
                >
                  {subject.charAt(0).toUpperCase() + subject.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PracticeSelectionPage;

