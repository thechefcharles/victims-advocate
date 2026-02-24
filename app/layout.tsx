// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import TopNav from "@/components/TopNav";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { I18nProvider } from "@/components/i18n/i18nProvider";
import { StateProvider } from "@/components/state/StateProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NxtStps",
  description: "Trauma-informed, AI-powered victim support",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#020b16] text-slate-50 antialiased">
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