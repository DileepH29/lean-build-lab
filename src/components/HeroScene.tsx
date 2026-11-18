import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const NODE_COUNT = 14;
const CYAN = new THREE.Color("#5ee0f2");
const VIOLET = new THREE.Color("#8b6cf0");

function Core() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, d) => {
    if (ref.current) {
      ref.current.rotation.y += Math.min(d, 0.05) * 0.25;
      ref.current.rotation.x += Math.min(d, 0.05) * 0.1;
    }
  });
  return (
    <group>
      <mesh ref={ref}>
        <icosahedronGeometry args={[1.1, 1]} />
        <meshStandardMaterial color={CYAN} wireframe emissive={CYAN} emissiveIntensity={0.6} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshStandardMaterial color="#1a2140" emissive={VIOLET} emissiveIntensity={0.12} roughness={0.3} metalness={0.6} />
      </mesh>
    </group>
  );
}

function Network() {
  const group = useRef<THREE.Group>(null);
  const nodes = useMemo(() => {
    return Array.from({ length: NODE_COUNT }, (_, i) => {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / NODE_COUNT);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 2.4 + (i % 3) * 0.35;
      return new THREE.Vector3(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi) * 0.7, r * Math.sin(phi) * Math.sin(theta));
    });
  }, []);
  const lines = useMemo(() => {
    const pts: number[] = [];
    nodes.forEach((n, i) => {
      pts.push(0, 0, 0, n.x, n.y, n.z);
      const m = nodes[(i + 3) % nodes.length];
      pts.push(n.x, n.y, n.z, m.x, m.y, m.z);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [nodes]);
  useFrame((s, d) => {
    if (group.current) {
      group.current.rotation.y += Math.min(d, 0.05) * 0.08;
      group.current.rotation.z = Math.sin(s.clock.elapsedTime * 0.2) * 0.08;
    }
  });
  return (
    <group ref={group}>
      <lineSegments geometry={lines}>
        <lineBasicMaterial color={CYAN} transparent opacity={0.18} />
      </lineSegments>
      {nodes.map((p, i) => (
        <mesh key={i} position={p}>
          <boxGeometry args={[0.14, 0.19, 0.01]} />
          <meshStandardMaterial color={i % 4 === 0 ? VIOLET : CYAN} emissive={i % 4 === 0 ? VIOLET : CYAN} emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function Particles() {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const arr = new Float32Array(600 * 3);
    for (let i = 0; i < arr.length; i++) arr[i] = (Math.sin(i * 12.9898) * 43758.5453) % 1 * 14;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);
  useFrame((_, d) => {
    if (ref.current) ref.current.rotation.y -= Math.min(d, 0.05) * 0.02;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.025} color="#9fdcff" transparent opacity={0.6} />
    </points>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0.6, 9.5], fov: 45 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => gl.domElement.parentElement?.setAttribute("data-scene-ready", "")}
    >
      <ambientLight intensity={0.4} />
      <pointLight position={[4, 4, 4]} intensity={14} color="#5ee0f2" />
      <pointLight position={[-4, -2, 2]} intensity={8} color="#8b6cf0" />
      <Core />
      <Network />
      <Particles />
    </Canvas>
  );
}
