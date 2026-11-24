"use client";

import * as React from "react";
import Image from "next/image";
import {
  Eye,
  EyeOff,
  Music,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LotusEmblem } from "@/components/sacred/ornaments";
import { ambientAudio } from "@/lib/chant/ambient-audio";
import { JapaMalaWheel } from "@/components/chant/japa-mala-wheel";
import { cn } from "@/lib/cn";
import type { ChantingSessionRecord } from "@/lib/chant/types";

export interface DrishtiArtworkOption {
  id: string;
  title: string;
  shortLabel: string;
  src: string;
  description: string;
}

export const DRISHTI_ARTWORKS: DrishtiArtworkOption[] = [
  {
    id: "krishna-flute",
    title: "Śrī Kṛṣṇa Flute in Vṛndāvana",
    shortLabel: "Śrī Kṛṣṇa",
    src: "/media/krishna-flute-vrindavan.jpg",
    description: "Lord Krishna playing His divine flute beside the sacred Yamunā with grazing calves.",
  },
  {
    id: "radha-krishna-rasalila",
    title: "Śrī Śrī Rādhā-Kṛṣṇa Rāsa Līlā",
    shortLabel: "Rādhā-Kṛṣṇa",
    src: "/media/radha-krishna-rasalila.jpg",
    description: "The divine nocturnal dance of sacred divine love in the forest of Vrindavan.",
  },
  {
    id: "japa-grove",
    title: "Sacred Grove Meditation",
    shortLabel: "Sacred Grove",
    src: "/media/japa-devotee-meditation.jpg",
    description: "Devotee immersed in one-pointed remembrance under the holy Kadamba tree.",
  },
];

interface DrishtiAmbientModeProps {
  isAmbientMode: boolean;
  onToggleAmbientMode: () => void;
  ambientSoundEnabled?: boolean;
  ambientVolume?: number;
  onSavePreferences?: (soundEnabled: boolean, volume: number) => void;
  beadCount?: number;
  onAdvanceBead?: () => void;
  onUndoBead?: () => void;
  sessionRounds?: number;
  todayRounds?: number;
  mantraName?: string;
  isPaused?: boolean;
  isBusy?: boolean;
  activeSession?: ChantingSessionRecord | null;
  isSessionBusy?: boolean;
  onSessionStatusChange?: (status: "active" | "paused" | "completed") => void;
  onStartNewSession?: () => void;
}

const quarterMilestones = [
  { label: "Quarter 1", target: 27 },
  { label: "Halfway", target: 54 },
  { label: "Quarter 3", target: 81 },
  { label: "Complete", target: 108 },
] as const;

export function DrishtiAmbientMode({
  isAmbientMode,
  onToggleAmbientMode,
  ambientSoundEnabled = false,
  ambientVolume = 0.5,
  onSavePreferences,
  beadCount = 0,
  onAdvanceBead,
  onUndoBead,
  sessionRounds = 0,
  todayRounds = 0,
  mantraName = "Hare Kṛṣṇa Mahā-mantra",
  isPaused = false,
  isBusy = false,
  activeSession,
  isSessionBusy = false,
  onSessionStatusChange,
  onStartNewSession,
}: DrishtiAmbientModeProps) {
  const [selectedArtworkIndex, setSelectedArtworkIndex] = React.useState(0);
  const [isSoundOn, setIsSoundOn] = React.useState(ambientSoundEnabled);
  const [volume, setVolume] = React.useState(ambientVolume);
  const [showControls, setShowControls] = React.useState(false);

  // Sync Tanpura sound state with ambient mode
  React.useEffect(() => {
    if (isAmbientMode && isSoundOn) {
      ambientAudio.startTanpura(volume);
    } else {
      ambientAudio.stopTanpura();
    }
    return () => {
      ambientAudio.stopTanpura();
    };
  }, [isAmbientMode, isSoundOn, volume]);

  // Handle keyboard shortcuts (Escape to exit, Space to advance bead)
  React.useEffect(() => {
    if (!isAmbientMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onToggleAmbientMode();
      } else if (
        (e.code === "Space" || e.key === " ") &&
        !isPaused &&
        !isBusy &&
        onAdvanceBead
      ) {
        // Prevent default spacebar scroll
        e.preventDefault();
        onAdvanceBead();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAmbientMode, isPaused, isBusy, onAdvanceBead, onToggleAmbientMode]);

  const handleToggleSound = () => {
    const next = !isSoundOn;
    setIsSoundOn(next);
    onSavePreferences?.(next, volume);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    ambientAudio.setTanpuraVolume(newVol);
    onSavePreferences?.(isSoundOn, newVol);
  };

  const currentArtwork: DrishtiArtworkOption =
    DRISHTI_ARTWORKS[selectedArtworkIndex] ?? DRISHTI_ARTWORKS[0]!;

  const beadPct = Math.min(100, Math.round((beadCount / 108) * 100));

  return (
    <>
      {/* 1. Permanent Toolbar Button (Always Visible in Header) */}
      <Button
        variant={isAmbientMode ? "primary" : "secondary"}
        size="sm"
        onClick={onToggleAmbientMode}
        className={`flex items-center gap-1.5 text-xs rounded-xl border transition-all cursor-pointer shadow-2xs ${
          isAmbientMode
            ? "border-gold-border bg-gold-ink text-ink-on-dark shadow-sacred-sm font-bold"
            : "border-gold-border/70 bg-paper hover:bg-gold-wash/70 hover:border-gold-antique text-ink font-semibold"
        }`}
        title={isAmbientMode ? "Exit Dṛṣṭi Mode (Esc)" : "Enter Dṛṣṭi Ambient Devotional Mode"}
      >
        {isAmbientMode ? (
          <>
            <EyeOff className="size-3.5 text-gold-wash animate-pulse" />
            <span className="hidden sm:inline">Exit Dṛṣṭi</span>
          </>
        ) : (
          <>
            <Eye className="size-3.5 text-gold-antique" />
            <span className="hidden sm:inline">Dṛṣṭi Mode</span>
          </>
        )}
      </Button>

      {/* 2. Full-Screen Immersive Darshan Sanctum Overlay */}
      {isAmbientMode && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Dṛṣṭi Ambient Devotional Mode"
          className="fixed inset-0 z-[60] flex flex-col justify-between overflow-y-auto bg-krishna-midnight/95 text-ink-on-dark animate-in fade-in-0 duration-300"
        >
          {/* Background Sacred Darshan Artwork */}
          <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            <Image
              src={currentArtwork.src}
              alt={currentArtwork.title}
              fill
              priority
              className="object-cover object-center filter brightness-[0.52] contrast-[1.1] scale-105 transition-all duration-1000 ease-out"
            />
            {/* Soft Atmospheric Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-krishna-midnight via-krishna-midnight/40 to-krishna-midnight/70" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(12,21,43,0.75)_80%)]" />
          </div>

          {/* Top Sanctum Header Strip (Apple/Linear-Polished Responsive Nav Bar) */}
          <header className="relative z-20 flex items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3.5 border-b border-gold-border/30 bg-krishna-midnight/85 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
            {/* Left: Devotional Title & Branding (Single-line, Truncate-Safe) */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {/* Sacred Lotus Emblem */}
              <div className="flex size-8 sm:size-10 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl border border-gold-antique/50 bg-gradient-to-br from-gold-wash/25 via-gold-wash/10 to-transparent text-gold-antique shadow-[0_0_12px_rgba(214,168,72,0.25)]">
                <LotusEmblem size={18} className="sm:hidden text-gold-antique" />
                <LotusEmblem size={22} className="hidden sm:inline-block text-gold-antique" />
              </div>

              <div className="min-w-0 space-y-0.5">
                {/* Title & Live Presence Indicator */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h1 className="font-serif text-xs xs:text-sm sm:text-base md:text-lg font-bold tracking-wide text-ink-on-dark whitespace-nowrap truncate">
                    <span className="sm:hidden">Dṛṣṭi Sanctum</span>
                    <span className="hidden sm:inline">Dṛṣṭi Darshan Sanctum</span>
                  </h1>
                  {/* Desktop Darshan Badge */}
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-tulsi-wash/25 text-tulsi-light border border-peacock-green/40 shadow-2xs shrink-0">
                    <span className="size-1.5 rounded-full bg-peacock-green animate-pulse" />
                    Darshan
                  </span>
                  {/* Mobile Live Diya Flame Pulse */}
                  <span className="sm:hidden inline-flex items-center shrink-0" title="Active Darshan">
                    <span className="size-1.5 rounded-full bg-peacock-green animate-pulse shadow-[0_0_6px_rgba(46,125,82,0.8)]" />
                  </span>
                </div>

                {/* Subtitle / Selected Sacred Darshan */}
                <p className="text-[10px] sm:text-[11px] text-ink-muted-dark font-medium tracking-wide whitespace-nowrap truncate max-w-[120px] xs:max-w-[180px] sm:max-w-none">
                  <span className="hidden sm:inline">One-pointed remembrance · </span>
                  <strong className="text-gold-antique/95 font-semibold">{currentArtwork.shortLabel}</strong>
                  <span className="sm:hidden text-ink-muted-dark/80"> · Vrindavan</span>
                </p>
              </div>
            </div>

            {/* Center: Segmented Darshan Artwork Switcher (Desktop & Tablet) */}
            <div className="hidden md:flex items-center gap-1 p-1 rounded-2xl border border-gold-border/40 bg-krishna-elevated/85 backdrop-blur-xl shadow-inner shrink-0">
              {DRISHTI_ARTWORKS.map((art, idx) => (
                <button
                  key={art.id}
                  type="button"
                  onClick={() => setSelectedArtworkIndex(idx)}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer select-none whitespace-nowrap",
                    selectedArtworkIndex === idx
                      ? "bg-gradient-to-r from-gold-antique/25 via-gold-antique/35 to-gold-antique/20 text-gold-antique border border-gold-border/70 shadow-sacred-sm font-bold scale-[1.02]"
                      : "text-ink-muted-dark hover:text-ink-on-dark hover:bg-white/5"
                  )}
                  title={`View ${art.title}`}
                >
                  <Sparkles
                    className={cn(
                      "size-3 transition-opacity shrink-0",
                      selectedArtworkIndex === idx ? "opacity-100 text-gold-antique" : "opacity-0"
                    )}
                  />
                  <span>{art.shortLabel}</span>
                </button>
              ))}
            </div>

            {/* Right: Sound Controls, Mobile Artwork Cycler & Exit Button */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              {/* Mobile Darshan Artwork Switcher Pill (Active on < md) */}
              <button
                type="button"
                onClick={() => setSelectedArtworkIndex((prev) => (prev + 1) % DRISHTI_ARTWORKS.length)}
                className="md:hidden flex items-center gap-1 px-2 py-1.5 rounded-xl border border-gold-border/40 bg-krishna-elevated/80 text-gold-antique hover:bg-white/5 active:scale-95 transition-all text-xs font-semibold shrink-0 cursor-pointer shadow-2xs whitespace-nowrap"
                title={`Current: ${currentArtwork.shortLabel}. Tap to change Darshan.`}
                aria-label={`Current darshan: ${currentArtwork.shortLabel}. Tap to cycle darshan.`}
              >
                <Sparkles className="size-3 text-gold-antique shrink-0" />
                <span className="text-[11px] font-bold truncate max-w-[56px] xs:max-w-[75px]">
                  {currentArtwork.shortLabel}
                </span>
              </button>

              {/* Tanpura Drone Control Pill */}
              <div className="flex items-center rounded-xl sm:rounded-2xl border border-gold-border/40 bg-krishna-elevated/85 backdrop-blur-xl p-0.5 shadow-2xs shrink-0">
                <button
                  type="button"
                  onClick={handleToggleSound}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0",
                    isSoundOn
                      ? "bg-gold-wash/25 text-gold-antique font-bold"
                      : "text-ink-muted-dark hover:text-ink-on-dark hover:bg-white/5"
                  )}
                  title={isSoundOn ? "Mute Tanpura Drone" : "Play Tanpura Drone (C# Sa-Pa)"}
                >
                  {isSoundOn ? (
                    <>
                      {/* Animated Audio Equalizer Bars */}
                      <span className="flex items-end gap-0.5 h-3.5 shrink-0" aria-hidden="true">
                        <span className="w-0.5 h-3 bg-gold-antique rounded-full animate-pulse" />
                        <span className="w-0.5 h-2 bg-gold-antique rounded-full animate-pulse delay-75" />
                        <span className="w-0.5 h-3.5 bg-gold-antique rounded-full animate-pulse delay-150" />
                      </span>
                      <span className="hidden sm:inline">Tanpura: ON</span>
                      <span className="sm:hidden text-[11px]">ON</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="size-3.5 text-ink-muted-dark shrink-0" />
                      <span className="hidden sm:inline">Play Tanpura</span>
                      <span className="sm:hidden text-[11px]">Tanpura</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowControls((prev) => !prev)}
                  className={cn(
                    "p-1.5 rounded-lg sm:rounded-xl text-ink-muted-dark hover:text-ink-on-dark hover:bg-white/5 transition-colors cursor-pointer shrink-0",
                    showControls && "text-gold-antique bg-gold-wash/20"
                  )}
                  title="Adjust Tanpura Volume & Artwork"
                  aria-label="Audio and darshan settings"
                >
                  <Volume2 className="size-3.5 shrink-0" />
                </button>
              </div>

              {/* Exit Dṛṣṭi Button (Apple visionOS / Linear aesthetic, never wraps) */}
              <button
                type="button"
                onClick={onToggleAmbientMode}
                className="inline-flex items-center gap-1 sm:gap-1.5 rounded-xl sm:rounded-2xl border border-gold-border/60 bg-gradient-to-r from-gold-antique/25 via-gold-ink/30 to-gold-antique/20 hover:from-gold-antique/35 hover:to-gold-antique/35 text-ink-on-dark px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 text-xs font-bold shadow-sacred-sm transition-all duration-200 active:scale-95 cursor-pointer ring-1 ring-gold-antique/20 hover:border-gold-antique whitespace-nowrap shrink-0"
                title="Return to standard workspace (Esc)"
              >
                <X className="size-3.5 text-gold-wash shrink-0" />
                <span className="hidden sm:inline">Exit Dṛṣṭi</span>
                <span className="sm:hidden">Exit</span>
                <kbd className="hidden lg:inline-block px-1.5 py-0.5 rounded-md bg-black/40 border border-white/20 text-[10px] font-mono text-gold-wash/90 leading-none">
                  Esc
                </kbd>
              </button>
            </div>
          </header>

          {/* Expanded Audio Controls Popover (Mobile-friendly max width & position) */}
          {showControls && (
            <div className="fixed top-16 sm:top-20 right-3 sm:right-6 z-30 p-4 sm:p-5 rounded-3xl bg-krishna-elevated/95 backdrop-blur-xl border border-gold-border/60 shadow-sacred-xl w-[calc(100vw-24px)] max-w-xs sm:w-80 space-y-4 text-ink-on-dark animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between text-xs font-bold text-ink-on-dark">
                <span>Tanpura Resonance Volume</span>
                <span className="font-serif text-gold-antique tabular-nums">{Math.round(volume * 100)}%</span>
              </div>

              <div className="relative py-1">
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  aria-label="Tanpura Drone Volume"
                  className="h-2 w-full appearance-none rounded-full cursor-pointer bg-krishna-midnight accent-gold-antique border border-gold-border/40"
                />
              </div>

              <div className="pt-3 border-t border-gold-border/20 space-y-2">
                <span className="block text-[11px] font-bold text-ink-muted-dark uppercase tracking-wider">
                  Select Darshan Artwork
                </span>
                <div className="space-y-1.5">
                  {DRISHTI_ARTWORKS.map((art, idx) => (
                    <button
                      key={art.id}
                      type="button"
                      onClick={() => {
                        setSelectedArtworkIndex(idx);
                        setShowControls(false);
                      }}
                      className={cn(
                        "w-full text-left text-xs p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between",
                        selectedArtworkIndex === idx
                          ? "bg-gold-wash/20 text-gold-antique font-bold border border-gold-border/50"
                          : "text-ink-muted-dark hover:text-ink-on-dark hover:bg-krishna-midnight/60"
                      )}
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-ink-on-dark block">{art.shortLabel}</span>
                        <span className="text-[10px] text-ink-muted-dark block line-clamp-1">{art.title}</span>
                      </div>
                      {selectedArtworkIndex === idx && <Sparkles className="size-3.5 text-gold-antique shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Central Sacred Altar: Japa Mala Wheel Experience (Image 2) in Darshan Sanctum */}
          <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-3 py-6 max-w-xl mx-auto w-full">
            <div className="w-full rounded-3xl border border-gold-border/40 bg-krishna-midnight/70 backdrop-blur-2xl p-5 sm:p-7 text-center text-ink-on-dark shadow-sacred-xl space-y-5">
              {/* Mantra Title Pill & Mahā-mantra */}
              <div className="space-y-1.5 pb-1">
                <div className="flex items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-serif font-bold text-gold-antique bg-gold-wash/15 border border-gold-border/40">
                    <Sparkles className="size-3.5 text-gold-antique" />
                    <span>{mantraName}</span>
                  </span>
                </div>
                <p className="font-serif text-sm sm:text-base font-bold tracking-wide text-ink-on-dark leading-snug">
                  हरे कृष्ण हरे कृष्ण कृष्ण कृष्ण हरे हरे · हरे राम हरे राम राम राम हरे हरे
                </p>
              </div>

              {/* 1. Visual Quarter-Round Cadence Strip (Image 2) */}
              <div
                aria-label="Current round milestones"
                className="mx-auto grid max-w-md grid-cols-4 gap-1 sm:gap-1.5 rounded-2xl border border-gold-border/40 bg-paper/95 p-1 sm:p-1.5 shadow-2xs text-ink"
              >
                {quarterMilestones.map((step) => {
                  const reached = beadCount >= step.target;
                  const isCurrent =
                    !reached &&
                    (step.target === 27 ? beadCount < 27 : beadCount >= step.target - 27);
                  return (
                    <div
                      key={step.target}
                      className={cn(
                        "rounded-xl border px-1 sm:px-2 py-1.5 sm:py-2 text-center transition-all duration-200",
                        reached
                          ? "border-peacock-green/50 bg-tulsi-wash text-peacock-deep shadow-xs font-semibold"
                          : isCurrent
                            ? "border-gold-border/90 bg-paper text-ink shadow-xs ring-2 ring-gold-antique/30 font-bold"
                            : "border-transparent bg-transparent text-ink-muted/70"
                      )}
                    >
                      <p className="font-serif text-sm sm:text-base font-bold tabular-nums">
                        {step.target}
                      </p>
                      <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider">{step.label}</p>
                    </div>
                  );
                })}
              </div>

              {/* 2. Authentic 108-Bead Japa Mala Wheel (Image 2) */}
              <div className="py-1 flex justify-center">
                <JapaMalaWheel
                  currentBead={beadCount}
                  isPaused={isPaused}
                  isBusy={isBusy}
                  onAdvanceBead={() => onAdvanceBead?.()}
                  sessionRounds={sessionRounds}
                  todayRounds={todayRounds}
                />
              </div>

              {/* 3. Sacred Guidance Text (Image 2) */}
              <p className="mx-auto max-w-md text-center text-xs leading-relaxed text-ink-muted-dark">
                Touch the center sphere or tap below for each sacred mantra. Partial bead progress does not count toward completed rounds until bead 108 is reached.
              </p>

              {/* 4. Primary & Undo Buttons (Image 2) */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <Button
                  variant="primary"
                  size="lg"
                  disabled={isPaused || isBusy}
                  onClick={() => onAdvanceBead?.()}
                  className="min-w-48 rounded-2xl bg-peacock-deep hover:bg-peacock-slate text-ink-on-dark px-8 py-3.5 text-sm font-bold shadow-sacred-md active:scale-[0.96] cursor-pointer"
                >
                  <Plus className="size-4 mr-1.5" strokeWidth={2.2} aria-hidden={true} />
                  <span>Next bead ({Math.min(beadCount + 1, 108)})</span>
                </Button>

                {onUndoBead && (
                  <Button
                    variant="secondary"
                    size="lg"
                    disabled={beadCount === 0 || isPaused}
                    onClick={() => onUndoBead?.()}
                    className="rounded-2xl border border-sandalwood-border/80 bg-paper hover:bg-linen px-5 py-3.5 text-sm font-semibold text-ink shadow-2xs active:scale-[0.97] cursor-pointer"
                  >
                    <RotateCcw className="size-4 mr-1.5" strokeWidth={1.75} aria-hidden={true} />
                    <span>Undo bead</span>
                  </Button>
                )}
              </div>

              {/* 5. Session Starting, Pausing & Ending Controls */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2 border-t border-gold-border/20">
                {activeSession ? (
                  <>
                    {isPaused ? (
                      <Button
                        variant="primary"
                        size="md"
                        loading={isSessionBusy}
                        onClick={() => onSessionStatusChange?.("active")}
                        className="rounded-xl bg-gold-ink hover:bg-gold-antique text-ink-on-dark px-4 py-2 text-xs font-bold border border-gold-border/60 shadow-xs cursor-pointer"
                      >
                        <Play className="size-3.5 mr-1.5 fill-current" strokeWidth={1.75} aria-hidden={true} />
                        <span>Resume session</span>
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="md"
                        loading={isSessionBusy}
                        onClick={() => onSessionStatusChange?.("paused")}
                        className="rounded-xl border border-gold-border/40 bg-krishna-elevated/80 hover:bg-krishna-elevated text-ink-on-dark px-4 py-2 text-xs font-semibold shadow-xs cursor-pointer"
                      >
                        <Pause className="size-3.5 mr-1.5" strokeWidth={1.75} aria-hidden={true} />
                        <span>Pause session</span>
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="md"
                      loading={isSessionBusy}
                      onClick={() => onSessionStatusChange?.("completed")}
                      className="rounded-xl border border-gold-border/30 bg-krishna-midnight/80 hover:bg-krishna-midnight text-ink-muted-dark hover:text-ink-on-dark px-4 py-2 text-xs font-medium cursor-pointer"
                    >
                      <span>Finish session</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="md"
                      disabled={isSessionBusy}
                      onClick={() => onStartNewSession?.()}
                      className="rounded-xl px-3 py-2 text-xs text-ink-muted-dark hover:text-ink-on-dark cursor-pointer"
                    >
                      <Plus className="size-3.5 mr-1" strokeWidth={1.75} aria-hidden={true} />
                      <span>New session</span>
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="md"
                    disabled={isSessionBusy}
                    onClick={() => onStartNewSession?.()}
                    className="rounded-xl border border-gold-border/60 bg-gold-wash/10 hover:bg-gold-wash/20 text-gold-antique px-4 py-2 text-xs font-bold cursor-pointer transition-all"
                  >
                    <Plus className="size-3.5 mr-1.5 text-gold-antique" strokeWidth={2} aria-hidden={true} />
                    <span>Start New Chanting Session</span>
                  </Button>
                )}
              </div>
            </div>
          </main>

          {/* Bottom Calm Navigation Footer Strip */}
          <footer className="relative z-10 flex flex-wrap items-center justify-between gap-2.5 p-3 sm:p-5 border-t border-gold-border/20 bg-krishna-midnight/60 backdrop-blur-md text-xs text-ink-muted-dark">
            <span className="flex items-center gap-1.5">
              <LotusEmblem size={14} className="text-gold-antique shrink-0" />
              <span className="hidden sm:inline">Dṛṣṭi Mode: Touch or press <kbd className="px-1.5 py-0.5 rounded bg-krishna-elevated border border-gold-border/30 text-ink-on-dark font-mono text-[10px]">Space</kbd> to chant next bead</span>
              <span className="sm:hidden text-[11px]">Touch bead or button to chant</span>
            </span>

            <button
              type="button"
              onClick={onToggleAmbientMode}
              className="text-gold-antique hover:underline cursor-pointer font-medium whitespace-nowrap text-xs"
            >
              <span className="hidden sm:inline">Exit Dṛṣṭi Mode &amp; Return to Workspace &rarr;</span>
              <span className="sm:hidden">Exit Dṛṣṭi &rarr;</span>
            </button>
          </footer>
        </div>
      )}
    </>
  );
}
