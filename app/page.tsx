import type { Metadata } from "next";
import { Suspense } from "react";
import { MarketingHomePage } from "@/components/marketing/MarketingHomePage";
import { TermsDeclinedBanner } from "@/components/marketing/TermsDeclinedBanner";

export const metadata: Metadata = {
  title: "NxtStps — Illinois Crime Victims Compensation",
  description:
    "Trauma-informed platform guiding survivors and advocates through Illinois Crime Victims Compensation—pilot stage, Chicago, IL.",
};

export default function MarketingLandingPage() {
  return (
    <>
      <Suspense fallback={null}>
        <TermsDeclinedBanner />
      </Suspense>
      <MarketingHomePage />
    </>
  );
}
