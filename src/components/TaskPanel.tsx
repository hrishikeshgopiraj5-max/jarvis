'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { motion } from 'framer-motion';
import { Clock, Bell, Play, Pause, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { getReminders, createReminder, saveReminders } from '@/lib/storage';

export default function TaskPanel() {
  const { activeTimers, startTimer, addNotification, pendingReminders, setPendingReminders } = useApp();
  const [timerInput, setTimerInput] = useState('');
  const [timerLabel, setTimerLabel] = useState('');
  const [reminderInput, setReminderInput] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState('');
  const [showTimerForm, setShowTimerForm] = useState(false);
  const [showReminderForm, setShowReminderForm] = useState(false);

  useEffect(() => {
    setPendingReminders(getReminders());
  }, []);

  const handleTimer = () => {
    const mins = parseInt(timerInput);
    if (isNaN(mins) || mins <= 0) return;
    startTimer(mins, timerLabel || `Timer: ${mins}min`);
    setTimerInput(''); setTimerLabel(''); setShowTimerForm(false);
  };

  const handleReminder = () => {
    const mins = parseInt(reminderMinutes);
    if (isNaN(mins) || mins <= 0 || !reminderInput.trim()) return;
    const triggerAt = new Date(Date.now() + mins * 60000).toISOString();
    const reminder = createReminder(reminderInput.trim(), triggerAt);
    setPendingReminders(getReminders());
    setReminderInput(''); setReminderMinutes(''); setShowReminderForm(false);
    addNotification('SYSTEM', `Reminder set: "${reminder.message}" in ${mins} minutes`, 'system');
  };

  const formatTime = (ms: number) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`;
  };

  const deleteReminder = (id: string) => {
    saveReminders(getReminders().filter(r => r.id !== id));
    setPendingReminders(getReminders());
  };

  const upcomingReminders = pendingReminders.filter(r => !r.completed);

  return (
    <div className="flex flex-col h-full p-6 max-w-4xl mx-auto w-full">
      <h1 className="text-xl font-bold text-cyan-400 tracking-wider mb-6">TASKS & TIMERS</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Timers */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-cyan-400/80 tracking-wider flex items-center gap-2">
              <Clock size={16} /> TIMERS
            </h2>
            <button
              onClick={() => setShowTimerForm(!showTimerForm)}
              className="text-xs text-cyan-400/60 hover:text-cyan-400 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>

          {showTimerForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="bg-black/40 border border-cyan-500/20 rounded-xl p-4 space-y-3"
            >
              <input
                type="number"
                value={timerInput}
                onChange={e => setTimerInput(e.target.value)}
                placeholder="Minutes"
                className="w-full bg-transparent border border-cyan-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none"
              />
              <input
                type="text"
                value={timerLabel}
                onChange={e => setTimerLabel(e.target.value)}
                placeholder="Label (optional)"
                className="w-full bg-transparent border border-cyan-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none"
              />
              <button
                onClick={handleTimer}
                className="w-full px-4 py-2 bg-cyan-500/15 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm hover:bg-cyan-500/25 transition-colors"
              >
                Start Timer
              </button>
            </motion.div>
          )}

          {/* Quick timers */}
          <div className="grid grid-cols-3 gap-2">
            {[1, 5, 10, 15, 25, 30].map(m => (
              <button
                key={m}
                onClick={() => startTimer(m, `Timer: ${m}min`)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:border-cyan-500/30 hover:text-cyan-400 transition-colors"
              >
                {m}m
              </button>
            ))}
          </div>

          {/* Active timers */}
          <div className="space-y-2">
            {activeTimers.map(timer => {
              const progress = timer.running
                ? ((timer.durationMs - timer.remainingMs) / timer.durationMs) * 100
                : timer.remainingMs === 0 ? 100 : 0;
              return (
                <div key={timer.id} className="bg-black/40 border border-cyan-500/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-300">{timer.label}</span>
                    <span className="text-lg font-mono text-cyan-400">
                      {timer.running || timer.remainingMs < timer.durationMs ? formatTime(timer.remainingMs) : formatTime(timer.durationMs)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  {timer.remainingMs === 0 && (
                    <div className="mt-2 text-xs text-green-400 font-medium">✓ Complete</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Reminders */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-cyan-400/80 tracking-wider flex items-center gap-2">
              <Bell size={16} /> REMINDERS
            </h2>
            <button
              onClick={() => setShowReminderForm(!showReminderForm)}
              className="text-xs text-cyan-400/60 hover:text-cyan-400 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>

          {showReminderForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="bg-black/40 border border-cyan-500/20 rounded-xl p-4 space-y-3"
            >
              <input
                type="text"
                value={reminderInput}
                onChange={e => setReminderInput(e.target.value)}
                placeholder="What to remind..."
                className="w-full bg-transparent border border-cyan-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none"
              />
              <input
                type="number"
                value={reminderMinutes}
                onChange={e => setReminderMinutes(e.target.value)}
                placeholder="In how many minutes?"
                className="w-full bg-transparent border border-cyan-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none"
              />
              <button
                onClick={handleReminder}
                className="w-full px-4 py-2 bg-cyan-500/15 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm hover:bg-cyan-500/25 transition-colors"
              >
                Set Reminder
              </button>
            </motion.div>
          )}

          {/* Reminder list */}
          <div className="space-y-2">
            {upcomingReminders.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">No pending reminders.</div>
            )}
            {upcomingReminders.map(r => {
              const timeLeft = Math.max(0, Math.floor((new Date(r.triggerAt).getTime() - Date.now()) / 60000));
              return (
                <div key={r.id} className="flex items-center justify-between bg-black/40 border border-white/10 rounded-xl p-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-300 truncate">{r.message}</div>
                    <div className="text-xs text-gray-500 mt-0.5">In ~{timeLeft} minutes</div>
                  </div>
                  <button
                    onClick={() => deleteReminder(r.id)}
                    className="text-gray-500 hover:text-red-400 ml-2 p-1 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
