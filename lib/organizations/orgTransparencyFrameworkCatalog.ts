/**
 * Victim-facing “transparency framework” outline: tier legend + weighted sections and fields.
 * Section 1 values can be merged from `ResponseAccessibilityPublic`; other sections are placeholders until profile/platform wiring.
 */

import {
  RESPONSE_ACCESSIBILITY_FIELD_LABELS,
  type ResponseAccessibilityPublic,
} from "@/lib/organizations/responseAccessibilityPublic";

export type FrameworkFieldSource = "self" | "platform";

export type FrameworkField = {
  id: string;
  label: string;
  source: FrameworkFieldSource;
  dashed?: boolean;
  responseKey?: keyof ResponseAccessibilityPublic;
};

export type FrameworkSectionTheme = "blue" | "purple" | "green" | "orange" | "gray" | "red";

export type FrameworkSection = {
  id: string;
  title: string;
  weightPercent: number;
  theme: FrameworkSectionTheme;
  fields: FrameworkField[];
};

const responseFields: FrameworkField[] = RESPONSE_ACCESSIBILITY_FIELD_LABELS.map(
  ({ key, label, dashed }) => ({
    id: key,
    label,
    source: dashed ? "platform" : "self",
    dashed,
    responseKey: key,
  })
);

export const ORG_TRANSPARENCY_FRAMEWORK_SECTIONS: FrameworkSection[] = [
  {
    id: "response_accessibility",
    title: "Response & Accessibility",
    weightPercent: 25,
    theme: "blue",
    fields: responseFields,
  },
  {
    id: "advocate_competency",
    title: "Advocate Competency & Credentials",
    weightPercent: 20,
    theme: "purple",
    fields: [
      { id: "annual_training", label: "Annual training type (none → national certified)", source: "self" },
      {
        id: "trauma_training",
        label: "Trauma-informed care training (formal / informal)",
        source: "self",
      },
      { id: "ce_requirement", label: "Continuing education requirement", source: "self" },
      { id: "background_checks", label: "Background checks conducted", source: "self" },
      { id: "ethics_policy", label: "Code of ethics / conduct policy", source: "self" },
      { id: "advocate_ratio", label: "Advocate-to-client ratio", source: "self" },
      { id: "designated_advocates", label: "Number of designated victim advocates", source: "self" },
      {
        id: "specialized_training",
        label: "Specialized training (DV, SA, HV, trafficking, youth)",
        source: "self",
      },
      { id: "staffing_mix", label: "Full-time vs. volunteer staffing mix", source: "self" },
    ],
  },
  {
    id: "case_outcomes",
    title: "Case Outcomes & Application Accuracy",
    weightPercent: 20,
    theme: "green",
    fields: [
      { id: "cvc_approval_rate", label: "CVC application approval rate", source: "self" },
      {
        id: "returned_applications",
        label: "Frequency of returned / incomplete applications",
        source: "self",
      },
      { id: "avg_case_time", label: "Average time to complete a case", source: "self" },
      {
        id: "case_tracking_system",
        label: "Case tracking system type (none → formal CMS)",
        source: "self",
      },
      { id: "documentation_tracking", label: "Documentation tracking method", source: "self" },
      {
        id: "case_completion_platform",
        label: "Case completion rate (platform-measured)",
        source: "platform",
        dashed: true,
      },
      {
        id: "intake_completeness_platform",
        label: "Intake completeness quality (platform-measured)",
        source: "platform",
        dashed: true,
      },
      {
        id: "document_submission_ocr",
        label: "Document submission success rate (OCR / completeness)",
        source: "platform",
        dashed: true,
      },
    ],
  },
  {
    id: "victim_experience",
    title: "Victim Experience & Dignity",
    weightPercent: 15,
    theme: "orange",
    fields: [
      {
        id: "client_feedback",
        label: "Client feedback collection method (none → structured)",
        source: "self",
      },
      { id: "informed_choice", label: "Informed choice / client autonomy policy", source: "self" },
      { id: "confidentiality", label: "Confidentiality policy in place", source: "self" },
      {
        id: "trauma_principles",
        label: "Trauma-informed care principles followed",
        source: "self",
      },
      {
        id: "survey_scores_platform",
        label: "Aggregated anonymous survey scores (platform)",
        source: "platform",
        dashed: true,
      },
    ],
  },
  {
    id: "org_reliability",
    title: "Organizational Reliability & Transparency",
    weightPercent: 10,
    theme: "gray",
    fields: [
      {
        id: "compliance_docs",
        label: "Compliance documents uploaded (HIPAA, VOCA, etc.)",
        source: "self",
      },
      {
        id: "services_documented",
        label: "Services publicly and clearly documented",
        source: "self",
      },
      {
        id: "entity_status",
        label: "Registered entity status (Yes / In progress / No)",
        source: "self",
      },
      { id: "funding_disclosed", label: "Funding sources disclosed (phase 2+)", source: "self" },
      {
        id: "availability_updated",
        label: "Availability updated within required timeframe",
        source: "self",
      },
      {
        id: "profile_freshness",
        label: "Data freshness / last profile update (platform)",
        source: "platform",
        dashed: true,
      },
      {
        id: "timeline_consistency",
        label: "Timeline activity consistency (platform)",
        source: "platform",
        dashed: true,
      },
    ],
  },
  {
    id: "community_integration",
    title: "Community & System Integration",
    weightPercent: 10,
    theme: "red",
    fields: [
      { id: "hospital_partnerships", label: "Hospital / clinic partnerships", source: "self" },
      { id: "cvi_coordination", label: "CVI program coordination", source: "self" },
      {
        id: "prosecutor_relationships",
        label: "Prosecutor / State's Attorney relationships",
        source: "self",
      },
      { id: "school_partnerships", label: "School partnerships", source: "self" },
      {
        id: "warm_handoff",
        label: "Warm hand-off practices (Yes / Sometimes / No)",
        source: "self",
      },
      {
        id: "coalition_participation",
        label: "Regional / statewide coalition participation",
        source: "self",
      },
      { id: "national_training", label: "National training participation", source: "self" },
      { id: "crisis_network", label: "Crisis response network membership", source: "self" },
    ],
  },
];

export const FRAMEWORK_THEME_STYLES: Record<
  FrameworkSectionTheme,
  { border: string; headerBg: string; badge: string }
> = {
  blue: {
    border: "border-[var(--color-teal)]/35",
    headerBg: "bg-blue-950/35",
    badge: "bg-[var(--color-teal-deep)]/35 text-blue-100",
  },
  purple: {
    border: "border-purple-500/35",
    headerBg: "bg-purple-950/35",
    badge: "bg-purple-600/35 text-purple-100",
  },
  green: {
    border: "border-emerald-600/35",
    headerBg: "bg-emerald-950/30",
    badge: "bg-emerald-600/35 text-emerald-100",
  },
  orange: {
    border: "border-amber-600/35",
    headerBg: "bg-amber-950/25",
    badge: "bg-amber-600/35 text-amber-100",
  },
  gray: {
    border: "border-[var(--color-muted)]/40",
    headerBg: "bg-[var(--color-light-sand)]/70",
    badge: "bg-[var(--color-light-sand)]/40 text-[var(--color-charcoal)]",
  },
  red: {
    border: "border-red-600/35",
    headerBg: "bg-red-950/30",
    badge: "bg-red-600/35 text-red-100",
  },
};
