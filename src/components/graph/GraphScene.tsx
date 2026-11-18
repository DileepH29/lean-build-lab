import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { GNode, GraphData } from "@/lib/graph-data";

const COLORS: Record<string, string> = {
  center: "#5ee0f2", reference: "#8b6cf0", citing: "#4fd1a5", claim: "#f5f5f5",
  SUPPORTED: "#4fd1a5", PARTIALLY_SUPPORTED: "#f0c75e", UNSUPPORTED: "#e89a5b", CONTRADICTED: "#f0605e", UNVERIFIABLE: "#8b93a7",
};

function layout(data: GraphData, claim?: GNode) {
  const pos = new Map<string, THREE.Vector3>();
  pos.set(data.center.id, new THREE.Vector3(0, 0, 0));
  const place = (list: GNode[], r: number, yBias: number) =>
    list.forEach((n, i) => {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / Math.max(list.length, 1));
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const rr = r + (i % 3) * 0.5;
      pos.set(n.id, new THREE.Vector3(rr * Math.sin(phi) * Math.cos(theta), rr * Math.cos(phi) * 0.6 + yBias, rr * Math.sin(phi) * Math.sin(theta)));
    });
  place(data.nodes.filter((n) => n.kind === "reference"), 4.2, -0.8);
  place(data.nodes.filter((n) => n.kind === "citing"), 7, 0.8);
  if (claim) pos.set(claim.id, new THREE.Vector3(0, 2.4, 0));
  return pos;
}

function Node({ n, p, selected, dim, onSelect }: { n: GNode; p: THREE.Vector3; selected: boolean; dim: boolean; onSelect: (n: GNode) => void }) {
  const ref = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState(false);
  const size = n.kind === "center" ? 0.55 : n.kind === "claim" ? 0.32 : 0.12 + Math.min(0.32, Math.log10(n.cited + 1) * 0.07);
  const color = COLORS[n.kind === "claim" ? n.status ?? "claim" : n.kind];
  useFrame((s) => {
    if (ref.current && (selected || n.kind === "center")) ref.current.scale.setScalar(1 + Math.sin(s.clock.elapsedTime * 2.5) * 0.08);
  });
  return (
    <mesh
      ref={ref}
      position={p}
      onClick={(e) => { e.stopPropagation(); onSelect(n); }}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = ""; }}
    >
      {n.kind === "claim" ? <octahedronGeometry args={[size, 0]} /> : <sphereGeometry args={[size, 20, 20]} />}
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={selected || hover ? 1.1 : 0.45} transparent opacity={dim ? 0.15 : 1} />
      {(hover || selected) && (
        <Html distanceFactor={10} position={[0, size + 0.25, 0]} center style={{ pointerEvents: "none" }}>
          <div className="w-56 rounded-lg border bg-popover/95 px-2.5 py-1.5 text-[11px] leading-snug text-popover-foreground shadow-lg">
            {n.title.slice(0, 110)}{n.year ? ` (${n.year})` : ""}
          </div>
        </Html>
      )}
    </mesh>
  );
}

function Edges({ data, pos, claim, focus }: { data: GraphData; pos: Map<string, THREE.Vector3>; claim?: GNode; focus: Set<string> | null }) {
  const geo = useMemo(() => {
    const arr: number[] = [];
    const col: number[] = [];
    const c = new THREE.Color();
    for (const e of data.edges) {
      const a = pos.get(e.a), b = pos.get(e.b);
      if (!a || !b) continue;
      const on = !focus || (focus.has(e.a) && focus.has(e.b));
      const isCenter = e.a === data.center.id || e.b === data.center.id;
      c.set(isCenter ? "#5ee0f2" : "#8b6cf0").multiplyScalar(on ? (isCenter ? 0.55 : 0.35) : 0.06);
      arr.push(a.x, a.y, a.z, b.x, b.y, b.z);
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    return g;
  }, [data, pos, focus]);
  const claimLine = useMemo(() => {
    if (!claim) return null;
    const g = new THREE.BufferGeometry().setFromPoints([pos.get(claim.id)!, pos.get(data.center.id)!]);
    return g;
  }, [claim, pos, data.center.id]);
  return (
    <>
      <lineSegments geometry={geo}><lineBasicMaterial vertexColors transparent opacity={0.9} /></lineSegments>
      {claimLine && claim && (
        <lineSegments geometry={claimLine}>
          <lineDashedMaterial color={COLORS[claim.status ?? "claim"]} dashSize={0.15} gapSize={0.1} />
        </lineSegments>
      )}
    </>
  );
}

export default function GraphScene({ data, claim, selected, onSelect, match, show }: {
  data: GraphData; claim?: GNode; selected: string | null; onSelect: (n: GNode | null) => void; match: string; show: { reference: boolean; citing: boolean };
}) {
  const pos = useMemo(() => layout(data, claim), [data, claim]);
  const all = claim ? [...data.nodes, claim] : data.nodes;
  const visible = all.filter((n) => n.kind === "center" || n.kind === "claim" || show[n.kind as "reference" | "citing"]);
  const q = match.trim().toLowerCase();
  const focus = useMemo(() => {
    if (selected) {
      const s = new Set([selected]);
      data.edges.forEach((e) => { if (e.a === selected) s.add(e.b); if (e.b === selected) s.add(e.a); });
      return s;
    }
    return null;
  }, [selected, data.edges]);
  return (
    <Canvas camera={{ position: [0, 3, 14], fov: 50 }} dpr={[1, 1.75]} onPointerMissed={() => onSelect(null)} onCreated={({ gl }) => gl.domElement.parentElement?.setAttribute("data-scene-ready", "")}>
      <ambientLight intensity={0.5} />
      <pointLight position={[6, 6, 6]} intensity={40} color="#5ee0f2" />
      <pointLight position={[-6, -4, 3]} intensity={25} color="#8b6cf0" />
      <Edges data={{ ...data, edges: data.edges.filter((e) => visible.some((n) => n.id === e.a) && visible.some((n) => n.id === e.b)) }} pos={pos} claim={claim} focus={focus} />
      {visible.map((n) => {
        const p = pos.get(n.id);
        if (!p) return null;
        const dim = (q && !n.title.toLowerCase().includes(q)) || (focus ? !focus.has(n.id) && n.kind !== "claim" : false);
        return <Node key={n.id} n={n} p={p} selected={selected === n.id} dim={Boolean(dim)} onSelect={onSelect} />;
      })}
      <OrbitControls enableDamping makeDefault autoRotate={!selected} autoRotateSpeed={0.4} minDistance={4} maxDistance={30} />
    </Canvas>
  );
}
