/** A small synthesized "ding" for notifications. No audio file needed. */
let context: AudioContext | null = null;
let enabled = true;

function getContext() {
  if (context) return context;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    context = new Ctor();
  } catch {
    context = null;
  }
  return context;
}

/** Browsers only allow sound after a tap or key press, so the first one wakes the audio up. */
export function unlockAudio() {
  const ctx = getContext();
  if (ctx && ctx.state === "suspended") void ctx.resume().catch(() => {});
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

export function ding() {
  if (!enabled) return;
  const ctx = getContext();
  if (!ctx || ctx.state !== "running") return;
  const start = ctx.currentTime + 0.01;
  // two quick bell tones: E6 then A6
  [
    { freq: 1318.5, at: 0 },
    { freq: 1760, at: 0.11 },
  ].forEach(({ freq, at }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start + at);
    gain.gain.exponentialRampToValueAtTime(0.18, start + at + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + at + 0.9);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start + at);
    osc.stop(start + at + 0.95);
  });
}
