'use client';

import { useState } from 'react';
import { useApp } from '@/lib/context';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pin, Trash2, Search, Edit3, Check, X } from 'lucide-react';
import { getNotes, createNote, updateNote, deleteNote, Note } from '@/lib/storage';

export default function NotesPanel() {
  const { addNotification } = useApp();
  const [notes, setNotes] = useState<Note[]>(getNotes);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const refresh = () => setNotes(getNotes());

  const filtered = notes.filter(
    n => n.title.toLowerCase().includes(search.toLowerCase()) ||
         n.content.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createNote(newTitle.trim(), newContent.trim());
    setNewTitle(''); setNewContent(''); setShowNew(false);
    refresh();
    addNotification('MEMORY', 'Note saved successfully.', 'memory');
  };

  const handleUpdate = (id: string) => {
    updateNote(id, { title: editTitle, content: editContent });
    setEditingId(null);
    refresh();
  };

  const handleDelete = (id: string, title: string) => {
    deleteNote(id);
    refresh();
    addNotification('MEMORY', `Deleted note: "${title}"`, 'memory');
  };

  const handlePin = (id: string, pinned: boolean) => {
    updateNote(id, { pinned: !pinned });
    refresh();
  };

  return (
    <div className="flex flex-col h-full p-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-cyan-400 tracking-wider">NOTES</h1>
        <button
          onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm hover:bg-cyan-500/20 transition-colors"
        >
          <Plus size={16} /> New Note
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search notes..."
          className="w-full bg-white/5 border border-cyan-500/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-500/50 transition-colors"
        />
      </div>

      {/* New note form */}
      <AnimatePresence>
        {showNew && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="bg-black/40 border border-cyan-500/20 rounded-xl p-4 space-y-3">
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Note title..."
                className="w-full bg-transparent text-white text-sm outline-none placeholder-gray-500"
              />
              <textarea
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                placeholder="Write your note..."
                rows={3}
                className="w-full bg-transparent text-gray-300 text-sm outline-none resize-none placeholder-gray-500"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowNew(false)}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  className="px-4 py-1.5 text-xs bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 hover:bg-cyan-500/30 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {sorted.length === 0 && (
          <div className="text-center py-12 text-gray-500 text-sm">
            {search ? 'No matching notes found.' : 'No notes yet. Create your first note!'}
          </div>
        )}

        {sorted.map(note => (
          <motion.div
            key={note.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-black/40 border rounded-xl p-4 transition-colors ${
              note.pinned ? 'border-cyan-500/30' : 'border-white/10 hover:border-white/20'
            }`}
          >
            {editingId === note.id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full bg-transparent text-white text-sm outline-none"
                />
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={3}
                  className="w-full bg-transparent text-gray-300 text-sm outline-none resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-white p-1">
                    <X size={14} />
                  </button>
                  <button onClick={() => handleUpdate(note.id)} className="text-cyan-400 hover:text-cyan-300 p-1">
                    <Check size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {note.pinned && <Pin size={12} className="text-cyan-400 shrink-0" />}
                      <h3 className="text-sm font-semibold text-white truncate">{note.title}</h3>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{note.content}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <button
                      onClick={() => handlePin(note.id, note.pinned)}
                      className={`p-1.5 rounded-lg transition-colors ${note.pinned ? 'text-cyan-400' : 'text-gray-500 hover:text-cyan-400'}`}
                      title={note.pinned ? 'Unpin' : 'Pin'}
                    >
                      <Pin size={14} />
                    </button>
                    <button
                      onClick={() => { setEditingId(note.id); setEditTitle(note.title); setEditContent(note.content); }}
                      className="p-1.5 text-gray-500 hover:text-cyan-400 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(note.id, note.title)}
                      className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  {new Date(note.updatedAt).toLocaleString()}
                </div>
              </>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
