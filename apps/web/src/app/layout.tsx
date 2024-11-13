import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { OfflineIndicator } from "@/components/pwa/offline-indicator";
import { BottomNav } from "@/components/layout/bottom-nav";
import { auth } from "@infra/auth/auth";
import { headers } from "next/headers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dorloter.fr";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Dorloter · adopter, retrouver, prendre soin",
    template: "%s · Dorloter",
  },
  description:
    "Plateforme française pour adopter un animal en refuge ou signaler un compagnon perdu ou trouvé. Chats, chiens, géolocalisation et mise en relation automatique.",
  applicationName: "Dorloter",
  authors: [{ name: "Dorloter", url: siteUrl }],
  keywords: [
    "adoption",
    "chat",
    "chien",
    "refuge",
    "association",
    "animal perdu",
    "animal trouvé",
    "pension",
    "France",
  ],
  category: "Animaux",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Dorloter",
    url: siteUrl,
    title: "Dorloter · adopter, retrouver, prendre soin",
    description:
      "Trouvez votre prochain compagnon parmi les refuges partenaires, ou aidez à réunir une famille avec l'animal qu'elle cherche.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dorloter · adopter, retrouver, prendre soin",
    description:
      "Plateforme française pour l'adoption en refuge et les retrouvailles d'animaux perdus.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  appleWebApp: {
    capable: true,
    title: "Dorloter",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#e8634d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);

  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col pb-16 md:pb-0">
        {/* Skip link : accessible au clavier (Tab depuis le haut), invisible
            tant que non focus. Cible `#main`, qui doit être présent sur
            chaque page (cf. <main id="main"> dans les layouts/pages). */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-full focus:bg-coral-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-coral-200"
        >
          Aller au contenu
        </a>
        <OfflineIndicator />
        {children}
        <BottomNav isSignedIn={!!session} />
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast: "!font-sans !border !border-border",
            },
          }}
        />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
