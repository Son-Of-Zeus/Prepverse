import { motion } from 'framer-motion';
import type { ChatMessage as ChatMessageType } from '../../store/peerStore';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isSystem = message.messageType === 'system';

  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center my-2"
      >
        <span className="px-3 py-1 rounded-full bg-white/5 text-xs text-white/40">
          {message.content}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${message.isFromMe ? 'justify-end' : 'justify-start'} mb-3`}
    >
      <div
        className={`
          max-w-[75%] rounded-2xl px-4 py-2
          ${
            message.isFromMe
              ? 'bg-prepverse-red text-white rounded-br-md'
              : 'bg-surface border border-white/10 text-white rounded-bl-md'
          }
        `}
      >
        {/* Sender name (only for others' messages) */}
        {!message.isFromMe && (
          <div className="text-xs text-white/50 font-medium mb-1">
            {message.senderName}
          </div>
        )}

        {/* Message content */}
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>

        {/* Timestamp */}
        <div
          className={`
            text-[10px] mt-1
            ${message.isFromMe ? 'text-white/60' : 'text-white/40'}
          `}
        >
          {formatTime(message.createdAt)}
        </div>
      </div>
    </motion.div>
  );
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  placeholder = 'Type a message...',
}: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        onSend();
      }
    }
  };

  return (
    <div className="flex gap-2 p-3 border-t border-white/10 bg-deep">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="
          flex-1 px-4 py-2 rounded-full
          bg-surface border border-white/10
          text-white placeholder-white/30
          focus:outline-none focus:border-prepverse-red/50
          disabled:opacity-50
        "
      />
      <button
        onClick={onSend}
        disabled={disabled || !value.trim()}
        className="
          px-4 py-2 rounded-full
          bg-prepverse-red text-white font-medium
          hover:bg-prepverse-red-light active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all
        "
      >
        Send
      </button>
    </div>
  );
}
