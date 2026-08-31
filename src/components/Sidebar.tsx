'use client';

import { useApp } from '@/lib/context';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, MessageSquare, Mic, Database, StickyNote,
  ListTodo, Settings, ChevronLeft, ChevronRight, Cpu, X, Menu
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'voice', label: 'Voice', icon: Mic },
  { id: 'memory', label: 'Memory', icon: Database },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { currentView, setCurrentView, sidebarOpen, setSidebarOpen } = useApp();

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-black/60 backdrop-blur border border-cyan-500/30 rounded-lg p-2 text-cyan-400 hover:bg-cyan-500/10 transition-colors"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 240 : 64 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed left-0 top-0 h-full z-50 bg-black/80 backdrop-blur-xl border-r border-cyan-500/20 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyan-500/20">
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-2"
              >
                <Cpu className="text-cyan-400 w-6 h-6" />
                <span className="text-cyan-400 font-bold text-lg tracking-wider">JARVIS</span>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-cyan-400/60 hover:text-cyan-400 transition-colors hidden lg:block"
          >
            {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id);
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  active
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                    : 'text-gray-400 hover:text-cyan-400 hover:bg-white/5'
                }`}
              >
                <Icon size={18} className={active ? 'text-cyan-400' : ''} />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="whitespace-nowrap text-sm font-medium overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-cyan-500/20">
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs text-cyan-400/40 text-center"
              >
                JARVIS v1.0
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>
    </>
  );
}
