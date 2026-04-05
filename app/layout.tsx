// app/layout.tsx
import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { Poppins, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import TopNav from "@/components/TopNav";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { I18nProvider } from "@/components/i18n/i18nProvider";
import { StateProvider } from "@/components/state/StateProvider";

const poppins = Poppins({
  variable: "--font-marketing-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-marketing-serif",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NxtStps",
  description: "Trauma-informed victim services infrastructure — Illinois Crime Victims Compensation and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${poppins.variable} ${sourceSerif.variable} ${geistMono.variable} min-h-screen antialiased bg-[var(--color-warm-white)] text-[var(--color-charcoal)]`}
      >
        <AuthProvider>
          <StateProvider>
            <I18nProvider>
              <TopNav />
              {children}
            </I18nProvider>
          </StateProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
