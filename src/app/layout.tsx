import type { Metadata } from "next";
import localFont from "next/font/local";
import { Geist } from "next/font/google";
import { Instrument_Serif } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/lib/i18n/context";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const miSans = localFont({
  src: [
    { path: "../fonts/MiSans-Light.ttf", weight: "300", style: "normal" },
    { path: "../fonts/MiSans-Regular.ttf", weight: "400", style: "normal" },
    { path: "../fonts/MiSans-Medium.ttf", weight: "500", style: "normal" },
    { path: "../fonts/MiSans-Semibold.ttf", weight: "600", style: "normal" },
    { path: "../fonts/MiSans-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-misans",
  display: "swap",
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Lumora — Illuminate Your Web Presence",
  description:
    "Deep SEO & AI Search (GEO) analysis with intelligent fix suggestions. Scan any URL to uncover optimization opportunities.",
  keywords: ["SEO", "GEO", "AI Search Optimization", "Website Analysis", "SEO Audit"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${miSans.variable} ${geist.variable} ${instrumentSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Script src="/gradient.js" strategy="beforeInteractive" />
        <ThemeProvider>
          <LanguageProvider>
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
