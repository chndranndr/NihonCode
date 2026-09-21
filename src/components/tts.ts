/**
 * TTS service: Web Speech API with Japanese-voice detection and a visible
 * unavailable fallback (DEVELOPMENT_PROMPT.md task 9). Text study never blocks
 * on audio: every speaker surface checks status().available first. Lives in
 * components/ because every feature with a speaker consumes it and features
 * must not import across each other.
 */

import { createLogger } from "../observability/logger";

const log = createLogger("tts");

export interface TtsStatus {
  available: boolean;
  reason: string | null;
}

let cached: TtsStatus | null = null;
let voices: SpeechSynthesisVoice[] = [];

function detect(): TtsStatus {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return { available: false, reason: "speech synthesis unsupported in this browser" };
  }
  voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("ja"));
  if (voices.length === 0) {
    return { available: false, reason: "no Japanese voice installed" };
  }
  return { available: true, reason: null };
}

export function status(): TtsStatus {
  if (cached === null) cached = detect();
  return cached;
}

/** Re-probe after voice loading (voices arrive asynchronously in some browsers). */
export function refresh(): TtsStatus {
  cached = detect();
  return cached;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    refresh();
  });
}

export function speak(text: string): boolean {
  const s = status();
  if (!s.available) {
    log.warn("speak-unavailable", { reason: s.reason });
    return false;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.voice = voices[0] ?? null;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}
