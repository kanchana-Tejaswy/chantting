"use client";

import * as React from "react";
import {
  Check,
  Info,
  Palette,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Type,
} from "lucide-react";
import {
  DEVOTIONAL_THEMES,
  FONT_SIZES,
  useDevotionalFontSize,
  useDevotionalTheme,
  type DevotionalFontSize,
  type DevotionalThemeId,
} from "@/lib/design/themes";
import { ManuscriptDivider } from "@/components/sacred/ornaments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTrigger,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import { ProgressBar, SacredRingProgress } from "@/components/ui/progress";
import { SwitchField } from "@/components/ui/switch";

export function DesignSystemShowcase() {
  const [activeTheme, setActiveTheme] = useDevotionalTheme();
  const [activeFontSize, setActiveFontSize] = useDevotionalFontSize();
  const [appliedFeedback, setAppliedFeedback] = React.useState<string | null>(null);

  // Editable Preview Input States (User edits here to see live preview in the box!)
  const [previewName, setPreviewName] = React.useState("Tejaswy Kanchana");
  const [previewNote, setPreviewNote] = React.useState("Chanting before sunrise in quiet surrender.");

  // Form inputs demo state
  const [nameInput, setNameInput] = React.useState("");
  const [notesInput, setNotesInput] = React.useState("");
  const [policySelect, setPolicySelect] = React.useState("automatic");
  const [soundEnabled, setSoundEnabled] = React.useState(false);
  const [reducedMotionUI, setReducedMotionUI] = React.useState(false);
  const [confirmMessage, setConfirmMessage] = React.useState<string | null>(null);

  // Interactive Live Japa Mala Counter Specimen state
  const [sampleBead, setSampleBead] = React.useState(72);
  const [sampleRounds, setSampleRounds] = React.useState(12);

  const handleSelectTheme = (themeId: DevotionalThemeId) => {
    setActiveTheme(themeId);
    const found = DEVOTIONAL_THEMES.find((t) => t.id === themeId);
    setAppliedFeedback(`Theme set to ${found?.name ?? themeId}`);
    setTimeout(() => setAppliedFeedback(null), 3500);
  };

  const handleSelectFontSize = (sizeId: DevotionalFontSize) => {
    setActiveFontSize(sizeId);
    const found = FONT_SIZES.find((s) => s.id === sizeId);
    setAppliedFeedback(`Font size adjusted to ${found?.label ?? sizeId}`);
    setTimeout(() => setAppliedFeedback(null), 3500);
  };

  const handleResetToDefault = () => {
    setActiveTheme("vrindavan-ivory");
    setActiveFontSize("normal");
    setAppliedFeedback("Reset to default Vrindavan Ivory theme & standard typography.");
    setTimeout(() => setAppliedFeedback(null), 3500);
  };

  const handleIncrementBead = () => {
    if (sampleBead >= 107) {
      setSampleBead(0);
      setSampleRounds((r) => r + 1);
    } else {
      setSampleBead((b) => b + 1);
    }
  };

  const currentTheme =
    DEVOTIONAL_THEMES.find((t) => t.id === activeTheme) ?? DEVOTIONAL_THEMES[0]!;

  const nameError =
    nameInput.length > 0 && nameInput.trim().length < 2
      ? "Please enter at least 2 characters."
      : undefined;

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-5 py-8 sm:px-8 sm:py-12">
      {/* Top Hero Section: Side-by-Side Controls (Left) & Live Preview Box (Right) */}
      <section aria-labelledby="theme-studio-heading" className="space-y-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
          {/* LEFT COLUMN: Controls, 4 Themes & Font Size Options */}
          <div className="space-y-6 lg:col-span-7">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="gold">Phase 2 Design System</Badge>
                {activeTheme !== "vrindavan-ivory" && (
                  <Badge variant="neutral">Customized Theme</Badge>
                )}
              </div>
              <h1 className="mt-3 font-display text-3xl font-semibold text-ink text-balance sm:text-5xl">
                {currentTheme.name}
              </h1>
              <p className="mt-1 font-devanagari text-base text-gold-ink font-normal">
                {currentTheme.hindi}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted text-pretty">
                Canonical color tokens, Sanskrit-capable typography, elevation surfaces,
                and accessible interactive primitives shared across SMARAN (स्मरण).
              </p>
            </div>

            {/* Simple 4 Default Themes Selector */}
            <div className="space-y-3 rounded-[16px] border border-sandalwood-border bg-paper p-5 shadow-sacred-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Palette className="size-4 text-peacock-deep" aria-hidden={true} />
                  <span className="text-sm font-semibold text-ink">
                    Select Devotional Theme (4 Defaults)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-ink-muted hover:text-peacock-deep transition-colors"
                  title="Reset to default theme & typography"
                >
                  <RotateCcw className="size-3" aria-hidden={true} />
                  <span>Reset Default</span>
                </button>
              </div>

              {/* Clean 4 Theme Grid */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2">
                {DEVOTIONAL_THEMES.map((theme) => {
                  const isSelected = activeTheme === theme.id;
                  const isDefault = theme.id === "vrindavan-ivory";
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => handleSelectTheme(theme.id)}
                      className={`flex flex-col text-left p-3 rounded-[12px] border transition-all cursor-pointer ${
                        isSelected
                          ? "border-gold-antique bg-gold-wash/60 ring-2 ring-gold-antique/40 shadow-sacred-xs"
                          : "border-sandalwood-border bg-paper hover:border-gold-antique/50 hover:bg-linen"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="size-3 rounded-full border border-black/10 shadow-xs shrink-0"
                            style={{ backgroundColor: theme.previewColors[1] }}
                          />
                          <span className="text-xs font-bold text-ink truncate">
                            {theme.name.split(" ")[0]} {theme.name.split(" ")[1] ?? ""}
                          </span>
                        </div>
                        {isSelected && (
                          <Check className="size-3.5 text-gold-ink shrink-0" aria-hidden={true} />
                        )}
                      </div>

                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-[11px] text-ink-muted">
                          {isDefault ? "Default Sattvic" : theme.tag}
                        </span>
                      </div>

                      {/* Micro Palette Ribbon */}
                      <div className="mt-2.5 flex h-2 w-full overflow-hidden rounded-full border border-sandalwood-border/50">
                        {theme.previewColors.slice(0, 5).map((color, i) => (
                          <div
                            key={i}
                            className="flex-1 h-full"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Text Font Size Option */}
            <div className="space-y-3 rounded-[16px] border border-sandalwood-border bg-paper p-5 shadow-sacred-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Type className="size-4 text-peacock-deep" aria-hidden={true} />
                  <span className="text-sm font-semibold text-ink">
                    Text Font Size Option
                  </span>
                </div>
                <span className="text-xs font-medium text-ink-muted">
                  Active: {FONT_SIZES.find((s) => s.id === activeFontSize)?.shortLabel}
                </span>
              </div>

              {/* Font Size Pills */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {FONT_SIZES.map((size) => {
                  const isSelected = activeFontSize === size.id;
                  return (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => handleSelectFontSize(size.id)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-[10px] border text-center transition-all cursor-pointer ${
                        isSelected
                          ? "border-gold-antique bg-gold-wash/60 ring-1 ring-gold-antique font-bold text-ink"
                          : "border-sandalwood-border bg-paper hover:bg-linen text-ink-muted hover:text-ink font-medium"
                      }`}
                    >
                      <span className="text-xs">{size.shortLabel}</span>
                      <span className="text-[10px] opacity-75">{size.rem}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interactive Inputs (Edit here to see live preview in the box on the right!) */}
            <div className="space-y-3 rounded-[16px] border border-sandalwood-border bg-paper p-5 shadow-sacred-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-gold-antique" aria-hidden={true} />
                <span className="text-sm font-semibold text-ink">
                  Type Here to Preview Edits Live in the Box
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField id="live-name-input" label="Devotee Display Name">
                  <Input
                    id="live-name-input"
                    value={previewName}
                    onChange={(e) => setPreviewName(e.target.value)}
                    placeholder="Enter practitioner name..."
                  />
                </FormField>
                <FormField id="live-note-input" label="Personal Reflection / Sankalpa">
                  <Input
                    id="live-note-input"
                    value={previewNote}
                    onChange={(e) => setPreviewNote(e.target.value)}
                    placeholder="Write a short reflection..."
                  />
                </FormField>
              </div>
            </div>

            {appliedFeedback && (
              <div
                role="status"
                className="inline-flex items-center gap-1.5 rounded-full bg-tulsi-wash px-3.5 py-1.5 text-xs font-medium text-peacock-ink border border-peacock-green/30 animate-in fade-in"
              >
                <Check className="size-3.5" aria-hidden={true} />
                <span>{appliedFeedback}</span>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: THE LIVE PREVIEW BOX (Where the user drew the red circle) */}
          <div className="lg:col-span-5 lg:sticky lg:top-20">
            <div className="overflow-hidden rounded-[20px] border-2 border-gold-antique/60 bg-paper shadow-sacred-lg transition-all duration-200">
              {/* Preview Box Top Header */}
              <div className="flex items-center justify-between border-b border-sandalwood-border bg-linen/80 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-peacock-green opacity-75" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-peacock-green" />
                  </span>
                  <span className="font-serif text-sm font-semibold text-ink">
                    Live Preview Box
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="gold" className="text-[10px]">
                    {currentTheme.name.split(" ")[0]}
                  </Badge>
                  <Badge variant="neutral" className="text-[10px]">
                    {FONT_SIZES.find((s) => s.id === activeFontSize)?.shortLabel}
                  </Badge>
                </div>
              </div>

              {/* Inside the Live Preview Box */}
              <div className="space-y-4 p-5">
                {/* Devotee Greeting */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sandalwood-linen border border-gold-antique/60 font-display text-sm font-bold text-gold-ink shadow-sacred-xs">
                      {previewName.trim().charAt(0).toUpperCase() || "D"}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-ink-muted">Practice Sanctuary</p>
                      <p className="font-display text-base font-bold text-ink truncate">
                        {previewName.trim() || "Devotee"}
                      </p>
                    </div>
                  </div>
                  <Badge variant="peacock">Active Vow</Badge>
                </div>

                {/* Live Chanting Mala Specimen */}
                <div className="rounded-[14px] border border-sandalwood-border bg-ivory p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
                      Japa Practice
                    </span>
                    <span className="text-xs font-bold text-gold-ink tabular-nums">
                      Round {sampleRounds} of 16
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="font-display text-4xl font-bold text-ink tabular-nums">
                        {sampleBead}
                      </span>
                      <span className="text-xs text-ink-muted ml-1">/ 108 beads</span>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleIncrementBead}
                      className="cursor-pointer"
                    >
                      +1 Bead
                    </Button>
                  </div>

                  <ProgressBar
                    value={sampleBead}
                    max={108}
                    label="Current round bead progress"
                    tone="peacock"
                  />
                </div>

                {/* Live Streak & Round Progress */}
                <div className="flex items-center gap-3.5 rounded-[14px] border border-sandalwood-border bg-linen p-3.5">
                  <SacredRingProgress
                    value={sampleRounds}
                    max={16}
                    size={48}
                    strokeWidth={4.5}
                    label="Daily completion"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base font-bold text-ink tabular-nums">
                      {Math.round((sampleRounds / 16) * 100)}% Fulfilled
                    </p>
                    <p className="text-xs text-ink-muted truncate">
                      {sampleRounds >= 16 ? "Daily vow complete!" : `${16 - sampleRounds} rounds remaining today`}
                    </p>
                  </div>
                </div>

                {/* Live Scripture Specimen (Scales with chosen font size!) */}
                <div className="rounded-[14px] border border-sandalwood-border bg-sanctum p-4 text-ink-on-dark space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-ink-muted-dark uppercase tracking-wider">
                      Bhagavad Gītā 12.8
                    </span>
                    <Badge variant="sanctum" className="text-[10px]">
                      Sanskrit
                    </Badge>
                  </div>
                  <p
                    lang="sa"
                    className="font-devanagari leading-relaxed text-gold-antique"
                  >
                    मय्येव मन आधत्स्व मयि बुद्धिं निवेशय।
                  </p>
                  <p className="font-serif text-xs leading-relaxed text-ink-muted-dark">
                    &ldquo;Fix your mind on Me alone and place your intellect in Me; thereafter you will abide in Me without doubt.&rdquo;
                  </p>
                  {previewNote.trim() && (
                    <p className="pt-2 border-t border-white/10 text-[11px] italic text-gold-wash/90">
                      &ldquo;{previewNote.trim()}&rdquo;
                    </p>
                  )}
                </div>

                {/* Live Buttons & Badges Specimen */}
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <Button variant="primary" size="sm" className="text-xs">
                    Primary
                  </Button>
                  <Button variant="secondary" size="sm" className="text-xs">
                    Secondary
                  </Button>
                  <Button variant="gold" size="sm" className="text-xs">
                    Gold
                  </Button>
                  <Badge variant="neutral" className="text-[10px]">
                    Neutral
                  </Badge>
                  <Badge variant="kumkum" className="text-[10px]">
                    Kumkum
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ManuscriptDivider />

      {/* Color Tokens & WCAG Contrast Matrix */}
      <section aria-labelledby="colors-heading" className="space-y-5">
        <div>
          <h2
            id="colors-heading"
            className="font-serif text-2xl font-semibold text-ink"
          >
            Colour System &amp; Accessibility Contrast
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Every text and surface pairing exceeds WCAG AA (4.5:1 minimum).
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {currentTheme.swatches.map((swatch) => (
            <div
              key={swatch.name}
              className="overflow-hidden rounded-[12px] border border-sandalwood-border bg-paper"
            >
              <div
                className="flex h-20 items-end p-3"
                style={{ backgroundColor: swatch.hex }}
              >
                <span
                  className={
                    swatch.dark
                      ? "text-xs font-medium text-ink-on-dark tabular-nums drop-shadow-sm"
                      : "text-xs font-medium text-ink tabular-nums"
                  }
                >
                  {swatch.hex}
                </span>
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-ink">{swatch.name}</p>
                <p className="mt-0.5 truncate text-xs text-ink-muted">
                  {swatch.token}
                </p>
              </div>
            </div>
          ))}
        </div>

        <Card surface="parchment">
          <CardHeader>
            <CardTitle className="text-base">Verified Contrast Pairs ({currentTheme.name})</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {currentTheme.contrastPairs.map((pair) => (
              <div
                key={pair.name}
                className="flex items-center justify-between gap-3 rounded-[10px] border border-sandalwood-border px-3 py-2.5"
                style={{ backgroundColor: pair.bg, color: pair.fg }}
              >
                <span className="text-xs font-medium">{pair.name}</span>
                <span className="shrink-0 text-xs font-semibold tabular-nums">
                  {pair.ratio}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <ManuscriptDivider />

      {/* Typography & Sanskrit Script Verification */}
      <section aria-labelledby="typography-heading" className="space-y-5">
        <div>
          <h2
            id="typography-heading"
            className="font-serif text-2xl font-semibold text-ink"
          >
            Typography &amp; Sanskrit Transliteration
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Cormorant Garamond (display), Noto Serif (reading &amp; IAST), Noto Sans
            (UI), and Tiro Devanagari Sanskrit (Devanāgarī script).
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card surface="parchment">
            <CardHeader>
              <Badge variant="neutral" className="w-fit">
                Display &amp; Body Scale
              </Badge>
              <CardTitle className="mt-2 font-display text-3xl">
                Śrīmad Bhagavad Gītā Layout Specimen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="font-serif text-base leading-relaxed text-ink text-pretty">
                Reading prose uses Noto Serif at comfortable line lengths under 75
                characters so sustained study remains calm and effortless.
              </p>
              <p className="text-sm text-ink-muted tabular-nums">
                UI numerals align strictly with tabular-nums: 016 / 108 / 027.
              </p>
            </CardContent>
          </Card>

          <Card surface="linen">
            <CardHeader>
              <Badge variant="peacock" className="w-fit">
                IAST &amp; Devanāgarī Glyph Coverage
              </Badge>
              <CardTitle className="mt-2">Character Set Specimen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-medium text-ink-muted">
                  Tiro Devanagari Sanskrit (Devanāgarī sample)
                </p>
                <p
                  lang="sa"
                  className="mt-1 font-devanagari text-2xl leading-relaxed text-ink"
                >
                  श्री कृष्ण साधना — अ आ इ ई उ ऊ ऋ ऌ क ख ग घ ङ च छ ज झ ञ
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">
                  Noto Serif (IAST diacritic sample)
                </p>
                <p className="mt-1 font-serif text-lg tracking-normal text-ink">
                  Ā ā Ī ī Ū ū Ṛ ṛ Ṝ ṝ Ḷ ḷ Ṅ ṅ Ñ ñ Ṭ ṭ Ḍ ḍ Ṇ ṇ Ś ś Ṣ ṣ Ṁ ṁ Ḥ ḥ
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <ManuscriptDivider />

      {/* Interactive Reusable Components */}
      <section aria-labelledby="components-heading" className="space-y-6">
        <div>
          <h2
            id="components-heading"
            className="font-serif text-2xl font-semibold text-ink"
          >
            Reusable Component Primitives
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Interactive states, 44px touch targets, layered neutral elevation, and
            keyboard-accessible Radix dialogs.
          </p>
        </div>

        {/* Buttons & Badges */}
        <Card surface="parchment">
          <CardHeader>
            <CardTitle>Buttons &amp; Status Badges</CardTitle>
            <CardDescription>
              Buttons apply a crisp 0.96 press scale on pointer activation with
              high-contrast focus rings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary Action</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="gold">Gold Highlight</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="primary" loading>
                Saving
              </Button>
              <Button variant="secondary" size="icon" aria-label="Confirm check">
                <Check className="size-4" strokeWidth={1.75} aria-hidden={true} />
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 border-t border-sandalwood-border pt-4">
              <Badge variant="neutral">Neutral</Badge>
              <Badge variant="peacock">Target Met</Badge>
              <Badge variant="gold">Carried Balance</Badge>
              <Badge variant="sanctum">Sanctum</Badge>
              <Badge variant="kumkum">Attention Needed</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Form Controls & Progress */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card surface="parchment">
            <CardHeader>
              <CardTitle>Form Inputs &amp; Controls</CardTitle>
              <CardDescription>
                Visible labels, inline validation, and accessible switches.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                id="demo-name"
                label="Display Name"
                hint="Shown only to room co-members when permitted."
                error={nameError}
                required
              >
                <Input
                  id="demo-name"
                  placeholder="Enter display name"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  hasError={Boolean(nameError)}
                />
              </FormField>

              <FormField id="demo-policy" label="Carry-Forward Policy Preview">
                <Select
                  id="demo-policy"
                  value={policySelect}
                  onChange={(e) => setPolicySelect(e.target.value)}
                >
                  <option value="automatic">Automatic carry-forward</option>
                  <option value="optional">Optional confirmation</option>
                  <option value="fresh_daily">Fresh daily target</option>
                  <option value="custom">Custom cap rule</option>
                </Select>
              </FormField>

              <FormField id="demo-notes" label="Reflection Note">
                <Textarea
                  id="demo-notes"
                  placeholder="Write a personal reflection..."
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                />
              </FormField>

              <SwitchField
                id="demo-sound"
                label="Gentle audio feedback"
                description="Configurable tactile or bell chime during Japa practice."
                checked={soundEnabled}
                onCheckedChange={setSoundEnabled}
              />

              <SwitchField
                id="demo-motion"
                label="Prefer static presentation"
                description="Disables ambient motion on immersive visual frames."
                checked={reducedMotionUI}
                onCheckedChange={setReducedMotionUI}
              />
            </CardContent>
          </Card>

          {/* Progress & Dialogs */}
          <div className="flex flex-col gap-6">
            <Card surface="elevated">
              <CardHeader>
                <CardTitle>Progress Primitives (Specimen)</CardTitle>
                <CardDescription>
                  Illustrative UI values only — live chanting data arrives in Phase 3+.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <SacredRingProgress
                  value={12}
                  max={16}
                  label="Specimen ring progress"
                />
                <div className="flex-1 space-y-4">
                  <ProgressBar
                    value={12}
                    max={16}
                    label="Peacock completion tone"
                    tone="peacock"
                  />
                  <ProgressBar
                    value={8}
                    max={16}
                    label="Gold balance tone"
                    tone="gold"
                  />
                </div>
              </CardContent>
            </Card>

            <Card surface="sanctum">
              <CardHeader>
                <CardTitle>Sanctum Surface &amp; Dialog Primitives</CardTitle>
                <CardDescription className="text-ink-muted-dark opacity-100">
                  Keyboard-trapped modal and destructive confirmation dialogs.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProgressBar
                  value={9}
                  max={16}
                  label="Sanctum surface bar"
                  tone="sanctum"
                />
              </CardContent>
              <CardFooter>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="gold">
                      <Info className="size-4" strokeWidth={1.75} aria-hidden={true} />
                      Open Info Dialog
                    </Button>
                  </DialogTrigger>
                  <DialogContent
                    title="Sanctum Keyboard Focus"
                    description="Press Escape or Tab to verify keyboard trapping and focus restoration."
                  >
                    <p className="text-sm leading-relaxed text-ink-muted">
                      Dialogs keep warm ivory reading contrast with layered neutral
                      shadow depth.
                    </p>
                    <div className="mt-5 flex justify-end">
                      <DialogClose asChild>
                        <Button variant="primary">Done</Button>
                      </DialogClose>
                    </div>
                  </DialogContent>
                </Dialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <ShieldAlert
                        className="size-4"
                        strokeWidth={1.75}
                        aria-hidden={true}
                      />
                      Destructive Confirm
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent
                    title="Confirm irreversible action?"
                    description="Irreversible actions always require explicit AlertDialog confirmation."
                    confirmLabel="Confirm action"
                    destructive
                    onConfirm={() =>
                      setConfirmMessage("AlertDialog confirmation handler triggered.")
                    }
                  />
                </AlertDialog>
              </CardFooter>
              {confirmMessage && (
                <p className="mt-3 text-xs text-gold-antique" role="status">
                  {confirmMessage}
                </p>
              )}
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
