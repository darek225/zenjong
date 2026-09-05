"use client";

export type MapTheme = {
  id: string;
  name: string;
  description: string;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    table: string;
  };
  ambientColor: string;
  sunColor: string;
  sunIntensity: number;
  sunPosition: [number, number, number];
  tableColor: string;
  tableType: "pagoda" | "stump" | "altar" | "parlor";
  fogColor: string;
  fogIntensity: number;
  hasProps: boolean;
  hasFlames?: boolean;
  hasSpotlights?: boolean;
};

export const ENVIRONMENTS: MapTheme[] = [
  {
    id: "classic_green", name: "Jade Lantern Pavilion",
    description: "Warm lanterns, grained wooden floors and ivory screens around classic green felt.",
    palette: { primary: "#e6d3a7", secondary: "#8b7156", accent: "#e9bc70", background: "#625348", table: "#513325" },
    ambientColor: "#fff1d6", sunColor: "#fff1d6", sunIntensity: 0.8, sunPosition: [5, 10, 5],
    tableColor: "#1b4d2e", tableType: "pagoda", fogColor: "#625348", fogIntensity: 0.02, hasProps: true,
  },
  {
    id: "cyberpunk", name: "Neon Skyline Lounge",
    description: "Brushed metal decking, cyan light columns and luminous architectural screens.",
    palette: { primary: "#55eaff", secondary: "#697b94", accent: "#55eaff", background: "#173044", table: "#223442" },
    ambientColor: "#a4dfff", sunColor: "#c4eaff", sunIntensity: 0.8, sunPosition: [5, 10, 5],
    tableColor: "#1b4d2e", tableType: "parlor", fogColor: "#173044", fogIntensity: 0.02, hasProps: true,
  },
  {
    id: "temple_courtyard",
    name: "Ancient Temple Courtyard",
    description: "A serene marble courtyard surrounded by ancient pagoda pillars and drifting incense.",
    palette: {
      primary: "#e6d3a7",
      secondary: "#8b7d6b",
      accent: "#cfa15d",
      background: "#1a1a2e",
      table: "#f5f5dc",
    },
    ambientColor: "#ffffff33",
    sunColor: "#fff1b2",
    sunIntensity: 0.8,
    sunPosition: [5, 10, 5],
    tableColor: "#f5f5dc",
    tableType: "pagoda",
    fogColor: "#1a1a2e",
    fogIntensity: 0.3,
    hasProps: true,
  },
  {
    id: "nature_stump",
    name: "Enchanted Nature Stump",
    description: "A magical clearing with a towering wooden stump table and glowing moss.",
    palette: {
      primary: "#2e7d32",
      secondary: "#81c784",
      accent: "#a5d6a7",
      background: "#0d2818",
      table: "#5d4037",
    },
    ambientColor: "#4caf5044",
    sunColor: "#81c784",
    sunIntensity: 0.6,
    sunPosition: [3, 8, -3],
    tableColor: "#5d4037",
    tableType: "stump",
    fogColor: "#0d2818",
    fogIntensity: 0.5,
    hasProps: true,
  },
  {
    id: "mystic_sanctuary",
    name: "Mystic Sanctuary Altar",
    description: "A sacred chamber with a black marble altar and flickering violet flames.",
    palette: {
      primary: "#6a1b9a",
      secondary: "#9c27b0",
      accent: "#ba68c8",
      background: "#27272c",
      table: "#424242",
    },
    ambientColor: "#9c27b055",
    sunColor: "#d1c4e9",
    sunIntensity: 0.7,
    sunPosition: [-5, 7, 5],
    tableColor: "#424242",
    tableType: "altar",
    fogColor: "#27272c",
    fogIntensity: 0.4,
    hasProps: true,
    hasFlames: true,
  },
  {
    id: "spotlight_parlor",
    name: "Spotlight Parlor",
    description: "An elegant study with golden spotlights and a polished lacquer table.",
    palette: {
      primary: "#ffd54f",
      secondary: "#ffc107",
      accent: "#ffeb3b",
      background: "#1a1a1a",
      table: "#8d6e63",
    },
    ambientColor: "#fff17655",
    sunColor: "#fff176",
    sunIntensity: 0.9,
    sunPosition: [0, 12, 0],
    tableColor: "#8d6e63",
    tableType: "parlor",
    fogColor: "#1a1a1a",
    fogIntensity: 0.2,
    hasProps: false,
    hasSpotlights: true,
  },
];

export function getEnvironmentById(id: string): MapTheme | undefined {
  return ENVIRONMENTS.find((env) => env.id === id);
}