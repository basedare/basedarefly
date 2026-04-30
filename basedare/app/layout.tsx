import type { Metadata, Viewport } from "next";
import "@fontsource/figtree/400.css";
import "@fontsource/figtree/500.css";
import "@fontsource/figtree/600.css";
import "@fontsource/figtree/700.css";
import "@fontsource/figtree/800.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/700.css";
import "maplibre-gl/dist/maplibre-gl.css";
import localFont from "next/font/local";
import "./global.css";
import { Providers } from "@/components/Providers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LivePotBubble from "@/components/LivePotBubble";
import LivePotPortal from "@/components/LivePotPortal";
import { LiquidFilter } from "@/components/ui/LiquidFilter";
import ClientLoader from "@/components/ClientLoader";
import BackgroundLayers from "@/components/BackgroundLayers";
import { Toaster } from "@/components/ui/toaster";
import MobileLightningFlash from "@/components/MobileLightningFlash";
import PwaRegistrar from "@/components/PwaRegistrar";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import MobileIgnitionField from "@/components/MobileIgnitionField";

// FIXED PATH
import { IgnitionProvider } from "@/app/context/IgnitionContext";
import { ViewProvider } from "@/app/context/ViewContext";

// Body - Figtree, bundled locally via @fontsource files
const figtree = localFont({
  src: [
    {
      path: "../node_modules/@fontsource/figtree/files/figtree-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/figtree/files/figtree-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/figtree/files/figtree-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/figtree/files/figtree-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/figtree/files/figtree-latin-800-normal.woff2",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-alpha",
  display: "swap",
});

// Display - Alpha Lyrae, already self-hosted in the repo
const alphaLyrae = localFont({
  src: "../public/fonts/AlphaLyrae-Medium.woff2",
  variable: "--font-bricolage",
  weight: "500",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://basedare.xyz"),
  title: "BaseDare — Own the Grid",
  description: "Get paid to complete IRL dares at real venues near you. Real payouts. On-chain proof. Every pin is a legend.",
  applicationName: "BaseDare",
  manifest: "/manifest.webmanifest",
  formatDetection: {
    telephone: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BaseDare",
  },
  openGraph: {
    title: "BaseDare — Own the Grid",
    description: "Get paid to complete IRL dares at real venues near you. Real payouts. On-chain proof. Every pin is a legend.",
    url: "https://basedare.xyz",
    siteName: "BaseDare",
    images: [
      {
        url: "/assets/basedarenew.png",
        alt: "BaseDare — Own the Grid",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BaseDare — Own the Grid",
    description: "Get paid to complete IRL dares at real venues near you. Real payouts. On-chain proof. Every pin is a legend.",
    images: ["/assets/basedarenew.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#050510",
  colorScheme: "dark",
};

export default function RootLayout({ 
  children 
}: Readonly<{ 
  children: React.ReactNode; 
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${figtree.variable} ${alphaLyrae.variable} font-sans bg-[#020204] text-white min-h-screen overflow-x-hidden`}>
        <LiquidFilter />
        <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-b from-black via-[#050510] to-black md:hidden" />
        <div className="hidden md:block">
          <BackgroundLayers />
        </div>

        {/* Mobile-only periodic lightning flash */}
        <MobileLightningFlash />
        <PwaRegistrar />
        <PwaInstallPrompt />

        <ClientLoader>
          <Providers>
            <ViewProvider>
              <IgnitionProvider>
                <MobileIgnitionField />
                <div className="bd-app-shell relative z-10 flex min-h-screen flex-col">
                  <Navbar />
                  <main className="pt-24">
                    {children}
                  </main>
                  <Footer />
                </div>
                <LivePotPortal>
                  <LivePotBubble />
                </LivePotPortal>
              </IgnitionProvider>
            </ViewProvider>
            <Toaster />
          </Providers>
        </ClientLoader>
      </body>
    </html>
  );
}
