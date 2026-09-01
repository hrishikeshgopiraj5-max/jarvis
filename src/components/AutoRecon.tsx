'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════
// Auto-Recon UI — Iron Man HUD Style
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

const SEVERITY_CLASSES: Record<string, string> = {
  critical: 'text-red-400 border-red-500/20 bg-red-500/5',
  high: 'text-orange-400 border-orange-500/20 bg-orange-500/5',
  medium: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
  low: 'text-blue-400 border-blue-500/20 bg-blue-500/5',
  info: 'text-slate-400 border-cyan-500/10 bg-cyan-500/[0.02]',
};

const SEVERITY_DOTS: Record<string, string> = {
  critical: 'bg-red-400',
  high: 'bg-orange-400',
  medium: 'bg-amber-400',
  low: 'bg-blue-400',
  info: 'bg-slate-500',
};

const PHASE_LABELS: Record<string, string> = {
  subdomains: 'SUBENUM',
  technology: 'TECHFP',
  ports: 'PORTSC',
  directories: 'DIRFND',
  vulnerabilities: 'VULCHK',
};

function buildAllInOneReport(data: any, result: any): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  let report = '';
  report += '=====================================================================\n';
  report += '           JARVIS BUG BOUNTY REPORT — SUBMISSION DOCUMENT\n';
  report += '=====================================================================\n';
  report += `  Target:     ${result.target}\n`;
  report += `  Date:       ${dateStr} ${timeStr}\n`;
  report += `  Reports:    ${data.totalReports}\n`;
  report += `  Generated:  JARVIS AI — Automated Reconnaissance & Reporting Engine\n`;
  report += '=====================================================================\n\n';

  report += '--- EXECUTIVE SUMMARY ---\n\n';
  const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, informational: 0 };
  for (const r of data.reports) counts[r.severity as keyof typeof counts]++;
  report += `  Total Vulnerabilities: ${data.totalReports}\n`;
  if (counts.critical > 0) report += `  CRITICAL:  ${counts.critical}\n`;
  if (counts.high > 0) report += `  HIGH:      ${counts.high}\n`;
  if (counts.medium > 0) report += `  MEDIUM:    ${counts.medium}\n`;
  if (counts.low > 0) report += `  LOW:       ${counts.low}\n`;
  if (counts.informational > 0) report += `  INFO:      ${counts.informational}\n`;
  report += '\n';

  report += '--- SCOPE & METHODOLOGY ---\n\n';
  report += `  Target: ${result.target}\n`;
  report += `  Phases: ${result.phases.length}\n`;
  report += `  Duration: ${result.endTime ? Math.round((result.endTime - result.startTime) / 1000) : '?'}s\n`;
  report += `  Subdomains: ${result.summary.subdomains}\n`;
  report += `  Open Ports: ${result.summary.openPorts}\n`;
  report += `  Technologies: ${result.summary.technologies.join(', ') || 'N/A'}\n\n`;

  report += '--- FINDINGS OVERVIEW ---\n\n';
  for (let i = 0; i < data.reports.length; i++) {
    const r = data.reports[i];
    const sev = r.severity === 'critical' ? '[!!!]' : r.severity === 'high' ? '[!! ]' : r.severity === 'medium' ? '[!  ]' : '[   ]';
    report += `  ${String(i + 1).padStart(2)}. ${sev} ${r.title}\n`;
    report += `      Severity: ${r.severity.toUpperCase()} | CVSS: ${r.cvssScore} | Type: ${r.vulnerabilityType}\n\n`;
  }

  for (let i = 0; i < data.reports.length; i++) {
    const r = data.reports[i];
    report += '\n=====================================================================\n';
    report += `  FINDING ${i + 1}: ${r.title.toUpperCase()}\n`;
    report += '=====================================================================\n\n';
    report += `  Severity:        ${r.severity.toUpperCase()}\n`;
    report += `  CVSS Score:      ${r.cvssScore}\n`;
    report += `  CVSS Vector:     ${r.cvssVector}\n`;
    report += `  Vulnerability:   ${r.vulnerabilityType}\n`;
    report += `  Target:          ${r.target}\n`;
    report += `  Endpoint:        ${r.endpoint}\n`;
    report += `  CWE:             ${r.classification.cwe}\n`;
    report += `  OWASP:           ${r.classification.owasp}\n\n`;
    report += `  SUMMARY:\n  ${r.summary}\n\n`;
    report += `  IMPACT:\n  ${r.impact}\n\n`;
    report += '  STEPS TO REPRODUCE:\n';
    for (const step of r.stepsToReproduce) report += `  ${step}\n`;
    report += '\n  EVIDENCE:\n';
    for (const ev of r.evidence) {
      report += `  [${ev.label}]\n`;
      for (const line of ev.content.split('\n')) report += `    ${line}\n`;
      report += '\n';
    }
    report += '  REMEDIATION:\n';
    for (const line of r.remediation.split('\n')) report += `  ${line}\n`;
    report += '\n  REFERENCES:\n';
    for (const ref of r.references) report += `  - ${ref}\n`;
    report += '\n';
  }

  report += '=====================================================================\n';
  report += '  END OF REPORT\n';
  report += '=====================================================================\n\n';
  report += `  Generated by JARVIS AI\n`;
  report += `  Ready for submission to HackerOne, Bugcrowd, or Intigriti.\n`;
  return report;
}

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
        className="fixed inset-0 z-[80] flex items-center justify-center"
        style={{ background: 'rgba(2,4,8,0.92)' }}
        onClick={(e) => { if (e.target === e.currentTarget && !scanning) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.97, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.97, opacity: 0 }}
          className="hud-panel rounded-lg w-[95vw] max-w-4xl max-h-[90vh] flex flex-col overflow-hidden relative"
        >
          <div className="corner-line-tl" />
          <div className="corner-line-br" />

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/5">
            <div className="flex items-center gap-3">
              <div className="hud-value text-sm text-cyan-400/60">[&gt;]</div>
              <div>
                <div className="hud-text text-cyan-400/30">AUTONOMOUS RECON</div>
                <div className="hud-value text-sm text-cyan-100/60">JARVIS Auto-Recon Engine</div>
              </div>
              {scanning && (
                <div className="flex items-center gap-2 ml-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="hud-text text-[9px] text-cyan-400/50">{currentPhase}</span>
                </div>
              )}
            </div>
            {!scanning && (
              <button onClick={onClose}
                className="w-7 h-7 rounded border border-cyan-500/10 flex items-center justify-center text-cyan-400/30 hover:text-cyan-400/60 transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Target Input */}
          {!result && !scanning && (
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
              <div className="hud-text text-cyan-400/20 mb-4">[TARGET ACQUISITION]</div>
              <div className="text-[11px] text-slate-400/60 mb-6 text-center max-w-md"
                style={{ fontFamily: 'Courier New, monospace' }}>
                Enter a target domain to begin autonomous reconnaissance.
                JARVIS will scan subdomains, technologies, ports, directories, and vulnerabilities.
              </div>
              <div className="flex gap-3 w-full max-w-lg">
                <input type="text" value={target} onChange={e => setTarget(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && target.trim()) startRecon(); }}
                  placeholder="target.com"
                  className="flex-1 bg-transparent border border-cyan-500/15 rounded px-4 py-3 text-sm text-cyan-100 placeholder-slate-600 focus:border-cyan-400/25 transition-all"
                  style={{ fontFamily: 'Courier New, monospace' }} autoFocus />
                <button onClick={startRecon} disabled={!target.trim()}
                  className="px-6 py-3 rounded border border-cyan-500/20 text-cyan-400/80 text-[11px] tracking-wider hover:bg-cyan-500/5 disabled:opacity-20 transition-all"
                  style={{ fontFamily: 'Courier New, monospace' }}>
                  INITIATE SCAN
                </button>
              </div>
              <div className="mt-4 hud-text text-[8px] text-cyan-400/15">
                5 PHASES · SUBDOMAINS · TECHNOLOGY · PORTS · DIRECTORIES · VULNERABILITIES
              </div>
            </div>
          )}

          {/* Scanning Animation */}
          {scanning && !result && (
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
              <div className="relative">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  className="w-20 h-20 border border-cyan-500/15 rounded-full"
                  style={{ borderTopColor: 'rgba(0,200,255,0.5)' }} />
                <div className="absolute inset-0 flex items-center justify-center hud-value text-xs text-cyan-400/60">
                  SCAN
                </div>
              </div>
              <div className="mt-6 hud-value text-sm text-cyan-400/60">Scanning {target}...</div>
              <div className="mt-2 hud-text text-[9px] text-cyan-400/30">{currentPhase}</div>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Summary Bar */}
              <div className="hud-panel rounded p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="hud-value text-sm text-cyan-100/70">{result.target}</div>
                    <div className="hud-text text-[8px] text-cyan-400/25">
                      {result.phases.length} PHASES · {result.summary.totalFindings} FINDINGS ·{' '}
                      {result.endTime ? formatDuration(result.endTime - result.startTime) : '--'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setResult(null); setTarget(''); }}
                      className="px-3 py-1.5 rounded border border-cyan-500/10 text-[9px] text-cyan-400/40 hover:text-cyan-400/60 transition-colors"
                      style={{ fontFamily: 'Courier New, monospace' }}>
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
                          const allInOne = buildAllInOneReport(data, result);
                          const blob = new Blob([allInOne], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `JARVIS-BugBounty-Report-${result.target}-${new Date().toISOString().split('T')[0]}.txt`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                          for (const report of data.reports) {
                            const mdBlob = new Blob([report.markdown], { type: 'text/markdown' });
                            const mdUrl = URL.createObjectURL(mdBlob);
                            const mdA = document.createElement('a');
                            mdA.href = mdUrl;
                            mdA.download = `${report.id}-${report.title.substring(0, 40).replace(/[^a-zA-Z0-9]/g, '-')}.md`;
                            document.body.appendChild(mdA);
                            mdA.click();
                            document.body.removeChild(mdA);
                            URL.revokeObjectURL(mdUrl);
                          }
                        } catch {}
                        setGeneratingReport(false);
                      }}
                      disabled={generatingReport}
                      className="px-3 py-1.5 rounded border border-emerald-500/20 text-[9px] text-emerald-400/60 hover:bg-emerald-500/5 disabled:opacity-30 transition-all"
                      style={{ fontFamily: 'Courier New, monospace' }}>
                      {generatingReport ? 'GENERATING...' : 'GENERATE & DOWNLOAD'}
                    </button>
                  </div>
                </div>

                {/* Severity counts */}
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(severityCounts).filter(([, c]) => c > 0).map(([sev, count]) => (
                    <button key={sev} onClick={() => setFilter(filter === sev ? 'all' : sev)}
                      className={`px-2.5 py-1 rounded border text-[9px] transition-all ${
                        filter === sev ? `${SEVERITY_CLASSES[sev]}` : `${SEVERITY_CLASSES[sev]} opacity-50 hover:opacity-100`
                      }`} style={{ fontFamily: 'Courier New, monospace' }}>
                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${SEVERITY_DOTS[sev]}`} />
                      {count} {sev.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phases Overview */}
              <div className="grid grid-cols-5 gap-2">
                {result.phases.map(phase => (
                  <div key={phase.id}
                    className={`hud-panel rounded p-2.5 text-center transition-all ${
                      phase.status === 'complete' ? 'border-emerald-500/15' :
                      phase.status === 'error' ? 'border-red-500/15' : ''
                    }`}>
                    <div className="hud-text text-[8px] text-cyan-400/25 mb-1">{PHASE_LABELS[phase.id] || phase.id.toUpperCase()}</div>
                    <div className="hud-text text-[8px] text-cyan-400/40 leading-tight">{phase.name}</div>
                    <div className="hud-text text-[7px] text-cyan-400/15 mt-1">
                      {phase.results.length} FINDS
                      {phase.duration ? ` · ${formatDuration(phase.duration)}` : ''}
                    </div>
                    <div className={`hud-text text-[7px] mt-1 ${
                      phase.status === 'complete' ? 'text-emerald-400/60' :
                      phase.status === 'error' ? 'text-red-400/60' : 'text-amber-400/60'
                    }`}>
                      {phase.status === 'complete' ? 'COMPLETE' : phase.status === 'error' ? 'ERROR' : 'RUNNING'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Technologies */}
              {result.summary.technologies.length > 0 && (
                <div className="hud-panel rounded p-3">
                  <div className="hud-text text-cyan-400/25 mb-2">TECHNOLOGIES DETECTED</div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.summary.technologies.map((tech, i) => (
                      <span key={i} className="px-2 py-0.5 border border-cyan-500/10 text-[9px] text-cyan-400/50"
                        style={{ fontFamily: 'Courier New, monospace' }}>
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Findings List */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="hud-text text-cyan-400/25">FINDINGS ({filteredFindings.length})</div>
                  {filter !== 'all' && (
                    <button onClick={() => setFilter('all')} className="hud-text text-[8px] text-cyan-400/30 hover:text-cyan-400/60 transition-colors">
                      CLEAR FILTER
                    </button>
                  )}
                </div>
                {filteredFindings.map((finding, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className={`border rounded p-3 cursor-pointer transition-all hover:bg-cyan-500/[0.02] ${
                      SEVERITY_CLASSES[finding.severity]
                    } ${expandedFinding === i ? 'ring-1 ring-cyan-500/10' : ''}`}
                    onClick={() => setExpandedFinding(expandedFinding === i ? null : i)}>
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${SEVERITY_DOTS[finding.severity]}`} />
                      <span className="hud-text text-[8px] text-cyan-400/25">{finding.type.toUpperCase()}</span>
                      <span className="hud-value text-[11px] text-cyan-100/70 flex-1">{finding.title}</span>
                      <span className="hud-text text-[8px]">{finding.severity.toUpperCase()}</span>
                    </div>
                    {expandedFinding === i && (
                      <div className="mt-2 ml-4 space-y-1">
                        <div className="text-[10px] text-slate-400/60" style={{ fontFamily: 'Courier New, monospace' }}>
                          {finding.detail}
                        </div>
                        {finding.evidence && (
                          <div className="text-[9px] text-cyan-400/30 bg-cyan-500/[0.02] rounded px-2 py-1 border border-cyan-500/5"
                            style={{ fontFamily: 'Courier New, monospace' }}>
                            {finding.evidence}
                          </div>
                        )}
                        {finding.command && (
                          <div className="text-[9px] text-emerald-400/50 bg-emerald-500/[0.03] rounded px-2 py-1 border border-emerald-500/10"
                            style={{ fontFamily: 'Courier New, monospace' }}>
                            $ {finding.command}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
                {filteredFindings.length === 0 && (
                  <div className="text-center text-cyan-400/15 text-[10px] py-8" style={{ fontFamily: 'Courier New, monospace' }}>
                    NO FINDINGS MATCH THIS FILTER
                  </div>
                )}
              </div>

              {/* Commands */}
              <div className="hud-panel rounded p-3">
                <div className="hud-text text-cyan-400/25 mb-2">COMMANDS EXECUTED</div>
                <div className="space-y-0.5 text-[9px] text-cyan-400/20 max-h-32 overflow-y-auto"
                  style={{ fontFamily: 'Courier New, monospace' }}>
                  {result.phases.flatMap(p => p.commands).map((cmd, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <span className="text-emerald-500/30">$</span>
                      <span>{cmd}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generated Reports */}
              {reportResult && (
                <div className="hud-panel rounded p-4 border-emerald-500/15">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <div>
                      <div className="hud-text text-emerald-400/40">BUG BOUNTY REPORTS ({reportResult.totalReports} FINDINGS)</div>
                      <div className="hud-text text-[8px] text-cyan-400/15">Reports downloaded to your Downloads folder</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {reportResult.reports.map((report: any) => (
                      <details key={report.id} className="border border-cyan-500/5 rounded group">
                        <summary className="px-3 py-2 cursor-pointer flex items-center gap-2 hover:bg-cyan-500/[0.02]">
                          <span className={`w-1.5 h-1.5 rounded-full ${SEVERITY_DOTS[report.severity]}`} />
                          <span className="hud-value text-[11px] text-cyan-100/60 flex-1">{report.title}</span>
                          <span className="hud-text text-[8px] text-cyan-400/25">CVSS {report.cvssScore}</span>
                        </summary>
                        <div className="px-3 pb-3 text-[10px] text-cyan-400/30 whitespace-pre-wrap" style={{ fontFamily: 'Courier New, monospace' }}>
                          {report.plainText}
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
              <div className="border border-red-500/20 bg-red-500/5 rounded px-4 py-3 text-[11px] text-red-400/70"
                style={{ fontFamily: 'Courier New, monospace' }}>
                {error}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
