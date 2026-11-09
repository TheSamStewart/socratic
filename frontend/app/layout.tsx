import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/AppProvider";
import { Suspense } from "react";
import Shell from "@/components/Shell";
import { LogoMark } from "@/components/Logo";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-source-serif", weight: ["600", "700"], display: "swap" });

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
                <p className="font-serif text-xl font-semibold">Socratic</p>
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
