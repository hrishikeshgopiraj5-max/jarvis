'use client';

/**
 * Contextual UI — tool result cards.
 * Each card type renders real structured data returned by a tool.
 * No fabricated content: cards only render what the tool returned.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { ToolResult } from '@/lib/tools';

interface WeatherData {
  city?: string; temp?: number; description?: string;
  humidity?: number; windSpeed?: number; icon?: string;
}

interface NotesData {
  notes?: { id: string; title: string; updatedAt: string }[];
  title?: string;
}

interface SystemData {
  cores?: number | null; deviceMemoryGB?: number | null;
  jsHeapUsedMB?: number | null; jsHeapLimitMB?: number | null;
  online?: boolean; platform?: string;
}

interface SearchData { engine?: string; query?: string; url?: string }

interface CADData {
  templateName?: string; volumeCm3?: number; massG?: number;
  parts?: number; sizeMm?: string; material?: string;
}

function CADCard({ data }: { data: CADData }) {
  if (!data?.templateName) return null;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold tracking-widest text-[color:var(--t1)]">CAD STUDIO</span>
        <span className="text-[10px] text-[color:var(--t3)]">parametric model</span>
      </div>
      <p className="text-sm text-[color:var(--t1)]">{data.templateName}</p>
      <dl className="mt-2 space-y-1 text-[11px] text-[color:var(--t2)]">
        <div className="flex justify-between"><dt>Parts</dt><dd className="font-mono text-[color:var(--t1)]">{data.parts}</dd></div>
        <div className="flex justify-between"><dt>Size</dt><dd className="font-mono text-[color:var(--t1)]">{data.sizeMm}</dd></div>
        <div className="flex justify-between"><dt>Volume</dt><dd className="font-mono text-[color:var(--t1)]">{data.volumeCm3?.toFixed(1)} cm³</dd></div>
        <div className="flex justify-between"><dt>Mass est.</dt><dd className="font-mono text-[color:var(--t1)]">{data.massG?.toFixed(0)} g · {data.material}</dd></div>
      </dl>
      <p className="mt-2 text-[10px] text-[color:var(--t3)]">The CAD Studio panel is open — tune parameters and export STL there.</p>
    </div>
  );
}
interface ClockData { time?: string; date?: string; iso?: string; expression?: string; value?: number }

export default function ToolResultCard({ card, data }: { card: NonNullable<ToolResult['card']>; data?: Record<string, unknown> }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={card + JSON.stringify(data ?? {}).slice(0, 64)}
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm mx-auto hud-panel rounded-lg p-4"
        role="status"
      >
        {card === 'weather' && <WeatherCard data={data as WeatherData} />}
        {card === 'notes' && <NotesCard data={data as NotesData} />}
        {card === 'system' && <SystemCard data={data as SystemData} />}
        {card === 'search' && <SearchCard data={data as SearchData} />}
        {card === 'clock' && <ClockCard data={data as ClockData} />}
        {card === 'cad' && <CADCard data={data as CADData} />}
      </motion.div>
    </AnimatePresence>
  );
}

function WeatherCard({ data }: { data: WeatherData }) {
  if (!data?.city) return null;
  return (
    <div>
      <div className="hud-text text-[9px] mb-2">WEATHER — {String(data.city).toUpperCase()}</div>
      <div className="flex items-center gap-4">
        <div className="hud-value text-3xl text-[color:var(--t1)]">{Math.round(data.temp ?? 0)}°C</div>
        <div>
          <div className="text-[11px] text-[color:var(--t2)] capitalize">{data.description}</div>
          <div className="hud-text text-[8px] mt-1">
            HUMIDITY {data.humidity ?? '–'}% · WIND {data.windSpeed ?? '–'} m/s
          </div>
        </div>
      </div>
    </div>
  );
}

function NotesCard({ data }: { data: NotesData }) {
  const notes = data?.notes ?? [];
  return (
    <div>
      <div className="hud-text text-[9px] mb-2">NOTES — {notes.length} SHOWN</div>
      {notes.length === 0 ? (
        <div className="text-[11px] text-[color:var(--t3)]">No notes yet. Say “create a note …”.</div>
      ) : (
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {notes.map(n => (
            <div key={n.id} className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-[color:var(--t1)] truncate">{n.title}</span>
              <span className="hud-text text-[7px] text-[color:var(--t3)] shrink-0">
                {new Date(n.updatedAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SystemCard({ data }: { data: SystemData }) {
  const heapPct = data?.jsHeapUsedMB && data?.jsHeapLimitMB
    ? Math.round((data.jsHeapUsedMB / data.jsHeapLimitMB) * 100) : null;
  return (
    <div>
      <div className="hud-text text-[9px] mb-2">SYSTEM DIAGNOSTICS</div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'CORES', value: data?.cores ?? '–' },
          { label: 'DEVICE MEM', value: data?.deviceMemoryGB ? `${data.deviceMemoryGB} GB` : '–' },
          { label: 'JS HEAP', value: data?.jsHeapUsedMB ? `${data.jsHeapUsedMB} MB${heapPct ? ` (${heapPct}%)` : ''}` : '–' },
          { label: 'NETWORK', value: data?.online ? 'ONLINE' : 'OFFLINE' },
        ].map(item => (
          <div key={item.label} className="bg-white/[0.03] border border-white/10 rounded p-2">
            <div className="hud-text text-[7px] mb-0.5">{item.label}</div>
            <div className="hud-value text-[11px]">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchCard({ data }: { data: SearchData }) {
  if (!data?.query) return null;
  return (
    <div>
      <div className="hud-text text-[9px] mb-1">WEB SEARCH — {String(data.engine).toUpperCase()}</div>
      <div className="text-[12px] text-[color:var(--t1)]">“{data.query}”</div>
      <div className="hud-text text-[7px] mt-2 text-[color:var(--t3)]">RESULTS OPENED IN NEW TAB</div>
    </div>
  );
}

function ClockCard({ data }: { data: ClockData }) {
  if (data?.expression) {
    return (
      <div>
        <div className="hud-text text-[9px] mb-1">CALCULATION</div>
        <div className="text-[12px] text-[color:var(--t1)]">{data.expression} =</div>
        <div className="hud-value text-2xl text-[color:var(--t1)] mt-1">{String(data.value)}</div>
      </div>
    );
  }
  if (data?.time || data?.date) {
    return (
      <div>
        <div className="hud-text text-[9px] mb-1">CHRONOMETER</div>
        <div className="hud-value text-2xl text-[color:var(--t1)]">{data.time}</div>
        {data.date && <div className="hud-text text-[9px] mt-1">{data.date}</div>}
      </div>
    );
  }
  return null;
}
