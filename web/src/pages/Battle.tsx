import React, { useState, useEffect } from 'react';
import { CosmicBackground } from '../components/ui/CosmicBackground';
import {
  listBattles,
  createBattle,
  joinBattle,
  Battle,
  CreateBattleRequest,
} from '../api/battle';
import { getTopics, TopicsResponse } from '../api/practice';

/**
 * Battle/Join Battle Page
 * 
 * Allows users to create or join quiz battles
 */
interface BattlePageProps {
  onNavigateBack?: () => void;
}

export const BattlePage: React.FC<BattlePageProps> = ({ onNavigateBack }) => {
  const [battles, setBattles] = useState<Battle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [topics, setTopics] = useState<TopicsResponse | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [questionCount, setQuestionCount] = useState(10);

  useEffect(() => {
    loadBattles();
    loadTopics();
  }, []);

  const loadBattles = async () => {
    setIsLoading(true);
    try {
      const data = await listBattles();
      setBattles(data);
    } catch (error) {
      console.error('Failed to load battles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTopics = async () => {
    try {
      const data = await getTopics();
      setTopics(data);
      if (data.subjects.length > 0 && !selectedSubject) {
        const firstSubject = data.subjects[0];
        if (firstSubject) {
          setSelectedSubject(firstSubject);
        }
      }
    } catch (error) {
      console.error('Failed to load topics:', error);
    }
  };

  const handleCreateBattle = async () => {
    setIsLoading(true);
    try {
      const request: CreateBattleRequest = {
        subject: selectedSubject,
        topic: selectedTopic || null,
        difficulty,
        question_count: questionCount,
        max_participants: 4,
      };
      const newBattle = await createBattle(request);
      setBattles([newBattle, ...battles]);
      setShowCreateModal(false);
      alert('Battle created! Waiting for participants...');
    } catch (error) {
      console.error('Failed to create battle:', error);
      alert('Failed to create battle. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinBattle = async (battleId: string) => {
    setIsLoading(true);
    try {
      await joinBattle(battleId);
      alert(`Joined battle! Battle ID: ${battleId}`);
      // In a real app, you would navigate to the battle screen
    } catch (error) {
      console.error('Failed to join battle:', error);
      alert('Failed to join battle. It may be full or already started.');
    } finally {
      setIsLoading(false);
    }
  };

  const availableBattles = battles.filter((b) => b.status === 'waiting');
  const activeBattles = battles.filter((b) => b.status === 'in_progress');

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
            <h1 className="font-display text-xl text-white">Battle Mode</h1>
            <p className="text-gray-500 text-sm">Compete with other students</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 bg-prepverse-red hover:bg-prepverse-red-light transition-colors rounded-xl text-white font-medium"
        >
          Create Battle
        </button>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-6 py-8 max-w-6xl mx-auto">
        {/* Available Battles */}
        <section className="mb-8">
          <h2 className="font-display text-xl text-white mb-4">Available Battles</h2>
          {isLoading && battles.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <div className="w-16 h-16 border-4 border-prepverse-red border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading battles...</p>
            </div>
          ) : availableBattles.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <p className="text-gray-400 mb-4">No available battles at the moment.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-prepverse-red hover:bg-prepverse-red-light transition-colors rounded-xl text-white font-medium"
              >
                Create One
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableBattles.map((battle) => (
                <div key={battle.battle_id} className="glass rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-medium text-white mb-1">
                        {battle.subject.charAt(0).toUpperCase() + battle.subject.slice(1)}
                      </h3>
                      {battle.topic && (
                        <p className="text-gray-400 text-sm">{battle.topic}</p>
                      )}
                    </div>
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                      Waiting
                    </span>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Difficulty:</span>
                      <span className="text-white capitalize">{battle.difficulty}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Questions:</span>
                      <span className="text-white">{battle.question_count}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Participants:</span>
                      <span className="text-white">
                        {battle.current_participants}/{battle.max_participants}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleJoinBattle(battle.battle_id)}
                    disabled={isLoading || battle.current_participants >= battle.max_participants}
                    className="w-full px-4 py-2 bg-prepverse-red hover:bg-prepverse-red-light transition-colors rounded-xl text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {battle.current_participants >= battle.max_participants
                      ? 'Full'
                      : 'Join Battle'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Active Battles */}
        {activeBattles.length > 0 && (
          <section className="mb-8">
            <h2 className="font-display text-xl text-white mb-4">Active Battles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeBattles.map((battle) => (
                <div key={battle.battle_id} className="glass rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-medium text-white mb-1">
                        {battle.subject.charAt(0).toUpperCase() + battle.subject.slice(1)}
                      </h3>
                      {battle.topic && (
                        <p className="text-gray-400 text-sm">{battle.topic}</p>
                      )}
                    </div>
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                      In Progress
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Participants:</span>
                      <span className="text-white">
                        {battle.current_participants}/{battle.max_participants}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Create Battle Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="glass rounded-2xl p-8 max-w-md w-full mx-4">
              <h2 className="font-display text-2xl text-white mb-6">Create Battle</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Subject</label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-prepverse-red"
                  >
                    {topics?.subjects.map((subject) => (
                      <option key={subject} value={subject} className="bg-void">
                        {subject.charAt(0).toUpperCase() + subject.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Topic (Optional)</label>
                  <select
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-prepverse-red"
                  >
                    <option value="" className="bg-void">All Topics</option>
                    {topics?.topics
                      .filter((t) => t.subject === selectedSubject)
                      .map((topic) => (
                        <option key={topic.id} value={topic.topic} className="bg-void">
                          {topic.display_name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-prepverse-red"
                  >
                    <option value="easy" className="bg-void">Easy</option>
                    <option value="medium" className="bg-void">Medium</option>
                    <option value="hard" className="bg-void">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Question Count</label>
                  <input
                    type="number"
                    min="5"
                    max="30"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value) || 10)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-prepverse-red"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 transition-colors rounded-xl text-white font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateBattle}
                    disabled={isLoading}
                    className="flex-1 px-4 py-3 bg-prepverse-red hover:bg-prepverse-red-light transition-colors rounded-xl text-white font-medium disabled:opacity-50"
                  >
                    {isLoading ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default BattlePage;

