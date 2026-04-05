import type { Metadata } from "next";
import { MarketingHomePage } from "@/components/marketing/MarketingHomePage";

export const metadata: Metadata = {
  title: "NxtStps — Illinois Crime Victims Compensation",
  description:
    "Trauma-informed platform guiding survivors and advocates through Illinois Crime Victims Compensation—pilot stage, Chicago, IL.",
};

export default function MarketingLandingPage() {
  return <MarketingHomePage />;
}
