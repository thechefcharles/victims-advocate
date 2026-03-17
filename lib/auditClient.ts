/**
 * Client-side helper to log auth events. Fire-and-forget.
 */
export async function logAuthEvent(
  action: "auth.signup" | "auth.login" | "auth.logout" | "auth.password_reset_requested" | "auth.password_reset_completed",
  accessToken?: string | null
): Promise<void> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }
    await fetch("/api/audit/log-auth-event", {
      method: "POST",
      headers,
      body: JSON.stringify({ action }),
    });
  } catch {
    // Fire-and-forget; never block auth flows
  }
}
