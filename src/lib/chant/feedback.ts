"use client";

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioContext) {
    sharedAudioContext = new AudioCtx();
  }
  if (sharedAudioContext.state === "suspended") {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  durationSec: number,
  gainPeak: number,
  delaySec = 0
) {
  const start = ctx.currentTime + delaySec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, start);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainPeak, start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(start);
  osc.stop(start + durationSec + 0.02);
}

/**
 * Triggers gentle optional tactile vibration and/or soft Web Audio cues.
 */
export function triggerBeadFeedback(opts: {
  soundEnabled: boolean;
  tactileEnabled: boolean;
  isRoundComplete?: boolean;
}) {
  if (opts.tactileEnabled && typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(opts.isRoundComplete ? [24, 48, 36] : 10);
    } catch {
      // Ignore vibration permission restrictions
    }
  }

  if (opts.soundEnabled) {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      if (opts.isRoundComplete) {
        // Gentle two-harmonic temple chime for 108th bead completion
        playTone(ctx, 528, 0.55, 0.075, 0);
        playTone(ctx, 792, 0.65, 0.04, 0.04);
      } else {
        // Subtle soft wooden bead tap
        playTone(ctx, 660, 0.045, 0.04, 0);
      }
    } catch {
      // Ignore Web Audio restrictions cleanly
    }
  }
}

