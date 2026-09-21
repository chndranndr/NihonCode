import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SpeakerButton } from "./SpeakerButton";
import { speak, status } from "./tts";

/**
 * jsdom has no speechSynthesis, which is exactly the TTS-unavailable path the
 * design contract requires: a visible disabled state, and text study that
 * never blocks.
 */
describe("tts service", () => {
  it("reports unavailable without speech synthesis", () => {
    expect(status().available).toBe(false);
    expect(status().reason).toContain("unsupported");
  });

  it("speak returns false instead of throwing when unavailable", () => {
    expect(speak("みず")).toBe(false);
  });
});

describe("SpeakerButton unavailable state", () => {
  it("renders a disabled button with the reason when TTS cannot run", () => {
    const html = renderToStaticMarkup(<SpeakerButton text="みず" label="prompt" />);
    expect(html).toContain("disabled");
    expect(html).toContain("audio unavailable");
  });
});
