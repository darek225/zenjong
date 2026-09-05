export interface MapLayout {
  id: string;
  name: string;
  description: string;
  tileCount: number;
  difficulty: "easy" | "medium" | "hard" | "expert";
}

export const LAYOUTS: MapLayout[] = [
  { id: "temple_courtyard", name: "Temple Courtyard", description: "Ancient stone tiles amidst serene garden courtyards", tileCount: 144, difficulty: "medium" },
  { id: "nature_stump", name: "Nature Stump", description: "Rustic wooden setting with forest ambience", tileCount: 144, difficulty: "easy" },
  { id: "mystic_sanctuary", name: "Mystic Sanctuary", description: "Ethereal floating islands with crystal formations", tileCount: 144, difficulty: "hard" },
  { id: "zen_parlor", name: "Zen Parlor", description: "Minimalist tea house with tranquil garden views", tileCount: 144, difficulty: "expert" },
];

export function getLayoutById(id: string): MapLayout | undefined {
  return LAYOUTS.find((layout) => layout.id === id);
}

export function getLayoutsByDifficulty(difficulty: string): MapLayout[] {
  return LAYOUTS.filter((layout) => layout.difficulty === difficulty);
}