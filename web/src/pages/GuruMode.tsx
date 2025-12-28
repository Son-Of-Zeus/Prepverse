import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  BookOpen,
  Users,
  Baby,
  HelpCircle,
  Sparkles,
  ArrowLeft,
  Play,
  Loader2,
  AlertCircle,
  History,
  X,
  ChevronDown,
} from 'lucide-react';

import { CosmicBackground } from '../components/ui/CosmicBackground';
import { ConfusionMeter, GuruChatInterface, ReportCardModal } from '../components/guru';
import {
  startGuruSession,
  sendGuruMessage,
  endGuruSession,
  abandonGuruSession,
  getActiveGuruSession,
  getGuruSessionDetail,
  GuruPersona,
  GuruSessionResponse,
  ChatMessage,
  GuruReportCard,
} from '../api/guru';
import { getTopics, TopicInfo, TopicsResponse } from '../api/practice';
import { useAuth } from '../hooks/useAuth';

// Persona options
const PERSONAS: { id: GuruPersona; name: string; icon: React.ReactNode; description: string }[] = [
  {
    id: 'peer',
    name: 'Fellow Student',
    icon: <GraduationCap className="w-5 h-5" />,
    description: 'A classmate who missed the lesson',
  },
  {
    id: '5-year-old',
    name: '5-Year-Old',
    icon: <Baby className="w-5 h-5" />,
    description: 'Needs very simple explanations',
  },
  {
    id: 'skeptic',
    name: 'Skeptic',
    icon: <HelpCircle className="w-5 h-5" />,
    description: 'Questions everything, asks for proof',
  },
  {
    id: 'curious_beginner',
    name: 'Curious Beginner',
    icon: <Sparkles className="w-5 h-5" />,
    description: 'Excited to learn, asks follow-ups',
  },
];

type PageState = 'setup' | 'loading' | 'chat' | 'report';

/**
 * GuruMode Page - Teach AI Feature
 * 
 * Students teach concepts to an AI student using the Feynman Technique.
 * The AI simulates confusion, asks questions, and grades the explanation.
 */
export const GuruMode: React.FC = () => {
  const navigate = useNavigate();
  const { refetchUser } = useAuth();

  // Page state
  const [pageState, setPageState] = useState<PageState>('setup');
  const [error, setError] = useState<string | null>(null);

  // Topics from DB
  const [topicsData, setTopicsData] = useState<TopicsResponse | null>(null);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [filteredTopics, setFilteredTopics] = useState<TopicInfo[]>([]);

  // Setup form state
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<TopicInfo | null>(null);
  const [subtopic, setSubtopic] = useState<string>('');
  const [selectedPersona, setSelectedPersona] = useState<GuruPersona>('peer');

  // Session state
  const [session, setSession] = useState<GuruSessionResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [confusionLevel, setConfusionLevel] = useState<number>(80);
  const [isSatisfied, setIsSatisfied] = useState<boolean>(false);
  const [hints, setHints] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Report card state
  const [reportCard, setReportCard] = useState<GuruReportCard | null>(null);
  const [sessionDuration, setSessionDuration] = useState<number>(0);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);

  // Fetch topics on mount
  useEffect(() => {
    loadTopics();
    checkActiveSession();
  }, []);

  // Filter topics when subject changes
  useEffect(() => {
    if (topicsData && selectedSubject) {
      const filtered = topicsData.topics.filter(t => t.subject === selectedSubject);
      setFilteredTopics(filtered);
      setSelectedTopic(null); // Reset topic when subject changes
    } else {
      setFilteredTopics([]);
    }
  }, [selectedSubject, topicsData]);

  const loadTopics = async () => {
    try {
      setTopicsLoading(true);
      const data = await getTopics();
      setTopicsData(data);
    } catch (err) {
      console.error('Failed to load topics:', err);
      setError('Failed to load topics. Please refresh the page.');
    } finally {
      setTopicsLoading(false);
    }
  };

  const checkActiveSession = async () => {
    try {
      const active = await getActiveGuruSession();
      if (active.has_active && active.session_id) {
        // Resume active session
        const detail = await getGuruSessionDetail(active.session_id);
        setSession({
          session_id: detail.session_id,
          topic: detail.topic,
          subject: detail.subject,
          persona: detail.persona,
          initial_message: '',
          created_at: detail.created_at,
        });
        setMessages(detail.messages);
        setPageState('chat');
      }
    } catch (err) {
      console.error('Failed to check active session:', err);
    }
  };

  const handleStartSession = async () => {
    if (!selectedSubject || !selectedTopic) {
      setError('Please select a subject and topic');
      return;
    }

    // Build topic name with optional subtopic
    const topicName = subtopic.trim() 
      ? `${selectedTopic.display_name} - ${subtopic.trim()}`
      : selectedTopic.display_name;

    setError(null);
    setPageState('loading');

    try {
      const response = await startGuruSession({
        topic: topicName,
        subject: selectedSubject,
        persona: selectedPersona,
      });

      setSession(response);
      setMessages([{ role: 'model', content: response.initial_message }]);
      setConfusionLevel(80); // Start confused
      setPageState('chat');
    } catch (err: any) {
      console.error('Failed to start session:', err);
      
      // Check if user already has an active session
      if (err.response?.data?.detail?.session_id) {
        setError(`You already have an active session on "${err.response.data.detail.topic}"`);
      } else {
        setError(err.response?.data?.detail || 'Failed to start session. Please try again.');
      }
      setPageState('setup');
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!session || isLoading) return;

    setIsLoading(true);
    setError(null);

    // Optimistically add user message
    const userMessage: ChatMessage = { role: 'user', content: message };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await sendGuruMessage({
        session_id: session.session_id,
        message,
      });

      // Add AI response
      const aiMessage: ChatMessage = { role: 'model', content: response.message };
      setMessages((prev) => [...prev, aiMessage]);

      setConfusionLevel(response.confusion_level);
      setHints(response.hints || null);
      setIsSatisfied(response.is_satisfied);

      // If satisfied, trigger end session
      if (response.is_satisfied) {
        await handleEndSession();
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setError('Failed to send message. Please try again.');
      // Remove optimistic message on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!session) return;

    setIsLoading(true);

    try {
      const response = await endGuruSession(session.session_id);
      setReportCard(response.report_card);
      setSessionDuration(response.session_duration_seconds);
      setShowReportModal(true);
      setPageState('report');
      
      // Refetch user data to update XP display
      refetchUser();
    } catch (err: any) {
      console.error('Failed to end session:', err);
      setError('Failed to get report card. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAbandonSession = async () => {
    if (!session) return;

    if (!window.confirm('Are you sure you want to quit? You won\'t earn any XP.')) {
      return;
    }

    try {
      await abandonGuruSession(session.session_id);
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to abandon session:', err);
      navigate('/dashboard');
    }
  };

  const handleCloseReport = () => {
    setShowReportModal(false);
    navigate('/dashboard');
  };

  const handleGoBack = () => {
    if (pageState === 'chat' && session) {
      handleAbandonSession();
    } else {
      navigate('/dashboard');
    }
  };

  // Render setup screen
  const renderSetup = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto pb-8"
    >
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-4 shadow-glow-purple"
        >
          <GraduationCap className="w-10 h-10 text-white" />
        </motion.div>
        <h1 className="text-3xl font-display font-bold text-white mb-2">
          Guru Mode
        </h1>
        <p className="text-slate-400">
          Teach a concept to an AI student using the Feynman Technique.
          <br />
          The better you explain, the more XP you earn!
        </p>
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading topics */}
      {topicsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          <span className="ml-3 text-slate-400">Loading topics...</span>
        </div>
      ) : (
        <>
          {/* Subject Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              <BookOpen className="inline w-4 h-4 mr-2" />
              Choose a Subject
            </label>
            <div className="relative">
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 cursor-pointer"
              >
                <option value="">Select a subject...</option>
                {topicsData?.subjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject.charAt(0).toUpperCase() + subject.slice(1)}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Topic Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Choose a Topic
            </label>
            {selectedSubject ? (
              filteredTopics.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {filteredTopics.map((topicItem) => (
                    <button
                      key={topicItem.id}
                      onClick={() => setSelectedTopic(topicItem)}
                      className={`p-3 rounded-xl border transition-all text-left ${
                        selectedTopic?.id === topicItem.id
                          ? 'border-purple-500 bg-purple-500/20 text-white'
                          : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-white'
                      }`}
                    >
                      <span className="block font-medium text-sm truncate">
                        {topicItem.display_name}
                      </span>
                      {topicItem.description && (
                        <span className="text-xs text-slate-500 line-clamp-1">
                          {topicItem.description}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm py-4 text-center">
                  No topics available for this subject
                </p>
              )
            ) : (
              <p className="text-slate-500 text-sm py-4 text-center">
                Select a subject first to see available topics
              </p>
            )}
          </div>

          {/* Optional Subtopic */}
          {selectedTopic && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-6"
            >
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Specific Subtopic (Optional)
              </label>
              <input
                type="text"
                value={subtopic}
                onChange={(e) => setSubtopic(e.target.value)}
                placeholder={`e.g., A specific concept within ${selectedTopic.display_name}...`}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
              />
              <p className="text-xs text-slate-500 mt-2">
                Leave empty to teach the entire topic, or specify a narrower subtopic
              </p>
            </motion.div>
          )}

          {/* Persona Selection */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              <Users className="inline w-4 h-4 mr-2" />
              Choose Your Student
            </label>
            <div className="grid grid-cols-2 gap-3">
              {PERSONAS.map((persona) => (
                <button
                  key={persona.id}
                  onClick={() => setSelectedPersona(persona.id)}
                  className={`p-4 rounded-xl border transition-all text-left ${
                    selectedPersona === persona.id
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        selectedPersona === persona.id
                          ? 'bg-purple-500 text-white'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {persona.icon}
                    </div>
                    <div>
                      <span className="block font-medium text-white">{persona.name}</span>
                      <span className="text-xs text-slate-400">{persona.description}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStartSession}
            disabled={!selectedSubject || !selectedTopic}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed rounded-xl text-white font-semibold text-lg transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" />
            Start Teaching
          </button>

          {/* History Link */}
          <button
            onClick={() => navigate('/guru/history')}
            className="w-full mt-4 py-3 border border-slate-700 hover:border-slate-600 rounded-xl text-slate-400 hover:text-white transition-all flex items-center justify-center gap-2"
          >
            <History className="w-4 h-4" />
            View Past Sessions
          </button>
        </>
      )}
    </motion.div>
  );

  // Render loading screen
  const renderLoading = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center flex-1"
    >
      <Loader2 className="w-12 h-12 text-purple-400 animate-spin mb-4" />
      <p className="text-slate-400">Finding a student for you...</p>
    </motion.div>
  );

  // Render chat screen
  const renderChat = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col flex-1 max-w-3xl mx-auto w-full min-h-0"
    >
      {/* Header */}
      <div className="mb-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              Teaching: {session?.topic}
            </h2>
            <p className="text-sm text-slate-400">
              {session?.subject} • {PERSONAS.find(p => p.id === session?.persona)?.name || 'Student'}
            </p>
          </div>
          <button
            onClick={handleEndSession}
            disabled={isLoading || messages.length < 3}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-all"
          >
            Finish & Get Report
          </button>
        </div>

        {/* Confusion Meter */}
        <ConfusionMeter level={confusionLevel} isSatisfied={isSatisfied} />
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400 text-sm flex-shrink-0"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Interface */}
      <div className="flex-1 min-h-0">
        <GuruChatInterface
          messages={messages}
          persona={session?.persona || 'peer'}
          topic={session?.topic || ''}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
          hints={hints}
          disabled={isSatisfied}
        />
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-prepverse-dark relative overflow-x-hidden">
      <CosmicBackground starCount={60} />

      {/* Back Button */}
      <div className="absolute top-4 left-4 z-20">
        <button
          onClick={handleGoBack}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-full text-slate-300 hover:text-white transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">
            {pageState === 'chat' ? 'Quit' : 'Back'}
          </span>
        </button>
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 pt-16 pb-8 min-h-screen flex flex-col">
        <AnimatePresence mode="wait">
          {pageState === 'setup' && (
            <div className="flex-1 overflow-y-auto">
              {renderSetup()}
            </div>
          )}
          {pageState === 'loading' && renderLoading()}
          {pageState === 'chat' && (
            <div className="flex-1 flex flex-col min-h-0">
              {renderChat()}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Report Card Modal */}
      <ReportCardModal
        isOpen={showReportModal}
        onClose={handleCloseReport}
        reportCard={reportCard}
        topic={session?.topic || ''}
        subject={session?.subject || ''}
        sessionDuration={sessionDuration}
      />
    </div>
  );
};

export default GuruMode;
