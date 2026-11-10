import type { Metadata } from "next";
import { Inter, Merriweather } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/AppProvider";
import { Suspense } from "react";
import Shell from "@/components/Shell";
import { LogoMark } from "@/components/Logo";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const serif = Merriweather({ subsets: ["latin"], variable: "--font-merriweather", weight: ["700"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Socratic", template: "%s · Socratic" },
  description: "Learn by being asked. Socratic checks understanding of your own coursework through feedback, practice and a short spoken viva.",
  applicationName: "Socratic",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full antialiased ${inter.variable} ${serif.variable}`}>
      <body className="h-full">
        <AppProvider>
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center gap-3 bg-page text-ink" role="status">
                <LogoMark size={32} />
                <p className="font-serif text-xl font-bold">Socratic</p>
                <span className="text-sm text-ink3">The University of Manchester</span>
                <span className="text-sm text-ink2">Loading…</span>
              </div>
            }
          >
            <Shell>{children}</Shell>
          </Suspense>
        </AppProvider>
      </body>
    </html>
  );
}
