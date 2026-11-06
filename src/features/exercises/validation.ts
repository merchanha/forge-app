import { z } from "zod";

export const movementCategories = [
  "olympic",
  "strength",
  "gymnastics",
  "conditioning",
  "monostructural",
  "mobility",
  "other",
] as const;

export const movementCategorySchema = z.enum(movementCategories);

export type MovementCategory = z.infer<typeof movementCategorySchema>;

export const movementCategoryLabels: Record<MovementCategory, string> = {
  olympic: "Olympic",
  strength: "Strength",
  gymnastics: "Gymnastics",
  conditioning: "Conditioning",
  monostructural: "Monostructural",
  mobility: "Mobility",
  other: "Other",
};

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com"]);

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{6,12}$/;

function isYouTubeVideoPath(url: URL): boolean {
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (path === "/watch") {
    const id = url.searchParams.get("v");
    return id !== null && YOUTUBE_ID.test(id);
  }

  const match = path.match(/^\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})$/);
  return match !== null;
}

export function isAllowedDemoUrl(value: string): boolean {
  if (value.length === 0 || value.length > 300) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== "https:") {
    return false;
  }
  if (url.username !== "" || url.password !== "") {
    return false;
  }
  if (url.port !== "") {
    return false;
  }

  const host = url.hostname.toLowerCase();

  if (host === "youtu.be") {
    const id = url.pathname.replace(/^\/+|\/+$/g, "");
    return YOUTUBE_ID.test(id);
  }

  if (YOUTUBE_HOSTS.has(host)) {
    return isYouTubeVideoPath(url);
  }

  if (host === "player.vimeo.com") {
    return /^\/video\/\d{6,12}\/?$/.test(url.pathname);
  }

  if (VIMEO_HOSTS.has(host)) {
    const segments = url.pathname.split("/").filter(Boolean);
    const last = segments.at(-1);
    return last !== undefined && VIMEO_ID.test(last);
  }

  return false;
}

const demoUrlSchema = z
  .string()
  .trim()
  .max(300, "Demo link must be 300 characters or fewer")
  .refine(
    (value) => value === "" || isAllowedDemoUrl(value),
    "Use an https YouTube or Vimeo link",
  )
  .transform((value) => (value === "" ? null : value));

export const exerciseInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(80, "Name must be 80 characters or fewer"),
  description: z
    .string()
    .trim()
    .max(500, "Description must be 500 characters or fewer"),
  movementCategory: movementCategorySchema,
  equipment: z
    .string()
    .trim()
    .min(1, "Equipment is required")
    .max(40, "Equipment must be 40 characters or fewer"),
  demoUrl: demoUrlSchema,
});

export const exerciseIdSchema = z.uuid("Exercise not found.");

export const deleteExerciseSchema = z.object({
  id: exerciseIdSchema,
  confirmDelete: z
    .string()
    .refine((value) => value === "yes", "Confirm before deleting."),
});

export type ExerciseInput = z.infer<typeof exerciseInputSchema>;
