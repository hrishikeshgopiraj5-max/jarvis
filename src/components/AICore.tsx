'use client';

/**
 * J.A.R.V.I.S. AI Core — "Liquid Chrome" (KODE Immersive style).
 *
 * A dark chrome ball that flows like liquid metal — the fake studio
 * environment (key light above, cool fill from the left, warm ember rim)
 * is computed analytically in the shader, so no HDR asset is needed.
 * Around it: sparse monochrome light-dust and, while agents work,
 * floating chrome shards that catch the same environment.
 *
 * API identical to the previous orb: state, micLevel, activeAgents.
 */

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AssistantState } from '@/lib/assistant-state';
import { AGENT_NODES, AgentId } from '@/lib/agents';

// ── Adaptive quality ─────────────────────────────────────────────────────
function detectQuality(): 'low' | 'medium' | 'high' {
  if (typeof navigator === 'undefined') return 'medium';
  const nav = navigator as unknown as { hardwareConcurrency?: number; deviceMemory?: number };
  const reduce = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return 'low';
  if ((nav.hardwareConcurrency ?? 4) <= 4 || (nav.deviceMemory ?? 8) <= 4) return 'low';
  if ((nav.hardwareConcurrency ?? 0) >= 8) return 'high';
  return 'medium';
}

// State = one light color, used sparingly (rim/energy), never flooding
const STATE_COLORS: Record<AssistantState, string> = {
  idle: '#e8e6e1',      // neutral studio white
  listening: '#7ff0d4',
  processing: '#ff5a1f', // the ember
  thinking: '#ff5a1f',
  planning: '#ff5a1f',
  executing: '#c9b8fd',
  speaking: '#c9b8fd',
  success: '#7ce8b0',
  error: '#fda4af',
};

// State "energy" — how alive the ball feels (0..1)
function stateEnergy(state: AssistantState, micLevel: number): number {
  switch (state) {
    case 'listening': return 0.35 + micLevel * 0.65;
    case 'processing': case 'thinking': case 'planning': return 0.62;
    case 'executing': return 0.5;
    case 'speaking': return 0.7;
    case 'success': return 0.4;
    case 'error': return 0.55;
    default: return 0.12 + micLevel * 0.1;
  }
}

// ── GLSL: compact 3D simplex noise (Ashima / IQ public domain) ───────────
const SIMPLEX = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;

// ── Chrome environment: analytic "dark studio" reflections ──────────────
// Returns a radiance color for a reflected direction r.
// Three practical lights + horizon falloff = believable chrome without HDR.
const CHROME_ENV = /* glsl */`
vec3 studioEnv(vec3 r){
  r = normalize(r);
  // Key light: big soft rect overhead (the studio softbox)
  float key = smoothstep(0.72, 0.99, dot(r, normalize(vec3(0.15, 1.0, 0.18))));
  // Secondary strip: cool white from the upper left
  float fill = smoothstep(0.86, 0.995, dot(r, normalize(vec3(-0.7, 0.45, 0.25))));
  // The ember: small warm-orange light low-right (the ONE color)
  float ember = smoothstep(0.955, 0.999, dot(r, normalize(vec3(0.62, -0.28, 0.45))));
  // Floor bounce: barely-there gray from below
  float floorUp = smoothstep(-0.2, -0.95, r.y) * 0.05;
  // Horizon: dark gray sky, black ground
  float horizon = mix(0.028, 0.075, smoothstep(-0.4, 0.6, r.y));
  vec3 col = vec3(horizon);
  col += vec3(1.0, 0.98, 0.95) * key * 1.35;      // hot softbox
  col += vec3(0.75, 0.82, 0.95) * fill * 0.8;     // cool strip
  col += vec3(1.0, 0.36, 0.1) * ember * 2.6;      // burnt orange ember
  col += vec3(0.5) * floorUp;
  return col;
}
`;

// ── The chrome ball surface ──────────────────────────────────────────────
const ORB_VERT = /* glsl */`
uniform float uTime;
uniform float uEnergy;
uniform float uMic;
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vWorld;
varying float vFlow;
${SIMPLEX}
void main(){
  vec3 n = normalize(position);
  float t = uTime * (0.35 + uEnergy * 0.65);
  // Two octaves of flow: broad liquid breathing + fine ripple
  float flow = snoise(n * 1.8 + vec3(0.0, t * 0.55, t * 0.22)) * 0.6
             + snoise(n * 4.2 - vec3(t * 0.32, 0.0, t * 0.4)) * 0.18;
  vFlow = flow;
  float amp = 0.05 + uEnergy * 0.15 + uMic * 0.12;
  vec3 displaced = position + n * flow * amp;
  vNormal = normalize(normalMatrix * n);
  vec4 world = modelMatrix * vec4(displaced, 1.0);
  vWorld = world.xyz;
  vec4 mv = viewMatrix * world;
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const ORB_FRAG = /* glsl */`
uniform vec3 uState;
uniform float uEnergy;
uniform float uTime;
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vWorld;
varying float vFlow;
${SIMPLEX}
${CHROME_ENV}
void main(){
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vView);
  vec3 r = reflect(-v, n);

  // Liquid micro-detail: warp the reflection with fine noise creases
  float rip = snoise(vWorld * 5.5 + vec3(0.0, uTime * 0.35, uTime * 0.2));
  r = normalize(r + n * rip * (0.05 + uEnergy * 0.05));

  // Studio chrome reflection
  vec3 env = studioEnv(r);

  // Flow warp: creases in the liquid catch light differently
  float sheen = smoothstep(0.1, 0.9, vFlow) * 0.25;
  env += studioEnv(normalize(r + n * sheen * 0.5)) * 0.4;

  // Fresnel — chrome is mirror at grazing angles, darker facing you
  float fres = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 3.0);
  env *= mix(0.55, 1.35, fres);

  // State light bleeds into the reflection as a tint at high energy
  env = mix(env, env * (0.7 + uState * 0.65) + uState * 0.06, clamp(uEnergy * 0.55, 0.0, 0.5));

  // Tone: filmic-ish rolloff, deep blacks preserved
  vec3 col = env / (1.0 + env * 0.35);

  float alpha = 1.0;
  gl_FragColor = vec4(col, alpha);
}
`;

function Orb({ state, micLevel, color }: { state: AssistantState; micLevel: number; color: THREE.Color }) {
  const mesh = useRef<THREE.Mesh>(null);
  const live = useRef(new THREE.Color(STATE_COLORS.idle));

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uEnergy: { value: 0.1 },
    uMic: { value: 0 },
    uState: { value: new THREE.Color(STATE_COLORS.idle) },
  }), []);

  useFrame((_, delta) => {
    const energy = stateEnergy(state, micLevel);
    const u = uniforms;
    u.uTime.value += delta * (state === 'idle' ? 0.5 : 1);
    u.uMic.value += (micLevel - u.uMic.value) * 0.12;
    u.uEnergy.value += (energy - u.uEnergy.value) * 0.06;
    live.current.lerp(color, 0.05);
    (u.uState.value as THREE.Color).copy(live.current);
    if (mesh.current) {
      const t = performance.now() / 1000;
      const breath = 1 + Math.sin(t * (state === 'idle' ? 0.9 : 1.8)) * (0.015 + energy * 0.03);
      mesh.current.scale.setScalar(breath);
    }
  });

  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[1, qualitySegments(), qualitySegments()]} />
      <shaderMaterial
        vertexShader={ORB_VERT}
        fragmentShader={ORB_FRAG}
        uniforms={uniforms}
      />
    </mesh>
  );
}

function qualitySegments(): number {
  if (typeof navigator === 'undefined') return 96;
  return (navigator.hardwareConcurrency ?? 4) >= 8 ? 160 : 96;
}

// ── Floating chrome shards — the KODE signature ──────────────────────────
const SHARD_VERT = /* glsl */`
varying vec3 vNormal;
varying vec3 vView;
void main(){
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const SHARD_FRAG = /* glsl */`
uniform float uOpacity;
varying vec3 vNormal;
varying vec3 vView;
${CHROME_ENV}
void main(){
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vView);
  vec3 env = studioEnv(reflect(-v, n));
  float fres = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.5);
  env *= mix(0.4, 1.3, fres);
  vec3 col = env / (1.0 + env * 0.4);
  gl_FragColor = vec4(col, uOpacity);
}
`;

interface ShardSpec {
  pos: THREE.Vector3;
  rot: THREE.Euler;
  scale: number;
  kind: number; // 0 octahedron, 1 box, 2 icosahedron
  orbitR: number;
  orbitSpeed: number;
  phase: number;
  tilt: number;
}

function ChromeShards({ state }: { state: AssistantState }) {
  const group = useRef<THREE.Group>(null);

  const shards = useMemo<ShardSpec[]>(() => {
    const specs: ShardSpec[] = [];
    // Deterministic scatter — 9 shards, varied geometry
    for (let i = 0; i < 9; i++) {
      const golden = i * 2.399963;
      const orbitR = 1.85 + (i % 3) * 0.55;
      specs.push({
        pos: new THREE.Vector3(0, 0, 0),
        rot: new THREE.Euler(Math.sin(golden) * 1.2, golden, Math.cos(golden) * 0.8),
        scale: 0.09 + ((i * 37) % 11) / 90,
        kind: i % 3,
        orbitR,
        orbitSpeed: 0.05 + ((i * 13) % 7) / 90,
        phase: golden,
        tilt: ((i * 29) % 10) / 14 - 0.35,
      });
    }
    return specs;
  }, []);

  const uniforms = useMemo(() => ({ uOpacity: { value: 0.92 } }), []);

  useFrame((_, delta) => {
    if (!group.current) return;
    const t = performance.now() / 1000;
    const boost = state === 'idle' ? 1 : 1.6;
    group.current.children.forEach((child, i) => {
      const s = shards[i];
      if (!s) return;
      const a = s.phase + t * s.orbitSpeed * boost;
      child.position.set(
        Math.cos(a) * s.orbitR,
        s.tilt * 2.2 + Math.sin(t * 0.5 + s.phase) * 0.18,
        Math.sin(a) * s.orbitR * 0.6, // elliptical: flatter toward camera
      );
      child.rotation.x = s.rot.x + t * 0.22;
      child.rotation.y = s.rot.y + t * 0.3;
    });
    void delta;
  });

  return (
    <group ref={group}>
      {shards.map((s, i) => (
        <mesh key={i} position={s.pos} rotation={s.rot} scale={s.scale}>
          {s.kind === 0 && <octahedronGeometry args={[1, 0]} />}
          {s.kind === 1 && <boxGeometry args={[1.35, 0.85, 0.85]} />}
          {s.kind === 2 && <icosahedronGeometry args={[1, 0]} />}
          <shaderMaterial vertexShader={SHARD_VERT} fragmentShader={SHARD_FRAG} uniforms={uniforms} />
        </mesh>
      ))}
    </group>
  );
}

// ── Atmospheric glow — kept whisper-faint behind the chrome ─────────────
const GLOW_FRAG = /* glsl */`
uniform vec3 uColor;
uniform float uIntensity;
varying vec3 vPos;
void main(){
  float d = length(normalize(vPos));
  float falloff = smoothstep(1.0, 0.15, d);
  gl_FragColor = vec4(uColor, falloff * falloff * uIntensity);
}
`;

const GLOW_VERT = /* glsl */`
varying vec3 vPos;
void main(){
  vPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

function Atmosphere({ state, micLevel, color }: { state: AssistantState; micLevel: number; color: THREE.Color }) {
  const live = useRef(new THREE.Color(STATE_COLORS.idle));
  const uniforms = useMemo(() => ({
    uColor: { value: new THREE.Color(STATE_COLORS.idle) },
    uIntensity: { value: 0.1 },
  }), []);

  useFrame(() => {
    live.current.lerp(color, 0.04);
    (uniforms.uColor.value as THREE.Color).copy(live.current);
    const target = state === 'idle' ? 0.07 : 0.13 + micLevel * 0.08 + stateEnergy(state, micLevel) * 0.06;
    uniforms.uIntensity.value += (target - uniforms.uIntensity.value) * 0.05;
  });

  return (
    <mesh scale={2.35}>
      <sphereGeometry args={[1, 48, 48]} />
      <shaderMaterial
        vertexShader={GLOW_VERT}
        fragmentShader={GLOW_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ── Soft round-sprite texture (shared by dust) ───────────────────────────
function makeGlowTexture(): THREE.Texture {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

// ── Ambient light-dust — monochrome now ─────────────────────────────────
function Dust({ state, count, color }: { state: AssistantState; count: number; color: THREE.Color }) {
  const points = useRef<THREE.Points>(null);
  const tex = useMemo(makeGlowTexture, []);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 1.7 + Math.pow(Math.random(), 0.7) * 2.6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (!points.current) return;
    const drift = state === 'idle' ? 0.028 : 0.07;
    points.current.rotation.y += delta * drift;
    points.current.rotation.x = Math.sin(performance.now() / 12000) * 0.08;
    const m = points.current.material as THREE.PointsMaterial;
    m.color.lerp(color, 0.03);
    m.opacity = state === 'idle' ? 0.16 : 0.28;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={tex} size={0.12} transparent opacity={0.2} sizeAttenuation
        depthWrite={false} blending={THREE.AdditiveBlending} color={STATE_COLORS.idle}
      />
    </points>
  );
}

// ── Scene root ───────────────────────────────────────────────────────────
interface SceneProps {
  state: AssistantState;
  micLevel: number;
  activeAgents: { primary: AgentId[]; support: AgentId[] };
  quality: 'low' | 'medium' | 'high';
}

function Scene({ state, micLevel, activeAgents, quality }: SceneProps) {
  const color = useMemo(() => new THREE.Color(STATE_COLORS[state]), [state]);
  const dustCount = quality === 'low' ? 80 : quality === 'medium' ? 170 : 300;
  const shardCount = quality === 'low' ? 5 : 9;
  const light = useRef<THREE.PointLight>(null);

  useFrame(() => {
    if (light.current) {
      light.current.color.lerp(color, 0.06);
      light.current.intensity = 1.0 + micLevel * 0.8 + stateEnergy(state, micLevel) * 0.9;
    }
  });

  return (
    <group>
      <ambientLight intensity={0.35} />
      <pointLight ref={light} distance={16} intensity={1.2} />
      <Atmosphere state={state} micLevel={micLevel} color={color} />
      <Orb state={state} micLevel={micLevel} color={color} />
      <ChromeShards state={state} />
      <Dust state={state} count={dustCount} color={color} />
    </group>
  );
  void activeAgents;
  void shardCount;
}

export interface AICoreProps {
  state: AssistantState;
  micLevel?: number;
  activeAgents?: { primary: AgentId[]; support: AgentId[] };
  className?: string;
}

export default function AICore({ state, micLevel = 0, activeAgents = { primary: [], support: [] }, className }: AICoreProps) {
  const quality = useMemo(detectQuality, []);
  return (
    <div className={className} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 4.6], fov: 45 }}
        dpr={[1, quality === 'high' ? 2 : 1.5]}
        gl={{ antialias: quality !== 'low', alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
      >
        <Scene state={state} micLevel={micLevel} activeAgents={activeAgents} quality={quality} />
      </Canvas>
    </div>
  );
}
