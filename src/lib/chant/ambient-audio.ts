// SMARAN Ambient Devotional Audio & Pace Cadence Synthesizer
// Uses Web Audio API for 100% offline, zero-asset, high-fidelity devotional soundscapes.

class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private tanpuraGain: GainNode | null = null;
  private tanpuraOscillators: OscillatorNode[] = [];
  private tanpuraLfos: OscillatorNode[] = [];
  private isTanpuraPlaying = false;

  private paceTimerId: ReturnType<typeof setInterval> | null = null;
  private paceGain: GainNode | null = null;
  private isPaceActive = false;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Starts an authentic, calming Tanpura drone (Sa-Pa tuning in C#)
   * Four strings: Pa (G#3 ~207.65 Hz), Sa (C#4 ~277.18 Hz), Sa (C#4), Sa (C#3 ~138.59 Hz)
   */
  public startTanpura(volume = 0.5): void {
    const ctx = this.getContext();
    if (!ctx) return;

    if (this.isTanpuraPlaying) {
      this.setTanpuraVolume(volume);
      return;
    }

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(
      Math.max(0.01, Math.min(volume, 1.0)),
      ctx.currentTime + 1.5
    );
    masterGain.connect(ctx.destination);
    this.tanpuraGain = masterGain;

    // Filter to give warm, wooden resonance
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(850, ctx.currentTime);
    filter.Q.setValueAtTime(1.5, ctx.currentTime);
    filter.connect(masterGain);

    // Harmonic frequencies for C# Tanpura
    const freqs = [
      { freq: 207.65, type: "sine" as OscillatorType, gain: 0.18, lfoRate: 0.25 }, // Pa
      { freq: 277.18, type: "triangle" as OscillatorType, gain: 0.14, lfoRate: 0.35 }, // Sa
      { freq: 277.68, type: "sine" as OscillatorType, gain: 0.12, lfoRate: 0.28 }, // Sa (detuned chorus)
      { freq: 138.59, type: "triangle" as OscillatorType, gain: 0.22, lfoRate: 0.18 }, // Low Sa
    ];

    this.tanpuraOscillators = [];
    this.tanpuraLfos = [];

    freqs.forEach((spec) => {
      const osc = ctx.createOscillator();
      osc.type = spec.type;
      osc.frequency.setValueAtTime(spec.freq, ctx.currentTime);

      const strGain = ctx.createGain();
      strGain.gain.setValueAtTime(spec.gain, ctx.currentTime);

      // Subtle LFO modulation for jawari string shimmer
      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(spec.lfoRate, ctx.currentTime);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(spec.gain * 0.4, ctx.currentTime);
      lfo.connect(lfoGain.gain);

      osc.connect(strGain);
      strGain.connect(filter);

      osc.start();
      lfo.start();

      this.tanpuraOscillators.push(osc);
      this.tanpuraLfos.push(lfo);
    });

    this.isTanpuraPlaying = true;
  }

  public setTanpuraVolume(volume: number): void {
    if (!this.tanpuraGain || !this.ctx) return;
    const safe = Math.max(0, Math.min(volume, 1.0));
    this.tanpuraGain.gain.setTargetAtTime(safe, this.ctx.currentTime, 0.1);
  }

  public stopTanpura(): void {
    if (!this.isTanpuraPlaying || !this.ctx || !this.tanpuraGain) return;

    this.tanpuraGain.gain.setValueAtTime(this.tanpuraGain.gain.value, this.ctx.currentTime);
    this.tanpuraGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.8);

    setTimeout(() => {
      this.tanpuraOscillators.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // ignore
        }
      });
      this.tanpuraLfos.forEach((lfo) => {
        try {
          lfo.stop();
          lfo.disconnect();
        } catch {
          // ignore
        }
      });
      this.tanpuraOscillators = [];
      this.tanpuraLfos = [];
      this.isTanpuraPlaying = false;
    }, 900);
  }

  /**
   * Plays a single gentle wooden cadence tick for pace guidance.
   */
  public playPaceTick(volume = 0.4): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Gentle woodblock / kartal frequency
    osc.type = "sine";
    osc.frequency.setValueAtTime(620, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(310, ctx.currentTime + 0.08);

    const safeVol = Math.max(0.01, Math.min(volume, 1.0));
    gain.gain.setValueAtTime(safeVol * 0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.13);
  }

  /**
   * Starts rhythmic pace guidance metronome (interval in seconds per bead, e.g. 7.0s)
   */
  public startPaceGuidance(secondsPerBead = 7.0, volume = 0.4): void {
    this.stopPaceGuidance();
    const safeInterval = Math.max(2, Math.min(secondsPerBead, 30)) * 1000;

    // Initial tick
    this.playPaceTick(volume);

    this.paceTimerId = setInterval(() => {
      this.playPaceTick(volume);
    }, safeInterval);

    this.isPaceActive = true;
  }

  public stopPaceGuidance(): void {
    if (this.paceTimerId) {
      clearInterval(this.paceTimerId);
      this.paceTimerId = null;
    }
    this.isPaceActive = false;
  }

  public isPaceRunning(): boolean {
    return this.isPaceActive;
  }

  public isAmbientRunning(): boolean {
    return this.isTanpuraPlaying;
  }
}

export const ambientAudio = new AmbientAudioEngine();

