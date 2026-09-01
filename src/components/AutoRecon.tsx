'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════
// Auto-Recon UI — Autonomous bug bounty reconnaissance panel
// ═══════════════════════════════════════════════════════════════

interface ReconFinding {
  type: 'subdomain' | 'port' | 'technology' | 'file' | 'vulnerability' | 'info' | 'header' | 'dns' | 'email';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  detail: string;
  evidence?: string;
  command?: string;
}

interface ReconPhase {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  results: ReconFinding[];
  commands: string[];
  duration?: number;
}

interface ReconResult {
  target: string;
  startTime: number;
  endTime?: number;
  phases: ReconPhase[];
  summary: {
    totalFindings: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    subdomains: number;
    openPorts: number;
    technologies: string[];
  };
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/30',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  low: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  info: 'text-slate-400 bg-white/[0.03] border-white/[0.06]',
};

const SEVERITY_DOTS: Record<string, string> = {
  critical: 'bg-red-400',
  high: 'bg-orange-400',
  medium: 'bg-yellow-400',
  low: 'bg-blue-400',
  info: 'bg-slate-500',
};

const PHASE_ICONS: Record<string, string> = {
  subdomains: '🌐',
  technology: '⚙️',
  ports: '🔌',
  directories: '📁',
  vulnerabilities: '🛡️',
};

interface AutoReconProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AutoRecon({ isOpen, onClose }: AutoReconProps) {
  const [target, setTarget] = useState('');
  const [scanning, setScanning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState('');
  const [result, setResult] = useState<ReconResult | null>(null);
  const [error, setError] = useState('');
  const [expandedFinding, setExpandedFinding] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportResult, setReportResult] = useState<any>(null);

  const startRecon = useCallback(async () => {
    if (!target.trim() || scanning) return;
    const cleanTarget = target.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();

    setScanning(true);
    setResult(null);
    setError('');
    setCurrentPhase('Initializing...');

    try {
      const res = await fetch('/api/recon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: cleanTarget }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Recon failed');
      }

      const data: ReconResult = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Recon failed');
    } finally {
      setScanning(false);
      setCurrentPhase('');
    }
  }, [target, scanning]);

  const severityCounts = result
    ? { critical: result.summary.critical, high: result.summary.high, medium: result.summary.medium, low: result.summary.low, info: result.summary.info }
    : { critical: 0, high: 0, medium: 0, low: 0, info: 0 };

  const filteredFindings = result
    ? result.phases.flatMap(p => p.results).filter(f => filter === 'all' || f.severity === filter || f.type === filter)
    : [];

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget && !scanning) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#0a0e14]/98 border border-white/10 rounded-2xl w-[95vw] max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="text-xl">🎯</div>
              <div>
                <div className="text-[10px] tracking-[0.3em] text-cyan-400/60">AUTONOMOUS RECON</div>
                <div className="text-sm font-light text-white">JARVIS Auto-Recon Engine</div>
              </div>
              {scanning && (
                <div className="flex items-center gap-2 ml-4">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-[10px] text-cyan-400/60 font-mono">{currentPhase}</span>
                </div>
              )}
            </div>
            {!scanning && (
              <button onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Target Input */}
          {!result && !scanning && (
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
              <div className="text-4xl mb-4 opacity-30">⬡</div>
              <div className="text-sm text-slate-400 mb-6 text-center max-w-md">
                Enter a target domain to begin autonomous reconnaissance.
                JARVIS will scan subdomains, technologies, ports, directories, and vulnerabilities.
              </div>
              <div className="flex gap-3 w-full max-w-lg">
                <input
                  type="text"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && target.trim()) startRecon(); }}
                  placeholder="target.com"
                  className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500/30 focus:bg-white/[0.06] transition-all font-mono"
                  autoFocus
                />
                <button
                  onClick={startRecon}
                  disabled={!target.trim()}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 text-cyan-400 text-sm font-medium hover:from-cyan-500/30 hover:to-indigo-500/30 disabled:opacity-30 transition-all"
                >
                  {scanning ? 'Scanning...' : 'Start Recon'}
                </button>
              </div>
              <div className="mt-4 text-[10px] text-slate-600">
                5 phases · Subdomains · Technology · Ports · Directories · Vulnerabilities
              </div>
            </div>
          )}

          {/* Scanning Animation */}
          {scanning && !result && (
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  className="w-20 h-20 border-2 border-cyan-500/20 rounded-full border-t-cyan-400"
                />
                <div className="absolute inset-0 flex items-center justify-center text-2xl">🎯</div>
              </div>
              <div className="mt-6 text-sm text-cyan-400/80">Scanning {target}...</div>
              <div className="mt-2 text-[10px] text-slate-500 font-mono">{currentPhase}</div>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Summary Bar */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm text-white font-mono">{result.target}</div>
                    <div className="text-[10px] text-slate-500">
                      {result.phases.length} phases · {result.summary.totalFindings} findings ·{' '}
                      {result.endTime ? formatDuration(result.endTime - result.startTime) : '—'}
                    </div>
                  </div>
                  <button
                    onClick={() => { setResult(null); setTarget(''); }}
                    className="px-3 py-1.5 rounded-lg bg-white/5 text-[10px] text-slate-400 hover:text-white transition-colors"
                  >
                    NEW TARGET
                  </button>
                  <button
                    onClick={async () => {
                      setGeneratingReport(true);
                      try {
                        const res = await fetch('/api/report', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ reconResult: result }),
                        });
                        const data = await res.json();
                        setReportResult(data);
                      } catch {}
                      setGeneratingReport(false);
                    }}
                    disabled={generatingReport}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition-all"
                  >
                    {generatingReport ? 'GENERATING...' : '📄 GENERATE REPORT'}
                  </button>
                </div>

                {/* Severity counts */}
                <div className="flex gap-3 flex-wrap">
                  {Object.entries(severityCounts).filter(([, c]) => c > 0).map(([sev, count]) => (
                    <button
                      key={sev}
                      onClick={() => setFilter(filter === sev ? 'all' : sev)}
                      className={`px-3 py-1 rounded-full text-[10px] border transition-all ${
                        filter === sev
                          ? `${SEVERITY_COLORS[sev]} ring-1 ring-white/20`
                          : `${SEVERITY_COLORS[sev]} opacity-60 hover:opacity-100`
                      }`}
                    >
                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${SEVERITY_DOTS[sev]}`} />
                      {count} {sev}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phases Overview */}
              <div className="grid grid-cols-5 gap-2">
                {result.phases.map((phase) => (
                  <div
                    key={phase.id}
                    className={`bg-white/[0.02] border rounded-lg p-2.5 text-center transition-all ${
                      phase.status === 'complete'
                        ? 'border-emerald-500/20'
                        : phase.status === 'error'
                        ? 'border-red-500/20'
                        : 'border-white/[0.06]'
                    }`}
                  >
                    <div className="text-lg mb-1">{PHASE_ICONS[phase.id] || '⚙️'}</div>
                    <div className="text-[9px] text-slate-400 leading-tight">{phase.name}</div>
                    <div className="text-[9px] text-slate-600 mt-1">
                      {phase.results.length} findings
                      {phase.duration ? ` · ${formatDuration(phase.duration)}` : ''}
                    </div>
                    <div className={`text-[8px] mt-1 ${
                      phase.status === 'complete' ? 'text-emerald-400' :
                      phase.status === 'error' ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {phase.status === 'complete' ? 'COMPLETE' : phase.status === 'error' ? 'ERROR' : 'RUNNING'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Technologies */}
              {result.summary.technologies.length > 0 && (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
                  <div className="text-[9px] tracking-wider text-slate-500 mb-2">TECHNOLOGIES DETECTED</div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.summary.technologies.map((tech, i) => (
                      <span key={i} className="px-2 py-0.5 rounded text-[10px] border border-cyan-500/20 bg-cyan-500/5 text-cyan-400/70">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Findings List */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] tracking-wider text-slate-500">FINDINGS ({filteredFindings.length})</div>
                  {filter !== 'all' && (
                    <button onClick={() => setFilter('all')} className="text-[10px] text-cyan-400/60 hover:text-cyan-400 transition-colors">
                      Clear filter
                    </button>
                  )}
                </div>
                {filteredFindings.map((finding, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className={`border rounded-lg p-3 cursor-pointer transition-all hover:bg-white/[0.02] ${
                      SEVERITY_COLORS[finding.severity]
                    } ${expandedFinding === i ? 'ring-1 ring-white/10' : ''}`}
                    onClick={() => setExpandedFinding(expandedFinding === i ? null : i)}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${SEVERITY_DOTS[finding.severity]}`} />
                      <span className="text-[10px] uppercase tracking-wider opacity-60">{finding.type}</span>
                      <span className="text-sm text-white flex-1">{finding.title}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                        SEVERITY_COLORS[finding.severity]
                      }`}>
                        {finding.severity}
                      </span>
                    </div>
                    {expandedFinding === i && (
                      <div className="mt-2 ml-4 space-y-1">
                        <div className="text-[11px] text-slate-400">{finding.detail}</div>
                        {finding.evidence && (
                          <div className="text-[10px] text-slate-500 font-mono bg-white/[0.02] rounded px-2 py-1">
                            {finding.evidence}
                          </div>
                        )}
                        {finding.command && (
                          <div className="text-[10px] text-emerald-400/70 font-mono bg-emerald-500/5 rounded px-2 py-1 border border-emerald-500/10">
                            $ {finding.command}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
                {filteredFindings.length === 0 && (
                  <div className="text-center text-slate-600 text-xs py-8">No findings match this filter.</div>
                )}
              </div>

              {/* Commands Used */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
                <div className="text-[9px] tracking-wider text-slate-500 mb-2">COMMANDS EXECUTED</div>
                <div className="space-y-0.5 font-mono text-[10px] text-slate-500">
                  {result.phases.flatMap(p => p.commands).map((cmd, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <span className="text-emerald-600">$</span>
                      <span>{cmd}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generated Reports */}
              {reportResult && (
                <div className="bg-white/[0.02] border border-emerald-500/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] tracking-wider text-emerald-400/60">📄 BUG BOUNTY REPORTS ({reportResult.totalReports})</div>
                    <button
                      onClick={() => {
                        const blob = new Blob([reportResult.summary], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `jarvis-report-${result.target}.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 hover:bg-emerald-500/20 transition-all"
                    >
                      ⬇ DOWNLOAD ALL
                    </button>
                  </div>

                  <div className="text-xs text-slate-400 mb-3 bg-emerald-500/5 rounded-lg px-3 py-2 whitespace-pre-wrap font-mono text-[10px] max-h-40 overflow-y-auto">
                    {reportResult.summary}
                  </div>

                  <div className="space-y-3">
                    {reportResult.reports.map((report: any) => (
                      <details key={report.id} className="bg-white/[0.02] border border-white/[0.06] rounded-lg group">
                        <summary className="px-3 py-2 cursor-pointer flex items-center gap-2 hover:bg-white/[0.02]">
                          <span className={`w-2 h-2 rounded-full ${
                            report.severity === 'critical' ? 'bg-red-400' :
                            report.severity === 'high' ? 'bg-orange-400' :
                            report.severity === 'medium' ? 'bg-yellow-400' :
                            'bg-blue-400'
                          }`} />
                          <span className="text-xs text-white flex-1">{report.title}</span>
                          <span className="text-[9px] text-slate-500">CVSS {report.cvssScore}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const blob = new Blob([report.markdown], { type: 'text/markdown' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${report.id}-${report.title.substring(0, 30).replace(/\s+/g, '-')}.md`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                            className="px-2 py-0.5 rounded bg-emerald-500/10 text-[9px] text-emerald-400 hover:bg-emerald-500/20"
                          >
                            ⬇
                          </button>
                        </summary>
                        <div className="px-3 pb-3 space-y-3">
                          <div className="text-[11px] text-slate-400 whitespace-pre-wrap font-mono">
                            {report.plainText}
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-6 pb-4">
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
