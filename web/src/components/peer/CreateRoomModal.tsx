import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Pencil, MessageSquare } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { CreateSessionRequest } from '../../api/peer';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (request: CreateSessionRequest) => void;
  isCreating?: boolean;
  initialTopic?: string;
}

const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology'];

const topicSuggestions: Record<string, string[]> = {
  Mathematics: [
    'Quadratic Equations',
    'Trigonometry',
    'Calculus',
    'Probability',
    'Coordinate Geometry',
    'Linear Algebra',
  ],
  Physics: [
    'Mechanics',
    'Electricity & Magnetism',
    'Optics',
    'Thermodynamics',
    'Modern Physics',
    'Waves & Oscillations',
  ],
  Chemistry: [
    'Organic Chemistry',
    'Inorganic Chemistry',
    'Physical Chemistry',
    'Chemical Bonding',
    'Electrochemistry',
    'Chemical Kinetics',
  ],
  Biology: [
    'Cell Biology',
    'Genetics',
    'Human Physiology',
    'Ecology',
    'Evolution',
    'Botany',
  ],
};

export function CreateRoomModal({
  isOpen,
  onClose,
  onCreate,
  isCreating,
  initialTopic,
}: CreateRoomModalProps) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState<string>(subjects[0] ?? 'Mathematics');
  const [topic, setTopic] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(4);
  const [whiteboardEnabled, setWhiteboardEnabled] = useState(true);

  // Pre-fill topic when initialTopic is provided (e.g., from peer invite)
  useEffect(() => {
    if (initialTopic && isOpen) {
      setTopic(initialTopic);
    }
  }, [initialTopic, isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName('');
      setTopic('');
      setMaxParticipants(4);
      setWhiteboardEnabled(true);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    onCreate({
      name: name.trim() || null,
      topic: topic.trim(),
      subject,
      max_participants: maxParticipants,
      is_whiteboard_enabled: whiteboardEnabled,
      is_voice_enabled: false, // Voice not implemented
    });
  };

  const handleSubjectChange = (newSubject: string) => {
    setSubject(newSubject);
    setTopic(''); // Reset topic when subject changes
  };

  const currentTopics = topicSuggestions[subject] || [];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md bg-deep rounded-2xl border border-white/10 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white">Create Study Room</h2>
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                {/* Room name (optional) */}
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">
                    Room Name (optional)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., JEE Prep Group"
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-prepverse-red/50"
                  />
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Subject</label>
                  <div className="grid grid-cols-2 gap-2">
                    {subjects.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleSubjectChange(s)}
                        className={`
                          px-3 py-2 rounded-lg text-sm font-medium transition-all
                          ${
                            subject === s
                              ? 'bg-prepverse-red text-white'
                              : 'bg-surface text-white/70 hover:bg-white/10'
                          }
                        `}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Topic */}
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">
                    Topic <span className="text-prepverse-red">*</span>
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Quadratic Equations"
                    required
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-prepverse-red/50"
                  />
                  {/* Topic suggestions */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {currentTopics.slice(0, 4).map((t: string) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTopic(t)}
                        className="px-2 py-0.5 rounded-full text-xs bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70 transition-colors"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Max participants */}
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">
                    <Users className="w-4 h-4 inline mr-1" />
                    Max Participants
                  </label>
                  <div className="flex gap-2">
                    {[2, 3, 4].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setMaxParticipants(n)}
                        className={`
                          flex-1 py-2 rounded-lg text-sm font-medium transition-all
                          ${
                            maxParticipants === n
                              ? 'bg-prepverse-red text-white'
                              : 'bg-surface text-white/70 hover:bg-white/10'
                          }
                        `}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Features */}
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Features</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-2 rounded-lg bg-surface cursor-pointer hover:bg-white/5">
                      <input
                        type="checkbox"
                        checked={whiteboardEnabled}
                        onChange={(e) => setWhiteboardEnabled(e.target.checked)}
                        className="w-4 h-4 rounded accent-prepverse-red"
                      />
                      <Pencil className="w-4 h-4 text-white/60" />
                      <span className="text-sm text-white/80">Whiteboard</span>
                    </label>
                    <label className="flex items-center gap-3 p-2 rounded-lg bg-surface opacity-50 cursor-default">
                      <input
                        type="checkbox"
                        checked={true}
                        disabled
                        className="w-4 h-4 rounded"
                      />
                      <MessageSquare className="w-4 h-4 text-white/60" />
                      <span className="text-sm text-white/80">Chat (always enabled)</span>
                    </label>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={!topic.trim() || isCreating}
                  className="
                    w-full py-3 rounded-xl font-semibold
                    bg-gradient-to-r from-prepverse-red to-prepverse-red-light
                    text-white
                    hover:shadow-glow-md active:scale-[0.98]
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all
                  "
                >
                  {isCreating ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    'Create Room'
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
