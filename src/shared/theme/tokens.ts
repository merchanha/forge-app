/**
 * FORGE design tokens derived from design/FORGE.html visual system.
 * CSS variables in globals.css are the runtime source of truth for styling;
 * this module mirrors them for typed usage in TypeScript.
 */

export const forgeColors = {
  accent: "#FF5A1F",
  ground: "#0C0C0E",
  surface: "#16161A",
  raised: "#1F1F25",
  border: "#2A2A32",
  text: "#F4F2EE",
  muted: "#A8A6AE",
  success: "#7BE0A4",
  successSurface: "#12301F",
  work: "#FF5A1F",
  rest: "#4CC3E8",
  done: "#F4F2EE",
  lightAccent: "#C93C06",
  lightSurface: "#FFFFFF",
  lightText: "#15151A",
  lightMuted: "#5C5A62",
  lightBorder: "#D9D5CD",
} as const;

export const forgeRadii = {
  md: "12px",
  lg: "20px",
  xl: "28px",
  pill: "9999px",
} as const;

export const forgeSpacing = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  6: "24px",
} as const;

export const forgeTapTargetMinPx = 48;
