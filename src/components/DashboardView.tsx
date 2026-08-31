'use client';

import { motion } from 'framer-motion';
import AIOrb from './AIOrb';
import { useApp } from '@/lib/context';
import WeatherWidget from './WeatherWidget';
import {
  ClockWidget, SystemStatusWidget, TasksWidget, AIStatusWidget, ActivityWidget, MeshVisualWidget
} from './DashboardWidgets';

export default function DashboardView() {
  const { orbState, setCurrentView } = useApp();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Hero section with Orb */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Orb */}
        <div className="flex-1 bg-black/40 backdrop-blur border border-cyan-500/20 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[350px] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />
          <div className="w-64 h-64 md:w-80 md:h-80 relative z-10">
            <AIOrb />
          </div>
          <div className="text-center mt-4 z-10">
            <motion.div
              className="text-3xl font-bold text-cyan-400 tracking-[0.3em]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              JARVIS
            </motion.div>
            <motion.div
              className="text-sm text-cyan-400/50 tracking-wider mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {orbState === 'IDLE' ? 'SYSTEM ONLINE' : orbState}
            </motion.div>
            <motion.button
              onClick={() => setCurrentView('chat')}
              className="mt-4 px-6 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 text-sm hover:bg-cyan-500/20 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              Start Conversation
            </motion.button>
          </div>
        </div>

        {/* Right panel widgets */}
        <div className="flex-1 grid grid-cols-1 gap-4">
          <SystemStatusWidget />
          <AIStatusWidget />
        </div>
      </div>

      {/* Agent Mesh visual */}
      <MeshVisualWidget />

      {/* Bottom widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ClockWidget />
        <WeatherWidget />
        <TasksWidget />
        <ActivityWidget />
      </div>
    </div>
  );
}
