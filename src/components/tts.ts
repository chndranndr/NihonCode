import { useSyncExternalStore } from "react";
import { createLogger } from "../observability/logger";

const log = createLogger("tts");

export interface TtsStatus {
  available: boolean;
  reason: string | null;
}

let cached: TtsStatus | null = null;
let voices: SpeechSynthesisVoice[] = [];
// Ignore late completion/error events from an utterance replaced by another playback.
let activeUtterance: SpeechSynthesisUtterance | null = null;

function detect(): TtsStatus {
  if (
    typeof window === "undefined" ||
    !window.speechSynthesis ||
    typeof SpeechSynthesisUtterance === "undefined"
  ) {
    return { available: false, reason: "Speech synthesis is unsupported in this browser." };
  }
  voices = window.speechSynthesis.getVoices().filter((v) => /^ja(?:[-_]|$)/i.test(v.lang));
  if (voices.length === 0) {
    return {
      available: false,
      reason:
        "No Japanese voice is installed. Add Japanese text-to-speech in your device settings, then restart the browser.",
    };
  }
  return { available: true, reason: null };
}

export function status(): TtsStatus {
  if (cached === null) cached = detect();
  return cached;
}

export function refresh(): TtsStatus {
  const next = detect();
  if (!cached || cached.available !== next.available || cached.reason !== next.reason)
    cached = next;
  return cached;
}

function subscribe(listener: () => void): () => void {
  const synthesis = typeof window === "undefined" ? undefined : window.speechSynthesis;
  if (!synthesis) return () => {};
  const changed = () => {
    refresh();
    listener();
  };
  synthesis.addEventListener("voiceschanged", changed);
  changed();
  return () => synthesis.removeEventListener("voiceschanged", changed);
}

export function useTtsStatus(): TtsStatus {
  return useSyncExternalStore(subscribe, status, status);
}

export function speak(text: string, onError?: (reason: string) => void): boolean {
  const availability = refresh();
  if (!availability.available) {
    log.warn("speak-unavailable", { reason: availability.reason });
    onError?.(availability.reason ?? "Japanese audio is unavailable.");
    return false;
  }
  const synthesis = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.voice = voices.find((voice) => voice.localService) ?? voices[0] ?? null;
  utterance.onend = () => {
    if (activeUtterance === utterance) activeUtterance = null;
  };
  utterance.onerror = (event) => {
    if (activeUtterance !== utterance) return;
    activeUtterance = null;
    if (event.error === "canceled" || event.error === "interrupted") return;
    log.warn("speak-failed", { error: event.error });
    onError?.("Japanese audio could not play. Tap the speaker to try again.");
  };
  try {
    synthesis.cancel();
    activeUtterance = utterance;
    synthesis.speak(utterance);
    return true;
  } catch (error) {
    activeUtterance = null;
    log.warn("speak-failed", { error: String(error) });
    onError?.("Japanese audio could not play. Tap the speaker to try again.");
    return false;
  }
}
