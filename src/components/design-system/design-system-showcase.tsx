"use client";

import * as React from "react";
import { Check, Info, ShieldAlert } from "lucide-react";
import {
  CONTRAST_PAIRS,
  PALETTE,
  getContrastRatio,
} from "@/lib/design/tokens";
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

const SWATCHES = [
  { name: "Krishna Midnight", token: "--ks-krishna-midnight", hex: PALETTE.krishnaMidnight, dark: true },
  { name: "Peacock Deep", token: "--ks-peacock-deep", hex: PALETTE.peacockDeep, dark: true },
  { name: "Peacock Green", token: "--ks-peacock-green", hex: PALETTE.peacockGreen, dark: true },
  { name: "Antique Gold", token: "--ks-gold-antique", hex: PALETTE.antiqueGold, dark: false },
  { name: "Warm Ivory", token: "--ks-ivory", hex: PALETTE.warmIvory, dark: false },
  { name: "Sandalwood Linen", token: "--ks-linen", hex: PALETTE.sandalwoodLinen, dark: false },
  { name: "Sandalwood Umber", token: "--ks-ink-muted", hex: PALETTE.sandalwoodUmber, dark: true },
  { name: "Sacred Kumkum", token: "--ks-kumkum", hex: PALETTE.kumkum, dark: true },
];

export function DesignSystemShowcase() {
  const [nameInput, setNameInput] = React.useState("");
  const [notesInput, setNotesInput] = React.useState("");
  const [policySelect, setPolicySelect] = React.useState("automatic");
  const [soundEnabled, setSoundEnabled] = React.useState(false);
  const [reducedMotionUI, setReducedMotionUI] = React.useState(false);
  const [confirmMessage, setConfirmMessage] = React.useState<string | null>(null);

  const nameError =
    nameInput.length > 0 && nameInput.trim().length < 2
      ? "Please enter at least 2 characters."
      : undefined;

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-5 py-8 sm:px-8 sm:py-12">
      {/* Intro */}
      <header className="max-w-3xl">
        <Badge variant="gold">Phase 2 Design System</Badge>
        <h1 className="mt-3 font-display text-3xl font-semibold text-ink text-balance sm:text-5xl">
          Vrindavan Dusk &amp; Manuscript Ivory
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-muted text-pretty">
          Canonical color tokens, Sanskrit-capable typography, elevation surfaces,
          and accessible interactive primitives shared across SMARAN (स्मरण).
        </p>
      </header>

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
          {SWATCHES.map((swatch) => (
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
                      ? "text-xs font-medium text-ink-on-dark tabular-nums"
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
            <CardTitle className="text-base">Verified Contrast Pairs</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CONTRAST_PAIRS.map((pair) => {
              const ratio = getContrastRatio(pair.fg, pair.bg);
              return (
                <div
                  key={pair.name}
                  className="flex items-center justify-between gap-3 rounded-[10px] border border-sandalwood-border px-3 py-2.5"
                  style={{ backgroundColor: pair.bg, color: pair.fg }}
                >
                  <span className="text-xs font-medium">{pair.name}</span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums">
                    {ratio.toFixed(1)}:1
                  </span>
                </div>
              );
            })}
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

