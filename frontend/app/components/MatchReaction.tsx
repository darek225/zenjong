import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, MeshBasicMaterial } from "three";
import type { SolitaireTile } from "../../lib/solitaire";

function Ring({ tile, color }: { tile: SolitaireTile; color: string }) {
  const ref = useRef<Mesh>(null);
  const age = useRef(0);
  useFrame((_, delta) => {
    age.current += delta;
    if (!ref.current) return;
    ref.current.visible = age.current < 0.6;
    ref.current.scale.setScalar(1 + age.current * 1.5);
    (ref.current.material as MeshBasicMaterial).opacity = Math.max(0, 0.5 - age.current);
  });
  return <mesh ref={ref} position={[tile.x * 0.88, 0.3 + tile.layer * 0.52, tile.z * 1.16]} rotation={[-Math.PI / 2, 0, 0]}>
    <ringGeometry args={[0.28, 0.32, 24]} /><meshBasicMaterial color={color} transparent depthWrite={false} />
  </mesh>;
}
export default function MatchReaction({ tiles, color = "#b6ffe2" }: { tiles: SolitaireTile[]; color?: string }) {
  return <group>{tiles.map(tile => <Ring key={tile.id} tile={tile} color={color} />)}</group>;
}