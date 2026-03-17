import type { AuthContext } from "@/lib/server/auth";
import { getSafeNotificationMode, getSafetySettings, isSafetyModeEnabled } from "./settings";

export { getSafetySettings, isSafetyModeEnabled, getSafeNotificationMode };
export type { SafeNotificationMode, SafetySettings } from "./types";

export function requireSafetyOwner(ctx: AuthContext | null): asserts ctx is AuthContext {
  if (!ctx?.userId) {
    throw new Error("Auth required");
  }
}

