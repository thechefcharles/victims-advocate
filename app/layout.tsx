// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import { Poppins, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { SkipToMainLink } from "@/components/SkipToMainLink";
import TopNav from "@/components/TopNav";
import { ApplicantPathChrome } from "@/components/applicant/ApplicantPathChrome";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { PilotProgramFeedbackLauncher } from "@/components/pilot/PilotProgramFeedbackLauncher";
import { I18nProvider } from "@/components/i18n/i18nProvider";
import { StateProvider } from "@/components/state/StateProvider";

const poppins = Poppins({
  variable: "--font-marketing-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
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
  description: "Trauma-informed applicant services infrastructure — Illinois Crime Victims Compensation and more.",
};

/** Phase 7 — never block zoom (accessibility); safe-area for notched devices */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontVars = `${poppins.variable} ${sourceSerif.variable} ${geistMono.variable}`;
  return (
    <html lang="en" className={fontVars}>
      <body className="min-h-screen antialiased bg-[var(--color-bg)] text-[var(--color-charcoal)]">
        <AuthProvider>
          <StateProvider>
            <I18nProvider>
              <SkipToMainLink />
              <TopNav />
              <div id="main-content" tabIndex={-1} className="nxt-main-content-region">
                {children}
              </div>
              <ApplicantPathChrome />
              <PilotProgramFeedbackLauncher />
            </I18nProvider>
          </StateProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
