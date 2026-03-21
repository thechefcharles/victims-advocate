import { redirect } from "next/navigation";

/** Backward-compatible redirect: advocate home is now `/advocate`. */
export default function AdvocateDashboardRedirectPage() {
  redirect("/advocate");
}
