import { speak, status } from "./tts";

/**
 * Speaker button with the binding unavailable state: when TTS cannot run, the
 * button renders a visible disabled state and never blocks text study.
 */
export function SpeakerButton({ text, label }: { text: string; label: string }) {
  const tts = status();
  if (!tts.available) {
    return (
      <button
        type="button"
        className="speaker speaker-unavailable"
        disabled
        title={tts.reason ?? "audio unavailable"}
        aria-label={`${label}: audio unavailable`}
      >
        N/A
      </button>
    );
  }
  return (
    <button
      type="button"
      className="speaker"
      onClick={() => speak(text)}
      aria-label={`${label}: play pronunciation`}
    >
      TTS
    </button>
  );
}
