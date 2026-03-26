import { redirect } from "next/navigation";

/** Legacy URL: forwards to unified signup with Advocate selected. */
export default function AdvocateSignupRedirectPage() {
  redirect("/signup?intent=advocate");
}
