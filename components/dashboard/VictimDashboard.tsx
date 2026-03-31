// components/dashboard/VictimDashboard.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FunnelStepId } from "@/lib/victimDashboardFunnel";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/components/i18n/i18nProvider";
import { logAuthEvent } from "@/lib/auditClient";
import { emptyCompensationApplication } from "@/lib/compensationSchema";
import { useSafetySettings } from "@/lib/client/safety/useSafetySettings";
import {
  ROUTES,
  victimCasePaths,
  compensationIntakeMessagesUrl,
} from "@/lib/routes/pageRegistry";
import { useStateSelection } from "@/components/state/StateProvider";
import { PageHeader } from "@/components/layout/PageHeader";
import { PrimaryActionArea } from "@/components/layout/PrimaryActionArea";
import { APP_CARD, APP_PAGE_MAIN } from "@/lib/ui/appSurface";
import { hasBlockingDocumentGap, type CompletenessSignal } from "@/lib/product/nextAction";
import { priorityRingClassName } from "@/lib/product/priority";
import {
  canClickVictimFunnelStep,
  getVictimFunnelSteps,
  getEligibilitySkippedFromApplication,
} from "@/lib/victimDashboardFunnel";
import { VictimFunnelStepper } from "@/components/dashboard/VictimFunnelStepper";
import { VictimProfileCompletionBanner } from "@/components/dashboard/VictimProfileCompletionBanner";
import { useAuth } from "@/components/auth/AuthProvider";
import { victimWelcomeDisplayName } from "@/lib/personalInfo";

const LEGACY_ORG_DISPLAY_NAME = "Legacy (pre-tenant)";

const ACTIVE_CASE_KEY_PREFIX = "nxtstps_active_case_";
const PROGRESS_KEY_PREFIX = "nxtstps_intake_progress_";

type EligibilityResult = "eligible" | "needs_review" | "not_eligible" | null;

type CaseRow = {
  id: string;
  name?: string | null;
  created_at?: string;
  updated_at?: string | null;
  status?: string;
  state_code?: string;
  application?: any;
  eligibility_result?: EligibilityResult;
  eligibility_readiness?: string | null;
  eligibility_completed_at?: string | null;
  organization_id?: string | null;
  access?: { role?: "owner" | "advocate"; can_view?: boolean; can_edit?: boolean };
};

type SupportTeamPayload = {
  organization: { id: string; name: string } | null;
  advocates: { id: string; label: string }[];
  advocateConnectionPending?: boolean;
};

type SupportOverviewPayload = {
  pending_org_connects: { id: string; organization_id: string; organization_name: string }[];
  advocate_connection_pending: boolean;
  pending_advocate_requests: { id: string; advocate_label: string }[];
};

function getCaseDisplayName(c: CaseRow): string {
  if (c.name?.trim()) return c.name.trim();
  const app = c.application;
  if (app?.victim?.firstName || app?.victim?.lastName) {
    const first = (app.victim.firstName ?? "").trim();
    const last = (app.victim.lastName ?? "").trim();
    const full = `${first} ${last}`.trim();
    if (full) return full;
  }
  return `Case ${c.id.slice(0, 8)}…`;
}

function safeGetItem(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSetItem(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}
function safeRemoveItem(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

function PrimaryActionSkeleton() {
  return (
    <div
      className={`${APP_CARD} animate-pulse rounded-2xl border border-slate-700 bg-slate-900 p-6 sm:p-7 space-y-4`}
      aria-hidden
    >
      <div className="h-3 w-40 rounded bg-slate-700/80" />
      <div className="h-4 w-full max-w-md rounded bg-slate-700/60" />
      <div className="h-10 w-44 rounded-full bg-emerald-900/40" />
    </div>
  );
}

function CaseActivitySkeleton() {
  return (
    <div className={`${APP_CARD} space-y-3 animate-pulse`} aria-hidden>
      <div className="h-3 w-56 rounded bg-slate-700/70" />
      <div className="h-3 w-full rounded bg-slate-800/80" />
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center justify-between gap-3 border-b border-slate-800/80 py-3 last:border-0">
          <div className="h-4 w-28 rounded bg-slate-700/60" />
          <div className="h-3 w-24 rounded bg-slate-800/80" />
        </div>
      ))}
    </div>
  );
}

export default function VictimDashboard({
  userId,
  token,
}: {
  userId: string;
  token: string | null;
}) {
  const router = useRouter();
  const { t, tf } = useI18n();
  const { personalInfo } = useAuth();
  const { strictPreviews } = useSafetySettings(token);

  const dashboardHeaderTitle = useMemo(() => {
    const name = victimWelcomeDisplayName(personalInfo);
    if (name) return tf("victimDashboard.welcomeTitle", { name });
    return t("victimDashboard.title");
  }, [personalInfo, t, tf]);

  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [creatingCase, setCreatingCase] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; displayName: string } | null>(
    null
  );
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  /** Apply now: path (advocate vs self) → state (IL/IN) → optional eligible review. */
  const [applyModalMode, setApplyModalMode] = useState<"apply" | "eligible" | null>(null);
  const [applyModalStep, setApplyModalStep] = useState<"path" | "state" | "eligibleReview">(
    "path"
  );
  const [pendingState, setPendingState] = useState<"IL" | "IN">("IL");
  const { setStateCode: setGlobalStateCode } = useStateSelection();
  const [supportTeam, setSupportTeam] = useState<SupportTeamPayload | null>(null);
  const [supportTeamLoading, setSupportTeamLoading] = useState(false);
  const [supportOverview, setSupportOverview] = useState<SupportOverviewPayload | null>(null);
  const [supportOverviewLoading, setSupportOverviewLoading] = useState(false);

  const [messagesUnread, setMessagesUnread] = useState(0);
  const [messagesTotal, setMessagesTotal] = useState(0);
  const [completenessResult, setCompletenessResult] = useState<CompletenessSignal | null>(null);
  const [matchCount, setMatchCount] = useState(0);
  const [secondaryLoading, setSecondaryLoading] = useState(false);

  const readActiveCase = useCallback(
    (uid: string) => safeGetItem(`${ACTIVE_CASE_KEY_PREFIX}${uid}`),
    []
  );

  const clearPointers = useCallback((uid: string) => {
    safeRemoveItem(`${ACTIVE_CASE_KEY_PREFIX}${uid}`);
    safeRemoveItem(`${PROGRESS_KEY_PREFIX}${uid}`);
  }, []);

  const refetch = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setCases([]);
      setErr(t("victimDashboard.sessionExpired"));
      router.replace("/login");
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      const res = await fetch("/api/compensation/cases", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(await res.text());

      const json = await res.json();
      const rows = (json.cases ?? []) as CaseRow[];

      setCases(rows.filter((c) => c.access?.role === "owner"));
    } catch (e) {
      console.error(e);
      setErr(t("victimDashboard.loadError"));
    } finally {
      setLoading(false);
    }
  }, [token, router, t]);

  useEffect(() => {
    setActiveCaseId(readActiveCase(userId));
    void refetch();
  }, [userId, readActiveCase, refetch]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      const key = `${ACTIVE_CASE_KEY_PREFIX}${userId}`;
      if (e.key === key) setActiveCaseId(readActiveCase(userId));
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [userId, readActiveCase]);

  /** Focus first case when needed; clear pointer when no cases */
  useEffect(() => {
    if (loading) return;
    if (cases.length === 0) {
      if (activeCaseId) {
        clearPointers(userId);
        setActiveCaseId(null);
      }
      return;
    }
    const valid = activeCaseId && cases.some((c) => c.id === activeCaseId);
    if (!valid) {
      const first = cases[0].id;
      safeSetItem(`${ACTIVE_CASE_KEY_PREFIX}${userId}`, first);
      setActiveCaseId(first);
    }
  }, [loading, cases, activeCaseId, userId, clearPointers]);

  const focusCaseId = useMemo(() => {
    if (activeCaseId && cases.some((c) => c.id === activeCaseId)) return activeCaseId;
    return cases[0]?.id ?? null;
  }, [activeCaseId, cases]);

  const focusCase = useMemo(
    () => (focusCaseId ? cases.find((c) => c.id === focusCaseId) : undefined),
    [cases, focusCaseId]
  );

  /** No eligibility outcome yet and user did not skip — primary CTA is “Apply now” → state → eligibility. */
  const applicationNotStarted = useMemo(() => {
    if (!focusCase) return false;
    if (focusCase.eligibility_result) return false;
    if (getEligibilitySkippedFromApplication(focusCase.application)) return false;
    return true;
  }, [focusCase]);

  const funnelSteps = useMemo(
    () =>
      getVictimFunnelSteps({
        caseCount: cases.length,
        focusCase: focusCase ?? null,
      }),
    [cases.length, focusCase]
  );

  const funnelLabels = useMemo(
    () => ({
      eligibility: t("victimDashboard.funnel.stepEligibility"),
      application: t("victimDashboard.funnel.stepApplication"),
      support: t("victimDashboard.funnel.stepSupport"),
    }),
    [t]
  );

  const intakeHref = focusCaseId
    ? `${ROUTES.compensationIntake}?case=${focusCaseId}`
    : ROUTES.compensationIntake;

  useEffect(() => {
    if (!token || !focusCaseId) {
      setMessagesUnread(0);
      setMessagesTotal(0);
      setCompletenessResult(null);
      setMatchCount(0);
      return;
    }

    let cancelled = false;
    setSecondaryLoading(true);

    (async () => {
      try {
        const [msgRes, compRes, matchRes] = await Promise.all([
          fetch(`/api/cases/${focusCaseId}/messages`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/compensation/cases/${focusCaseId}/completeness`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/compensation/cases/${focusCaseId}/match-orgs`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (cancelled) return;

        if (msgRes.ok) {
          const mj = await msgRes.json().catch(() => ({}));
          setMessagesUnread(Number(mj.unread_count ?? 0));
          const arr = mj.messages;
          setMessagesTotal(Array.isArray(arr) ? arr.length : 0);
        } else {
          setMessagesUnread(0);
          setMessagesTotal(0);
        }

        if (compRes.ok) {
          const cj = await compRes.json().catch(() => null);
          const inner = cj?.data?.result ?? cj?.result ?? null;
          setCompletenessResult(
            inner && typeof inner === "object" ? (inner as CompletenessSignal) : null
          );
        } else {
          setCompletenessResult(null);
        }

        if (matchRes.ok) {
          const mj = await matchRes.json().catch(() => null);
          const matches = mj?.data?.matches ?? mj?.matches ?? [];
          setMatchCount(Array.isArray(matches) ? matches.length : 0);
        } else {
          setMatchCount(0);
        }
      } catch {
        if (!cancelled) {
          setMessagesUnread(0);
          setMessagesTotal(0);
          setCompletenessResult(null);
          setMatchCount(0);
        }
      } finally {
        if (!cancelled) setSecondaryLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, focusCaseId]);

  useEffect(() => {
    if (!token || !focusCaseId) {
      setSupportTeam(null);
      return;
    }
    let cancelled = false;
    setSupportTeamLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/compensation/cases/${focusCaseId}/support-team`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (!cancelled) setSupportTeam(null);
          return;
        }
        const json = await res.json();
        const d = (json?.data ?? json) as SupportTeamPayload;
        if (!cancelled) {
          setSupportTeam({
            organization: d?.organization ?? null,
            advocates: Array.isArray(d?.advocates) ? d.advocates : [],
            advocateConnectionPending: Boolean(d?.advocateConnectionPending),
          });
        }
      } catch {
        if (!cancelled) setSupportTeam(null);
      } finally {
        if (!cancelled) setSupportTeamLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, focusCaseId]);

  useEffect(() => {
    if (!token) {
      setSupportOverview(null);
      setSupportOverviewLoading(false);
      return;
    }
    let cancelled = false;
    setSupportOverviewLoading(true);
    void (async () => {
      try {
        const res = await fetch("/api/victim/support-overview", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setSupportOverview(null);
          return;
        }
        const d = (json?.data ?? json) as Record<string, unknown>;
        if (!cancelled) {
          setSupportOverview({
            pending_org_connects: Array.isArray(d?.pending_org_connects)
              ? (d.pending_org_connects as SupportOverviewPayload["pending_org_connects"])
              : [],
            advocate_connection_pending: Boolean(d?.advocate_connection_pending),
            pending_advocate_requests: Array.isArray(d?.pending_advocate_requests)
              ? (d.pending_advocate_requests as SupportOverviewPayload["pending_advocate_requests"])
              : [],
          });
        }
      } catch {
        if (!cancelled) setSupportOverview(null);
      } finally {
        if (!cancelled) setSupportOverviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, cases.length]);

  const closeApplyModal = useCallback(() => {
    setApplyModalOpen(false);
    setApplyModalMode(null);
    setApplyModalStep("path");
  }, []);

  const openApplyModal = useCallback(() => {
    setApplyModalMode("apply");
    setApplyModalStep("path");
    setPendingState("IL");
    setApplyModalOpen(true);
  }, []);

  const handleProgressStepClick = useCallback(
    (step: FunnelStepId) => {
      if (step === "eligibility") {
        if (cases.length === 0 || !focusCaseId || !focusCase) {
          openApplyModal();
          return;
        }
        if (applicationNotStarted) {
          openApplyModal();
          return;
        }
        router.push(`/compensation/eligibility/${encodeURIComponent(focusCaseId)}`);
        return;
      }
      if (!canClickVictimFunnelStep(step, funnelSteps)) return;
      if (!focusCaseId) return;
      if (step === "application" || step === "support") {
        router.push(`/compensation/intake?case=${encodeURIComponent(focusCaseId)}`);
      }
    },
    [
      cases.length,
      focusCaseId,
      focusCase,
      applicationNotStarted,
      funnelSteps,
      router,
      openApplyModal,
    ]
  );

  /** Creates an empty draft case, selects it, and opens rename — program state is chosen only when user clicks Apply now. */
  const handleCreateBlankCaseOnDashboard = useCallback(async () => {
    if (!token) return;
    setCreatingCase(true);
    setErr(null);
    try {
      const res = await fetch("/api/compensation/cases", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          application: emptyCompensationApplication,
          name: null,
        }),
      });
      if (!res.ok) throw new Error("Create failed");
      const json = await res.json();
      const newCase = json.case as { id?: string } | undefined;
      if (newCase?.id) {
        safeSetItem(`${ACTIVE_CASE_KEY_PREFIX}${userId}`, newCase.id);
        setActiveCaseId(newCase.id);
        await refetch();
        setEditNameValue("");
        setRenameModalOpen(true);
      }
    } catch (e) {
      console.error(e);
      setErr(t("victimDashboard.loadError"));
    } finally {
      setCreatingCase(false);
    }
  }, [token, userId, refetch, t]);

  /** Existing draft case: save program state and open eligibility checker (no new case). */
  const handleExistingCaseProceedToEligibility = useCallback(
    async (programState: "IL" | "IN") => {
      if (!token || !focusCaseId) return;
      setCreatingCase(true);
      setErr(null);
      closeApplyModal();
      try {
        const res = await fetch(`/api/compensation/cases/${focusCaseId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ state_code: programState }),
        });
        if (!res.ok) {
          const text = await res.text();
          let msg = t("victimDashboard.loadError");
          try {
            const parsed = JSON.parse(text) as { error?: { message?: string }; message?: string };
            const m = parsed?.error?.message ?? parsed?.message;
            if (typeof m === "string" && m.trim()) msg = m.trim();
          } catch {
            /* keep generic */
          }
          if (process.env.NODE_ENV === "development") {
            console.error("[VictimDashboard] PATCH case failed", res.status, text.slice(0, 500));
          }
          throw new Error(msg);
        }
        setGlobalStateCode(programState);
        await refetch();
        router.push(`/compensation/eligibility/${encodeURIComponent(focusCaseId)}`);
      } catch (e) {
        console.error(e);
        setErr(e instanceof Error && e.message ? e.message : t("victimDashboard.loadError"));
      } finally {
        setCreatingCase(false);
      }
    },
    [token, focusCaseId, closeApplyModal, setGlobalStateCode, refetch, router, t]
  );

  const handleStartNew = async (skipEligibility: boolean, programState: "IL" | "IN" = pendingState) => {
    if (!token) return;
    setGlobalStateCode(programState);
    clearPointers(userId);
    setActiveCaseId(null);
    setCreatingCase(true);
    closeApplyModal();
    try {
      const res = await fetch("/api/compensation/cases", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          application: emptyCompensationApplication,
          name: null,
          state_code: programState,
        }),
      });
      if (!res.ok) throw new Error("Create failed");
      const json = await res.json();
      const newCase = json.case;
      if (newCase?.id) {
        safeSetItem(`${ACTIVE_CASE_KEY_PREFIX}${userId}`, newCase.id);
        setActiveCaseId(newCase.id);
        if (skipEligibility && token) {
          try {
            const rawApp = newCase.application;
            const parsed =
              typeof rawApp === "string"
                ? JSON.parse(rawApp)
                : (rawApp ?? {}) as Record<string, unknown>;
            const prevDash =
              parsed._dashboard && typeof parsed._dashboard === "object"
                ? (parsed._dashboard as Record<string, unknown>)
                : {};
            await fetch(`/api/compensation/cases/${newCase.id}`, {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                application: {
                  ...emptyCompensationApplication,
                  ...parsed,
                  _dashboard: { ...prevDash, skippedEligibility: true },
                },
              }),
            });
          } catch (e) {
            console.error("Failed to mark eligibility skipped on case", e);
          }
        }
        void refetch();
        if (skipEligibility) {
          router.push(`/compensation/intake?case=${encodeURIComponent(newCase.id)}`);
        } else {
          router.push(`/compensation/eligibility/${newCase.id}`);
        }
      } else {
        router.push(skipEligibility ? ROUTES.compensationIntake : ROUTES.compensationHub);
      }
    } catch {
      router.push(ROUTES.compensationHub);
    } finally {
      setCreatingCase(false);
    }
  };

  const pickProgramState = useCallback(
    (s: "IL" | "IN") => {
      setPendingState(s);
      setGlobalStateCode(s);
      if (applyModalMode === "eligible") {
        setApplyModalStep("eligibleReview");
        return;
      }
      /* Apply: state → eligibility checker (no “skip to form” step on the dashboard). */
      if (cases.length === 0) {
        void handleStartNew(false, s);
        return;
      }
      if (focusCaseId && applicationNotStarted) {
        void handleExistingCaseProceedToEligibility(s);
        return;
      }
    },
    [
      applyModalMode,
      setGlobalStateCode,
      cases.length,
      focusCaseId,
      applicationNotStarted,
      handleExistingCaseProceedToEligibility,
      handleStartNew,
    ]
  );

  const selectCase = (caseId: string) => {
    safeSetItem(`${ACTIVE_CASE_KEY_PREFIX}${userId}`, caseId);
    setActiveCaseId(caseId);
  };

  const handleLogout = async () => {
    const { data } = await supabase.auth.getSession();
    await logAuthEvent("auth.logout", data.session?.access_token);
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleSaveName = async (caseId: string, newName: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/compensation/cases/${caseId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newName.trim() || null }),
      });
      if (res.ok) {
        setRenameModalOpen(false);
        refetch();
      }
    } catch {
      console.error("Failed to save case name");
    }
  };

  const confirmDeleteCase = async () => {
    if (!deleteTarget || !token) return;
    setDeleteBusy(true);
    setDeleteErr(null);
    try {
      const res = await fetch(`/api/compensation/cases/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        if (activeCaseId === deleteTarget.id) {
          clearPointers(userId);
          setActiveCaseId(null);
        }
        setDeleteTarget(null);
        refetch();
      } else {
        setDeleteErr(t("victimDashboard.deleteFailed"));
      }
    } catch {
      setDeleteErr(t("victimDashboard.deleteFailed"));
    } finally {
      setDeleteBusy(false);
    }
  };

  const noCasesYet = cases.length === 0;
  const hasSupportAdvocates = Boolean(supportTeam?.advocates && supportTeam.advocates.length > 0);
  const advocateConnectionPending = Boolean(supportTeam?.advocateConnectionPending);
  const advocatePendingFromOverview = Boolean(supportOverview?.advocate_connection_pending);
  const advocatePendingEffective = advocateConnectionPending || advocatePendingFromOverview;

  const hasSupportOrg = Boolean(supportTeam?.organization?.name);
  const pendingOrgConnects = supportOverview?.pending_org_connects ?? [];
  const hasPendingOrgConnects = pendingOrgConnects.length > 0;
  const pendingAdvocateRequests = supportOverview?.pending_advocate_requests ?? [];
  const hasPendingAdvocateDetail = pendingAdvocateRequests.length > 0;
  const caseLinkedOrgName = focusCaseId ? supportTeam?.organization?.name : undefined;
  const supportSectionLoading =
    supportOverviewLoading || (Boolean(focusCaseId) && supportTeamLoading);
  const caseContextForSupport = Boolean(focusCaseId && focusCase && !noCasesYet);
  /** Once this case has an org or an advocate, hide both next-step shortcuts; use the support team block to manage. */
  const hideBothNextStepHelp =
    caseContextForSupport && !supportTeamLoading && (hasSupportOrg || hasSupportAdvocates);
  const showNextStepConnectAdvocate =
    (Boolean(focusCaseId) || noCasesYet) &&
    !hideBothNextStepHelp &&
    (!caseContextForSupport || (!supportTeamLoading && !hasSupportAdvocates)) &&
    !advocatePendingEffective;
  const showNextStepFindOrganizations =
    !hideBothNextStepHelp && (!caseContextForSupport || (!supportTeamLoading && !hasSupportOrg));

  const connectAdvocateHref = useMemo(
    () =>
      focusCaseId
        ? `${ROUTES.compensationConnectAdvocate}?case=${encodeURIComponent(focusCaseId)}`
        : ROUTES.compensationConnectAdvocate,
    [focusCaseId]
  );

  const goConnectAdvocateFromApply = useCallback(() => {
    closeApplyModal();
    router.push(connectAdvocateHref);
  }, [closeApplyModal, router, connectAdvocateHref]);

  const findOrgHref = useMemo(
    () =>
      focusCaseId
        ? `${ROUTES.victimFindOrganizations}?case=${encodeURIComponent(focusCaseId)}`
        : ROUTES.victimFindOrganizations,
    [focusCaseId]
  );

  const manageOrgPath = focusCaseId ? victimCasePaths.organization(focusCaseId) : findOrgHref;
  const manageAdvocatePath = focusCaseId ? victimCasePaths.advocate(focusCaseId) : connectAdvocateHref;
  const secureMessagesHref = focusCaseId ? compensationIntakeMessagesUrl(focusCaseId) : intakeHref;

  const messagesRowStatus = !focusCaseId
    ? t("victimDashboard.messagesEmpty")
    : secondaryLoading
      ? t("victimDashboard.messagesLoading")
      : messagesUnread > 0
        ? messagesUnread === 1
          ? t("victimDashboard.messagesUnreadOne")
          : tf("victimDashboard.messagesUnreadMany", { count: messagesUnread })
        : messagesTotal === 0
          ? t("victimDashboard.messagesEmpty")
          : t("victimDashboard.messagesInThread");

  const documentsRowStatus = !focusCaseId
    ? t("victimDashboard.documentsNoCase")
    : secondaryLoading
      ? t("victimDashboard.updatingDetails")
      : completenessResult && hasBlockingDocumentGap(completenessResult)
        ? t("victimDashboard.documentsStatusMissing")
        : t("victimDashboard.documentsStatusGeneric");

  const appointmentsRowStatus = !focusCaseId
    ? t("victimDashboard.appointmentsEmpty")
    : secondaryLoading
      ? t("victimDashboard.updatingDetails")
      : t("victimDashboard.appointmentsEmpty");

  const supportRowStatus = !focusCaseId
    ? t("victimDashboard.supportNoCase")
    : secondaryLoading
      ? t("victimDashboard.updatingDetails")
      : matchCount === 0
        ? t("victimDashboard.supportNoMatches")
        : matchCount === 1
          ? t("victimDashboard.supportMatchOne")
          : tf("victimDashboard.supportMatchMany", { count: matchCount });

  const primaryCtaClass = `inline-flex min-h-[3rem] items-center justify-center rounded-full bg-blue-600 px-8 py-3 text-base font-bold text-white shadow-md shadow-blue-950/30 hover:bg-blue-500 disabled:opacity-50`;

  const eligibilitySkipped = Boolean(
    focusCase && getEligibilitySkippedFromApplication(focusCase.application)
  );

  const renderHubMainCta = () => {
    const showApplyNow = noCasesYet || applicationNotStarted;
    if (showApplyNow) {
      return (
        <button
          type="button"
          onClick={() => openApplyModal()}
          disabled={creatingCase}
          className={`${primaryCtaClass} ${priorityRingClassName("high")}`}
        >
          {t("victimDashboard.applyNow")}
        </button>
      );
    }
    const href = focusCaseId
      ? `${ROUTES.compensationIntake}?case=${encodeURIComponent(focusCaseId)}`
      : ROUTES.compensationIntake;
    return (
      <Link href={href} className={`${primaryCtaClass} ${priorityRingClassName("medium")}`}>
        {t("victimDashboard.resumeApplication")}
      </Link>
    );
  };

  return (
    <main className={`relative ${APP_PAGE_MAIN}`}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_80%_0%,rgba(99,102,241,0.06),transparent)] pointer-events-none max-w-[100vw]" />
      <div className="relative max-w-3xl mx-auto space-y-6">
        {loading && !err ? (
          <>
            <PageHeader
              title={dashboardHeaderTitle}
              titleClassName="text-xl sm:text-2xl font-semibold text-slate-100 tracking-tight"
              className="rounded-2xl border border-slate-800/50 bg-slate-950/30 px-4 py-4 sm:px-6"
            />
            <div className="rounded-lg border border-slate-800/50 bg-slate-950/40 px-3 py-3 animate-pulse">
              <div className="h-1 w-full rounded-full bg-slate-800/80" />
              <div className="mt-2 grid grid-cols-3 gap-2">
                <div className="h-8 rounded bg-slate-800/60" />
                <div className="h-8 rounded bg-slate-800/60" />
                <div className="h-8 rounded bg-slate-800/60" />
              </div>
            </div>
            <PrimaryActionSkeleton />
            <CaseActivitySkeleton />
            <section className={`${APP_CARD} space-y-3`}>
              <div className="h-4 w-40 animate-pulse rounded bg-slate-700/70" />
              <div className="h-3 w-full max-w-md animate-pulse rounded bg-slate-800/80" />
            </section>
          </>
        ) : (
          <>
            <VictimProfileCompletionBanner />
            <div id="your-cases" className="scroll-mt-24 space-y-3">
              <PageHeader
                title={dashboardHeaderTitle}
                titleClassName="text-xl sm:text-2xl font-semibold text-slate-100 tracking-tight"
                className="rounded-2xl border border-slate-800/40 bg-slate-950/25 px-4 py-4 sm:px-5"
                rightActions={
                  cases.length > 0 && focusCase ? (
                    <div className="flex flex-wrap items-center gap-2 justify-end">
                      <div className="flex items-center gap-2">
                        <span
                          id="victim-case-select-label"
                          className="text-[10px] font-medium uppercase tracking-wide text-slate-500 whitespace-nowrap"
                        >
                          {t("victimDashboard.myCasesSectionLabel")}
                        </span>
                        <select
                          id="victim-case-select"
                          value={focusCaseId ?? ""}
                          onChange={(e) => selectCase(e.target.value)}
                          aria-labelledby="victim-case-select-label"
                          className="max-w-[min(100%,15rem)] rounded-md border border-slate-700/40 bg-slate-950/50 py-1.5 pl-2 pr-7 text-xs text-slate-200 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500/35"
                        >
                          {cases.map((c) => (
                            <option key={c.id} value={c.id}>
                              {strictPreviews ? `Case ${c.id.slice(0, 8)}…` : getCaseDisplayName(c)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <details className="relative shrink-0">
                        <summary className="cursor-pointer list-none rounded-md border border-slate-600/60 bg-slate-900/50 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-slate-900 [&::-webkit-details-marker]:hidden">
                          {t("victimDashboard.caseEdit")}
                        </summary>
                        <div className="absolute right-0 z-30 mt-1 min-w-[9rem] rounded-lg border border-slate-700 bg-slate-950 py-1 shadow-xl">
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-900"
                            onClick={() => {
                              setEditNameValue(focusCase.name?.trim() ?? "");
                              setRenameModalOpen(true);
                            }}
                          >
                            {t("victimDashboard.rename")}
                          </button>
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-slate-900"
                            onClick={() =>
                              setDeleteTarget({
                                id: focusCase.id,
                                displayName: strictPreviews
                                  ? `Case ${focusCase.id.slice(0, 8)}…`
                                  : getCaseDisplayName(focusCase),
                              })
                            }
                          >
                            {t("victimDashboard.delete")}
                          </button>
                        </div>
                      </details>
                      <button
                        type="button"
                        onClick={() => void handleCreateBlankCaseOnDashboard()}
                        disabled={creatingCase}
                        className="shrink-0 rounded-md bg-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-slate-600 disabled:opacity-50"
                      >
                        {creatingCase ? t("victimDashboard.creating") : t("victimDashboard.newCaseButton")}
                      </button>
                    </div>
                  ) : null
                }
              />
              {err ? <p className="text-[11px] text-red-300">{err}</p> : null}
            </div>

            {/* Progress — Check eligibility / Apply / Track */}
            <div
              className={`rounded-xl px-3 py-3 sm:px-4 ${
                eligibilitySkipped
                  ? "border border-red-500/35 bg-red-950/20 shadow-[0_0_24px_-6px_rgba(239,68,68,0.2),inset_0_1px_0_rgba(255,255,255,0.04)]"
                  : "border border-slate-700 bg-slate-900 shadow-sm shadow-black/20"
              }`}
            >
              <VictimFunnelStepper
                variant="minimal"
                steps={funnelSteps}
                labels={funnelLabels}
                ariaLabel={t("victimDashboard.funnel.ariaLabel")}
                title={t("victimDashboard.progressTitle")}
                onStepClick={handleProgressStepClick}
                canClickStep={(id) => canClickVictimFunnelStep(id, funnelSteps)}
                stepsDisabled={!focusCaseId || !focusCase}
                eligibilitySkipped={eligibilitySkipped}
              />
            </div>

            {/* Apply / Resume — centered in card */}
            <div id="victim-dashboard-next-step" className="scroll-mt-24">
            <PrimaryActionArea
              ariaLabel={t("victimDashboard.applyResumeCardAria")}
              className="shadow-sm"
              surface="neutral"
              eyebrow={false}
              primary={
                <div className="flex min-h-[10rem] w-full flex-col items-center justify-center gap-4 py-2">
                  <div className="flex w-full justify-center px-1">{renderHubMainCta()}</div>
                  {(showNextStepConnectAdvocate || showNextStepFindOrganizations) && (
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      {showNextStepConnectAdvocate ? (
                        <Link
                          href={connectAdvocateHref}
                          className="inline-flex items-center justify-center rounded-full bg-slate-700 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40"
                        >
                          {t("victimDashboard.getHelp.connectAdvocate")}
                        </Link>
                      ) : null}
                      {showNextStepFindOrganizations ? (
                        <Link
                          href={findOrgHref}
                          className="inline-flex items-center justify-center rounded-full border border-slate-600/80 bg-slate-900/60 px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-800/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40"
                        >
                          {t("victimDashboard.getHelp.findOrganizations")}
                        </Link>
                      ) : null}
                    </div>
                  )}
                </div>
              }
            />
            </div>

            {/* Organization + advocates — visible without a case; case-specific rows when a case is selected */}
            <section
              className="rounded-xl border border-slate-800/40 bg-slate-950/25 px-3 py-3 sm:px-4"
              aria-labelledby="victim-support-team-heading"
            >
              <h2
                id="victim-support-team-heading"
                className="text-base sm:text-lg font-semibold text-slate-50 tracking-tight"
              >
                {t("victimDashboard.supportTeamTitle")}
              </h2>
              {noCasesYet ? (
                <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                  {t("victimDashboard.supportTeamNoCaseHint")}
                </p>
              ) : null}
              {supportSectionLoading ? (
                <p className="mt-2 text-[11px] text-slate-600">{t("victimDashboard.supportTeamLoading")}</p>
              ) : (
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-slate-300">{t("victimDashboard.supportTeamOrg")}</p>
                    <div className="mt-1.5 space-y-3">
                      {caseLinkedOrgName ? (
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                          <Link
                            href={manageOrgPath}
                            title={t("victimDashboard.supportTeamEditOrgTitle")}
                            className="inline-block text-left text-xs font-medium text-emerald-400/95 underline decoration-emerald-500/45 underline-offset-2 hover:text-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 rounded-sm"
                          >
                            {caseLinkedOrgName === LEGACY_ORG_DISPLAY_NAME
                              ? t("victimDashboard.caseOrgManage.legacyLabel")
                              : caseLinkedOrgName}
                          </Link>
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={secureMessagesHref}
                              className="inline-flex items-center justify-center rounded-full border border-slate-600/90 bg-slate-900/50 px-2.5 py-1 text-[10px] font-semibold text-slate-200 hover:bg-slate-800/80"
                            >
                              {t("victimDashboard.supportTeamContactOrg")}
                            </Link>
                          </div>
                        </div>
                      ) : null}
                      {hasPendingOrgConnects ? (
                        <div className="rounded-lg border border-amber-500/25 bg-amber-950/15 px-3 py-2">
                          <p className="text-[11px] font-medium text-amber-200/95">
                            {t("victimDashboard.supportTeamPendingOrgConnectsTitle")}
                          </p>
                          <ul className="mt-1 list-none space-y-0.5 text-[11px] text-slate-300">
                            {pendingOrgConnects.map((p) => (
                              <li key={p.id}>{p.organization_name}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {!caseLinkedOrgName && !hasPendingOrgConnects ? (
                        <div className="space-y-2">
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            {t("victimDashboard.supportTeamNoOrg")}
                          </p>
                          <Link
                            href={findOrgHref}
                            className="inline-flex w-full sm:w-auto min-h-[2.5rem] items-center justify-center rounded-full border border-slate-600/80 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-200 shadow-sm transition hover:border-slate-500 hover:bg-slate-800/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40"
                          >
                            {t("victimDashboard.supportTeamAddOrgCta")}
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-300">{t("victimDashboard.supportTeamAdvocates")}</p>
                    {focusCaseId && supportTeam?.advocates && supportTeam.advocates.length > 0 ? (
                      <div className="mt-0.5 space-y-2">
                        <ul className="list-none space-y-2 text-xs">
                          {supportTeam.advocates.map((a) => (
                            <li key={a.id}>
                              <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                                <Link
                                  href={manageAdvocatePath}
                                  title={t("victimDashboard.supportTeamEditAdvocateTitle")}
                                  className="font-medium text-blue-400 underline decoration-blue-500/45 underline-offset-2 hover:text-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 rounded-sm"
                                >
                                  {a.label}
                                </Link>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Link
                                    href={secureMessagesHref}
                                    className="inline-flex items-center justify-center rounded-full border border-slate-600/90 bg-slate-900/50 px-2.5 py-1 text-[10px] font-semibold text-slate-200 hover:bg-slate-800/80"
                                  >
                                    {t("victimDashboard.supportTeamSendMessage")}
                                  </Link>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                        {advocatePendingEffective && hasPendingAdvocateDetail ? (
                          <div className="rounded-lg border border-amber-500/25 bg-amber-950/15 px-3 py-2">
                            <p className="text-[11px] font-medium text-amber-200/95">
                              {t("victimDashboard.supportTeamAdvocateMorePending")}
                            </p>
                            <ul className="mt-1 list-none space-y-0.5 text-[11px] text-slate-300">
                              {pendingAdvocateRequests.map((r) => (
                                <li key={r.id}>{r.advocate_label}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ) : advocatePendingEffective ? (
                      <div className="mt-1.5 space-y-2">
                        <p className="text-[11px] font-medium text-amber-200/90">
                          {t("victimDashboard.supportTeamAdvocateRequestPending")}
                        </p>
                        {hasPendingAdvocateDetail ? (
                          <ul className="list-none space-y-0.5 text-[11px] text-slate-400">
                            {pendingAdvocateRequests.map((r) => (
                              <li key={r.id}>{r.advocate_label}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-1.5 space-y-1.5">
                        <p className="text-[11px] text-slate-600">{t("victimDashboard.supportTeamNoAdvocates")}</p>
                        <Link
                          href={connectAdvocateHref}
                          className="inline-flex text-[11px] font-medium text-slate-500 underline decoration-slate-600 underline-offset-2 hover:text-slate-300"
                        >
                          {t("victimDashboard.supportTeamConnectCta")}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Case activity — tied to selected case */}
            {!noCasesYet && focusCaseId && focusCase && (
              <section className={`${APP_CARD} border-slate-800/60 bg-slate-950/35 space-y-1`}>
                <h2 className="text-sm font-semibold text-slate-100 pb-2">
                  {t("victimDashboard.caseDetailsHeading")}
                </h2>
                <div className="divide-y divide-slate-800/90 rounded-xl border border-slate-800/80 overflow-hidden">
                  <Link
                    href={intakeHref}
                    className="flex items-center justify-between gap-3 px-3 py-3 text-sm text-slate-200 hover:bg-slate-900/50 transition-colors"
                  >
                    <span className="font-medium text-slate-100">{t("victimDashboard.caseActivityMessages")}</span>
                    <span className="text-xs text-slate-400 text-right">{messagesRowStatus}</span>
                  </Link>
                  <Link
                    href={intakeHref}
                    className="flex items-center justify-between gap-3 px-3 py-3 text-sm text-slate-200 hover:bg-slate-900/50 transition-colors"
                  >
                    <span className="font-medium text-slate-100">{t("victimDashboard.caseActivityDocuments")}</span>
                    <span className="text-xs text-slate-400 text-right">{documentsRowStatus}</span>
                  </Link>
                  <Link
                    href={intakeHref}
                    className="flex items-center justify-between gap-3 px-3 py-3 text-sm text-slate-200 hover:bg-slate-900/50 transition-colors"
                  >
                    <span className="font-medium text-slate-100">{t("victimDashboard.caseActivityAppointments")}</span>
                    <span className="text-xs text-slate-400 text-right">{appointmentsRowStatus}</span>
                  </Link>
                  <Link
                    href={intakeHref}
                    className="flex items-center justify-between gap-3 px-3 py-3 text-sm text-slate-200 hover:bg-slate-900/50 transition-colors"
                  >
                    <span className="font-medium text-slate-100">{t("victimDashboard.caseActivitySupport")}</span>
                    <span className="text-xs text-slate-400 text-right">{supportRowStatus}</span>
                  </Link>
                </div>
              </section>
            )}
          </>
        )}

        {/* Apply now: path → state (IL/IN) → optional eligible review */}
        {applyModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => !creatingCase && closeApplyModal()}
            role="presentation"
          >
            <div
              className={`rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-xl ${
                applyModalStep === "path" ? "max-w-sm w-full space-y-4" : "max-w-md space-y-4"
              }`}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="apply-modal-title"
            >
              {applyModalStep === "path" ? (
                <>
                  <h2 id="apply-modal-title" className="sr-only">
                    {t("victimDashboard.applyPathAria")}
                  </h2>
                  <div className="grid grid-cols-1 gap-3">
                    {!advocatePendingEffective && (focusCaseId || noCasesYet) ? (
                      <button
                        type="button"
                        disabled={creatingCase}
                        onClick={() => void goConnectAdvocateFromApply()}
                        className="rounded-xl border border-slate-600 bg-slate-900/80 px-4 py-4 text-center text-sm font-semibold text-slate-100 transition hover:border-teal-500/50 hover:bg-slate-900 disabled:opacity-50"
                      >
                        {t("victimDashboard.applyPathConnect")}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={creatingCase}
                      onClick={() => setApplyModalStep("state")}
                      className="rounded-xl border border-blue-500/35 bg-blue-950/40 px-4 py-4 text-center text-sm font-semibold text-slate-100 transition hover:border-blue-400/60 hover:bg-blue-950/55 disabled:opacity-50"
                    >
                      {t("victimDashboard.applyPathSelf")}
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={creatingCase}
                    onClick={() => closeApplyModal()}
                    className="w-full text-center text-xs text-slate-500 hover:text-slate-300"
                  >
                    {t("victimDashboard.cancel")}
                  </button>
                </>
              ) : applyModalStep === "state" ? (
                <>
                  <h3 id="apply-modal-title" className="text-base font-semibold text-slate-100">
                    {t("victimDashboard.stateModalTitle")}
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-400">{t("victimDashboard.stateModalSubtitle")}</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      disabled={creatingCase}
                      onClick={() => pickProgramState("IL")}
                      className="rounded-xl border border-slate-600 bg-slate-900/80 px-4 py-4 text-center text-sm font-semibold text-slate-100 transition hover:border-blue-500/60 hover:bg-slate-900 disabled:opacity-50"
                    >
                      {t("victimDashboard.stateIL")}
                    </button>
                    <button
                      type="button"
                      disabled={creatingCase}
                      onClick={() => pickProgramState("IN")}
                      className="rounded-xl border border-slate-600 bg-slate-900/80 px-4 py-4 text-center text-sm font-semibold text-slate-100 transition hover:border-blue-500/60 hover:bg-slate-900 disabled:opacity-50"
                    >
                      {t("victimDashboard.stateIN")}
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={creatingCase}
                    onClick={() => setApplyModalStep("path")}
                    className="w-full text-center text-xs text-slate-500 hover:text-slate-300"
                  >
                    ← {t("victimDashboard.applyPathBack")}
                  </button>
                  <button
                    type="button"
                    disabled={creatingCase}
                    onClick={() => closeApplyModal()}
                    className="w-full text-center text-xs text-slate-600 hover:text-slate-400"
                  >
                    {t("victimDashboard.cancel")}
                  </button>
                </>
              ) : (
                <>
                  <h3 id="apply-modal-title" className="text-base font-semibold text-slate-100">
                    {t("victimDashboard.stateModalTitle")}
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300">
                    {tf("victimDashboard.eligibleReviewIntro", {
                      state: pendingState === "IN" ? t("victimDashboard.stateIN") : t("victimDashboard.stateIL"),
                    })}
                  </p>
                  <button
                    type="button"
                    disabled={creatingCase}
                    onClick={() => void handleStartNew(false)}
                    className="w-full rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {creatingCase ? t("victimDashboard.creating") : t("victimDashboard.continueToEligibility")}
                  </button>
                  <button
                    type="button"
                    disabled={creatingCase}
                    onClick={() => setApplyModalStep("state")}
                    className="w-full text-center text-xs text-slate-500 hover:text-slate-300"
                  >
                    ← {t("victimDashboard.stateModalTitle")}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Rename case */}
        {renameModalOpen && focusCase && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setRenameModalOpen(false)}
            role="presentation"
          >
            <div
              className="w-full max-w-md space-y-4 rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="rename-case-title"
            >
              <h3 id="rename-case-title" className="text-sm font-semibold text-slate-100">
                {t("victimDashboard.editNameTitle")}
              </h3>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSaveName(focusCase.id, editNameValue);
                }}
              >
                <input
                  type="text"
                  value={editNameValue}
                  onChange={(e) => setEditNameValue(e.target.value)}
                  placeholder={t("victimDashboard.caseNamePlaceholder")}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  autoFocus
                />
                <div className="flex flex-wrap justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setRenameModalOpen(false)}
                    className="rounded-full border border-slate-600 px-4 py-2 text-xs text-slate-300 hover:bg-slate-900/60"
                  >
                    {t("victimDashboard.cancel")}
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                  >
                    {t("victimDashboard.save")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete confirmation modal */}
        {deleteTarget && (
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => !deleteBusy && setDeleteTarget(null)}
          >
            <div
              className="rounded-2xl border border-slate-700 bg-slate-950 p-6 max-w-md space-y-4"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-app-title"
            >
              <h3 id="delete-app-title" className="text-sm font-semibold text-slate-100">
                {t("victimDashboard.deleteModalTitle")}
              </h3>
              <div className="text-xs text-slate-300 space-y-2">
                <p>{t("victimDashboard.deleteModalBodyLine1")}</p>
                <p>{t("victimDashboard.deleteModalBodyLine2")}</p>
              </div>
              {deleteErr ? <p className="text-xs text-red-300">{deleteErr}</p> : null}
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  disabled={deleteBusy}
                  onClick={() => {
                    setDeleteErr(null);
                    setDeleteTarget(null);
                  }}
                  className="rounded-full border border-slate-600 px-4 py-2 text-xs hover:bg-slate-900/60 disabled:opacity-50"
                >
                  {t("victimDashboard.deleteModalCancel")}
                </button>
                <button
                  type="button"
                  disabled={deleteBusy}
                  onClick={() => void confirmDeleteCase()}
                  className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                >
                  {t("victimDashboard.deleteModalConfirm")}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[11px] text-slate-400">
          <Link href={ROUTES.marketingLanding} className="hover:text-slate-200">
            {t("common.backToHome")}
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="hover:text-slate-200 text-left sm:text-right"
          >
            {t("nav.logout")}
          </button>
        </div>
      </div>
    </main>
  );
}
