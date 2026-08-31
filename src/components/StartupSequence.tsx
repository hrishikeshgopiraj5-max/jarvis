'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/lib/context';

const BOOT_LINES = [
  { text: 'INITIALIZING JARVIS...', delay: 0 },
  { text: '', delay: 400 },
  { text: 'NEURAL CORE ........ ONLINE', delay: 600, status: 'online' },
  { text: 'VOICE ENGINE ....... ONLINE', delay: 1000, status: 'online' },
  { text: 'MEMORY SYSTEM ...... ONLINE', delay: 1400, status: 'online' },
  { text: 'COMMAND SYSTEM ..... ONLINE', delay: 1800, status: 'online' },
  { text: 'SECURITY PROTOCOL .. ACTIVE', delay: 2200, status: 'online' },
  { text: '', delay: 2500 },
  { text: 'ALL SYSTEMS NOMINAL', delay: 2800, status: 'nominal' },
];

export default function StartupSequence() {
  const { setStartupComplete } = useApp();
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    BOOT_LINES.forEach((line, i) => {
      setTimeout(() => setVisibleLines(i + 1), line.delay);
    });
    setTimeout(() => setDone(true), 3500);
  }, []);

  return (
    <AnimatePresence>
      {!done ? (
        <motion.div
          className="fixed inset-0 z-[300] bg-black flex items-center justify-center"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="w-full max-w-md mx-4">
            {/* Scan line */}
            <motion.div
              className="h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent mb-8"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
            />

            {/* Boot lines */}
            <div className="font-mono space-y-2">
              {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`text-sm ${
                    line.status === 'online' ? 'text-green-400' :
                    line.status === 'nominal' ? 'text-cyan-400 font-bold text-base' :
                    'text-cyan-400/70'
                  }`}
                >
                  {line.text}
                </motion.div>
              ))}
            </div>

            {/* Progress bar */}
            <motion.div className="mt-8 h-0.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 3, ease: 'easeInOut' }}
              />
            </motion.div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          className="fixed inset-0 z-[300] bg-black flex items-center justify-center"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          onAnimationComplete={() => setStartupComplete(true)}
        >
          <div className="text-cyan-400 font-bold text-2xl tracking-widest">JARVIS</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
