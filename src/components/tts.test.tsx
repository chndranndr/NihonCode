import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const japaneseVoice: SpeechSynthesisVoice = {
  name: "Japanese",
  lang: "ja-JP",
  voiceURI: "Japanese",
  default: false,
  localService: true,
};
const englishVoice: SpeechSynthesisVoice = { ...japaneseVoice, name: "English", lang: "en-US" };

class Utterance {
  lang = "";
  voice: SpeechSynthesisVoice | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  constructor(public text: string) {}
}

function installSpeech(voices: SpeechSynthesisVoice[] = []) {
  const engine = Object.assign(new EventTarget(), {
    getVoices: vi.fn(() => voices),
    cancel: vi.fn(),
    speak: vi.fn<(utterance: Utterance) => void>(),
  });
  vi.stubGlobal("speechSynthesis", engine);
  vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
  return engine;
}

beforeEach(() => vi.resetModules());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("tts service", () => {
  it("reports unavailable without speech synthesis", async () => {
    const { status, speak } = await import("./tts");
    expect(status().available).toBe(false);
    expect(status().reason).toContain("unsupported");
    expect(speak("みず")).toBe(false);
  });

  it("does not use an English voice for Japanese pronunciation", async () => {
    const engine = installSpeech([englishVoice]);
    const { status, speak } = await import("./tts");
    expect(status().available).toBe(false);
    expect(status().reason).toContain("Japanese voice");
    expect(speak("一")).toBe(false);
    expect(engine.speak).not.toHaveBeenCalled();
  });

  it("speaks kanji with a Japanese voice and replaces previous playback", async () => {
    const engine = installSpeech([englishVoice, japaneseVoice]);
    const { speak } = await import("./tts");
    expect(speak("一")).toBe(true);
    const utterance = engine.speak.mock.calls[0][0];
    expect(utterance.text).toBe("一");
    expect(utterance.lang).toBe("ja-JP");
    expect(utterance.voice).toBe(japaneseVoice);
    expect(engine.cancel).toHaveBeenCalledOnce();
    expect(engine.cancel.mock.invocationCallOrder[0]).toBeLessThan(
      engine.speak.mock.invocationCallOrder[0],
    );
  });

  it("rechecks voices before playback instead of keeping an unavailable cache", async () => {
    const engine = installSpeech();
    const { speak, status } = await import("./tts");
    expect(status().available).toBe(false);
    engine.getVoices.mockReturnValue([japaneseVoice]);
    expect(speak("一")).toBe(true);
    expect(engine.speak.mock.calls[0][0].voice).toBe(japaneseVoice);
  });
});

describe("SpeakerButton", () => {
  it("shows a visible reason rather than N/A when speech is unavailable", async () => {
    const { SpeakerButton } = await import("./SpeakerButton");
    render(<SpeakerButton text="一" label="prompt" />);
    expect(
      screen.getByRole("button", { name: /audio unavailable/i }).hasAttribute("disabled"),
    ).toBe(true);
    expect(screen.getByRole("status").textContent).toContain("unsupported");
    expect(screen.queryByText("N/A")).toBeNull();
  });

  it("enables the mounted button when Japanese voices finish loading", async () => {
    const engine = installSpeech();
    const { SpeakerButton } = await import("./SpeakerButton");
    render(<SpeakerButton text="一" label="prompt" />);
    expect(screen.getByRole("button").hasAttribute("disabled")).toBe(true);
    act(() => {
      engine.getVoices.mockReturnValue([japaneseVoice]);
      engine.dispatchEvent(new Event("voiceschanged"));
    });
    const button = screen.getByRole("button", { name: "Listen: prompt" });
    expect(button.hasAttribute("disabled")).toBe(false);
    fireEvent.click(button);
    expect(engine.speak.mock.calls[0][0].text).toBe("一");
  });

  it("disables the button if the Japanese voice disappears", async () => {
    const engine = installSpeech([japaneseVoice]);
    const { SpeakerButton } = await import("./SpeakerButton");
    render(<SpeakerButton text="一" label="prompt" />);
    act(() => {
      engine.getVoices.mockReturnValue([englishVoice]);
      engine.dispatchEvent(new Event("voiceschanged"));
    });
    expect(
      screen.getByRole("button", { name: /audio unavailable/i }).hasAttribute("disabled"),
    ).toBe(true);
    expect(screen.getByRole("status").textContent).toContain("Japanese voice");
  });

  it("removes the voice subscription when the button unmounts", async () => {
    const engine = installSpeech([japaneseVoice]);
    const removeListener = vi.spyOn(engine, "removeEventListener");
    const { SpeakerButton } = await import("./SpeakerButton");
    const { unmount } = render(<SpeakerButton text="一" label="prompt" />);
    unmount();
    expect(removeListener).toHaveBeenCalledWith("voiceschanged", expect.any(Function));
  });

  it("reports synthesis errors and allows another attempt", async () => {
    const engine = installSpeech([japaneseVoice]);
    const { SpeakerButton } = await import("./SpeakerButton");
    render(<SpeakerButton text="一" label="prompt" />);
    const button = screen.getByRole("button", { name: "Listen: prompt" });
    fireEvent.click(button);
    act(() => engine.speak.mock.calls[0][0].onerror?.({ error: "synthesis-failed" }));
    expect(screen.getByRole("status").textContent).toMatch(/could not play/i);
    fireEvent.click(button);
    expect(engine.speak).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/could not play/i)).toBeNull();
  });

  it("does not report intentional cancellation as an error", async () => {
    const engine = installSpeech([japaneseVoice]);
    const { SpeakerButton } = await import("./SpeakerButton");
    render(<SpeakerButton text="一" label="prompt" />);
    const button = screen.getByRole("button", { name: "Listen: prompt" });
    fireEvent.click(button);
    const first = engine.speak.mock.calls[0][0];
    fireEvent.click(button);
    act(() => first.onerror?.({ error: "interrupted" }));
    expect(screen.queryByText(/could not play/i)).toBeNull();
  });

  it("does not submit a drill answer when Enter activates pronunciation", async () => {
    installSpeech([japaneseVoice]);
    const { DrillSession } = await import("./DrillSession");
    render(
      <DrillSession
        title="SRS REVIEW"
        items={[
          {
            id: "kanji:n5:一",
            prompt: "一",
            accepted: ["いち"],
            ask: "reading in kana or romaji",
            reveal: { scripts: ["一", "いち"], meaning: "one", group: "srs review" },
            speakText: "一",
          },
        ]}
        onFinish={vi.fn()}
        onAbort={vi.fn()}
      />,
    );
    fireEvent.keyDown(screen.getByRole("button", { name: "Listen: prompt" }), {
      key: "Enter",
    });
    expect(screen.queryByTestId("reveal")).toBeNull();
  });
});
