import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, User, GraduationCap, Sparkles, Mic, MicOff, Volume2, VolumeX, Square } from 'lucide-react';
import { ChatMessage, uploadAudioForTranscription } from '../../api/guru';

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
 * - Voice input (STT via Groq Whisper)
 * - Voice output (TTS via browser native API)
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
  
  // Voice state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const lastSpokenMessageRef = useRef<number>(-1);
  const [voicesLoaded, setVoicesLoaded] = useState(false);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // TTS: Speak text using browser native API
  const speakText = useCallback((text: string) => {
    if (!window.speechSynthesis) {
      console.warn('Speech synthesis not supported');
      return;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Get available voices
    const voices = window.speechSynthesis.getVoices();
    
    if (voices.length > 0) {
      // Try to find a good English voice
      const preferredVoice = voices.find(
        v => v.name.includes('Google US English') || 
             v.name.includes('Samantha') ||
             v.name.includes('Microsoft Zira') ||
             v.name.includes('Alex') ||
             v.name.includes('Daniel')
      ) || voices.find(v => v.lang.startsWith('en-US')) 
        || voices.find(v => v.lang.startsWith('en'))
        || voices[0];
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }
    
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => {
      setIsSpeaking(true);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      setIsSpeaking(false);
    };
    
    // For Chrome: need to call this in a user gesture or after voices loaded
    window.speechSynthesis.speak(utterance);
  }, []);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // Auto-speak new AI messages
  useEffect(() => {
    if (!autoSpeak || isLoading || !voicesLoaded) return;
    
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'model' && messages.length - 1 > lastSpokenMessageRef.current) {
      lastSpokenMessageRef.current = messages.length - 1;
      // Small delay to ensure UI has updated
      setTimeout(() => speakText(lastMessage.content), 100);
    }
  }, [messages, autoSpeak, isLoading, speakText, voicesLoaded]);

  // Load voices on mount (some browsers need this)
  useEffect(() => {
    if (!window.speechSynthesis) return;
    
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setVoicesLoaded(true);
      }
    };
    
    // Try immediately
    loadVoices();
    
    // Also listen for voiceschanged event (Chrome fires this async)
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    
    // Safari/Firefox workaround: poll for voices
    const pollInterval = setInterval(() => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setVoicesLoaded(true);
        clearInterval(pollInterval);
      }
    }, 100);
    
    // Cleanup after 3 seconds max
    setTimeout(() => clearInterval(pollInterval), 3000);
    
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      clearInterval(pollInterval);
    };
  }, []);

  // STT: Start recording
  const startRecording = async () => {
    try {
      // Stop any ongoing speech
      stopSpeaking();
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Determine supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/ogg';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        if (audioChunksRef.current.length === 0) {
          setIsProcessingVoice(false);
          return;
        }
        
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        try {
          setIsProcessingVoice(true);
          const transcribedText = await uploadAudioForTranscription(audioBlob);
          
          if (transcribedText && transcribedText.trim()) {
            // Populate the input field so user can review/edit before sending
            setInputValue(transcribedText.trim());
            // Focus the input so user can edit or press Enter to send
            inputRef.current?.focus();
          }
        } catch (error) {
          console.error('Transcription failed:', error);
          // Show error in input field as fallback
          setInputValue('[Voice transcription failed - please type your message]');
        } finally {
          setIsProcessingVoice(false);
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Microphone access denied. Please enable microphone permissions to use voice input.');
    }
  };

  // STT: Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Toggle recording
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading && !disabled) {
      stopSpeaking(); // Stop TTS when user sends a message
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
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center gap-3">
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
        
        {/* Voice Toggle */}
        <button
          onClick={() => {
            if (autoSpeak) stopSpeaking();
            setAutoSpeak(!autoSpeak);
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            autoSpeak 
              ? 'bg-purple-600/30 text-purple-300 hover:bg-purple-600/50' 
              : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
          }`}
          title={autoSpeak ? 'Auto-speak is ON' : 'Auto-speak is OFF'}
        >
          {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          {autoSpeak ? 'Voice On' : 'Voice Off'}
        </button>
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
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} group`}
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
              <div className="relative max-w-[75%]">
                <div
                  className={`rounded-2xl px-4 py-3 ${
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
                
                {/* Play button for messages (visible on hover) */}
                {msg.role === 'model' && (
                  <button
                    onClick={() => speakText(msg.content)}
                    className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full bg-slate-700/80 hover:bg-slate-600 text-slate-300"
                    title="Play this message"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                )}
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

      {/* Speaking Indicator */}
      {isSpeaking && (
        <div className="px-4 py-2 bg-purple-500/10 border-t border-purple-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-purple-300">
            <Volume2 className="w-4 h-4 animate-pulse" />
            <span className="text-xs">Speaking...</span>
          </div>
          <button
            onClick={stopSpeaking}
            className="p-1 rounded-full bg-purple-600/30 hover:bg-purple-600/50 text-purple-300"
            title="Stop speaking"
          >
            <Square className="w-3 h-3" />
          </button>
        </div>
      )}

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
          {/* Voice Input Button */}
          <button
            type="button"
            onClick={toggleRecording}
            disabled={isLoading || disabled || isProcessingVoice}
            className={`px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${
              isRecording
                ? 'bg-red-600 hover:bg-red-500 animate-pulse'
                : isProcessingVoice
                  ? 'bg-purple-600'
                  : 'bg-slate-700 hover:bg-slate-600'
            }`}
            title={isRecording ? 'Stop recording' : isProcessingVoice ? 'Processing...' : 'Start voice input'}
          >
            {isProcessingVoice ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : isRecording ? (
              <MicOff className="w-5 h-5 text-white" />
            ) : (
              <Mic className="w-5 h-5 text-white" />
            )}
          </button>
          
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={stopSpeaking}
            placeholder={
              disabled 
                ? "Session ended" 
                : isRecording 
                  ? "Recording... Click mic to stop" 
                  : isProcessingVoice 
                    ? "Processing voice..." 
                    : "Explain the concept to your student..."
            }
            disabled={isLoading || disabled || isRecording || isProcessingVoice}
            rows={2}
            className="flex-1 bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading || disabled || isRecording || isProcessingVoice}
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
          {isRecording 
            ? '🔴 Recording... Click the mic button to stop'
            : 'Press Enter to send, Shift+Enter for new line, or use the mic for voice input'
          }
        </p>
      </form>
    </div>
  );
};

export default GuruChatInterface;
