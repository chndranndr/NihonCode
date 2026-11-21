import { useId, useState } from "react";
import { speak, useTtsStatus } from "./tts";

export function SpeakerButton({ text, label }: { text: string; label: string }) {
  const tts = useTtsStatus();
  const descriptionId = useId();
  const [error, setError] = useState<{ text: string; reason: string } | null>(null);
  const reason = tts.available ? (error?.text === text ? error.reason : null) : tts.reason;
  const visibleLabel = tts.available ? "Listen" : "Audio unavailable";

  return (
    <>
      <button
        type="button"
        className={`speaker${tts.available ? "" : " speaker-unavailable"}`}
        disabled={!tts.available}
        title={reason ?? "Play Japanese pronunciation"}
        aria-label={`${visibleLabel}: ${label}`}
        aria-describedby={reason ? descriptionId : undefined}
        onClick={() => {
          setError(null);
          speak(text, (message) => setError({ text, reason: message }));
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M11 4 5 9H2v6h3l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>{visibleLabel}</span>
      </button>
      {reason && (
        <p id={descriptionId} className="micro-label speaker-status" role="status">
          {reason}
        </p>
      )}
    </>
  );
}
