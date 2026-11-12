import type { Metadata, Viewport } from "next";
import {
  Cormorant_Garamond,
  Noto_Sans,
  Noto_Serif,
  Tiro_Devanagari_Sanskrit,
} from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const notoSerif = Noto_Serif({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-serif",
  display: "swap",
});

const notoSans = Noto_Sans({
  subsets: ["latin", "latin-ext", "devanagari"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans",
  display: "swap",
});

const tiroDevanagari = Tiro_Devanagari_Sanskrit({
  subsets: ["devanagari", "latin", "latin-ext"],
  weight: "400",
  variable: "--font-tiro-devanagari",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "SMARAN",
  title: {
    default: "SMARAN (स्मरण) — Remember Him. Stay Connected.",
    template: "%s · SMARAN",
  },
  description:
    "SMARAN (स्मरण) — Remember Him. Stay Connected. A quiet devotional platform supporting daily chanting consistency, authentic Bhagavad Gītā study, and respectful spiritual community.",
  appleWebApp: {
    capable: true,
    title: "SMARAN",
  },
  openGraph: {
    type: "website",
    title: "SMARAN (स्मरण) — Remember Him. Stay Connected.",
    description:
      "Remember Him. Stay Connected. A quiet devotional sanctuary for daily Japa practice, authentic Bhagavad Gītā study, and respectful community.",
    siteName: "SMARAN",
  },
  twitter: {
    card: "summary_large_image",
    title: "SMARAN (स्मरण) — Remember Him. Stay Connected.",
    description:
      "Remember Him. Stay Connected. A quiet devotional sanctuary for daily Japa practice, authentic Bhagavad Gītā study, and respectful community.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0C152B",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${cormorant.variable} ${notoSerif.variable} ${notoSans.variable} ${tiroDevanagari.variable}`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
