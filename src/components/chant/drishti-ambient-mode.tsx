"use client";

import * as React from "react";
import Image from "next/image";
import { Eye, EyeOff, Music, Volume2, VolumeX, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ambientAudio } from "@/lib/chant/ambient-audio";

export interface DrishtiArtworkOption {
  id: string;
  title: string;
  src: string;
  description: string;
}

export const DRISHTI_ARTWORKS: DrishtiArtworkOption[] = [
  {
    id: "krishna-flute",
    title: "Śrī Kṛṣṇa Flute in Vṛndāvana",
    src: "/media/krishna-flute-vrindavan.jpg",
    description: "Lord Krishna playing His divine flute beside the sacred Yamunā with grazing calves.",
  },
  {
    id: "radha-krishna-rasalila",
    title: "Śrī Śrī Rādhā-Kṛṣṇa Rāsa Līlā",
    src: "/media/radha-krishna-rasalila.jpg",
    description: "The divine nocturnal dance of sacred divine love in the forest of Vrindavan.",
  },
  {
    id: "japa-grove",
    title: "Sacred Grove Meditation",
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
}

export function DrishtiAmbientMode({
  isAmbientMode,
  onToggleAmbientMode,
  ambientSoundEnabled = false,
  ambientVolume = 0.5,
  onSavePreferences,
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

  if (!isAmbientMode) {
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={onToggleAmbientMode}
        className="flex items-center gap-1.5 text-xs border-gold/30 hover:border-gold shadow-sm"
        title="Enter Dṛṣṭi Ambient Devotional Mode"
      >
        <Eye className="w-3.5 h-3.5 text-gold" />
        <span className="hidden sm:inline">Dṛṣṭi Mode</span>
      </Button>
    );
  }

  return (
    <>
      {/* Background Sacred Canvas */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden transition-opacity duration-1000 opacity-90">
        <Image
          src={currentArtwork.src}
          alt={currentArtwork.title}
          fill
          priority
          className="object-cover object-center filter brightness-[0.45] contrast-[1.1] scale-105 transition-all duration-1000 ease-out"
        />
        {/* Soft Golden Sacred Vignette */}
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-ink/60 to-ink/90" />
      </div>

      {/* Floating Ambient Controls Pill */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-2 bg-parchment-light/90 dark:bg-sacred-ash/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-gold/40 shadow-xl transition-all">
        <button
          onClick={handleToggleSound}
          className={`p-1.5 rounded-full transition-colors ${isSoundOn
              ? "text-gold bg-gold/20"
              : "text-ink-muted hover:text-ink"
            }`}
          title={isSoundOn ? "Mute Tanpura Drone" : "Play Tanpura Drone"}
        >
          {isSoundOn ? <Music className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        <button
          onClick={() =>
            setSelectedArtworkIndex((prev) => (prev + 1) % DRISHTI_ARTWORKS.length)
          }
          className="p-1.5 rounded-full text-ink-muted hover:text-ink transition-colors"
          title={`Switch visual (${currentArtwork.title})`}
        >
          <Sparkles className="w-4 h-4 text-gold" />
        </button>

        <button
          onClick={() => setShowControls(!showControls)}
          className="p-1.5 rounded-full text-ink-muted hover:text-ink transition-colors"
          title="Audio Controls"
        >
          <Volume2 className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleAmbientMode}
          className="flex items-center gap-1 pl-2 pr-1 text-xs font-medium text-ink dark:text-parchment hover:text-gold transition-colors"
          title="Exit Dṛṣṭi Mode"
        >
          <EyeOff className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Normal</span>
        </button>
      </div>

      {/* Expanded Audio Popover */}
      {showControls && (
        <div className="fixed top-16 right-4 z-40 p-4 rounded-2xl bg-paper/98 backdrop-blur-md border border-sandalwood-border/90 shadow-sacred-lg w-72 space-y-3.5 text-ink animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between text-xs font-bold text-ink">
            <span>Tanpura Drone Volume</span>
            <span className="font-serif text-peacock-deep tabular-nums">{Math.round(volume * 100)}%</span>
          </div>

          <div className="relative py-1">
            <input
              type="range"
              min="0.05"
              max="1.0"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              style={{
                background: `linear-gradient(to right, #7A2638 0%, #7A2638 ${Math.round(((volume - 0.05) / 0.95) * 100)}%, #E7DFD3 ${Math.round(((volume - 0.05) / 0.95) * 100)}%, #E7DFD3 100%)`,
              }}
              aria-label="Tanpura Drone Volume"
              className="h-2 w-full appearance-none rounded-full cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-peacock-deep/30 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-4.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-peacock-deep [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-paper [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:size-4.5 [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-peacock-deep [&::-moz-range-thumb]:shadow-md"
            />
          </div>

          <div className="pt-2.5 border-t border-sandalwood-border/70">
            <span className="block text-[11px] font-semibold text-ink-muted mb-2">
              Current Darshan Visual
            </span>
            <div className="space-y-1">
              {DRISHTI_ARTWORKS.map((art, idx) => (
                <button
                  key={art.id}
                  onClick={() => setSelectedArtworkIndex(idx)}
                  className={`w-full text-left text-xs px-2.5 py-1.5 rounded-xl transition-all ${selectedArtworkIndex === idx
                      ? "bg-tulsi-wash text-peacock-deep font-bold border border-peacock-green/30"
                      : "text-ink-muted hover:text-ink hover:bg-linen"
                    }`}
                >
                  {art.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
