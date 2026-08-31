'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useApp, OrbState } from '@/lib/context';

function OrbCore({ state }: { state: OrbState }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);

  const colorMap: Record<OrbState, string> = {
    IDLE: '#00e5ff',
    LISTENING: '#00ff88',
    THINKING: '#ffaa00',
    SPEAKING: '#00e5ff',
    ERROR: '#ff3366',
  };

  const emissiveIntensity = useMemo(() => ({
    IDLE: 0.5,
    LISTENING: 1.2,
    THINKING: 0.8,
    SPEAKING: 1.5,
    ERROR: 1.0,
  }), []);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
      meshRef.current.rotation.x += delta * 0.1;
      const pulse = state === 'SPEAKING' ? Math.sin(Date.now() * 0.005) * 0.1 + 1 : 
                    state === 'LISTENING' ? Math.sin(Date.now() * 0.008) * 0.15 + 1 :
                    state === 'THINKING' ? Math.sin(Date.now() * 0.003) * 0.05 + 1 : 1;
      meshRef.current.scale.setScalar(pulse);
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * (state === 'THINKING' ? 1.5 : 0.5);
      ringRef.current.rotation.x += delta * 0.3;
    }
    if (innerRef.current) {
      innerRef.current.rotation.y -= delta * 0.8;
    }
  });

  const color = colorMap[state];

  return (
    <group>
      {/* Main sphere */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.2, 4]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity[state]}
          wireframe
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Inner core */}
      <mesh ref={innerRef}>
        <icosahedronGeometry args={[0.8, 2]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity[state] * 1.5}
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* Orbital ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[1.8, 0.03, 16, 100]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Second ring */}
      <mesh rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[2.0, 0.02, 16, 100]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          transparent
          opacity={0.5}
        />
      </mesh>

      {/* Glow */}
      <pointLight color={color} intensity={2} distance={10} />
      <pointLight color={color} intensity={0.5} distance={5} />
    </group>
  );
}

function Particles({ state }: { state: OrbState }) {
  const count = 200;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    return pos;
  }, []);

  const ref = useRef<THREE.Points>(null);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.05;
      const posArray = ref.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        posArray[i * 3 + 1] += Math.sin(Date.now() * 0.001 + i) * delta * 0.1;
      }
      ref.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  const color = state === 'IDLE' ? '#00e5ff' : state === 'ERROR' ? '#ff3366' : state === 'THINKING' ? '#ffaa00' : '#00ff88';

  return (      <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color={color} size={0.03} transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

export default function AIOrb() {
  const { orbState } = useApp();

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.2} />
        <OrbCore state={orbState} />
        <Particles state={orbState} />
      </Canvas>

      {/* CSS Fallback overlay for no WebGL */}
      <noscript>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 rounded-full border-2 border-cyan-400 animate-pulse" />
        </div>
      </noscript>
    </div>
  );
}
