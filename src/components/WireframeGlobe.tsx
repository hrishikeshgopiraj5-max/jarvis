'use client';

import { useEffect, useState } from 'react';

// ═══════════════════════════════════════════════════════════════
// Holographic Wireframe Globe — Iron Man HUD style
// Pure SVG + CSS 3D transforms (no Three.js needed)
// ═══════════════════════════════════════════════════════════════

interface WireframeGlobeProps {
  size?: number;         // Diameter in px
  speed?: number;        // Rotation speed multiplier
  opacity?: number;      // Overall opacity 0-1
  className?: string;    // Extra CSS classes
  mode?: string;         // Orb mode for color shifts
}

export default function WireframeGlobe({
  size = 500,
  speed = 1,
  opacity = 0.12,
  className = '',
  mode = 'idle',
}: WireframeGlobeProps) {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    let frame: number;
    let lastTime = performance.now();
    const animate = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      setRotation(prev => (prev + delta * 15 * speed) % 360);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [speed]);

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42; // globe radius

  // Color shifts based on mode
  const baseColor = mode === 'thinking' ? '180,160,60' : '0,200,255';
  const glowColor = mode === 'thinking' ? 'rgba(180,160,60,0.3)' : 'rgba(0,200,255,0.25)';

  // ── Latitude lines (horizontal circles) ──
  const latCount = 7;
  const latitudes = Array.from({ length: latCount }, (_, i) => {
    const angle = ((i + 1) / (latCount + 1)) * Math.PI - Math.PI / 2;
    const y = cy + Math.sin(angle) * r;
    const latRadius = Math.cos(angle) * r;
    return { y, rx: latRadius, ry: latRadius * 0.3 }; // Slightly squished for perspective
  });

  // ── Longitude lines (vertical ellipses) ──
  const lonCount = 8;
  const longitudes = Array.from({ length: lonCount }, (_, i) => {
    const baseAngle = (i / lonCount) * 180;
    // Apply rotation offset to simulate 3D rotation
    const rotatedAngle = (baseAngle + rotation) % 180;
    // Calculate "depth" to determine opacity (front = brighter, back = dimmer)
    const depth = Math.sin((rotatedAngle * Math.PI) / 180);
    const visible = Math.abs(depth) > 0.05;
    return {
      angle: rotatedAngle,
      opacity: Math.abs(depth),
      visible,
    };
  }).filter(l => l.visible);

  // ── Continent dots (simplified landmass hints) ──
  const continentDots = [
    // North America
    { lat: 0.6, lon: -2.5 }, { lat: 0.5, lon: -2.0 }, { lat: 0.4, lon: -2.2 },
    // South America
    { lat: -0.2, lon: -1.5 }, { lat: -0.5, lon: -1.3 }, { lat: -0.7, lon: -1.2 },
    // Europe
    { lat: 0.7, lon: 0.3 }, { lat: 0.6, lon: 0.5 }, { lat: 0.55, lon: 0.4 },
    // Africa
    { lat: 0.1, lon: 0.5 }, { lat: -0.1, lon: 0.6 }, { lat: -0.3, lon: 0.5 },
    // Asia
    { lat: 0.5, lon: 1.2 }, { lat: 0.6, lon: 1.5 }, { lat: 0.4, lon: 1.8 },
    // Australia
    { lat: -0.5, lon: 2.2 }, { lat: -0.4, lon: 2.4 },
  ];

  const projectedDots = continentDots.map(dot => {
    // Rotate longitude around Y axis
    const rotatedLon = dot.lon + (rotation * Math.PI) / 180;
    const x3d = Math.cos(dot.lat) * Math.sin(rotatedLon);
    const y3d = Math.sin(dot.lat);
    const z3d = Math.cos(dot.lat) * Math.cos(rotatedLon);

    // Only show dots on the front hemisphere
    if (z3d < -0.1) return null;

    const px = cx + x3d * r * 0.95;
    const py = cy - y3d * r * 0.95;
    const dotOpacity = Math.max(0, z3d) * 0.6;

    return { x: px, y: py, opacity: dotOpacity, size: 1 + z3d * 1.5 };
  }).filter(Boolean) as Array<{ x: number; y: number; opacity: number; size: number }>;

  return (
    <div className={`pointer-events-none ${className}`}
      style={{ width: size, height: size, opacity }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          {/* Globe glow filter */}
          <filter id="globe-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Subtle inner glow */}
          <radialGradient id="globe-inner" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={`rgba(${baseColor},0.06)`} />
            <stop offset="80%" stopColor={`rgba(${baseColor},0.02)`} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* Globe edge gradient */}
          <radialGradient id="globe-edge" cx="50%" cy="50%" r="50%">
            <stop offset="85%" stopColor="transparent" />
            <stop offset="100%" stopColor={`rgba(${baseColor},0.08)`} />
          </radialGradient>
        </defs>

        {/* Inner glow fill */}
        <circle cx={cx} cy={cy} r={r} fill="url(#globe-inner)" />
        <circle cx={cx} cy={cy} r={r} fill="url(#globe-edge)" />

        {/* Outer ring */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={`rgba(${baseColor},0.15)`} strokeWidth="0.8" filter="url(#globe-glow)" />

        {/* Latitude lines */}
        {latitudes.map((lat, i) => (
          <ellipse key={`lat-${i}`}
            cx={cx} cy={lat.y}
            rx={lat.rx} ry={lat.ry}
            fill="none"
            stroke={`rgba(${baseColor},0.1)`}
            strokeWidth="0.4"
            strokeDasharray="2 4" />
        ))}

        {/* Longitude lines (rotating) */}
        {longitudes.map((lon, i) => (
          <ellipse key={`lon-${i}`}
            cx={cx} cy={cy}
            rx={r * Math.abs(Math.cos((lon.angle * Math.PI) / 180))}
            ry={r}
            fill="none"
            stroke={`rgba(${baseColor},${0.08 + lon.opacity * 0.12})`}
            strokeWidth="0.4" />
        ))}

        {/* Continent dots */}
        {projectedDots.map((dot, i) => (
          <circle key={`dot-${i}`}
            cx={dot.x} cy={dot.y}
            r={dot.size}
            fill={`rgba(${baseColor},${dot.opacity})`}
            filter="url(#globe-glow)" />
        ))}

        {/* Equator (slightly brighter) */}
        <ellipse cx={cx} cy={cy}
          rx={r} ry={r * 0.25}
          fill="none"
          stroke={`rgba(${baseColor},0.12)`}
          strokeWidth="0.6" />

        {/* Poles */}
        <circle cx={cx} cy={cy - r} r="1.5"
          fill={`rgba(${baseColor},0.2)`} filter="url(#globe-glow)" />
        <circle cx={cx} cy={cy + r} r="1.5"
          fill={`rgba(${baseColor},0.2)`} filter="url(#globe-glow)" />

        {/* Crosshair overlay */}
        <line x1={cx} y1={cy - r - 8} x2={cx} y2={cy - r + 3}
          stroke={`rgba(${baseColor},0.15)`} strokeWidth="0.5" />
        <line x1={cx} y1={cy + r - 3} x2={cx} y2={cy + r + 8}
          stroke={`rgba(${baseColor},0.15)`} strokeWidth="0.5" />
        <line x1={cx - r - 8} y1={cy} x2={cx - r + 3} y2={cy}
          stroke={`rgba(${baseColor},0.15)`} strokeWidth="0.5" />
        <line x1={cx + r - 3} y1={cy} x2={cx + r + 8} y2={cy}
          stroke={`rgba(${baseColor},0.15)`} strokeWidth="0.5" />
      </svg>
    </div>
  );
}
