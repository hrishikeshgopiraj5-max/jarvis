'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════
// Hardware Designer UI — Build wiring diagrams, BOMs, and architecture
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

const COMPLEXITY_COLORS: Record<string, string> = {
  beginner: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  intermediate: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  advanced: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  expert: 'text-red-400 bg-red-500/10 border-red-500/30',
};

const CATEGORY_COLORS: Record<string, string> = {
  microcontroller: 'text-cyan-400 bg-cyan-500/10',
  sensor: 'text-emerald-400 bg-emerald-500/10',
  actuator: 'text-orange-400 bg-orange-500/10',
  power: 'text-red-400 bg-red-500/10',
  communication: 'text-purple-400 bg-purple-500/10',
  display: 'text-blue-400 bg-blue-500/10',
};

const CATEGORY_ICONS: Record<string, string> = {
  microcontroller: '🧠',
  sensor: '📡',
  actuator: '⚙️',
  power: '🔋',
  communication: '📶',
  display: '🖥️',
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
    { icon: '🌡️', name: 'Weather Station', desc: 'ESP32 + BME280 + OLED display', prompt: 'Build an IoT weather station that measures temperature, humidity, and pressure, displays on OLED, and sends data to the cloud via WiFi' },
    { icon: '🤖', name: 'Robot Car', desc: 'Arduino + Ultrasonic + Motors', prompt: 'Build an autonomous robot car that avoids obstacles using ultrasonic sensor and servo-mounted scanner' },
    { icon: '🏠', name: 'Smart Home Hub', desc: 'ESP32 + Relay + PIR + NeoPixel', prompt: 'Build a smart home hub that controls lights and appliances via WiFi, detects motion with PIR, and shows status on display' },
    { icon: '🛸', name: 'Mini Drone', desc: 'ESP32 + MPU6050 + Motors', prompt: 'Build a mini quadcopter drone with ESP32 flight controller, MPU6050 IMU for stabilization, and barometric altitude hold' },
    { icon: '🔐', name: 'Motion Alarm', desc: 'ESP32 + PIR + Buzzer', prompt: 'Build a PIR motion alarm system that detects intruders and sends WiFi notifications to my phone' },
    { icon: '💡', name: 'LED Controller', desc: 'ESP32 + NeoPixel Strip', prompt: 'Build an RGB LED strip controller with WiFi, multiple color modes, music reactive patterns, and phone control' },
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
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget && !analyzing) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#0a0e14]/98 border border-white/10 rounded-2xl w-[95vw] max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="text-xl">🔧</div>
              <div>
                <div className="text-[10px] tracking-[0.3em] text-cyan-400/60">HARDWARE DESIGNER</div>
                <div className="text-sm font-light text-white">JARVIS Blueprint Engine</div>
              </div>
              {analyzing && (
                <div className="flex items-center gap-2 ml-4">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-[10px] text-cyan-400/60 font-mono">Analyzing project...</span>
                </div>
              )}
            </div>
            {!analyzing && (
              <button onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                  <div className="text-4xl mb-3 opacity-30">🔧</div>
                  <div className="text-sm text-slate-400 max-w-lg mx-auto">
                    Describe your hardware project and JARVIS will generate wiring diagrams,
                    bills of materials, architecture layouts, and step-by-step assembly guides.
                  </div>
                </div>

                <div className="max-w-2xl mx-auto space-y-4">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your project... e.g., Build an IoT weather station that measures temperature and humidity, displays on a small screen, and sends data to my phone via WiFi"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500/30 focus:bg-white/[0.06] transition-all h-24 resize-none"
                    autoFocus
                  />
                  <button
                    onClick={() => analyze(description)}
                    disabled={!description.trim()}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 text-cyan-400 text-sm font-medium hover:from-cyan-500/30 hover:to-indigo-500/30 disabled:opacity-30 transition-all"
                  >
                    Analyze & Generate Blueprint
                  </button>
                </div>

                {/* Quick Start Templates */}
                <div className="max-w-2xl mx-auto mt-8">
                  <div className="text-[10px] tracking-wider text-slate-500 mb-3">QUICK START TEMPLATES</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {quickProjects.map((project) => (
                      <button
                        key={project.name}
                        onClick={() => { setDescription(project.prompt); analyze(project.prompt); }}
                        className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-left hover:border-cyan-500/20 hover:bg-cyan-500/[0.03] transition-all group"
                      >
                        <span className="text-lg">{project.icon}</span>
                        <div className="text-xs text-white group-hover:text-cyan-300 transition-colors mt-1">{project.name}</div>
                        <div className="text-[10px] text-slate-600 mt-0.5">{project.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Analyzing */}
            {analyzing && (
              <div className="flex flex-col items-center justify-center py-16">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  className="w-16 h-16 border-2 border-cyan-500/20 rounded-full border-t-cyan-400"
                />
                <div className="mt-4 text-sm text-cyan-400/80">Designing your blueprint...</div>
                <div className="mt-1 text-[10px] text-slate-500">Analyzing components, generating wiring diagram, calculating power</div>
              </div>
            )}

            {/* Results */}
            {result && (
              <div className="px-6 py-4 space-y-4">
                {/* Project Summary */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm text-white">{result.analysis.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {result.analysis.components.length} components · {result.analysis.estimatedCost} · {result.analysis.estimatedTime}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-1 rounded-full border ${COMPLEXITY_COLORS[result.analysis.complexity] || ''}`}>
                        {result.analysis.complexity.toUpperCase()}
                      </span>
                      <button
                        onClick={() => { setResult(null); setDescription(''); }}
                        className="px-3 py-1.5 rounded-lg bg-white/5 text-[10px] text-slate-400 hover:text-white transition-colors"
                      >
                        NEW PROJECT
                      </button>
                    </div>
                  </div>

                  {/* Complexity + Cost + Time */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/[0.02] rounded-lg p-2.5 text-center">
                      <div className="text-[9px] text-slate-500">COMPONENTS</div>
                      <div className="text-sm text-white font-mono">{result.analysis.components.length}</div>
                    </div>
                    <div className="bg-white/[0.02] rounded-lg p-2.5 text-center">
                      <div className="text-[9px] text-slate-500">EST. COST</div>
                      <div className="text-sm text-white font-mono">{result.analysis.estimatedCost}</div>
                    </div>
                    <div className="bg-white/[0.02] rounded-lg p-2.5 text-center">
                      <div className="text-[9px] text-slate-500">BUILD TIME</div>
                      <div className="text-sm text-white font-mono">{result.analysis.estimatedTime}</div>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-white/[0.02] rounded-lg p-1">
                  {(['wiring', 'components', 'architecture', 'assembly', 'bom'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-2 rounded-md text-[10px] tracking-wider transition-all ${
                        activeTab === tab
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {tab.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <AnimatePresence mode="wait">
                  {activeTab === 'wiring' && (
                    <motion.div key="wiring" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="space-y-4">
                      {/* SVG Diagram */}
                      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                        <div className="text-[10px] tracking-wider text-slate-500 mb-3">WIRING DIAGRAM</div>
                        <div className="bg-[#0a0e14] rounded-lg p-4 overflow-x-auto" dangerouslySetInnerHTML={{ __html: result.wiringDiagramSVG }} />
                      </div>

                      {/* Connection List */}
                      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                        <div className="text-[10px] tracking-wider text-slate-500 mb-3">CONNECTIONS ({result.analysis.wiring.connections.length})</div>
                        <div className="space-y-1.5 max-h-60 overflow-y-auto">
                          {result.analysis.wiring.connections.map((conn, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs font-mono">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getWireColor(conn.wire) }} />
                              <span className="text-slate-300">{conn.from.component}.{conn.from.pin}</span>
                              <span className="text-slate-600">──▶</span>
                              <span className="text-slate-300">{conn.to.component}.{conn.to.pin}</span>
                              <span className="text-slate-600 text-[10px] ml-auto">{conn.wire}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Power Distribution */}
                      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                        <div className="text-[10px] tracking-wider text-slate-500 mb-3">POWER DISTRIBUTION</div>
                        <div className="space-y-1.5">
                          {result.analysis.architecture.powerDistribution.map((dist, i) => (
                            <div key={i} className="text-xs text-slate-400 flex items-start gap-2">
                              <span className="text-red-400 mt-0.5">⚡</span>
                              <span>{dist}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'components' && (
                    <motion.div key="components" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {result.analysis.components.map((comp) => (
                          <button
                            key={comp.id}
                            onClick={() => setSelectedComponent(selectedComponent?.id === comp.id ? null : comp)}
                            className={`bg-white/[0.03] border rounded-xl p-3 text-left transition-all ${
                              selectedComponent?.id === comp.id
                                ? 'border-cyan-500/30 bg-cyan-500/[0.05]'
                                : 'border-white/[0.06] hover:border-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span>{CATEGORY_ICONS[comp.category] || '📦'}</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm text-white truncate">{comp.name}</div>
                                <div className="text-[10px] text-slate-500">{comp.voltage} · {comp.price}</div>
                              </div>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded ${CATEGORY_COLORS[comp.category] || ''}`}>
                                {comp.category}
                              </span>
                            </div>
                            {selectedComponent?.id === comp.id && comp.pins && (
                              <div className="mt-3 pt-3 border-t border-white/5">
                                <div className="text-[9px] text-slate-500 mb-2">PINOUT</div>
                                <div className="grid grid-cols-2 gap-1">
                                  {comp.pins.map((pin) => (
                                    <div key={pin.name} className="text-[10px] font-mono">
                                      <span className="text-cyan-400">{pin.name}</span>
                                      <span className="text-slate-600 ml-1">{pin.type}</span>
                                    </div>
                                  ))}
                                </div>
                                {comp.description && (
                                  <div className="text-[10px] text-slate-500 mt-2">{comp.description}</div>
                                )}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'architecture' && (
                    <motion.div key="arch" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="space-y-4">
                      {/* Architecture Diagram */}
                      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                        <div className="text-[10px] tracking-wider text-slate-500 mb-3">SYSTEM ARCHITECTURE</div>
                        <div className="flex flex-wrap gap-3 justify-center py-4">
                          {result.analysis.architecture.blocks.map((block) => {
                            const typeColors: Record<string, string> = {
                              input: 'border-emerald-500/30 bg-emerald-500/5',
                              processing: 'border-cyan-500/30 bg-cyan-500/5',
                              output: 'border-orange-500/30 bg-orange-500/5',
                              power: 'border-red-500/30 bg-red-500/5',
                              communication: 'border-purple-500/30 bg-purple-500/5',
                              storage: 'border-blue-500/30 bg-blue-500/5',
                            };
                            return (
                              <div key={block.id} className={`border rounded-lg p-3 min-w-[120px] text-center ${typeColors[block.type] || 'border-white/10'}`}>
                                <div className="text-[9px] text-slate-500 uppercase">{block.type}</div>
                                <div className="text-xs text-white mt-0.5">{block.name}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Data Flow */}
                      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                        <div className="text-[10px] tracking-wider text-slate-500 mb-3">DATA FLOW</div>
                        <div className="space-y-2">
                          {result.analysis.architecture.dataFlow.map((flow, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                              <span className="text-cyan-400 font-mono">{i + 1}.</span>
                              <span>{flow}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Risks & Alternatives */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {result.analysis.risks.length > 0 && (
                          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                            <div className="text-[10px] tracking-wider text-orange-400/60 mb-3">⚠️ RISKS</div>
                            <div className="space-y-1.5">
                              {result.analysis.risks.map((risk, i) => (
                                <div key={i} className="text-[11px] text-slate-400">• {risk}</div>
                              ))}
                            </div>
                          </div>
                        )}
                        {result.analysis.alternatives.length > 0 && (
                          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                            <div className="text-[10px] tracking-wider text-cyan-400/60 mb-3">🔄 ALTERNATIVES</div>
                            <div className="space-y-1.5">
                              {result.analysis.alternatives.map((alt, i) => (
                                <div key={i} className="text-[11px] text-slate-400">• {alt}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'assembly' && (
                    <motion.div key="assembly" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="space-y-4">
                      {/* Assembly Steps */}
                      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                        <div className="text-[10px] tracking-wider text-slate-500 mb-3">ASSEMBLY STEPS</div>
                        <div className="space-y-3">
                          {result.analysis.wiring.assemblySteps.map((step, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-[10px] text-cyan-400 font-mono shrink-0 mt-0.5">
                                {i + 1}
                              </div>
                              <div className="text-sm text-slate-300">{step}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Tips */}
                      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                        <div className="text-[10px] tracking-wider text-slate-500 mb-3">💡 PRO TIPS</div>
                        <div className="space-y-2">
                          {result.analysis.wiring.tips.map((tip, i) => (
                            <div key={i} className="text-xs text-slate-400 bg-white/[0.02] rounded-lg px-3 py-2">
                              {tip}
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'bom' && (
                    <motion.div key="bom" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      <div className="bg-[#0a0e14] rounded-xl p-4 font-mono text-[11px] text-slate-400 whitespace-pre-wrap overflow-x-auto">
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
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-300">{error}</div>
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
