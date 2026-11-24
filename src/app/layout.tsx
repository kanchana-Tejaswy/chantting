import type { Metadata, Viewport } from "next";
import {
  Cormorant_Garamond,
  Noto_Sans,
  Noto_Serif,
  Tiro_Devanagari_Sanskrit,
} from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { LanguageProvider } from "@/lib/i18n/context";

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
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  title: {
    default: "SMARAN (स्मरण) — Remember Him. Stay Connected.",
    template: "%s · SMARAN",
  },
  description:
    "SMARAN (स्मरण) — Remember Him. Stay Connected. A quiet devotional platform supporting daily chanting consistency, authentic Bhagavad Gītā study, and respectful spiritual community.",
  appleWebApp: {
    capable: true,
    title: "SMARAN",
    statusBarStyle: "default",
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
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="padmaraga-lotus"
      data-scroll-behavior="smooth"
      className={`${cormorant.variable} ${notoSerif.variable} ${notoSans.variable} ${tiroDevanagari.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{document.documentElement.setAttribute("data-theme","padmaraga-lotus");var f=localStorage.getItem("smaran-font-size");if(f){document.documentElement.setAttribute("data-font-size",f);}var l=localStorage.getItem("smaran-language");if(!l){var m=document.cookie.match(/(?:^|; )smaran-language=([^;]+)/);if(m)l=decodeURIComponent(m[1]);}if(l){document.documentElement.lang=l;document.documentElement.dir="ltr";}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased">
        <LanguageProvider>
          <PwaRegister />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
