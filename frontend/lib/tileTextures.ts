"use client";

import * as THREE from "three";

export type TileType =
  | "DOT_1" | "DOT_2" | "DOT_3" | "DOT_4" | "DOT_5" | "DOT_6" | "DOT_7" | "DOT_8" | "DOT_9"
  | "BAM_1" | "BAM_2" | "BAM_3" | "BAM_4" | "BAM_5" | "BAM_6" | "BAM_7" | "BAM_8" | "BAM_9"
  | "WAN_1" | "WAN_2" | "WAN_3" | "WAN_4" | "WAN_5" | "WAN_6" | "WAN_7" | "WAN_8" | "WAN_9"
  | "WIND_EAST" | "WIND_SOUTH" | "WIND_WEST" | "WIND_NORTH"
  | "DRAGON_RED" | "DRAGON_GREEN" | "DRAGON_WHITE"
  | "FLOWER_PLUM" | "FLOWER_ORCHID" | "FLOWER_CHRYSANTHEMUM" | "FLOWER_BAMBOO"
  | "SEASON_SPRING" | "SEASON_SUMMER" | "SEASON_AUTUMN" | "SEASON_WINTER";

export type TileCategory = "suit" | "honor" | "bonus";

const textureCache = new Map<string, THREE.CanvasTexture>();
const TEX_SIZE = 256;
const PALETTE = {
  tileBackground: "#fdf6e3",
  tileBorder: "#8b6f47",
  red: "#c0392b",
  green: "#27ae60",
  blue: "#2c3e50",
  gold: "#d4af37",
  bambooGreen: "#2e7d32",
  inkBlack: "#1a1a1a"
};

const WIND_CHARS: Record<string, string> = {
  WIND_EAST: "東",
  WIND_SOUTH: "南",
  WIND_WEST: "西",
  WIND_NORTH: "北"
};

const DRAGON_COLORS: Record<string, string> = {
  DRAGON_RED: PALETTE.red,
  DRAGON_GREEN: PALETTE.green,
  DRAGON_WHITE: "#fff"
};

const DRAGON_CHARS: Record<string, string> = {
  DRAGON_RED: "中",
  DRAGON_GREEN: "發",
  DRAGON_WHITE: "白"
};

const BONUS_LABELS: Record<string, string> = {
  FLOWER_PLUM: "梅",
  FLOWER_ORCHID: "蘭",
  FLOWER_CHRYSANTHEMUM: "菊",
  FLOWER_BAMBOO: "竹",
  SEASON_SPRING: "春",
  SEASON_SUMMER: "夏",
  SEASON_AUTUMN: "秋",
  SEASON_WINTER: "冬"
};

const NUMBER_CHARS = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];

export function getTileCategory(type: string): TileCategory {
  if (type.startsWith("DOT_") || type.startsWith("BAM_") || type.startsWith("WAN_")) return "suit";
  if (type.startsWith("WIND_") || type.startsWith("DRAGON_")) return "honor";
  return "bonus";
}

function createCanvas(): HTMLCanvasElement | null {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  return document.createElement("canvas");
}

function getFallbackCanvas(): HTMLCanvasElement {
  if (typeof document !== "undefined") {
    return document.createElement("canvas");
  }
  // SSR fallback - create a minimal mock
  return {
    width: 0,
    height: 0,
    getContext: () => null,
  } as unknown as HTMLCanvasElement;
}

export function generateTileTexture(tileName: string): THREE.CanvasTexture {
  if (textureCache.has(tileName)) return textureCache.get(tileName)!;

  const canvas = createCanvas();
  if (!canvas) {
    return new THREE.CanvasTexture(getFallbackCanvas());
  }

  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Draw background
  ctx.fillStyle = PALETTE.tileBackground;
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
  ctx.strokeStyle = PALETTE.tileBorder;
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, TEX_SIZE - 12, TEX_SIZE - 12);

  const value = parseInt(tileName.match(/(\d+)$/)?.[1] || "0", 10);
  const cat = getTileCategory(tileName);
  const center = TEX_SIZE / 2;

  ctx.fillStyle = PALETTE.inkBlack;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${center * 0.4}px serif`;

  if (cat === "honor") {
    if (tileName.startsWith("WIND_")) {
      const c = WIND_CHARS[tileName] || "";
      ctx.fillText(c, center, center);
    } else {
      ctx.fillStyle = DRAGON_COLORS[tileName] || "#555";
      ctx.fillRect(20, 20, TEX_SIZE - 40, TEX_SIZE - 40);
      ctx.fillStyle = PALETTE.gold;
      const ch = DRAGON_CHARS[tileName] || "";
      ctx.fillText(ch, center, center);
    }
  } else if (cat === "bonus") {
    const label = BONUS_LABELS[tileName] || "";
    ctx.fillText(label, center, center);
  } else {
    const color = tileName.startsWith("DOT_")
      ? PALETTE.red
      : tileName.startsWith("BAM_")
        ? PALETTE.bambooGreen
        : PALETTE.blue;
    ctx.fillStyle = color;
    ctx.fillText(NUMBER_CHARS[value - 1] || "?", center, center);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  textureCache.set(tileName, tex);
  return tex;
}

export function getTileBackTexture(): THREE.CanvasTexture {
  const canvas = createCanvas();
  if (!canvas) {
    return new THREE.CanvasTexture(getFallbackCanvas());
  }

  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = "#1f6e3a";
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
  ctx.strokeStyle = "#16432a";
  ctx.lineWidth = 2;
  for (let i = 32; i < TEX_SIZE; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, TEX_SIZE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(TEX_SIZE, i);
    ctx.stroke();
  }
  ctx.strokeStyle = "#0e2a18";
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, TEX_SIZE - 8, TEX_SIZE - 8);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}