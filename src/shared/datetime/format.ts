/**
 * Pure UTC display helpers for Server Components.
 * Avoid `Date` / `toLocale*` during Cache Components prerender.
 */

export function formatUtcDate(iso: string): string {
  if (iso.length < 10) {
    return iso;
  }
  return iso.slice(0, 10);
}

export function formatUtcDateTime(iso: string): string {
  if (iso.length < 16) {
    return formatUtcDate(iso);
  }
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

/** Wall-clock ms after `await io()` / request-time auth — avoids `Date.now()` traps. */
export function requestWallClockMs(): number {
  return performance.timeOrigin + performance.now();
}

export function wallClockToIso(ms: number): string {
  return new Date(ms).toISOString();
}
