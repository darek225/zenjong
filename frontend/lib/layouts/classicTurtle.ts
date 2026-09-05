export interface TilePosition {
  id: string;
  x: number;
  y: number;
  z: number;
  layer: number;
  rotation: [number, number, number];
}

export interface LayoutDefinition {
  id: string;
  name: string;
  description: string;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "EXPERT";
  tileCount: number;
  icon: string;
  getPositions: () => TilePosition[];
}

export function generateClassicTurtle(): TilePosition[] {
  const positions: TilePosition[] = [];
  let tileId = 0;

  // Layer 0 (base) - 12x6 = 72 tiles
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 12; col++) {
      if ((row === 0 || row === 5) && (col === 0 || col === 11)) continue;
      positions.push({
        id: `tile-${tileId++}`,
        x: (col - 5.5) * 1.2,
        y: 0,
        z: (row - 2.5) * 1.2,
        layer: 0,
        rotation: [0, 0, 0],
      });
    }
  }

  // Layer 1 - 10x4 = 40 tiles
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 10; col++) {
      positions.push({
        id: `tile-${tileId++}`,
        x: (col - 4.5) * 1.2,
        y: 0.5,
        z: (row - 1.5) * 1.2,
        layer: 1,
        rotation: [0, 0, 0],
      });
    }
  }

  // Layer 2 - 8x2 = 16 tiles
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 8; col++) {
      positions.push({
        id: `tile-${tileId++}`,
        x: (col - 3.5) * 1.2,
        y: 1.0,
        z: (row - 0.5) * 1.2,
        layer: 2,
        rotation: [0, 0, 0],
      });
    }
  }

  // Layer 3 - 6x1 = 6 tiles
  for (let col = 0; col < 6; col++) {
    positions.push({
      id: `tile-${tileId++}`,
      x: (col - 2.5) * 1.2,
      y: 1.5,
      z: 0,
      layer: 3,
      rotation: [0, 0, 0],
    });
  }

  // Layer 4 (top) - 2x1 = 2 tiles
  positions.push({ id: `tile-${tileId++}`, x: -0.6, y: 2.0, z: 0, layer: 4, rotation: [0, 0, 0] });
  positions.push({ id: `tile-${tileId++}`, x: 0.6, y: 2.0, z: 0, layer: 4, rotation: [0, 0, 0] });

  return positions;
}