/**
 * Serializable “Response & accessibility” summary for victim-facing org map + learn-more UI.
 * Built on the server from organization profile fields.
 */

export type ResponseAccessibilityPublic = {
  avg_response_time: string;
  support_24_7: string;
  operating_hours: string;
  languages_count: string;
  ada_accommodations: string;
  interpretation: string;
  remote_virtual: string;
  transportation: string;
  intake_methods: string;
  /** Platform-measured metric (not yet wired). */
  platform_measured_response: string;
};

export const RESPONSE_ACCESSIBILITY_FIELD_LABELS: readonly { key: keyof ResponseAccessibilityPublic; label: string; dashed?: boolean }[] =
  [
    { key: "avg_response_time", label: "Average response time to new requests" },
    { key: "support_24_7", label: "24/7 support availability" },
    { key: "operating_hours", label: "Operating hours" },
    { key: "languages_count", label: "Languages supported (count)" },
    { key: "ada_accommodations", label: "ADA / disability accommodations" },
    { key: "interpretation", label: "Interpretation services" },
    { key: "remote_virtual", label: "Remote / virtual services offered" },
    { key: "transportation", label: "Transportation support" },
    { key: "intake_methods", label: "Intake methods (phone, walk-in, online)" },
    { key: "platform_measured_response", label: "Avg response time (platform-measured)", dashed: true },
  ] as const;
