import { useState } from 'react';
import { X, Send, Tag, AlertCircle } from 'lucide-react';
import { forumApi } from '../../api/forum';

interface AskQuestionModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export const AskQuestionModal = ({ onClose, onSuccess }: AskQuestionModalProps) => {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [tags, setTags] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);

            await forumApi.createPost({
                title,
                content: body,
                category: 'general', // Default for now
                tags: tagList
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Failed to post question:', err);
            setError(err.response?.data?.detail || 'Failed to post question. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl relative animate-scale-in flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <h2 className="text-xl font-display font-bold text-white">Ask a Question</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-200 text-sm">
                            <AlertCircle size={18} className="text-red-400 shrink-0" />
                            {error}
                        </div>
                    )}

                    <form id="ask-form" onSubmit={handleSubmit} className="space-y-6">
                        {/* Title */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Title</label>
                            <p className="text-xs text-slate-500">Be specific and imagine you're asking a question to another person.</p>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. How does photosynthesis work in low light conditions?"
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                                required
                                minLength={5}
                            />
                        </div>

                        {/* Body */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Description</label>
                            <p className="text-xs text-slate-500">Include all the information someone would need to answer your question.</p>
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder="Explain your problem details here..."
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors min-h-[200px] resize-y"
                                required
                                minLength={20}
                            />
                        </div>

                        {/* Tags */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                <Tag size={14} />
                                Tags
                            </label>
                            <p className="text-xs text-slate-500">Add up to 5 tags to describe what your question is about (comma separated).</p>
                            <input
                                type="text"
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                                placeholder="e.g. biology, exam-prep, plant-physiology"
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                            />
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 bg-slate-900/50 rounded-b-2xl flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors border border-transparent"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="ask-form"
                        disabled={isSubmitting}
                        className="px-6 py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Send size={16} />
                        )}
                        <span>Post Question</span>
                    </button>
                </div>

            </div>
        </div>
    );
};
