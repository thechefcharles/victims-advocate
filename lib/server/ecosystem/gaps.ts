/**
 * Phase G: Demand–supply and system health gaps (neutral, operational language).
 */

import type { EcosystemFilters, EcosystemGap, GapSeverity } from "./types";

function regionKey(filters: EcosystemFilters): string {
  if (filters.state && filters.county) return `${filters.state}/${filters.county}`;
  if (filters.state) return filters.state;
  return "national";
}

export function computeEcosystemGaps(params: {
  filters: EcosystemFilters;
  activeOrgs: number;
  acceptingOrgs: number;
  capacityWaitlistOrLimited: number;
  demandService: Record<string, number>;
  supplyService: Record<string, number>;
  demandLanguage: Record<string, number>;
  supplyLanguage: Record<string, number>;
  noMatchRuns: number;
  totalMatchRuns: number;
  lowTierOnlyRuns: number;
  orgsInsufficientDesignation: number;
  orgsLowConfidenceDesignation: number;
  orgsMinimalProfile: number;
  accessibilityDemandCount: number;
  orgsWithWheelchair: number;
  orgsWithInterpreter: number;
}): EcosystemGap[] {
  const rk = regionKey(params.filters);
  const gaps: EcosystemGap[] = [];

  const add = (
    gap_type: string,
    severity: GapSeverity,
    title: string,
    description: string,
    supporting_metrics: Record<string, number | string>,
    action_hint: string
  ) => {
    gaps.push({
      gap_type,
      severity,
      region_key: rk,
      title,
      description,
      supporting_metrics,
      action_hint,
    });
  };

  if (params.activeOrgs > 0 && params.activeOrgs < 4) {
    add(
      "low_org_density",
      params.activeOrgs === 1 ? "high" : "medium",
      "Few active provider organizations in view",
      "The filtered region shows a small number of organizations with active profiles. Coverage may be thin for survivors seeking in-network options.",
      { active_organizations: params.activeOrgs },
      "Consider outreach to expand participating organizations in this geography."
    );
  }

  for (const [svc, d] of Object.entries(params.demandService)) {
    if (d < 2) continue;
    const s = params.supplyService[svc] ?? 0;
    if (s === 0 || d / Math.max(s, 1) >= 2.5) {
      add(
        "low_service_supply",
        s === 0 ? "high" : "medium",
        `Demand signal for ${svc.replace(/_/g, " ")} outpaces visible supply`,
        "Recent matching activity suggests need for this service type more often than organizations in view list it on their profile.",
        { demand_runs_mentioning_service: d, orgs_listing_service: s, service: svc },
        "Encourage organizations that offer this work to list it clearly on their profile."
      );
    }
  }

  for (const [lang, d] of Object.entries(params.demandLanguage)) {
    if (d < 2 || !lang || lang === "en") continue;
    const s = params.supplyLanguage[lang] ?? 0;
    if (s <= 1 && d >= 2) {
      add(
        "low_language_coverage",
        "medium",
        `${lang.toUpperCase()} language support may be limited in view`,
        "Matching demand references this language more than organizations in the filtered set advertise.",
        { demand_mentions: d, orgs_listing_language: s, language: lang },
        "Highlight bilingual capacity where it exists; consider targeted provider recruitment."
      );
    }
  }

  const capPressure =
    params.capacityWaitlistOrLimited / Math.max(params.activeOrgs, 1);
  if (params.activeOrgs >= 3 && capPressure >= 0.45) {
    add(
      "high_waitlist_pressure",
      capPressure >= 0.65 ? "high" : "medium",
      "Many organizations report limited capacity or waitlist",
      "A large share of organizations in this view are not fully open or are on waitlist, which can constrain warm handoffs.",
      {
        orgs_waitlist_or_limited: params.capacityWaitlistOrLimited,
        active_organizations: params.activeOrgs,
      },
      "Review capacity fields with partners and set expectations with advocates."
    );
  }

  if (params.totalMatchRuns >= 5) {
    const noRate = params.noMatchRuns / params.totalMatchRuns;
    if (noRate >= 0.2) {
      add(
        "high_no_match_rate",
        noRate >= 0.35 ? "high" : "medium",
        "Elevated share of matching runs with no suggested organizations",
        "A noticeable portion of recent runs produced no matches — often due to strict filters or profile gaps.",
        {
          no_match_runs: params.noMatchRuns,
          total_match_runs: params.totalMatchRuns,
        },
        "Check org profiles and service coverage; widen intake signals where appropriate."
      );
    }
    const lowRate = params.lowTierOnlyRuns / params.totalMatchRuns;
    if (lowRate >= 0.35 && params.noMatchRuns / params.totalMatchRuns < 0.2) {
      add(
        "high_no_match_rate",
        "low",
        "Many runs yield only tentative matches",
        "Several recent runs returned only limited-tier suggestions, which may indicate thin fit or incomplete profiles.",
        {
          low_tier_heavy_runs: params.lowTierOnlyRuns,
          total_match_runs: params.totalMatchRuns,
        },
        "Improve profile completeness and service coverage metadata."
      );
    }
  }

  if (params.activeOrgs >= 4) {
    const insShare = params.orgsInsufficientDesignation / params.activeOrgs;
    if (insShare >= 0.35) {
      add(
        "designation_data_gap",
        "medium",
        "Many organizations lack sufficient data for a confident designation",
        "A substantial portion of organizations rely on insufficient-data designation, which limits readiness signaling.",
        {
          orgs_insufficient_data_designation: params.orgsInsufficientDesignation,
          active_organizations: params.activeOrgs,
        },
        "Prompt organizations to complete workflows that feed designation inputs."
      );
    }
    const lowShare = params.orgsLowConfidenceDesignation / params.activeOrgs;
    if (lowShare >= 0.25) {
      add(
        "designation_data_gap",
        "low",
        "Several organizations have low-confidence designations",
        "Low-confidence tiers reflect limited evidence on file, not poor quality of services.",
        {
          orgs_low_confidence_designation: params.orgsLowConfidenceDesignation,
        },
        "Continue collecting structured workflow evidence over time."
      );
    }
  }

  if (params.accessibilityDemandCount >= 3) {
    const wheelGap =
      params.orgsWithWheelchair < 2 && params.accessibilityDemandCount >= 4;
    const intGap =
      params.orgsWithInterpreter < 2 && params.accessibilityDemandCount >= 4;
    if (wheelGap) {
      add(
        "low_accessibility_coverage",
        "medium",
        "Wheelchair access appears unlisted for many organizations in view",
        "Recent matching includes accessibility needs; few org profiles explicitly list wheelchair access.",
        {
          demand_runs_with_accessibility_needs: params.accessibilityDemandCount,
          orgs_listing_wheelchair_access: params.orgsWithWheelchair,
        },
        "Ask partners to confirm and record accessibility features."
      );
    }
    if (intGap) {
      add(
        "low_accessibility_coverage",
        "low",
        "Interpreter-related needs outpace listed interpreter support",
        "Demand signals reference interpreters; supply-side listings may be under-recorded.",
        {
          orgs_listing_interpreters: params.orgsWithInterpreter,
        },
        "Update accessibility and language fields where services exist."
      );
    }
  }

  if (params.activeOrgs >= 5 && params.orgsMinimalProfile / params.activeOrgs >= 0.4) {
    add(
      "low_service_supply",
      "low",
      "Many organization profiles are minimally complete",
      "Incomplete profiles make matching and routing less reliable even when services exist.",
      {
        orgs_minimal_profile: params.orgsMinimalProfile,
        active_organizations: params.activeOrgs,
      },
      "Run profile completeness campaigns with tenant organizations."
    );
  }

  gaps.sort((a, b) => {
    const sev = { high: 0, medium: 1, low: 2 };
    if (sev[a.severity] !== sev[b.severity]) return sev[a.severity] - sev[b.severity];
    return a.title.localeCompare(b.title);
  });

  return gaps;
}
