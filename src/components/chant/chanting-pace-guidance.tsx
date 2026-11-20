"use client";

import * as React from "react";
import { Gauge, Play, Square, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ambientAudio } from "@/lib/chant/ambient-audio";

interface ChantingPaceGuidanceProps {
  isOpen: boolean;
  onClose: () => void;
  initialEnabled?: boolean;
  initialSecondsPerBead?: number;
  onSavePreferences?: (enabled: boolean, secondsPerBead: number) => void;
}

export function ChantingPaceGuidance({
  isOpen,
  onClose,
  initialEnabled = false,
  initialSecondsPerBead = 7.0,
  onSavePreferences,
}: ChantingPaceGuidanceProps) {
  const [isActive, setIsActive] = React.useState(initialEnabled);
  const [secondsPerBead, setSecondsPerBead] = React.useState(initialSecondsPerBead);
  const [volume, setVolume] = React.useState(0.4);

  React.useEffect(() => {
    return () => {
      ambientAudio.stopPaceGuidance();
    };
  }, []);

  if (!isOpen) return null;

  const estimatedMinutes = ((secondsPerBead * 108) / 60).toFixed(1);
  const speedPercent = Math.min(Math.max(0, ((secondsPerBead - 4.0) / (14.0 - 4.0)) * 100), 100);
  const volumePercent = Math.min(Math.max(0, ((volume - 0.05) / (1.0 - 0.05)) * 100), 100);

  const handleToggle = () => {
    if (isActive) {
      ambientAudio.stopPaceGuidance();
      setIsActive(false);
      onSavePreferences?.(false, secondsPerBead);
    } else {
      ambientAudio.startPaceGuidance(secondsPerBead, volume);
      setIsActive(true);
      onSavePreferences?.(true, secondsPerBead);
    }
  };

  const handleSecondsChange = (val: number) => {
    setSecondsPerBead(val);
    if (isActive) {
      ambientAudio.startPaceGuidance(val, volume);
    }
    onSavePreferences?.(isActive, val);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pace-guidance-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-sandalwood-border/90 bg-paper p-6 shadow-sacred-lg text-ink">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-sandalwood-border/70">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl border border-gold-border/70 bg-gold-wash/80 text-gold-ink shadow-2xs">
              <Gauge className="size-4.5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="pace-guidance-title" className="font-serif text-lg font-bold text-ink">
                Chanting Pace Guidance
              </h2>
              <p className="text-[11px] text-ink-muted">
                Gentle cadence ticks to anchor devotional focus
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-linen transition-colors"
            aria-label="Close dialog"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <p className="text-xs text-ink-muted leading-relaxed">
            Maintains a meditative, steady chanting rhythm through subtle temple ticks.
            Counting remains entirely manual and in your control.
          </p>

          {/* Pace Cadence Status Card */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              isActive
                ? "border-peacock-green/40 bg-tulsi-wash/90 text-peacock-deep shadow-2xs"
                : "border-sandalwood-border/80 bg-linen/50 text-ink"
            } flex items-center justify-between gap-3`}
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span
                  className={`size-2 rounded-full ${
                    isActive ? "bg-peacock-deep animate-pulse" : "bg-sandalwood-border"
                  }`}
                  aria-hidden="true"
                />
                <span className="text-xs font-bold text-ink">
                  Pace Cadence Status
                </span>
              </div>
              <span className="text-xs text-ink-muted block pl-4">
                {isActive ? "Actively ticking at set tempo" : "Inactive · Tap start to begin"}
              </span>
            </div>
            <Button
              variant={isActive ? "secondary" : "primary"}
              size="sm"
              onClick={handleToggle}
              className={
                isActive
                  ? "rounded-xl border border-peacock-green/50 bg-paper text-peacock-deep hover:bg-tulsi-wash font-semibold px-3.5 py-1.5 shadow-2xs active:scale-[0.97]"
                  : "rounded-xl font-bold px-3.5 py-1.5 shadow-2xs active:scale-[0.97]"
              }
            >
              {isActive ? (
                <>
                  <Square className="size-3.5 mr-1.5 fill-current" aria-hidden="true" />
                  <span>Stop Pace</span>
                </>
              ) : (
                <>
                  <Play className="size-3.5 mr-1.5 fill-current" aria-hidden="true" />
                  <span>Start Pace</span>
                </>
              )}
            </Button>
          </div>

          {/* Cadence Speed Slider */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink">Cadence Speed</span>
              <div className="flex items-center gap-2">
                <span className="font-serif text-sm font-bold text-peacock-deep tabular-nums">
                  {secondsPerBead.toFixed(1)}s / bead
                </span>
                <span className="rounded-full border border-sandalwood-border/80 bg-linen/70 px-2.5 py-0.5 text-[11px] font-medium text-ink-muted tabular-nums">
                  ~{estimatedMinutes} min / round
                </span>
              </div>
            </div>

            <div className="relative py-1">
              <input
                type="range"
                min="4.0"
                max="14.0"
                step="0.5"
                value={secondsPerBead}
                onChange={(e) => handleSecondsChange(parseFloat(e.target.value))}
                style={{
                  background: `linear-gradient(to right, #7A2638 0%, #7A2638 ${speedPercent}%, #E7DFD3 ${speedPercent}%, #E7DFD3 100%)`,
                }}
                aria-label="Cadence speed in seconds per bead"
                className="h-2 w-full appearance-none rounded-full cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-peacock-deep/30 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-peacock-deep [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-paper [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-110 [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-peacock-deep [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:active:scale-110"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-ink-muted">
              <span>Brisk (4.0s)</span>
              <span>Meditative (14.0s)</span>
            </div>
          </div>

          {/* Tick Volume Slider */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink flex items-center gap-1.5">
                <Volume2 className="size-3.5 text-peacock-deep" aria-hidden="true" />
                <span>Tick Volume</span>
              </span>
              <span className="rounded-full border border-sandalwood-border/80 bg-linen/70 px-2 py-0.5 text-[11px] font-medium text-ink-muted tabular-nums">
                {Math.round(volume * 100)}%
              </span>
            </div>

            <div className="relative py-1">
              <input
                type="range"
                min="0.05"
                max="1.0"
                step="0.05"
                value={volume}
                onChange={(e) => {
                  const newVol = parseFloat(e.target.value);
                  setVolume(newVol);
                  ambientAudio.playPaceTick(newVol);
                }}
                style={{
                  background: `linear-gradient(to right, #7A2638 0%, #7A2638 ${volumePercent}%, #E7DFD3 ${volumePercent}%, #E7DFD3 100%)`,
                }}
                aria-label="Tick volume percentage"
                className="h-2 w-full appearance-none rounded-full cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-peacock-deep/30 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-peacock-deep [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-paper [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-110 [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-peacock-deep [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:active:scale-110"
              />
            </div>
          </div>

          {/* Done CTA Footer */}
          <div className="pt-4 border-t border-sandalwood-border/70 flex justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={onClose}
              className="rounded-xl px-6 font-bold shadow-xs active:scale-[0.97]"
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
