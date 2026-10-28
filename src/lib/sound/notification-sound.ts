"use client";

/**
 * Super Warrior 30 / Trade Warrior Academy
 * Professional Web Audio Synthesized Notification Sound Engine
 * Uses Web Audio API — 100% offline, zero external file dependency, zero lag.
 */

const STORAGE_SOUND_KEY = "sw30_sound_enabled";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioCtx && AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(STORAGE_SOUND_KEY);
  return stored !== "false"; // Enabled by default
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_SOUND_KEY, enabled ? "true" : "false");
}

export function toggleSound(): boolean {
  const next = !isSoundEnabled();
  setSoundEnabled(next);
  return next;
}

/**
 * 💰 Income / Referral Commission / Wallet Cash-in Chime ("Cha-ching")
 */
export function playIncomeSound() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Primary coin strike
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(987.77, now); // B5
  osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.08); // E6
  gain1.gain.setValueAtTime(0.3, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.45);

  // Secondary high sparkle (metallic coin chime)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "triangle";
  osc2.frequency.setValueAtTime(1975.53, now + 0.06); // B6
  osc2.frequency.exponentialRampToValueAtTime(2637.02, now + 0.16); // E7
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.setValueAtTime(0.25, now + 0.06);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.06);
  osc2.stop(now + 0.55);
}

/**
 * 📈 Copy Trading Profit / Win Sound (Rising energetic double chime)
 */
export function playTradeProfitSound() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (Major Fanfare)

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const noteStart = now + idx * 0.06;

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, noteStart);

    gain.gain.setValueAtTime(0, noteStart);
    gain.gain.linearRampToValueAtTime(0.28, noteStart + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(noteStart);
    osc.stop(noteStart + 0.35);
  });
}

/**
 * 🎓 New Class / Course Added Chime (Warm, accomplishment bell)
 */
export function playCourseSound() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const noteStart = now + idx * 0.08;

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, noteStart);

    gain.gain.setValueAtTime(0, noteStart);
    gain.gain.linearRampToValueAtTime(0.25, noteStart + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(noteStart);
    osc.stop(noteStart + 0.5);
  });
}

/**
 * 👥 Referral Member Joined / Signup Celebration Sound
 */
export function playReferralSound() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [587.33, 739.99, 880.0, 1174.66]; // D5, F#5, A5, D6

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const noteStart = now + idx * 0.07;

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, noteStart);

    gain.gain.setValueAtTime(0, noteStart);
    gain.gain.linearRampToValueAtTime(0.22, noteStart + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(noteStart);
    osc.stop(noteStart + 0.4);
  });
}

/**
 * 🔔 Standard Notification Ping (Soft modern glass bubble ping)
 */
export function playNotificationSound(
  type?: "income" | "trade" | "course" | "referral" | "general"
) {
  if (!isSoundEnabled()) return;

  if (type === "income") return playIncomeSound();
  if (type === "trade") return playTradeProfitSound();
  if (type === "course") return playCourseSound();
  if (type === "referral") return playReferralSound();

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(880, now); // A5
  osc.frequency.exponentialRampToValueAtTime(1320, now + 0.05); // E6

  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.3);
}
