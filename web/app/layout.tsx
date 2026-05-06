import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ThemeProvider } from "@/components/ui/ThemeProvider";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Bovino — Compra e venda de gado", template: "%s | Bovino" },
  description: "O maior mercado de gado bovino do Brasil. Compre e venda nelore, angus, girolando e mais — direto do produtor.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Bovino" },
  openGraph: { type: "website", locale: "pt_BR", siteName: "Bovino" },
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <Providers>
          <ThemeProvider />
          {children}
        </Providers>
      </body>
    </html>
  );
}
