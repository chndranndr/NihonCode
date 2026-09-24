/**
 * Runtime asset resolution for the clean pool (data-recon 2026-09-23). JSON
 * keeps remote URLs as provenance; the app renders and plays local files
 * only. Vite emits every matched file as a build asset, so production builds
 * carry the media with no external requests.
 */

const AUDIO = import.meta.glob("/data/clean/audio/**", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const IMAGES = import.meta.glob("/data/clean/images/**", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const ASSETS: Record<string, string> = { ...AUDIO, ...IMAGES };

/** Resolve a pool-relative local path ("audio/n5/…", "images/n5/…") to a
 * served URL. Null when the asset is not bundled — the gate flags those. */
export function assetUrl(localPath: string): string | null {
  return ASSETS[`/data/clean/${localPath}`] ?? null;
}
