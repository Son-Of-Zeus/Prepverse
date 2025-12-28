import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, User, GraduationCap, Sparkles } from 'lucide-react';
import { ChatMessage } from '../../api/guru';

interface GuruChatInterfaceProps {
  /** Chat messages history */
  messages: ChatMessage[];
  /** Current persona of the AI student */
  persona: string;
  /** Topic being taught */
  topic: string;
  /** Whether waiting for AI response */
  isLoading?: boolean;
  /** Callback when user sends a message */
  onSendMessage: (message: string) => void;
  /** Optional hints from AI */
  hints?: string[] | null;
  /** Whether the input should be disabled */
  disabled?: boolean;
}

/**
 * GuruChatInterface - Chat UI for teaching the AI student
 * 
 * Features:
 * - Distinct avatars for Teacher (user) and Student (AI)
 * - Message bubbles with different styling
 * - Typing indicator when AI is responding
 * - Auto-scroll to bottom
 * - Optional hints display
 */
export const GuruChatInterface: React.FC<GuruChatInterfaceProps> = ({
  messages,
  persona,
  topic,
  isLoading = false,
  onSendMessage,
  hints,
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading && !disabled) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const getPersonaEmoji = () => {
    const emojiMap: Record<string, string> = {
      '5-year-old': '👶',
      'peer': '🎓',
      'skeptic': '🤔',
      'curious_beginner': '🌟',
    };
    return emojiMap[persona] || '📚';
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 rounded-2xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-700/50 bg-slate-800/50">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-lg">
          {getPersonaEmoji()}
        </div>
        <div>
          <h3 className="font-semibold text-white">AI Student</h3>
          <p className="text-xs text-slate-400">
            Learning about <span className="text-purple-400">{topic}</span>
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence mode="popLayout">
          {messages.map((msg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-prepverse-red to-orange-500'
                    : 'bg-gradient-to-br from-purple-500 to-blue-500'
                }`}
              >
                {msg.role === 'user' ? (
                  <GraduationCap className="w-4 h-4 text-white" />
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-prepverse-red/80 to-orange-600/80 text-white rounded-br-sm'
                    : 'bg-slate-800 text-slate-100 border border-slate-700/50 rounded-bl-sm'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>
                <span
                  className={`text-[10px] mt-1 block ${
                    msg.role === 'user' ? 'text-white/60' : 'text-slate-500'
                  }`}
                >
                  {msg.role === 'user' ? 'You (Teacher)' : 'Student'}
                </span>
              </div>
            </motion.div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="bg-slate-800 border border-slate-700/50 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                    className="w-2 h-2 bg-purple-400 rounded-full"
                  />
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                    className="w-2 h-2 bg-purple-400 rounded-full"
                  />
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                    className="w-2 h-2 bg-purple-400 rounded-full"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Hints Display */}
      {hints && hints.length > 0 && (
        <div className="px-4 py-2 bg-yellow-500/10 border-t border-yellow-500/20">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400 mt-0.5" />
            <div className="text-xs text-yellow-200">
              <span className="font-semibold">Hint:</span> {hints[0]}
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-slate-700/50 bg-slate-800/50"
      >
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "Session ended" : "Explain the concept to your student..."}
            disabled={isLoading || disabled}
            rows={2}
            className="flex-1 bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading || disabled}
            className="px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-all flex items-center justify-center"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </div>
  );
};

export default GuruChatInterface;
