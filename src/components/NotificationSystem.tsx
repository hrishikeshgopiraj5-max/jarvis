'use client';

import { useApp } from '@/lib/context';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Cpu, Database, AlertTriangle } from 'lucide-react';

const iconMap = {
  jarvis: Cpu,
  system: Bell,
  memory: Database,
  error: AlertTriangle,
};

const colorMap = {
  jarvis: 'border-cyan-500/50 text-cyan-400',
  system: 'border-blue-500/50 text-blue-400',
  memory: 'border-green-500/50 text-green-400',
  error: 'border-red-500/50 text-red-400',
};

export default function NotificationSystem() {
  const { notifications, dismissNotification } = useApp();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {notifications.map((n) => {
          const Icon = iconMap[n.type];
          const colors = colorMap[n.type];
          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              className={`bg-black/80 backdrop-blur-xl border ${colors} rounded-xl p-4 shadow-lg shadow-black/30`}
            >
              <div className="flex items-start gap-3">
                <Icon size={18} className="mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold tracking-wider uppercase opacity-70 mb-1">{n.title}</div>
                  <div className="text-sm text-gray-300">{n.body}</div>
                </div>
                <button
                  onClick={() => dismissNotification(n.id)}
                  className="text-gray-500 hover:text-gray-300 transition-colors shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
