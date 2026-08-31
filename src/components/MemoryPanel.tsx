'use client';

import { useState } from 'react';
import { useApp } from '@/lib/context';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Trash2, Edit3, Check, X } from 'lucide-react';
import { getConversations, updateConversation, deleteConversation, Conversation } from '@/lib/storage';

export default function MemoryPanel() {
  const { setCurrentView, addNotification } = useApp();
  const [conversations, setConversations] = useState<Conversation[]>(getConversations);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const refresh = () => setConversations(getConversations());

  const handleRename = (id: string) => {
    if (editTitle.trim()) {
      updateConversation(id, { title: editTitle.trim() });
      refresh();
    }
    setEditingId(null);
  };

  const handleDelete = (id: string, title: string) => {
    deleteConversation(id);
    refresh();
    addNotification('MEMORY', `Deleted conversation: "${title}"`, 'memory');
  };

  return (
    <div className="flex flex-col h-full p-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-cyan-400 tracking-wider">MEMORY</h1>
        <div className="text-sm text-gray-500">{conversations.length} conversations</div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {conversations.length === 0 && (
          <div className="text-center py-12 text-gray-500 text-sm">
            No conversations yet. Start chatting with JARVIS!
          </div>
        )}

        <AnimatePresence>
          {conversations.map(conv => (
            <motion.div
              key={conv.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="bg-black/40 border border-white/10 rounded-xl p-4 hover:border-cyan-500/20 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <MessageSquare size={16} className="text-cyan-400 shrink-0" />
                  {editingId === conv.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleRename(conv.id)}
                        className="flex-1 bg-transparent border border-cyan-500/30 rounded px-2 py-1 text-sm text-white outline-none"
                        autoFocus
                      />
                      <button onClick={() => handleRename(conv.id)} className="text-cyan-400 hover:text-cyan-300 p-1">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-white p-1">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-300 truncate">{conv.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {conv.messages.length} messages · {new Date(conv.updatedAt).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 ml-2 shrink-0">
                  <button
                    onClick={() => { setCurrentView('chat'); addNotification('MEMORY', `Continuing: "${conv.title}"`, 'memory'); }}
                    className="px-2 py-1 text-xs text-cyan-400/60 hover:text-cyan-400 border border-cyan-500/20 rounded-lg hover:border-cyan-500/40 transition-colors"
                  >
                    Continue
                  </button>
                  <button
                    onClick={() => { setEditingId(conv.id); setEditTitle(conv.title); }}
                    className="p-1.5 text-gray-500 hover:text-cyan-400 rounded-lg transition-colors"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(conv.id, conv.title)}
                    className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {conv.messages.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  <div className="text-xs text-gray-600 line-clamp-2">
                    Last: {conv.messages[conv.messages.length - 1]?.content.slice(0, 120)}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
