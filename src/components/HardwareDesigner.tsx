'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════
// Hardware Designer UI — Iron Man HUD Style
// ═══════════════════════════════════════════════════════════════

interface Component {
  id: string;
  name: string;
  category: string;
  voltage: string;
  price: string;
  description?: string;
  pins?: { name: string; type: string; voltage?: string; description?: string }[];
}

interface WiringConnection {
  from: { component: string; pin: string };
  to: { component: string; pin: string };
  wire: string;
  notes?: string;
}

interface ProjectAnalysis {
  name: string;
  complexity: string;
  estimatedCost: string;
  estimatedTime: string;
  components: Component[];
  wiring: {
    title: string;
    description: string;
    connections: WiringConnection[];
    powerRequirements: { component: string; voltage: string; current: string; source: string }[];
    assemblySteps: string[];
    tips: string[];
  };
  architecture: {
    blocks: { id: string; name: string; type: string; description: string; position?: { x: number; y: number } }[];
    connections: { from: string; to: string; type: string; protocol?: string; description: string }[];
    dataFlow: string[];
    powerDistribution: string[];
  };
  risks: string[];
  alternatives: string[];
}

interface HardwareResult {
  analysis: ProjectAnalysis;
  wiringDiagramText: string;
  wiringDiagramSVG: string;
  bom: string;
  templates: { id: string; name: string; description: string; category: string; complexity: string; tags: string[] }[];
}

const COMPLEXITY_CLASSES: Record<string, string> = {
  beginner: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
  intermediate: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
  advanced: 'text-orange-400 border-orange-500/20 bg-orange-500/5',
  expert: 'text-red-400 border-red-500/20 bg-red-500/5',
};

const CATEGORY_CLASSES: Record<string, string> = {
  microcontroller: 'text-cyan-400 border-cyan-500/15',
  sensor: 'text-emerald-400 border-emerald-500/15',
  actuator: 'text-orange-400 border-orange-500/15',
  power: 'text-red-400 border-red-500/15',
  communication: 'text-purple-400 border-purple-500/15',
  display: 'text-blue-400 border-blue-500/15',
};

const CATEGORY_LABELS: Record<string, string> = {
  microcontroller: 'MCU',
  sensor: 'SNSR',
  actuator: 'ACTU',
  power: 'PWR',
  communication: 'COMM',
  display: 'DSP',
};

interface HardwareDesignerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HardwareDesigner({ isOpen, onClose }: HardwareDesignerProps) {
  const [description, setDescription] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<HardwareResult | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'wiring' | 'components' | 'architecture' | 'assembly' | 'bom'>('wiring');
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null);

  const quickProjects = [
    { label: 'WS', name: 'Weather Station', desc: 'ESP32 + BME280 + OLED', prompt: 'Build an IoT weather station that measures temperature, humidity, and pressure, displays on OLED, and sends data to the cloud via WiFi' },
    { label: 'RC', name: 'Robot Car', desc: 'Arduino + Ultrasonic + Motors', prompt: 'Build an autonomous robot car that avoids obstacles using ultrasonic sensor and servo-mounted scanner' },
    { label: 'SH', name: 'Smart Home Hub', desc: 'ESP32 + Relay + PIR + NeoPixel', prompt: 'Build a smart home hub that controls lights and appliances via WiFi, detects motion with PIR, and shows status on display' },
    { label: 'DR', name: 'Mini Drone', desc: 'ESP32 + MPU6050 + Motors', prompt: 'Build a mini quadcopter drone with ESP32 flight controller, MPU6050 IMU for stabilization, and barometric altitude hold' },
    { label: 'MA', name: 'Motion Alarm', desc: 'ESP32 + PIR + Buzzer', prompt: 'Build a PIR motion alarm system that detects intruders and sends WiFi notifications to my phone' },
    { label: 'LC', name: 'LED Controller', desc: 'ESP32 + NeoPixel Strip', prompt: 'Build an RGB LED strip controller with WiFi, multiple color modes, music reactive patterns, and phone control' },
  ];

  const analyze = useCallback(async (prompt: string) => {
    if (!prompt.trim() || analyzing) return;
    setAnalyzing(true);
    setResult(null);
    setError('');
    setActiveTab('wiring');
    try {
      const res = await fetch('/api/hardware', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: prompt }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Analysis failed');
      }
      const data: HardwareResult = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }, [analyzing]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex items-center justify-center"
        style={{ background: 'rgba(2,4,8,0.92)' }}
        onClick={(e) => { if (e.target === e.currentTarget && !analyzing) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.97, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.97, opacity: 0 }}
          className="hud-panel rounded-lg w-[95vw] max-w-5xl max-h-[90vh] flex flex-col overflow-hidden relative"
        >
          <div className="corner-line-tl" />
          <div className="corner-line-br" />

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/5">
            <div className="flex items-center gap-3">
              <div className="hud-value text-sm text-cyan-400/60">[+]</div>
              <div>
                <div className="hud-text text-cyan-400/30">HARDWARE DESIGNER</div>
                <div className="hud-value text-sm text-cyan-100/60">JARVIS Blueprint Engine</div>
              </div>
              {analyzing && (
                <div className="flex items-center gap-2 ml-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="hud-text text-[9px] text-cyan-400/50">Analyzing project...</span>
                </div>
              )}
            </div>
            {!analyzing && (
              <button onClick={onClose}
                className="w-7 h-7 rounded border border-cyan-500/10 flex items-center justify-center text-cyan-400/30 hover:text-cyan-400/60 transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Input State */}
            {!result && !analyzing && (
              <div className="px-6 py-8">
                <div className="text-center mb-8">
                  <div className="hud-text text-cyan-400/15 mb-3">[BLUEPRINT GENERATOR]</div>
                  <div className="text-[11px] text-slate-400/50 max-w-lg mx-auto"
                    style={{ fontFamily: 'Courier New, monospace' }}>
                    Describe your hardware project and JARVIS will generate wiring diagrams,
                    bills of materials, architecture layouts, and step-by-step assembly guides.
                  </div>
                </div>

                <div className="max-w-2xl mx-auto space-y-4">
                  <textarea value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="Describe your project... e.g., Build an IoT weather station that measures temperature and humidity, displays on a small screen, and sends data to my phone via WiFi"
                    className="w-full bg-transparent border border-cyan-500/15 rounded px-4 py-3 text-sm text-cyan-100/70 placeholder-slate-600/40 focus:border-cyan-400/25 transition-all h-24 resize-none"
                    style={{ fontFamily: 'Courier New, monospace' }} autoFocus />
                  <button onClick={() => analyze(description)} disabled={!description.trim()}
                    className="w-full py-3 rounded border border-cyan-500/20 text-cyan-400/80 text-[11px] tracking-wider hover:bg-cyan-500/5 disabled:opacity-20 transition-all"
                    style={{ fontFamily: 'Courier New, monospace' }}>
                    ANALYZE & GENERATE BLUEPRINT
                  </button>
                </div>

                {/* Quick Start */}
                <div className="max-w-2xl mx-auto mt-8">
                  <div className="hud-text text-cyan-400/20 mb-3">QUICK START TEMPLATES</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {quickProjects.map(project => (
                      <button key={project.name}
                        onClick={() => { setDescription(project.prompt); analyze(project.prompt); }}
                        className="hud-panel rounded p-3 text-left hover:border-cyan-500/15 transition-all group">
                        <div className="hud-value text-[10px] text-cyan-400/30 group-hover:text-cyan-400/60 mb-1">[{project.label}]</div>
                        <div className="hud-value text-[11px] text-cyan-100/60 group-hover:text-cyan-100/80 transition-colors">
                          {project.name}
                        </div>
                        <div className="hud-text text-[7px] text-cyan-400/15 mt-0.5">{project.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Analyzing */}
            {analyzing && (
              <div className="flex flex-col items-center justify-center py-16">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  className="w-16 h-16 border border-cyan-500/15 rounded-full"
                  style={{ borderTopColor: 'rgba(0,200,255,0.5)' }} />
                <div className="mt-4 hud-value text-sm text-cyan-400/60">Designing your blueprint...</div>
                <div className="mt-1 hud-text text-[8px] text-cyan-400/20">
                  ANALYZING COMPONENTS · GENERATING WIRING · CALCULATING POWER
                </div>
              </div>
            )}

            {/* Results */}
            {result && (
              <div className="px-6 py-4 space-y-4">
                {/* Project Summary */}
                <div className="hud-panel rounded p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="hud-value text-sm text-cyan-100/70">{result.analysis.name}</div>
                      <div className="hud-text text-[8px] text-cyan-400/25">
                        {result.analysis.components.length} COMPONENTS · {result.analysis.estimatedCost} · {result.analysis.estimatedTime}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] px-2 py-1 rounded border ${COMPLEXITY_CLASSES[result.analysis.complexity] || ''}`}
                        style={{ fontFamily: 'Courier New, monospace' }}>
                        {result.analysis.complexity.toUpperCase()}
                      </span>
                      <button onClick={() => { setResult(null); setDescription(''); }}
                        className="px-3 py-1.5 rounded border border-cyan-500/10 text-[9px] text-cyan-400/40 hover:text-cyan-400/60 transition-colors"
                        style={{ fontFamily: 'Courier New, monospace' }}>
                        NEW PROJECT
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'COMPONENTS', value: String(result.analysis.components.length) },
                      { label: 'EST. COST', value: result.analysis.estimatedCost },
                      { label: 'BUILD TIME', value: result.analysis.estimatedTime },
                    ].map(item => (
                      <div key={item.label} className="bg-cyan-500/[0.02] border border-cyan-500/5 rounded p-2.5 text-center">
                        <div className="hud-text text-[7px] text-cyan-400/20">{item.label}</div>
                        <div className="hud-value text-[11px] text-cyan-100/60">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-cyan-500/[0.02] rounded p-1">
                  {(['wiring', 'components', 'architecture', 'assembly', 'bom'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-2 rounded text-[9px] tracking-wider transition-all ${
                        activeTab === tab
                          ? 'bg-cyan-500/8 text-cyan-400/70 border border-cyan-500/15'
                          : 'text-cyan-400/20 hover:text-cyan-400/40'
                      }`} style={{ fontFamily: 'Courier New, monospace' }}>
                      {tab.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <AnimatePresence mode="wait">
                  {activeTab === 'wiring' && (
                    <motion.div key="wiring" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="space-y-4">
                      <div className="hud-panel rounded p-4">
                        <div className="hud-text text-cyan-400/25 mb-3">WIRING DIAGRAM</div>
                        <div className="bg-[#04060c] rounded p-4 overflow-x-auto border border-cyan-500/5"
                          dangerouslySetInnerHTML={{ __html: result.wiringDiagramSVG }} />
                      </div>
                      <div className="hud-panel rounded p-4">
                        <div className="hud-text text-cyan-400/25 mb-3">CONNECTIONS ({result.analysis.wiring.connections.length})</div>
                        <div className="space-y-1.5 max-h-60 overflow-y-auto">
                          {result.analysis.wiring.connections.map((conn, i) => (
                            <div key={i} className="flex items-center gap-2 text-[10px]" style={{ fontFamily: 'Courier New, monospace' }}>
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getWireColor(conn.wire) }} />
                              <span className="text-cyan-100/50">{conn.from.component}.{conn.from.pin}</span>
                              <span className="text-cyan-400/20">--&gt;</span>
                              <span className="text-cyan-100/50">{conn.to.component}.{conn.to.pin}</span>
                              <span className="text-cyan-400/15 ml-auto text-[8px]">{conn.wire}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="hud-panel rounded p-4">
                        <div className="hud-text text-cyan-400/25 mb-3">POWER DISTRIBUTION</div>
                        <div className="space-y-1.5">
                          {result.analysis.architecture.powerDistribution.map((dist, i) => (
                            <div key={i} className="text-[10px] text-cyan-400/30 flex items-start gap-2"
                              style={{ fontFamily: 'Courier New, monospace' }}>
                              <span className="text-red-400/40 shrink-0">[PWR]</span>
                              <span>{dist}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'components' && (
                    <motion.div key="components" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {result.analysis.components.map(comp => (
                          <button key={comp.id}
                            onClick={() => setSelectedComponent(selectedComponent?.id === comp.id ? null : comp)}
                            className={`hud-panel rounded p-3 text-left transition-all ${
                              selectedComponent?.id === comp.id
                                ? 'border-cyan-500/20 bg-cyan-500/[0.03]'
                                : 'hover:border-cyan-500/10'
                            }`}>
                            <div className="flex items-center gap-2">
                              <span className={`hud-text text-[8px] px-1.5 py-0.5 border rounded ${CATEGORY_CLASSES[comp.category] || ''}`}>
                                {CATEGORY_LABELS[comp.category] || '???'}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="hud-value text-[11px] text-cyan-100/60 truncate">{comp.name}</div>
                                <div className="hud-text text-[7px] text-cyan-400/15">{comp.voltage} · {comp.price}</div>
                              </div>
                            </div>
                            {selectedComponent?.id === comp.id && comp.pins && (
                              <div className="mt-3 pt-3 border-t border-cyan-500/5">
                                <div className="hud-text text-[8px] text-cyan-400/20 mb-2">PINOUT</div>
                                <div className="grid grid-cols-2 gap-1">
                                  {comp.pins.map(pin => (
                                    <div key={pin.name} className="text-[9px]" style={{ fontFamily: 'Courier New, monospace' }}>
                                      <span className="text-cyan-400/50">{pin.name}</span>
                                      <span className="text-cyan-400/15 ml-1">{pin.type}</span>
                                    </div>
                                  ))}
                                </div>
                                {comp.description && (
                                  <div className="text-[9px] text-cyan-400/20 mt-2">{comp.description}</div>
                                )}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'architecture' && (
                    <motion.div key="arch" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="space-y-4">
                      <div className="hud-panel rounded p-4">
                        <div className="hud-text text-cyan-400/25 mb-3">SYSTEM ARCHITECTURE</div>
                        <div className="flex flex-wrap gap-3 justify-center py-4">
                          {result.analysis.architecture.blocks.map(block => {
                            const typeClasses: Record<string, string> = {
                              input: 'border-emerald-500/20 bg-emerald-500/5',
                              processing: 'border-cyan-500/20 bg-cyan-500/5',
                              output: 'border-orange-500/20 bg-orange-500/5',
                              power: 'border-red-500/20 bg-red-500/5',
                              communication: 'border-purple-500/20 bg-purple-500/5',
                              storage: 'border-blue-500/20 bg-blue-500/5',
                            };
                            return (
                              <div key={block.id}
                                className={`border rounded p-3 min-w-[120px] text-center ${typeClasses[block.type] || 'border-cyan-500/10'}`}>
                                <div className="hud-text text-[7px] text-cyan-400/20 uppercase">{block.type}</div>
                                <div className="hud-value text-[11px] text-cyan-100/60 mt-0.5">{block.name}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="hud-panel rounded p-4">
                        <div className="hud-text text-cyan-400/25 mb-3">DATA FLOW</div>
                        <div className="space-y-2">
                          {result.analysis.architecture.dataFlow.map((flow, i) => (
                            <div key={i} className="flex items-center gap-2 text-[10px] text-cyan-400/35"
                              style={{ fontFamily: 'Courier New, monospace' }}>
                              <span className="text-cyan-400/25">{i + 1}.</span>
                              <span>{flow}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {result.analysis.risks.length > 0 && (
                          <div className="hud-panel rounded p-4">
                            <div className="hud-text text-orange-400/30 mb-3">[!] RISKS</div>
                            <div className="space-y-1.5">
                              {result.analysis.risks.map((risk, i) => (
                                <div key={i} className="text-[10px] text-cyan-400/25" style={{ fontFamily: 'Courier New, monospace' }}>
                                  - {risk}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {result.analysis.alternatives.length > 0 && (
                          <div className="hud-panel rounded p-4">
                            <div className="hud-text text-cyan-400/25 mb-3">[~] ALTERNATIVES</div>
                            <div className="space-y-1.5">
                              {result.analysis.alternatives.map((alt, i) => (
                                <div key={i} className="text-[10px] text-cyan-400/25" style={{ fontFamily: 'Courier New, monospace' }}>
                                  - {alt}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'assembly' && (
                    <motion.div key="assembly" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="space-y-4">
                      <div className="hud-panel rounded p-4">
                        <div className="hud-text text-cyan-400/25 mb-3">ASSEMBLY STEPS</div>
                        <div className="space-y-3">
                          {result.analysis.wiring.assemblySteps.map((step, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded border border-cyan-500/15 flex items-center justify-center text-[9px] text-cyan-400/50 shrink-0 mt-0.5"
                                style={{ fontFamily: 'Courier New, monospace' }}>
                                {i + 1}
                              </div>
                              <div className="text-[11px] text-cyan-100/40" style={{ fontFamily: 'Courier New, monospace' }}>
                                {step}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="hud-panel rounded p-4">
                        <div className="hud-text text-cyan-400/25 mb-3">PRO TIPS</div>
                        <div className="space-y-2">
                          {result.analysis.wiring.tips.map((tip, i) => (
                            <div key={i} className="text-[10px] text-cyan-400/30 bg-cyan-500/[0.02] rounded px-3 py-2 border border-cyan-500/5"
                              style={{ fontFamily: 'Courier New, monospace' }}>
                              {tip}
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'bom' && (
                    <motion.div key="bom" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      <div className="hud-panel rounded p-4 text-[10px] text-cyan-400/25 whitespace-pre-wrap overflow-x-auto"
                        style={{ fontFamily: 'Courier New, monospace' }}>
                        {result.bom}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function getWireColor(wire: string): string {
  const colors: Record<string, string> = {
    Red: '#ef4444', Black: '#374151', Blue: '#3b82f6', Yellow: '#eab308',
    Green: '#22c55e', Orange: '#f97316', Purple: '#a855f7', White: '#e5e7eb',
    Grey: '#9ca3af', Brown: '#92400e', Pink: '#ec4899',
  };
  return colors[wire] || '#6b7280';
}
