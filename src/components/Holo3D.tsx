'use client';

/**
 * Holo3D — lightweight 3D brand marks used across the shell.
 *
 * Pure CSS 3D (perspective + transform-style) with gradient-lit surfaces:
 *   · cube   — rotating glass cube (brand / build)
 *   · ring   — tilted spinning halo ring (voice / activity)
 *   · prism  — triangular prism (recon)
 *   · core   — layered glowing orb (identity mark)
 *
 * Zero WebGL cost — a dozen of these animate for less GPU time than one
 * canvas frame, so they can live "everywhere": dock, headers, dialogs,
 * empty states.
 */

import React from 'react';

export type MarkKind = 'cube' | 'ring' | 'prism' | 'core';

interface Mark3DProps {
  kind: MarkKind;
  size?: number;
  /** hue rotation for the lit faces, deg */
  hue?: number;
  speed?: number; // seconds per revolution
  className?: string;
  paused?: boolean;
}

export function Mark3D({ kind, size = 18, hue = 36, speed = 9, className, paused }: Mark3DProps) {
  const anim = paused ? 'animation-play-state: paused' : '';
  const style: React.CSSProperties = {
    width: size,
    height: size,
    // Perspective lives on the wrapper; the child rotates in true 3D
    perspective: size * 6,
    ['--holo-hue' as string]: String(hue),
    ['--holo-speed' as string]: `${speed}s`,
    ['--holo-anim' as string]: anim,
  };

  return (
    <span className={`holo-wrap ${className ?? ''}`} style={style} aria-hidden="true">
      {kind === 'cube' && <HoloCube />}
      {kind === 'ring' && <HoloRing />}
      {kind === 'prism' && <HoloPrism />}
      {kind === 'core' && <HoloCore />}
    </span>
  );
}

function HoloCube() {
  return (
    <span className="holo-spin holo-cube">
      {[
        'rotateY(0deg)', 'rotateY(90deg)', 'rotateY(180deg)', 'rotateY(270deg)',
        'rotateX(90deg)', 'rotateX(-90deg)',
      ].map((t, i) => (
        <i key={i} className="holo-face" style={{ transform: t }} />
      ))}
    </span>
  );
}

function HoloRing() {
  return (
    <span className="holo-tilt">
      <span className="holo-spin holo-ring" />
      <span className="holo-spin-rev holo-ring holo-ring2" />
    </span>
  );
}

function HoloPrism() {
  return (
    <span className="holo-spin holo-prism">
      {['rotateY(0deg)', 'rotateY(120deg)', 'rotateY(240deg)'].map((t, i) => (
        <i key={i} className="holo-face holo-face-tri" style={{ transform: `${t} translateZ(6px)` }} />
      ))}
    </span>
  );
}

function HoloCore() {
  return (
    <span className="holo-core">
      <i className="holo-core-a" />
      <i className="holo-core-b" />
      <i className="holo-core-c" />
    </span>
  );
}
