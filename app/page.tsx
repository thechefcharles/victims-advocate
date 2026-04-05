import type { Metadata } from "next";
import { Poppins, Source_Serif_4 } from "next/font/google";
import { MarketingHomePage } from "@/components/marketing/MarketingHomePage";

export const metadata: Metadata = {
  title: "NxtStps — Illinois Crime Victims Compensation",
  description:
    "Trauma-informed platform guiding survivors and advocates through Illinois Crime Victims Compensation—pilot stage, Chicago, IL.",
};

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-marketing-sans",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-marketing-serif",
  display: "swap",
});

export default function MarketingLandingPage() {
  return (
    <div className={`${poppins.variable} ${sourceSerif.variable} min-h-screen`}>
      <MarketingHomePage />
    </div>
  );
}
