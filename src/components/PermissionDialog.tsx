'use client';

/**
 * Permission confirmation dialog — the user gate for MEDIUM/HIGH risk tools.
 * Wired into the permission system via AssistantProvider.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useAssistant } from '@/lib/assistant-provider';

const RISK_STYLES: Record<'medium' | 'high', { border: string; label: string; tag: string; dot: string }> = {
  medium: { border: 'border-amber-500/30', label: 'text-amber-400/90', tag: 'CONFIRMATION REQUIRED', dot: 'bg-amber-400' },
  high: { border: 'border-rose-400/30', label: 'text-red-400/90', tag: 'EXPLICIT APPROVAL REQUIRED', dot: 'bg-red-400' },
};

export default function PermissionDialog() {
  const { pendingPermission, answerPermission } = useAssistant();
  const risk = pendingPermission?.risk === 'high' ? 'high' as const : 'medium' as const;

  return (
    <AnimatePresence>
      {pendingPermission && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          style={{ background: 'rgba(2,4,8,0.85)' }}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="perm-title"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className={`hud-panel rounded-lg p-6 max-w-md w-full border ${RISK_STYLES[risk].border}`}
          >
            <div className="flex items-center gap-2 mb-4">
              <span className={`w-1.5 h-1.5 rounded-full ${RISK_STYLES[risk].dot}`} />
              <span className={`hud-text text-[8px] tracking-[0.25em] ${RISK_STYLES[risk].label}`}>
                {RISK_STYLES[risk].tag}
              </span>
            </div>

            <div id="perm-title" className="hud-value text-base text-[color:var(--t1)] mb-1">
              {pendingPermission.action.replace(/_/g, ' ').toUpperCase()}
            </div>
            <p className="text-[12px] text-[color:var(--t2)] leading-relaxed mb-1">{pendingPermission.summary}</p>
            {pendingPermission.detail && (
              <p className="text-[10px] text-[color:var(--t3)] mb-1" style={{ fontFamily: 'monospace' }}>{pendingPermission.detail}</p>
            )}
            <p className="text-[9px] text-[color:var(--t3)] mb-5" style={{ fontFamily: 'monospace' }}>
              TOOL: {pendingPermission.tool} · RISK: {pendingPermission.risk.toUpperCase()}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => answerPermission(true)}
                className="flex-1 py-2.5 rounded border border-white/15 bg-white/[0.05] text-[color:var(--t1)] text-[11px] tracking-wider hover:bg-white/[0.08] transition-colors"
                autoFocus
              >
                APPROVE
              </button>
              <button
                onClick={() => answerPermission(false)}
                className="flex-1 py-2.5 rounded border border-white/15 text-[color:var(--t2)] text-[11px] tracking-wider hover:bg-white/[0.05] transition-colors"
              >
                DENY
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
