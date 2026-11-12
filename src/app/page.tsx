import Link from "next/link";
import {
  BookOpen,
  Compass,
  Flame,
  Library,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import {
  LotusEmblem,
  ManuscriptDivider,
} from "@/components/sacred/ornaments";
import { VeoHeroBackground } from "@/components/sacred/veo-media-frame";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const PILLARS = [
  {
    icon: Flame,
    title: "Personal Sādhana & Japa Mala",
    tag: "Private",
    href: "/sadhana",
    cta: "Open Personal Sādhana",
    description:
      "Distraction-free round tracking, interactive 108-bead digital Japa Mala, automatic or optional carry-forward balance, and an honest annual consistency heatmap.",
  },
  {
    icon: BookOpen,
    title: "Bhagavad Gītā Centre",
    tag: "Attributed",
    href: "/gita",
    cta: "Explore 18 Chapters",
    description:
      "Clear separation of Sanskrit Devanāgarī, IAST transliteration, attributed licensed translations, human-reviewed commentary, and private study vaults.",
  },
  {
    icon: Library,
    title: "Spiritual Library",
    tag: "Curated",
    href: "/library",
    cta: "Browse Library",
    description:
      "Verified study guides, Japa meditation resources, devotional articles, talks, and approved external links—kept calm and strictly attributed.",
  },
  {
    icon: Users,
    title: "Satsang",
    tag: "Consented",
    href: "/rooms",
    cta: "Join Satsang",
    description:
      "Quiet public and invite-only circles with voluntary shared goals while every member retains full ownership over private chanting records.",
  },
];

export default function HomePage() {
  return (
    <AppShell pageTitle="SMARAN — स्मरण">
      {/* Immersive Sanctum Introduction (extends behind frosted glass sidebar on desktop) */}
      <section className="relative flex min-h-[calc(100dvh-7.25rem-env(safe-area-inset-bottom))] items-center overflow-hidden border-b border-gold-antique/25 bg-[#0D1117] text-ink-on-dark lg:-ml-64 lg:min-h-[calc(100dvh-3.5rem-1px)] lg:pl-64">
        <VeoHeroBackground
          videoSrc="/media/vrindavan-lake-boat.mp4"
          alt="Tranquil Vrindavan twilight lake with a wooden devotional boat drifting across calm water"
        />

        <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-10 px-5 pt-10 pb-20 sm:px-8 sm:pt-12 sm:pb-20 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-12 lg:py-16">
          <div className="flex flex-col items-start">
            <Badge variant="sanctum" className="bg-black/45 backdrop-blur-xs">
              <LotusEmblem size={14} className="text-gold-antique" />
              <span>Non-profit devotional platform</span>
            </Badge>

            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ink-on-dark text-balance drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)] sm:text-5xl lg:text-6xl">
              SMARAN{" "}
              <span className="font-devanagari text-2xl font-normal text-gold-antique sm:text-3xl lg:text-4xl">
                स्मरण
              </span>
            </h1>

            <p className="mt-2 font-serif text-sm tracking-wide text-gold-antique/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)] sm:text-base">
              Remember Him. Stay Connected.
            </p>

            <p className="mt-5 max-w-xl font-serif text-base leading-relaxed text-ink-on-dark/90 text-pretty drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] sm:text-lg">
              A quiet digital sanctuary built to sustain daily Japa practice,
              authentic Bhagavad Gītā study, and respectful community—without
              commercial pressure, rankings, or distraction.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link
                href="/sadhana"
                className={buttonStyles({ variant: "gold", size: "lg" })}
              >
                Open Personal Sādhana
              </Link>
              <Link
                href="/gita"
                className={buttonStyles({
                  variant: "outline",
                  size: "lg",
                  className:
                    "border-white/35 bg-black/40 text-ink-on-dark backdrop-blur-[2px] hover:border-gold-antique/60 hover:bg-black/60",
                })}
              >
                Read Bhagavad Gītā
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/20 pt-6 text-xs text-ink-on-dark/85 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck
                  className="size-4 text-gold-antique"
                  strokeWidth={1.5}
                  aria-hidden={true}
                />
                Private chanting records by default
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Compass
                  className="size-4 text-gold-antique"
                  strokeWidth={1.5}
                  aria-hidden={true}
                />
                Technology serves devotion
              </span>
            </div>
          </div>

          <div
            aria-hidden="true"
            className="hidden min-h-[260px] lg:block"
          />
        </div>
      </section>

      {/* Calm Ivory Workspace Surface */}
      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <ManuscriptDivider className="mb-10" />

        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-semibold text-ink text-balance sm:text-4xl">
            Quiet spaces tailored to devotion
          </h2>
          <p className="mt-3 text-base leading-relaxed text-ink-muted text-pretty">
            Landing introductions carry the serenity of Yamuna twilight. Daily
            chanting, analytics, Bhagavad Gītā reading, library articles, and
            account privacy controls live on calm sandalwood parchment.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <Card
                key={pillar.title}
                surface="parchment"
                className="flex flex-col transition-[transform,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5 [@media(hover:hover)_and_(pointer:fine)]:hover:border-gold-border/60 [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-sacred-sm"
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex size-10 items-center justify-center rounded-[10px] bg-linen text-peacock-deep">
                      <Icon
                        className="size-5"
                        strokeWidth={1.5}
                        aria-hidden={true}
                      />
                    </span>
                    <Badge variant="gold">{pillar.tag}</Badge>
                  </div>
                  <CardTitle className="mt-3">{pillar.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <CardDescription className="text-ink-muted opacity-100">
                    {pillar.description}
                  </CardDescription>
                </CardContent>
                <CardFooter>
                  <Link
                    href={pillar.href}
                    className={buttonStyles({ variant: "secondary", size: "sm" })}
                  >
                    {pillar.cta}
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <Card surface="linen" className="mt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <h3 className="font-serif text-lg font-semibold text-ink">
                Full Ownership Over Your Practice &amp; Data
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted text-pretty">
                Review room privacy settings, quiet-hour notifications, private
                milestones, JSON data exports, or permanent account deletion
                anytime in your Account workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/account"
                className={buttonStyles({ variant: "primary", size: "md" })}
              >
                Account &amp; Privacy
              </Link>
              <Link
                href="/design-system"
                className={buttonStyles({ variant: "secondary", size: "md" })}
              >
                Design System
              </Link>
            </div>
          </div>
        </Card>
      </section>
    </AppShell>
  );
}
