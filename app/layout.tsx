import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { OfflineIndicator } from "@/components/pwa/offline-indicator";
import { UpdateToast } from "@/components/pwa/update-toast";
import { siteConfig } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });
const display = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin"], display: "swap", weight: ["600", "700", "800"] });

const SPLASH: [number, number, number][] = [
  [430, 932, 3],
  [393, 852, 3],
  [390, 844, 3],
  [375, 812, 3],
  [414, 896, 2],
  [375, 667, 2],
  [820, 1180, 2],
  [1024, 1366, 2],
];

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name}: split group trip expenses & settle over UPI`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [...siteConfig.keywords],
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  alternates: { canonical: "/" },
  formatDetection: { telephone: false, email: false, address: false },
  appleWebApp: {
    capable: true,
    title: siteConfig.name,
    statusBarStyle: "default",
    startupImage: SPLASH.map(([w, h, dpr]) => ({
      url: `/splash/splash-${w}x${h}@${dpr}x.png`,
      media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`,
    })),
  },
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    locale: siteConfig.locale,
    url: "/",
    title: `${siteConfig.name}: ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: [{ url: "/og/og.png", width: 1200, height: 630, type: "image/png", alt: `${siteConfig.name}: ${siteConfig.tagline}` }],
  },
  twitter: {
    card: "summary_large_image",
    site: siteConfig.twitter,
    title: `${siteConfig.name}: ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: [{ url: "/og/og.png", alt: `${siteConfig.name}: ${siteConfig.tagline}` }],
  },
  robots: { index: true, follow: true },
  category: "finance",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4FAF9" },
    { media: "(prefers-color-scheme: dark)", color: "#0E1622" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-IN"
      dir="ltr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>
          <OfflineIndicator />
          {children}
          <InstallPrompt />
          <UpdateToast />
        </Providers>
      </body>
    </html>
  );
}
