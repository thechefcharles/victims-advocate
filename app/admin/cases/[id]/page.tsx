"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getNextActionForCase, type CompletenessSignal, type EligibilityResult } from "@/lib/product/nextAction";
import { priorityBadgeClassName, priorityLabel } from "@/lib/product/priority";
import { RecommendedOrganizationCard } from "@/components/trust/RecommendedOrganizationCard";
import { EMPTY_COPY, TRUST_LINK_HREF, TRUST_LINK_LABELS, TRUST_MICROCOPY } from "@/lib/trustDisplay";
import { CaseMessagesPanel } from "@/components/messaging/CaseMessagesPanel";

type AdminCaseTab =
  | "overview"
  | "intake"
  | "documents"
  | "messages"
  | "timeline"
  | "matching"
  | "routing"
  | "completeness"
  | "notes"
  | "access"
  | "appointments";

type CaseStatus = "draft" | "ready_for_review" | "submitted" | "closed";

interface UploadedDoc {
  id: string;
  type: string;
  description: string;
  fileName: string;
  fileSize: number;
  lastModified: number;
  status?: "active" | "restricted" | "deleted";
}

interface SavedCase {
  id: string;
  createdAt: string;
  status: CaseStatus;
  application: any; // matches CompensationApplication shape
  documents?: UploadedDoc[];
  eligibility_result?: EligibilityResult | null;
  assigned_advocate_id?: string | null;
}

interface CaseAccess {
  role: string;
  can_view: boolean;
  can_edit: boolean;
}

interface TimelineEvent {
  id: string;
  created_at: string;
  event_type: string;
  title: string;
  description: string | null;
  actor_role?: string | null;
}

type Appointment = {
  id: string;
  title: string;
  service_type: string;
  status: string;
  start_at: string;
  end_at: string;
  location: string | null;
  is_virtual: boolean;
  assigned_to: string | null;
};

interface CaseNote {
  id: string;
  created_at: string;
  updated_at: string;
  author_user_id: string;
  author_role: string | null;
  content: string;
  status: string;
  edited_at: string | null;
}

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const caseId = params.id;

  const [loadedCase, setLoadedCase] = useState<SavedCase | null>(null);
  const [messagesUnreadCount, setMessagesUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminCaseTab>("overview");
  const [caseStatusDraft, setCaseStatusDraft] = useState<CaseStatus | "">("");
  const [statusSaving, setStatusSaving] = useState(false);

  // 🔵 NxtGuide chat state for advocates
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [documentActioning, setDocumentActioning] = useState<string | null>(null);
  const [caseAccess, setCaseAccess] = useState<CaseAccess | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [notes, setNotes] = useState<CaseNote[]>([]);
  const [noteContent, setNoteContent] = useState("");
  const [noteActioning, setNoteActioning] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");

  // Phase 8: advocate amend intake
  const [amendFieldKey, setAmendFieldKey] = useState("");
  const [amendNewValue, setAmendNewValue] = useState("");
  const [amendReason, setAmendReason] = useState("");
  const [amendLoading, setAmendLoading] = useState(false);

  // Phase 11: routing
  type RoutingResult = {
    programs: Array<{
      program_key: string;
      program_name: string;
      eligibility_status: string;
      matched_conditions: unknown[];
      failed_conditions: unknown[];
      unknown_conditions: unknown[];
      missing_requirements: string[];
      next_steps: string[];
      confidence: string;
      deadline_summary?: string | null;
      required_documents: string[];
      explanation?: string | null;
    }>;
    evaluated_at?: string;
  };
  const [routingResult, setRoutingResult] = useState<RoutingResult | null>(null);
  const [routingLoading, setRoutingLoading] = useState(false);
  const [routingRunAt, setRoutingRunAt] = useState<string | null>(null);

  // Phase 12: completeness
  type CompletenessResult = {
    overall_status: string;
    program_results: Array<{
      program_key: string;
      program_name: string;
      required_documents: string[];
      missing_documents: string[];
      missing_fields: string[];
      issues: Array<{
        code: string;
        type: string;
        severity: string;
        message: string;
        field_key?: string | null;
        document_type?: string | null;
        program_key?: string | null;
        resolution_hint?: string | null;
      }>;
      next_steps: string[];
    }>;
    missing_items: Array<{ type: string; severity: string; message: string; resolution_hint?: string | null }>;
    inconsistencies: Array<{ message: string; resolution_hint?: string | null }>;
    recommended_next_actions: string[];
    summary_counts: { missing_count: number; blocking_count: number; warning_count: number; informational_count: number };
  };
  const [completenessResult, setCompletenessResult] = useState<CompletenessResult | null>(null);
  const [completenessLoading, setCompletenessLoading] = useState(false);
  const [completenessRunAt, setCompletenessRunAt] = useState<string | null>(null);

  type OrgMatchRow = {
    organization_id: string;
    organization_name: string;
    match_score: number;
    match_tier: string;
    reasons: string[];
    flags: string[];
    service_overlap: string[];
    language_match: boolean;
    accessibility_match?: string[];
    capacity_signal: string | null;
    virtual_ok?: boolean | null;
    strong_match: boolean;
    possible_match: boolean;
    limited_match: boolean;
    designation_tier: string | null;
    designation_confidence: string | null;
    designation_summary: string | null;
    designation_influenced_match: boolean;
    designation_reason: string | null;
  };
  const [orgMatches, setOrgMatches] = useState<OrgMatchRow[]>([]);
  const [orgMatchGlobalFlags, setOrgMatchGlobalFlags] = useState<string[]>([]);
  const [orgMatchRunAt, setOrgMatchRunAt] = useState<string | null>(null);
  const [orgMatchingRunLoading, setOrgMatchingRunLoading] = useState(false);

  const canViewNotes = caseAccess && caseAccess.role !== "owner";
  const canAmendIntake = caseAccess?.can_edit && caseAccess.role !== "owner";
  const canRunRouting = caseAccess?.can_edit && caseAccess.role !== "owner";
  const canRunOrgMatching = canRunRouting;
  const canRunCompleteness = caseAccess?.can_edit && caseAccess.role !== "owner";
  const canRunOcr = caseAccess?.can_edit && caseAccess.role !== "owner";

  // Phase 13: OCR per document (advocate/admin only)
  type OcrDocState = {
    run: { id: string; status: string; created_at: string };
    fields: Array<{ id: string; field_key: string; field_label: string | null; value_text: string | null; value_number: number | null; value_date: string | null; confidence_score: number | null; status: string }>;
    inconsistencies: Array<{ message: string }>;
    warnings: string[];
    type_mismatch?: boolean;
  };
  const [ocrByDocId, setOcrByDocId] = useState<Record<string, OcrDocState | null>>({});
  const [ocrLoadingDocId, setOcrLoadingDocId] = useState<string | null>(null);
  const [ocrExpandedDocId, setOcrExpandedDocId] = useState<string | null>(null);

  // Load case + docs from API (with auth so document list is returned)
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const res = await fetch(`/api/compensation/cases/${caseId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          console.error("Failed to fetch case", await res.text());
          setLoadedCase(null);
          return;
        }

        const json = await res.json();
        const caseRow = json.case;
        const docs = (json.documents ?? []) as any[];
        const access = json.access as CaseAccess | undefined;

        if (!caseRow) {
          setLoadedCase(null);
          setCaseAccess(null);
          return;
        }

        setCaseAccess(access ?? null);

        const mappedCase: SavedCase = {
          id: caseRow.id,
          createdAt: caseRow.created_at ?? new Date().toISOString(),
          status: (caseRow.status || "ready_for_review") as CaseStatus,
          application: caseRow.application,
          eligibility_result: (caseRow.eligibility_result as EligibilityResult | null | undefined) ?? null,
          assigned_advocate_id: (caseRow.assigned_advocate_id as string | null | undefined) ?? null,
          documents: docs.map((d) => ({
            id: d.id,
            type: d.doc_type || "other",
            description: d.description ?? "",
            fileName: d.file_name,
            fileSize: d.file_size ?? 0,
            lastModified:
              typeof d.lastModified === "number"
                ? d.lastModified
                : Date.parse(d.created_at || new Date().toISOString()),
            status: d.status ?? "active",
          })),
        };

        setLoadedCase(mappedCase);

        try {
          const msgRes = await fetch(`/api/cases/${caseId}/messages`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (msgRes.ok) {
            const mj = await msgRes.json();
            setMessagesUnreadCount(
              typeof mj.unread_count === "number" ? mj.unread_count : 0
            );
          } else {
            setMessagesUnreadCount(0);
          }
        } catch {
          setMessagesUnreadCount(0);
        }

        const timelineRes = await fetch(`/api/compensation/cases/${caseId}/timeline`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (timelineRes.ok) {
          const tJson = await timelineRes.json();
          setTimelineEvents(tJson.data?.events ?? tJson.events ?? []);
        } else {
          setTimelineEvents([]);
        }

        if (access?.role !== "owner") {
          const notesRes = await fetch(`/api/compensation/cases/${caseId}/notes`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (notesRes.ok) {
            const nJson = await notesRes.json();
            setNotes(nJson.data?.notes ?? nJson.notes ?? []);
          } else {
            setNotes([]);
          }
        } else {
          setNotes([]);
        }

        const routingRes = await fetch(`/api/compensation/cases/${caseId}/routing`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (routingRes.ok) {
          const rJson = await routingRes.json();
          const result = rJson.data?.result ?? rJson.result;
          const routing = rJson.data?.routing ?? rJson.routing;
          if (result?.programs) {
            setRoutingResult(result);
            setRoutingRunAt(routing?.created_at ?? result.evaluated_at ?? null);
          } else {
            setRoutingResult(null);
            setRoutingRunAt(null);
          }
        } else {
          setRoutingResult(null);
          setRoutingRunAt(null);
        }

        const completenessRes = await fetch(`/api/compensation/cases/${caseId}/completeness`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (completenessRes.ok) {
          const cJson = await completenessRes.json();
          const cResult = cJson.data?.result ?? cJson.result;
          const cRun = cJson.data?.completeness ?? cJson.completeness;
          if (cResult?.overall_status != null) {
            setCompletenessResult(cResult);
            setCompletenessRunAt(cRun?.created_at ?? cResult.evaluated_at ?? null);
          } else {
            setCompletenessResult(null);
            setCompletenessRunAt(null);
          }
        } else {
          setCompletenessResult(null);
          setCompletenessRunAt(null);
        }

        const matchRes = await fetch(`/api/compensation/cases/${caseId}/match-orgs`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (matchRes.ok) {
          const mJson = await matchRes.json();
          const d = mJson.data ?? mJson;
          setOrgMatches(Array.isArray(d.matches) ? d.matches : []);
          setOrgMatchGlobalFlags(Array.isArray(d.global_flags) ? d.global_flags : []);
          setOrgMatchRunAt(d.created_at ?? null);
        } else {
          setOrgMatches([]);
          setOrgMatchGlobalFlags([]);
          setOrgMatchRunAt(null);
        }
      } catch (err) {
        console.error("Failed to load case from API", err);
        setLoadedCase(null);
        setMessagesUnreadCount(0);
        setCaseAccess(null);
        setTimelineEvents([]);
        setNotes([]);
        setRoutingResult(null);
        setCompletenessResult(null);
        setOrgMatches([]);
        setOrgMatchGlobalFlags([]);
        setOrgMatchRunAt(null);
      } finally {
        setLoading(false);
      }
    };

    if (caseId) {
      load();
    }
  }, [caseId]);

  useEffect(() => {
    if (loadedCase) setCaseStatusDraft(loadedCase.status);
  }, [loadedCase?.status]);

  const reloadCase = () => {
    if (!caseId) return;
    setLoading(true);
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token;
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      fetch(`/api/compensation/cases/${caseId}`, { headers })
        .then((res) => (res.ok ? res.json() : null))
        .then(async (json) => {
          if (!json?.case) return;
          const docs = (json.documents ?? []) as any[];
          const access = json.access as CaseAccess | undefined;
          setCaseAccess(access ?? null);
          const cr = json.case;
          setLoadedCase((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              status: (cr.status as CaseStatus) ?? prev.status,
              eligibility_result:
                (cr.eligibility_result as EligibilityResult | null | undefined) ??
                prev.eligibility_result ??
                null,
              assigned_advocate_id:
                (cr.assigned_advocate_id as string | null | undefined) ??
                prev.assigned_advocate_id ??
                null,
              documents: docs.map((d: any) => ({
                id: d.id,
                type: d.doc_type || "other",
                description: d.description ?? "",
                fileName: d.file_name,
                fileSize: d.file_size ?? 0,
                lastModified: Date.parse(d.created_at || new Date().toISOString()),
                status: d.status ?? "active",
              })),
            };
          });
          try {
            const msgRes = await fetch(`/api/cases/${caseId}/messages`, { headers });
            if (msgRes.ok) {
              const mj = await msgRes.json();
              setMessagesUnreadCount(
                typeof mj.unread_count === "number" ? mj.unread_count : 0
              );
            }
          } catch {
            /* keep prior count */
          }
          const timelineRes = await fetch(`/api/compensation/cases/${caseId}/timeline`, { headers });
          if (timelineRes.ok) {
            const tJson = await timelineRes.json();
            setTimelineEvents(tJson.data?.events ?? tJson.events ?? []);
          }
          if (access?.role !== "owner" && token) {
            const notesRes = await fetch(`/api/compensation/cases/${caseId}/notes`, { headers });
            if (notesRes.ok) {
              const nJson = await notesRes.json();
              setNotes(nJson.data?.notes ?? nJson.notes ?? []);
            }
          }
        })
        .finally(() => setLoading(false));
    });
  };

  const handleAddNote = async () => {
    if (!caseId || !noteContent.trim()) return;
    setNoteActioning("add");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const res = await fetch(`/api/compensation/cases/${caseId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: noteContent.trim() }),
      });
      if (res.ok) {
        setNoteContent("");
        const nJson = await res.json();
        setNotes((prev) => [nJson.data?.note ?? nJson.note, ...prev]);
        const tRes = await fetch(`/api/compensation/cases/${caseId}/timeline`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (tRes.ok) {
          const tJson = await tRes.json();
          setTimelineEvents(tJson.data?.events ?? tJson.events ?? []);
        }
      } else {
        const err = await res.json();
        alert(
          err?.error?.message ??
            "We couldn't add that note — the server may be busy. Wait a moment and try again.",
        );
      }
    } finally {
      setNoteActioning(null);
    }
  };

  const handleEditNote = async (noteId: string) => {
    if (!editingNoteContent.trim()) return;
    setNoteActioning(noteId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const res = await fetch(`/api/case-notes/${noteId}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: editingNoteContent.trim() }),
      });
      if (res.ok) {
        setEditingNoteId(null);
        setEditingNoteContent("");
        const nJson = await res.json();
        setNotes((prev) =>
          prev.map((n) => (n.id === noteId ? (nJson.data?.note ?? nJson.note) : n))
        );
      } else {
        const err = await res.json();
        alert(
          err?.error?.message ??
            "We couldn't save that note. Check your connection, refresh the page, and try again.",
        );
      }
    } finally {
      setNoteActioning(null);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Delete this note?")) return;
    setNoteActioning(noteId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const res = await fetch(`/api/case-notes/${noteId}/delete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setNotes((prev) => prev.filter((n) => n.id !== noteId));
      else {
        const err = await res.json();
        alert(
          err?.error?.message ??
            "We couldn't delete that note. Refresh the page and try again — if it still shows, contact engineering.",
        );
      }
    } finally {
      setNoteActioning(null);
    }
  };

  const handleDocumentAccess = async (docId: string, accessType: "view" | "download") => {
    setDocumentActioning(docId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        alert("Your session expired. Sign in again, then reopen this case.");
        return;
      }
      const res = await fetch("/api/documents/access-url", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ document_id: docId, access_type: accessType }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(
          json?.error?.message ??
            "We couldn't open that document — you may not have access, or the link expired. Try again from the documents list.",
        );
        return;
      }
      const url = json.data?.url ?? json.url;
      if (url) {
        if (accessType === "download") {
          const a = document.createElement("a");
          a.href = url;
          a.download = "";
          a.target = "_blank";
          document.body.appendChild(a);
          a.click();
          a.remove();
        } else {
          window.open(url, "_blank", "noopener");
        }
      }
    } catch (err) {
      console.error("Document access error", err);
      alert(
        "We couldn't open that document because something interrupted the request. Check your connection and try again.",
      );
    } finally {
      setDocumentActioning(null);
    }
  };

  const handleDocumentDelete = async (docId: string) => {
    if (!confirm("Soft-delete this document? It will be hidden from lists.")) return;
    setDocumentActioning(docId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const res = await fetch("/api/documents/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ document_id: docId }),
      });
      if (res.ok) reloadCase();
      else
        alert(
          (await res.json())?.error?.message ??
            "We couldn't delete that document. Refresh the page and try again.",
        );
    } finally {
      setDocumentActioning(null);
    }
  };

  const handleDocumentRestrict = async (docId: string, restrict: boolean) => {
    setDocumentActioning(docId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const path = restrict ? "/api/documents/restrict" : "/api/documents/unrestrict";
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(restrict ? { document_id: docId } : { document_id: docId }),
      });
      if (res.ok) reloadCase();
      else
        alert(
          (await res.json())?.error?.message ??
            "We couldn't update document visibility. Refresh the page and try again.",
        );
    } finally {
      setDocumentActioning(null);
    }
  };

  const handleDownloadSummaryPdf = async () => {
    if (!loadedCase) return;
    try {
      const res = await fetch("/api/compensation/summary-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loadedCase.application),
      });

      if (!res.ok) {
        alert(
          "We couldn't build the summary PDF — the server may have timed out. Wait a moment and try again.",
        );
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "nxtstps_cvc_summary.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading summary PDF", err);
      alert(
        "We couldn't finish the summary PDF. Check your connection, refresh the page, and try again.",
      );
    }
  };

    const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    const newMessages = [
      ...chatMessages,
      { role: "user" as const, content: trimmed },
    ];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch("/api/nxtguide", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: newMessages,
          currentRoute: "/admin/cases",
          currentStep: null,
          caseId,
        }),
      });

      if (res.status === 403) {
        const json = await res.json().catch(() => ({}));
        if ((json as { error?: { code?: string } })?.error?.code === "CONSENT_REQUIRED") {
          router.replace(
            `/consent?workflow=ai_chat&redirect=${encodeURIComponent(`/admin/cases/${caseId}`)}`
          );
          return;
        }
      }

      if (!res.ok) {
        console.error("NxtGuide error:", await res.text());
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Sorry, I had trouble responding just now. Please try again in a moment.",
          },
        ]);
        return;
      }

      const json = await res.json();
      const reply = (json.reply as string) || "";

      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply },
      ]);
    } catch (err) {
      console.error("NxtGuide error:", err);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I ran into a technical problem while trying to respond. Please try again shortly.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-US");
  };

  const updateCaseStatus = async () => {
    if (!caseId || !caseStatusDraft || !loadedCase) return;
    setStatusSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch(`/api/compensation/cases/${caseId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: caseStatusDraft }),
      });
      if (res.ok) {
        const json = await res.json();
        const st = json.case?.status as CaseStatus | undefined;
        if (st) {
          setLoadedCase((prev) => (prev ? { ...prev, status: st } : null));
          setCaseStatusDraft(st);
        }
        const timelineRes = await fetch(`/api/compensation/cases/${caseId}/timeline`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (timelineRes.ok) {
          const tJson = await timelineRes.json();
          setTimelineEvents(tJson.data?.events ?? tJson.events ?? []);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(
          err?.error?.message ??
            "We couldn't update case status. Refresh the page and try again — check the timeline for the current value.",
        );
      }
    } finally {
      setStatusSaving(false);
    }
  };

  const adminTabs: { id: AdminCaseTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "intake", label: "Intake" },
    { id: "documents", label: "Documents" },
    { id: "messages", label: "Messages" },
    { id: "timeline", label: "Timeline" },
    { id: "matching", label: "Matching" },
    { id: "routing", label: "Routing" },
    { id: "completeness", label: "Completeness" },
    { id: "notes", label: "Internal notes" },
    { id: "access", label: "Access" },
    { id: "appointments", label: "Appointments" },
  ];

  const visibleAdminTabs = adminTabs.filter(
    (t) => t.id !== "notes" || canViewNotes
  );

  const adminNextAction = useMemo(() => {
    if (!loadedCase) return null;
    return getNextActionForCase({
      mode: "admin",
      caseId: loadedCase.id,
      eligibilityResult: loadedCase.eligibility_result ?? null,
      status: loadedCase.status,
      messagesUnread: messagesUnreadCount,
      completenessResult: completenessResult as CompletenessSignal | null,
      matchCount: orgMatches.length,
      intakeMissingReviewCount: 0,
      intakeDeferredSkippedCount: 0,
      hasAdvocateConnected: !!loadedCase.assigned_advocate_id,
    });
  }, [
    loadedCase,
    messagesUnreadCount,
    completenessResult,
    orgMatches.length,
  ]);

  if (loading) {
    return (
      <main className=" min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-4 sm:px-8 py-8">
        <div className="max-w-3xl mx-auto">Loading case…</div>
      </main>
    );
  }

  if (!loadedCase) {
    return (
      <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-4 sm:px-8 py-8">
        <div className="max-w-3xl mx-auto space-y-4">
          <header className="space-y-2">
            <p className="text-xs tracking-[0.25em] uppercase text-[var(--color-muted)]">
              Admin · Case Not Found
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold">
              Case could not be found
            </h1>
          </header>
          <p className="text-sm text-[var(--color-slate)]">
            This case ID could not be loaded from the server. It may have been
            removed or you may be using a different environment.
          </p>
          <a
            href="/admin/cases"
            className="inline-flex items-center rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs text-[var(--color-charcoal)] hover:bg-[var(--color-light-sand)] transition"
          >
            ← Back to all cases
          </a>
        </div>
              {/* Advocate NxtGuide chat widget */}
      <div className="fixed bottom-4 right-4 z-40">
        {chatOpen ? (
          <div className="w-72 sm:w-80 rounded-2xl border border-[var(--color-border)] bg-[var(--color-warm-white)] shadow-lg shadow-[var(--shadow-modal)] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border-light)] bg-white">
              <div className="text-[11px]">
                <div className="font-semibold text-[var(--color-navy)]">NxtGuide</div>
                <div className="text-[var(--color-slate)]">
                  Advocate view – case support
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="text-[var(--color-muted)] hover:text-[var(--color-charcoal)] text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 text-[11px]">
              {chatMessages.length === 0 && (
                <p className="text-[var(--color-muted)]">
                  You can ask things like:
                  <br />
                  • “What appears to be missing in this case?”
                  <br />
                  • “Do we have enough documentation for funeral costs?”
                  <br />
                  • “Which documents should I ask the family for?”
                </p>
              )}
              {chatMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-1.5 ${
                      m.role === "user"
                        ? "bg-[var(--color-teal-deep)] text-white"
                        : "bg-white text-[var(--color-navy)] border border-[var(--color-border)]"
                    } text-[11px] whitespace-pre-wrap`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <p className="text-[11px] text-[var(--color-muted)]">
                  NxtGuide is typing…
                </p>
              )}
            </div>

            <form onSubmit={handleChatSubmit} className="border-t border-[var(--color-border-light)] p-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask NxtGuide about this case..."
                className="w-full rounded-full border border-[var(--color-border)] bg-[var(--color-warm-cream)]/85 px-3 py-1.5 text-[11px] text-[var(--color-navy)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-teal)] focus:border-[var(--color-teal)]"
              />
            </form>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="inline-flex items-center rounded-full bg-[var(--color-teal-deep)] px-3 py-2 text-[11px] font-semibold text-white shadow-md shadow-[var(--shadow-modal)] hover:bg-[var(--color-teal)] transition"
          >
            Ask NxtGuide about this case
          </button>
        )}
      </div>
      
      </main>
    );
  }

  const app = loadedCase.application;
  const victim = app?.victim || {};
  const applicant = app?.applicant || {};
  const crime = app?.crime || {};
  const losses = app?.losses || {};
  const medical = app?.medical || {};
  const employment = app?.employment || {};
  const funeral = app?.funeral || {};
  const certification = app?.certification || {};
  const docs: UploadedDoc[] = loadedCase.documents || [];

  const fieldState = app?._fieldState ?? {};
  const getNested = (obj: any, path: string): unknown => {
    const parts = path.split(".");
    let cur = obj;
    for (const p of parts) {
      cur = cur?.[p];
    }
    return cur;
  };
  const currentValueForAmend = amendFieldKey
    ? getNested(app, amendFieldKey)
    : undefined;
  const amendedEntry = amendFieldKey ? fieldState[amendFieldKey] : null;
  const isAmended = amendedEntry?.status === "amended";

  const AMENDABLE_FIELDS: { key: string; label: string }[] = [
    { key: "crime.crimeDescription", label: "Crime description" },
    { key: "crime.injuryDescription", label: "Injury description" },
    { key: "victim.firstName", label: "Victim first name" },
    { key: "victim.lastName", label: "Victim last name" },
    { key: "victim.cellPhone", label: "Victim phone" },
  ];

  const selectedLossTypes = Object.entries(losses)
    .filter(([_, v]) => v)
    .map(([k]) => k);

  const primaryProvider = medical.providers?.[0];
  const primaryJob = employment.employmentHistory?.[0];
  const primaryFuneralPayer = funeral.payments?.[0];

  const docTypeCounts: Record<string, number> = {};
  docs.forEach((d) => {
    docTypeCounts[d.type] = (d.type && docTypeCounts[d.type]
      ? docTypeCounts[d.type]
      : 0) + 1;
  });

  return (
    <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-4 sm:px-8 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-2">
          <p className="text-xs tracking-[0.25em] uppercase text-[var(--color-muted)]">
            Admin · Case workspace
          </p>
          <h1 className="text-2xl sm:px-auto text-[var(--color-charcoal)]">
            {victim.firstName || victim.lastName
              ? `${victim.firstName || ""} ${victim.lastName || ""}`.trim()
              : "Unknown victim"}
          </h1>
          <p className="text-sm text-[var(--color-muted)] max-w-3xl">
            Review and manage all activity, documents, messaging, and evaluations for this case.
          </p>
          <p className="text-xs text-[var(--color-muted)] max-w-3xl">
            Run evaluations to understand what this case still needs. Open messages to coordinate
            with victims in one place.
          </p>
          <p className="text-sm text-[var(--color-slate)]">
            Case ID:{" "}
            <span className="font-mono text-[11px] text-[var(--color-muted)]">
              {loadedCase.id}
            </span>
          </p>
          <p className="text-[11px] text-[var(--color-muted)]">
            Created: {formatDate(loadedCase.createdAt)} · Status:{" "}
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 ${
                loadedCase.status === "ready_for_review"
                  ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
                  : "bg-[var(--color-light-sand)] text-[var(--color-slate)] border border-[var(--color-border)]"
              }`}
            >
              {loadedCase.status === "ready_for_review"
                ? "Ready for review"
                : loadedCase.status}
            </span>
          </p>
        </header>

        <nav
          className="sticky top-0 z-20 -mx-1 flex flex-wrap gap-1.5 border-b border-[var(--color-border-light)] bg-[var(--color-warm-white)]/95 px-1 py-2 backdrop-blur-sm"
          aria-label="Case sections"
        >
          {visibleAdminTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition ${
                activeTab === t.id
                  ? "bg-emerald-600/25 text-emerald-100 border border-emerald-500/40"
                  : "bg-white/92 text-[var(--color-muted)] border border-[var(--color-border)] hover:border-[var(--color-border)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {activeTab === "overview" && (
          <section className="rounded-2xl border border-[var(--color-border)] bg-white/92 p-5 text-xs space-y-4">
            <h2 className="text-sm font-semibold text-[var(--color-navy)]">Overview</h2>
            <p className="text-[var(--color-muted)]">
              Quick summary and common actions. Use the tabs above to jump to intake details,
              documents, secure messages, evaluations, and more.
            </p>
            {adminNextAction && (
              <div className="rounded-xl border border-[var(--color-border)]/90 bg-[var(--color-warm-white)]/45 p-3 space-y-2">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">
                  Next action for this case
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${priorityBadgeClassName(
                      adminNextAction.priority
                    )}`}
                  >
                    {priorityLabel(adminNextAction.priority)}
                  </span>
                  <span className="text-sm font-semibold text-[var(--color-navy)]">
                    {adminNextAction.label}
                  </span>
                </div>
                <p className="text-[var(--color-muted)] leading-relaxed">{adminNextAction.reason}</p>
                {adminNextAction.href ? (
                  <Link
                    href={adminNextAction.href}
                    className="inline-flex text-[11px] font-medium text-emerald-400/95 hover:text-emerald-300 underline-offset-2 hover:underline"
                  >
                    Go to suggested area →
                  </Link>
                ) : null}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/75 p-3">
                <p className="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">Victim</p>
                <p className="text-[var(--color-charcoal)] font-medium">
                  {victim.firstName || victim.lastName
                    ? `${victim.firstName || ""} ${victim.lastName || ""}`.trim()
                    : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/75 p-3">
                <p className="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">Your access</p>
                <p className="text-[var(--color-charcoal)]">
                  {caseAccess
                    ? `${caseAccess.role} · ${caseAccess.can_edit ? "Can edit" : "View only"}`
                    : "—"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-[var(--color-slate)] flex flex-col gap-1">
                <span className="text-[10px] uppercase text-[var(--color-muted)]">Update case status</span>
                <select
                  value={caseStatusDraft}
                  onChange={(e) => setCaseStatusDraft(e.target.value as CaseStatus)}
                  className="rounded-lg border border-[var(--color-border)] bg-white px-2 py-1.5 text-[var(--color-charcoal)]"
                >
                  <option value="draft">draft</option>
                  <option value="ready_for_review">ready_for_review</option>
                  <option value="submitted">submitted</option>
                  <option value="closed">closed</option>
                </select>
              </label>
              <button
                type="button"
                disabled={statusSaving || caseStatusDraft === loadedCase.status}
                onClick={updateCaseStatus}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-light-sand)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-navy)] hover:bg-[var(--color-teal-deep)] disabled:opacity-50"
              >
                {statusSaving ? "Saving…" : "Update case status"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1 border-t border-[var(--color-border-light)]">
              <a
                href="/admin/cases"
                className="inline-flex items-center rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-[11px] text-[var(--color-charcoal)] hover:bg-[var(--color-light-sand)] transition"
              >
                ← Back to all cases
              </a>
              <button
                type="button"
                onClick={handleDownloadSummaryPdf}
                className="inline-flex items-center rounded-lg border border-blue-600 bg-[var(--color-teal-deep)] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[var(--color-teal)] transition"
              >
                Download summary PDF
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("messages")}
                className="inline-flex items-center rounded-lg border border-sky-500/50 bg-sky-500/15 px-3 py-1.5 text-[11px] font-semibold text-sky-200 hover:bg-sky-500/25"
              >
                Open Messages
              </button>
              {canRunRouting && (
                <button
                  type="button"
                  disabled={routingLoading}
                  onClick={async () => {
                    if (!caseId) return;
                    setRoutingLoading(true);
                    try {
                      const { data: sessionData } = await supabase.auth.getSession();
                      const token = sessionData.session?.access_token;
                      const res = await fetch(`/api/compensation/cases/${caseId}/routing`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify({}),
                      });
                      if (res.ok) {
                        const json = await res.json();
                        const result = json.data?.result ?? json.result;
                        if (result?.programs) {
                          setRoutingResult(result);
                          setRoutingRunAt(result.evaluated_at ?? new Date().toISOString());
                        }
                        const timelineRes = await fetch(`/api/compensation/cases/${caseId}/timeline`, {
                          headers: token ? { Authorization: `Bearer ${token}` } : {},
                        });
                        if (timelineRes.ok) {
                          const tJson = await timelineRes.json();
                          setTimelineEvents(tJson.data?.events ?? tJson.events ?? []);
                        }
                      } else {
                        const err = await res.json();
                        alert(
                          err?.error?.message ??
                            "Routing didn't finish — the server may be busy. Wait a moment and run it again.",
                        );
                      }
                    } finally {
                      setRoutingLoading(false);
                    }
                  }}
                  className="inline-flex items-center rounded-lg border border-[var(--color-teal)] bg-[var(--color-teal-deep)] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[var(--color-teal)] disabled:opacity-50 transition"
                >
                  {routingLoading ? "Evaluating…" : "Run Routing"}
                </button>
              )}
              {canRunCompleteness && (
                <button
                  type="button"
                  disabled={completenessLoading}
                  onClick={async () => {
                    if (!caseId) return;
                    setCompletenessLoading(true);
                    try {
                      const { data: sessionData } = await supabase.auth.getSession();
                      const token = sessionData.session?.access_token;
                      const res = await fetch(`/api/compensation/cases/${caseId}/completeness`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify({}),
                      });
                      if (res.ok) {
                        const json = await res.json();
                        const result = json.data?.result ?? json.result;
                        if (result?.overall_status != null) {
                          setCompletenessResult(result);
                          setCompletenessRunAt(result.evaluated_at ?? new Date().toISOString());
                        }
                        const timelineRes = await fetch(`/api/compensation/cases/${caseId}/timeline`, {
                          headers: token ? { Authorization: `Bearer ${token}` } : {},
                        });
                        if (timelineRes.ok) {
                          const tJson = await timelineRes.json();
                          setTimelineEvents(tJson.data?.events ?? tJson.events ?? []);
                        }
                      } else {
                        const err = await res.json();
                        alert(
                          err?.error?.message ??
                            "Completeness check didn't finish. Wait a moment and run it again.",
                        );
                      }
                    } finally {
                      setCompletenessLoading(false);
                    }
                  }}
                  className="inline-flex items-center rounded-lg border border-amber-500/60 bg-amber-500/20 px-3 py-1.5 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/30 disabled:opacity-50 transition"
                >
                  {completenessLoading ? "Evaluating…" : "Run Completeness"}
                </button>
              )}
              {canRunOrgMatching && (
                <button
                  type="button"
                  disabled={orgMatchingRunLoading}
                  onClick={async () => {
                    if (!caseId) return;
                    setOrgMatchingRunLoading(true);
                    try {
                      const { data: sessionData } = await supabase.auth.getSession();
                      const token = sessionData.session?.access_token;
                      const res = await fetch(`/api/compensation/cases/${caseId}/match-orgs`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify({}),
                      });
                      if (res.ok) {
                        const json = await res.json();
                        const d = json.data ?? json;
                        setOrgMatches(Array.isArray(d.matches) ? d.matches : []);
                        setOrgMatchGlobalFlags(Array.isArray(d.global_flags) ? d.global_flags : []);
                        setOrgMatchRunAt(new Date().toISOString());
                        const timelineRes = await fetch(`/api/compensation/cases/${caseId}/timeline`, {
                          headers: token ? { Authorization: `Bearer ${token}` } : {},
                        });
                        if (timelineRes.ok) {
                          const tJson = await timelineRes.json();
                          setTimelineEvents(tJson.data?.events ?? tJson.events ?? []);
                        }
                      } else {
                        const err = await res.json().catch(() => ({}));
                        alert(
                          err?.error?.message ??
                            "Organization matching didn't finish. Wait a moment and run it again.",
                        );
                      }
                    } finally {
                      setOrgMatchingRunLoading(false);
                    }
                  }}
                  className="inline-flex items-center rounded-lg bg-[var(--color-teal-deep)] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[var(--color-teal)] disabled:opacity-50 transition"
                >
                  {orgMatchingRunLoading ? "Matching…" : "Find Matching Organizations"}
                </button>
              )}
              {canRunOcr && docs.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("documents");
                  }}
                  className="inline-flex items-center rounded-lg bg-[var(--color-teal-deep)] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[var(--color-teal)]"
                >
                  Run OCR (in Documents)
                </button>
              )}
            </div>
          </section>
        )}

        {/* Victim & applicant */}
        <section
          className={`bg-[var(--color-warm-cream)]/90 border border-[var(--color-border-light)] rounded-2xl p-5 text-xs space-y-2 ${
            activeTab !== "intake" ? "hidden" : ""
          }`}
        >
          <h2 className="text-sm font-semibold text-[var(--color-navy)]">
            Victim & applicant
          </h2>
          <p className="text-[var(--color-charcoal)]">
            Victim: {victim.firstName || "—"} {victim.lastName || ""}
          </p>
          <p className="text-[var(--color-slate)]">
            DOB: {victim.dateOfBirth || "—"} · City: {victim.city || "—"},{" "}
            {victim.state || "—"}
          </p>
          {applicant.isSameAsVictim ? (
            <p className="text-[var(--color-slate)]">
              Applicant is the same as the applicant.
            </p>
          ) : (
            <>
              <p className="text-[var(--color-charcoal)]">
                Applicant: {applicant.firstName || "—"}{" "}
                {applicant.lastName || ""}
              </p>
              <p className="text-[var(--color-slate)]">
                Relationship: {applicant.relationshipToVictim || "Not provided"}
                · Phone: {applicant.cellPhone || "—"}
              </p>
            </>
          )}
        </section>

        {/* Crime */}
        <section
          className={`bg-[var(--color-warm-cream)]/90 border border-[var(--color-border-light)] rounded-2xl p-5 text-xs space-y-2 ${
            activeTab !== "intake" ? "hidden" : ""
          }`}
        >
          <h2 className="text-sm font-semibold text-[var(--color-navy)]">Crime</h2>
          <p className="text-[var(--color-slate)]">
            Date of incident: {crime.dateOfCrime || "—"}
          </p>
          <p className="text-[var(--color-slate)]">
            Location: {crime.crimeAddress || "—"}, {crime.crimeCity || "—"}
            {crime.crimeCounty ? ` (${crime.crimeCounty})` : ""}
          </p>
          <p className="text-[var(--color-slate)]">
            Reported to: {crime.reportingAgency || "—"} · Police report #:{" "}
            {crime.policeReportNumber || "—"}
          </p>
          {crime.crimeDescription && (
            <p className="text-[var(--color-slate)]">
              Description: {crime.crimeDescription}
              {fieldState["crime.crimeDescription"]?.status === "amended" && (
                <span className="ml-2 text-amber-300 text-[10px]">(Amended)</span>
              )}
            </p>
          )}
          {crime.injuryDescription && (
            <p className="text-[var(--color-slate)]">
              Injuries: {crime.injuryDescription}
              {fieldState["crime.injuryDescription"]?.status === "amended" && (
                <span className="ml-2 text-amber-300 text-[10px]">(Amended)</span>
              )}
            </p>
          )}
        </section>

        {/* Phase 8: Advocate amend intake */}
        {canAmendIntake && (
          <section
            className={`bg-[var(--color-warm-cream)]/90 border border-[var(--color-border-light)] rounded-2xl p-5 text-xs space-y-3 ${
              activeTab !== "intake" ? "hidden" : ""
            }`}
          >
            <h2 className="text-sm font-semibold text-[var(--color-navy)]">Amend intake field</h2>
            <p className="text-[var(--color-muted)]">
              Change a value with a required reason. Original value is preserved in the audit trail.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="block text-[var(--color-muted)] mb-1">Field</label>
                <select
                  value={amendFieldKey}
                  onChange={(e) => {
                    setAmendFieldKey(e.target.value);
                    const val = e.target.value ? getNested(app, e.target.value) : "";
                    setAmendNewValue(typeof val === "string" ? val : val != null ? String(val) : "");
                  }}
                  className="w-full rounded border border-[var(--color-border)] bg-white px-2 py-1.5 text-[var(--color-charcoal)]"
                >
                  <option value="">Select field…</option>
                  {AMENDABLE_FIELDS.map((f) => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  ))}
                </select>
              </div>
              {amendFieldKey && (
                <>
                  <div className="sm:col-span-2">
                    <label className="block text-[var(--color-muted)] mb-1">Current value</label>
                    <p className="text-[var(--color-charcoal)] break-words">
                      {currentValueForAmend !== undefined && currentValueForAmend !== null && currentValueForAmend !== ""
                        ? String(currentValueForAmend)
                        : "(empty)"}
                      {isAmended && amendedEntry?.previous_value != null && (
                        <span className="block text-amber-200/80 mt-1 text-[10px]">
                          Original: {String(amendedEntry.previous_value)}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[var(--color-muted)] mb-1">New value</label>
                    <input
                      type="text"
                      value={amendNewValue}
                      onChange={(e) => setAmendNewValue(e.target.value)}
                      className="w-full rounded border border-[var(--color-border)] bg-white px-2 py-1.5 text-[var(--color-charcoal)]"
                      placeholder="Enter new value"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[var(--color-muted)] mb-1">Reason (required)</label>
                    <textarea
                      value={amendReason}
                      onChange={(e) => setAmendReason(e.target.value)}
                      rows={2}
                      className="w-full rounded border border-[var(--color-border)] bg-white px-2 py-1.5 text-[var(--color-charcoal)]"
                      placeholder="Why is this being amended?"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      disabled={amendLoading || !amendReason.trim()}
                      onClick={async () => {
                        if (!caseId || !amendFieldKey || !amendReason.trim()) return;
                        setAmendLoading(true);
                        try {
                          const { data: sessionData } = await supabase.auth.getSession();
                          const token = sessionData.session?.access_token;
                          const res = await fetch("/api/intake/amend", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              ...(token ? { Authorization: `Bearer ${token}` } : {}),
                            },
                            body: JSON.stringify({
                              caseId,
                              fieldKey: amendFieldKey,
                              newValue: amendNewValue,
                              reason: amendReason.trim(),
                            }),
                          });
                          if (res.ok) {
                            const json = await res.json();
                            const updatedApp = json?.data?.application;
                            if (updatedApp && loadedCase) {
                              setLoadedCase({ ...loadedCase, application: updatedApp });
                            }
                            setAmendReason("");
                            setAmendNewValue("");
                            setAmendFieldKey("");
                          }
                        } finally {
                          setAmendLoading(false);
                        }
                      }}
                      className="rounded border border-blue-600 bg-[var(--color-teal-deep)] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[var(--color-teal)] disabled:opacity-50"
                    >
                      {amendLoading ? "Amending…" : "Amend"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* Phase 11: Program routing result */}
        {(activeTab === "routing" || routingResult || canRunRouting) && (
          <section
            className={`bg-[var(--color-warm-cream)]/90 border border-[var(--color-border-light)] rounded-2xl p-5 text-xs space-y-3 ${
              activeTab !== "routing" ? "hidden" : ""
            }`}
          >
            <h2 className="text-sm font-semibold text-[var(--color-navy)]">Program routing</h2>
            {routingRunAt && (
              <p className="text-[11px] text-[var(--color-muted)]">
                Last evaluated: {formatDate(routingRunAt)}
              </p>
            )}
            {!routingResult ? (
              <div className="space-y-2">
                <p className="text-[var(--color-muted)]">
                  No routing result yet. Run Routing from the Overview tab to see which programs may
                  apply based on this intake.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("overview")}
                  className="rounded-lg bg-[var(--color-teal-deep)] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[var(--color-teal)]"
                >
                  Run Routing
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--color-border-light)] space-y-4">
                {routingResult.programs.map((prog) => (
                  <li key={prog.program_key} className="py-3 first:pt-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-[var(--color-navy)]">{prog.program_name}</span>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] ${
                          prog.eligibility_status === "likely_eligible"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : prog.eligibility_status === "possibly_eligible"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : prog.eligibility_status === "insufficient_information"
                                ? "bg-[var(--color-teal-light)]/40 text-[var(--color-slate)] border border-[var(--color-muted)]/40"
                                : "bg-red-500/20 text-red-300 border border-red-500/40"
                        }`}
                      >
                        {prog.eligibility_status.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-[var(--color-muted)]">confidence: {prog.confidence}</span>
                    </div>
                    {prog.explanation && (
                      <p className="text-[var(--color-muted)] mt-1">{prog.explanation}</p>
                    )}
                    {prog.missing_requirements.length > 0 && (
                      <div className="mt-2">
                        <p className="text-[var(--color-muted)] text-[10px] uppercase tracking-wide">Missing / unknown</p>
                        <ul className="list-disc list-inside text-[var(--color-muted)] mt-0.5">
                          {prog.missing_requirements.slice(0, 8).map((m, i) => (
                            <li key={i}>{m}</li>
                          ))}
                          {prog.missing_requirements.length > 8 && (
                            <li>… and {prog.missing_requirements.length - 8} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                    {prog.required_documents.length > 0 && (
                      <p className="mt-1.5 text-[var(--color-muted)]">
                        <span className="text-[var(--color-muted)]">Required documents:</span>{" "}
                        {prog.required_documents.join(", ")}
                      </p>
                    )}
                    {prog.deadline_summary && (
                      <p className="mt-1 text-[var(--color-muted)]">
                        <span className="text-[var(--color-muted)]">Deadline:</span> {prog.deadline_summary}
                      </p>
                    )}
                    {prog.next_steps.length > 0 && (
                      <div className="mt-1.5">
                        <p className="text-[var(--color-muted)] text-[10px] uppercase tracking-wide">Next steps</p>
                        <ul className="list-disc list-inside text-[var(--color-muted)] mt-0.5">
                          {prog.next_steps.slice(0, 5).map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Phase B: Recommended organizations */}
        {(activeTab === "matching" ||
          orgMatches.length > 0 ||
          orgMatchGlobalFlags.length > 0 ||
          canRunOrgMatching) && (
          <section
            className={`bg-white border border-[var(--color-border)] rounded-2xl p-5 text-xs space-y-3 ${
              activeTab !== "matching" ? "hidden" : ""
            }`}
          >
            <h2 className="text-sm font-semibold text-[var(--color-navy)]">Recommended organizations</h2>
            <p className="text-[var(--color-muted)] text-[11px] leading-relaxed">
              {TRUST_MICROCOPY.recommendationsLead} Confirm fit directly with each organization.{" "}
              <a
                href={TRUST_LINK_HREF.matching}
                className="text-[var(--color-slate)] hover:text-white underline"
                target="_blank"
                rel="noreferrer"
              >
                {TRUST_LINK_LABELS.howRecommendationsWork}
              </a>
            </p>
            {orgMatchRunAt && (
              <p className="text-[11px] text-[var(--color-muted)]">Last run: {formatDate(orgMatchRunAt)}</p>
            )}
            {orgMatchGlobalFlags.map((f, i) => (
              <p key={i} className="text-amber-200/90 text-[11px]">
                {f}
              </p>
            ))}
            {orgMatches.length === 0 && !orgMatchGlobalFlags.length && canRunOrgMatching && (
              <div className="space-y-2">
                <p className="text-[var(--color-muted)]">
                  {EMPTY_COPY.noMatchingResults} Find Matching Organizations from the Overview tab to
                  suggest organizations that may help with this case.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("overview")}
                  className="rounded-lg bg-[var(--color-teal-deep)] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[var(--color-teal)]"
                >
                  Find Matching Organizations
                </button>
              </div>
            )}
            {orgMatches.length > 0 && (
              <ul className="divide-y divide-[var(--color-border-light)] space-y-3">
                {orgMatches.map((m) => (
                  <li key={m.organization_id} className="pt-3 first:pt-0">
                    <RecommendedOrganizationCard match={m} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Phase 12: Documentation completeness */}
        {(activeTab === "completeness" || completenessResult || canRunCompleteness) && (
          <section
            className={`bg-[var(--color-warm-cream)]/90 border border-[var(--color-border-light)] rounded-2xl p-5 text-xs space-y-3 ${
              activeTab !== "completeness" ? "hidden" : ""
            }`}
          >
            <h2 className="text-sm font-semibold text-[var(--color-navy)]">Documentation completeness</h2>
            {completenessRunAt && (
              <p className="text-[11px] text-[var(--color-muted)]">
                Last evaluated: {formatDate(completenessRunAt)}
              </p>
            )}
            {!completenessResult ? (
              <div className="space-y-2">
                <p className="text-[var(--color-muted)]">
                  No completeness result yet. Run Routing first, then Run Completeness from the
                  Overview tab to see what documents and information are missing.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("overview")}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-light-sand)]/85 px-3 py-1.5 text-[11px] font-semibold text-[var(--color-navy)] hover:bg-[var(--color-light-sand)]"
                >
                  Run Completeness
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      completenessResult.overall_status === "complete"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : completenessResult.overall_status === "mostly_complete"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : completenessResult.overall_status === "incomplete"
                            ? "bg-red-500/20 text-red-300 border border-red-500/40"
                            : "bg-[var(--color-teal-light)]/40 text-[var(--color-slate)] border border-[var(--color-muted)]/40"
                    }`}
                  >
                    {completenessResult.overall_status.replace(/_/g, " ")}
                  </span>
                  <span className="text-[11px] text-[var(--color-muted)]">
                    Blocking: {completenessResult.summary_counts.blocking_count} · Warnings: {completenessResult.summary_counts.warning_count} · Info: {completenessResult.summary_counts.informational_count}
                  </span>
                </div>
                {completenessResult.recommended_next_actions.length > 0 && (
                  <div>
                    <p className="text-[var(--color-muted)] text-[10px] uppercase tracking-wide mb-1">Recommended next actions</p>
                    <ul className="list-disc list-inside text-[var(--color-slate)] space-y-0.5">
                      {completenessResult.recommended_next_actions.slice(0, 5).map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-3">
                  {completenessResult.missing_items.filter((m) => m.type === "missing_document").length > 0 && (
                    <div>
                      <p className="text-[var(--color-muted)] text-[10px] uppercase tracking-wide mb-1">Missing documents</p>
                      <ul className="text-[var(--color-muted)] space-y-0.5">
                        {completenessResult.missing_items
                          .filter((m) => m.type === "missing_document")
                          .slice(0, 6)
                          .map((m, i) => (
                            <li key={i}>{m.message}</li>
                          ))}
                      </ul>
                      <p className="text-[10px] text-[var(--color-muted)] mt-1">
                        <a href="/compensation/documents" className="text-amber-400 hover:underline">Upload document</a>
                      </p>
                    </div>
                  )}
                  {completenessResult.missing_items.filter((m) => m.type === "missing_field").length > 0 && (
                    <div>
                      <p className="text-[var(--color-muted)] text-[10px] uppercase tracking-wide mb-1">Missing information</p>
                      <ul className="text-[var(--color-muted)] space-y-0.5">
                        {completenessResult.missing_items
                          .filter((m) => m.type === "missing_field")
                          .slice(0, 6)
                          .map((m, i) => (
                            <li key={i}>{m.message}</li>
                          ))}
                      </ul>
                      <p className="text-[10px] text-[var(--color-muted)] mt-1">
                        <a href={`/compensation/intake?case=${caseId}`} className="text-amber-400 hover:underline">Go to intake</a>
                      </p>
                    </div>
                  )}
                  {completenessResult.inconsistencies.length > 0 && (
                    <div>
                      <p className="text-[var(--color-muted)] text-[10px] uppercase tracking-wide mb-1">Warnings / inconsistencies</p>
                      <ul className="text-[var(--color-muted)] space-y-0.5">
                        {completenessResult.inconsistencies.slice(0, 4).map((m, i) => (
                          <li key={i}>{m.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {completenessResult.program_results.length > 0 && (
                  <div className="border-t border-[var(--color-border-light)] pt-3 mt-3">
                    <p className="text-[var(--color-muted)] text-[10px] uppercase tracking-wide mb-2">By program</p>
                    <ul className="space-y-3">
                      {completenessResult.program_results.map((prog) => (
                        <li key={prog.program_key} className="border border-[var(--color-border)] rounded-lg p-3">
                          <p className="font-medium text-[var(--color-charcoal)]">{prog.program_name}</p>
                          {prog.missing_documents.length > 0 && (
                            <p className="text-[11px] text-[var(--color-muted)] mt-1">
                              Missing docs: {prog.missing_documents.join(", ")}
                            </p>
                          )}
                          {prog.missing_fields.length > 0 && (
                            <p className="text-[11px] text-[var(--color-muted)]">
                              Missing fields: {prog.missing_fields.slice(0, 3).join(", ")}{prog.missing_fields.length > 3 ? "…" : ""}
                            </p>
                          )}
                          {prog.next_steps.length > 0 && (
                            <p className="text-[11px] text-amber-200/90 mt-1">
                              Next: {prog.next_steps[0]}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* Losses */}
        <section
          className={`bg-[var(--color-warm-cream)]/90 border border-[var(--color-border-light)] rounded-2xl p-5 text-xs space-y-2 ${
            activeTab !== "intake" ? "hidden" : ""
          }`}
        >
          <h2 className="text-sm font-semibold text-[var(--color-navy)]">
            Losses claimed
          </h2>
          {selectedLossTypes.length === 0 ? (
            <p className="text-[var(--color-slate)]">No losses selected.</p>
          ) : (
            <p className="text-[var(--color-slate)]">{selectedLossTypes.join(", ")}</p>
          )}
        </section>

        {/* Medical / Employment / Funeral */}
        <section
          className={`grid gap-4 md:grid-cols-3 text-xs ${
            activeTab !== "intake" ? "hidden" : ""
          }`}
        >
          <div className="bg-[var(--color-warm-cream)]/90 border border-[var(--color-border-light)] rounded-2xl p-5 space-y-1.5">
            <h2 className="text-sm font-semibold text-[var(--color-navy)]">
              Medical / counseling
            </h2>
            {primaryProvider && primaryProvider.providerName ? (
              <>
                <p className="text-[var(--color-slate)]">
                  Provider: {primaryProvider.providerName}
                </p>
                <p className="text-[var(--color-slate)]">
                  City: {primaryProvider.city || "—"} · Phone:{" "}
                  {primaryProvider.phone || "—"}
                </p>
                <p className="text-[var(--color-slate)]">
                  Dates: {primaryProvider.serviceDates || "—"}
                </p>
                <p className="text-[var(--color-slate)]">
                  Bill:{" "}
                  {primaryProvider.amountOfBill != null
                    ? `$${primaryProvider.amountOfBill}`
                    : "—"}
                </p>
              </>
            ) : (
              <p className="text-[var(--color-slate)]">No provider entered.</p>
            )}
          </div>

          <div className="bg-[var(--color-warm-cream)]/90 border border-[var(--color-border-light)] rounded-2xl p-5 space-y-1.5">
            <h2 className="text-sm font-semibold text-[var(--color-navy)]">
              Work & income
            </h2>
            {primaryJob && primaryJob.employerName ? (
              <>
                <p className="text-[var(--color-slate)]">
                  Employer: {primaryJob.employerName}
                </p>
                <p className="text-[var(--color-slate)]">
                  Phone: {primaryJob.employerPhone || "—"}
                </p>
                <p className="text-[var(--color-slate)]">
                  Net monthly wages:{" "}
                  {primaryJob.netMonthlyWages != null
                    ? `$${primaryJob.netMonthlyWages}`
                    : "—"}
                </p>
              </>
            ) : (
              <p className="text-[var(--color-slate)]">No employment info entered.</p>
            )}
          </div>

          <div className="bg-[var(--color-warm-cream)]/90 border border-[var(--color-border-light)] rounded-2xl p-5 space-y-1.5">
            <h2 className="text-sm font-semibold text-[var(--color-navy)]">
              Funeral / burial
            </h2>
            {funeral.funeralHomeName || funeral.funeralBillTotal ? (
              <>
                <p className="text-[var(--color-slate)]">
                  Funeral home: {funeral.funeralHomeName || "—"}
                </p>
                <p className="text-[var(--color-slate)]">
                  Phone: {funeral.funeralHomePhone || "—"}
                </p>
                <p className="text-[var(--color-slate)]">
                  Total funeral bill:{" "}
                  {funeral.funeralBillTotal != null
                    ? `$${funeral.funeralBillTotal}`
                    : "—"}
              </p>
              {primaryFuneralPayer && primaryFuneralPayer.payerName ? (
                <p className="text-[var(--color-slate)]">
                  Payer: {primaryFuneralPayer.payerName} (
                  {primaryFuneralPayer.relationshipToVictim || "relationship not set"}
                  ) · Amount:{" "}
                  {primaryFuneralPayer.amountPaid != null
                    ? `$${primaryFuneralPayer.amountPaid}`
                    : "—"}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-[var(--color-slate)]">No funeral information entered.</p>
          )}
        </div>
      </section>

      {/* Documents */}
      <section
        className={`bg-[var(--color-warm-cream)]/90 border border-[var(--color-border-light)] rounded-2xl p-5 text-xs space-y-2 ${
          activeTab !== "documents" ? "hidden" : ""
        }`}
      >
        <h2 className="text-sm font-semibold text-[var(--color-navy)]">
          Documents attached
        </h2>
        <p className="text-[11px] text-[var(--color-muted)]">
          Uploads, statuses, secure access, and per-document OCR review.
        </p>
        {docs.length === 0 ? (
          <p className="text-[var(--color-slate)]">
            No documents are attached to this case yet. They will appear here after someone uploads files on the applicant side or staff adds them.
          </p>
        ) : (
          <>
            <p className="text-[var(--color-slate)]">
              {docs.length} document{docs.length > 1 ? "s" : ""} attached.
            </p>
            {Object.keys(docTypeCounts).length > 0 && (
              <p className="text-[11px] text-[var(--color-muted)]">
                By type:{" "}
                {Object.entries(docTypeCounts)
                  .map(([t, n]) => `${t.replace(/_/g, " ")} (${n})`)
                  .join(", ")}
              </p>
            )}
            <ul className="divide-y divide-[var(--color-border-light)] mt-2">
              {docs.map((d) => (
                <li
                  key={d.id}
                  className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-[var(--color-navy)]">
                        {d.type.replace(/_/g, " ")}
                      </p>
                      {d.status === "restricted" && (
                        <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Restricted
                        </span>
                      )}
                      {d.status === "deleted" && (
                        <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] bg-[var(--color-light-sand)] text-[var(--color-muted)]">
                          Deleted
                        </span>
                      )}
                    </div>
                    <p className="text-[var(--color-slate)] truncate">{d.fileName}</p>
                    {d.description && (
                      <p className="text-[11px] text-[var(--color-muted)]">
                        {d.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[11px] text-[var(--color-muted)]">
                      {new Date(d.lastModified).toLocaleDateString("en-US")}
                    </span>
                    {d.status !== "deleted" && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleDocumentAccess(d.id, "view")}
                          disabled={documentActioning === d.id}
                          className="text-[11px] text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                        >
                          {documentActioning === d.id ? "…" : "View"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDocumentAccess(d.id, "download")}
                          disabled={documentActioning === d.id}
                          className="text-[11px] text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                        >
                          Download
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDocumentRestrict(d.id, d.status !== "restricted")}
                          disabled={documentActioning === d.id}
                          className="text-[11px] text-amber-400 hover:text-amber-300 disabled:opacity-50"
                        >
                          {d.status === "restricted" ? "Unrestrict" : "Restrict"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDocumentDelete(d.id)}
                          disabled={documentActioning === d.id}
                          className="text-[11px] text-red-400 hover:text-red-300 disabled:opacity-50"
                        >
                          Delete
                        </button>
                        {canRunOcr && (
                          <button
                            type="button"
                            disabled={ocrLoadingDocId === d.id}
                            onClick={async () => {
                              if (ocrByDocId[d.id]) {
                                setOcrExpandedDocId((prev) => (prev === d.id ? null : d.id));
                                if (ocrExpandedDocId !== d.id) return;
                              }
                              setOcrLoadingDocId(d.id);
                              try {
                                const { data: sessionData } = await supabase.auth.getSession();
                                const token = sessionData.session?.access_token;
                                const res = await fetch(`/api/documents/${d.id}/ocr`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                                  body: JSON.stringify({}),
                                });
                                const json = await res.json();
                                const data = json.data ?? json;
                                if (res.ok && data.run) {
                                  setOcrByDocId((prev) => ({
                                    ...prev,
                                    [d.id]: {
                                      run: data.run,
                                      fields: data.fields ?? [],
                                      inconsistencies: data.inconsistencies ?? [],
                                      warnings: data.warnings ?? [],
                                      type_mismatch: data.type_mismatch,
                                    },
                                  }));
                                  setOcrExpandedDocId(d.id);
                                } else if (res.ok) {
                                  const getRes = await fetch(`/api/documents/${d.id}/ocr`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
                                  const getJson = await getRes.json();
                                  const g = getJson.data ?? getJson;
                                  setOcrByDocId((prev) => ({ ...prev, [d.id]: g.run ? { run: g.run, fields: g.fields ?? [], inconsistencies: g.inconsistencies ?? [], warnings: g.warnings ?? [], type_mismatch: g.type_mismatch } : null }));
                                  setOcrExpandedDocId(d.id);
                                } else {
                                  alert(
                                    data?.error?.message ??
                                      "We couldn't run OCR on that file. Try again — if it keeps failing, the scan may be unreadable.",
                                  );
                                }
                              } catch (e) {
                                alert(
                                  "We couldn't reach the OCR service. Check your connection and try again.",
                                );
                              } finally {
                                setOcrLoadingDocId(null);
                              }
                            }}
                            className="text-[11px] text-sky-400 hover:text-sky-300 disabled:opacity-50"
                          >
                            {ocrLoadingDocId === d.id ? "…" : ocrByDocId[d.id] ? "OCR" : "Run OCR"}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  {canRunOcr && (ocrLoadingDocId === d.id || ocrByDocId[d.id]) && (
                    <div className="sm:col-span-2 mt-2 pt-2 border-t border-[var(--color-border-light)]">
                      {ocrLoadingDocId === d.id ? (
                        <p className="text-[var(--color-muted)] text-[11px]">Running OCR…</p>
                      ) : !ocrByDocId[d.id] ? null : (() => {
                        const ocrData = ocrByDocId[d.id]!;
                        return (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] text-[var(--color-muted)]">
                              OCR: {ocrData.run.status} · {ocrData.fields.length} field(s)
                            </span>
                            <button type="button" onClick={() => setOcrExpandedDocId((prev) => (prev === d.id ? null : d.id))} className="text-[10px] text-[var(--color-muted)] hover:text-[var(--color-slate)]">
                              {ocrExpandedDocId === d.id ? "Collapse" : "Expand"}
                            </button>
                          </div>
                          {ocrExpandedDocId === d.id && (
                            <>
                              {(ocrData.inconsistencies?.length > 0 || ocrData.warnings?.length > 0) && (
                                <div className="mb-2 space-y-1">
                                  {ocrData.inconsistencies?.map((inc, i) => (
                                    <p key={i} className="text-[11px] text-amber-200/90">{inc.message}</p>
                                  ))}
                                  {ocrData.warnings?.map((w, i) => (
                                    <p key={i} className="text-[11px] text-[var(--color-muted)]">{w}</p>
                                  ))}
                                </div>
                              )}
                              <table className="w-full text-[11px] border border-[var(--color-border)] rounded overflow-hidden">
                                <thead>
                                  <tr className="bg-[var(--color-light-sand)]/85 text-left">
                                    <th className="p-1.5 text-[var(--color-muted)]">Field</th>
                                    <th className="p-1.5 text-[var(--color-muted)]">Value</th>
                                    <th className="p-1.5 text-[var(--color-muted)]">Conf.</th>
                                    <th className="p-1.5 text-[var(--color-muted)]">Status</th>
                                    {canRunOcr && <th className="p-1.5 text-[var(--color-muted)]">Actions</th>}
                                  </tr>
                                </thead>
                                <tbody>
                                  {ocrData.fields.map((f) => (
                                    <tr key={f.id} className="border-t border-[var(--color-border)]">
                                      <td className="p-1.5 text-[var(--color-slate)]">{f.field_label ?? f.field_key}</td>
                                      <td className="p-1.5 text-[var(--color-charcoal)]">
                                        {f.value_text ?? (f.value_number != null ? String(f.value_number) : f.value_date ?? "—")}
                                      </td>
                                      <td className="p-1.5 text-[var(--color-muted)]">{f.confidence_score != null ? Math.round(f.confidence_score * 100) + "%" : "—"}</td>
                                      <td className="p-1.5 text-[var(--color-muted)]">{f.status}</td>
                                      {canRunOcr && (
                                        <td className="p-1.5 flex gap-1 flex-wrap">
                                          {f.status === "extracted" && (
                                            <>
                                              <button
                                                type="button"
                                                onClick={async () => {
                                                  const { data: sessionData } = await supabase.auth.getSession();
                                                  const token = sessionData.session?.access_token;
                                                  const res = await fetch(`/api/ocr/fields/${f.id}/confirm`, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: "{}" });
                                                  if (res.ok) {
                                                    const j = await fetch(`/api/documents/${d.id}/ocr`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
                                                    const jd = await j.json();
                                                    const g = jd.data ?? jd;
                                                    setOcrByDocId((prev) => {
                                                      const cur = prev[d.id];
                                                      return cur ? { ...prev, [d.id]: { ...cur, fields: g.fields ?? cur.fields, inconsistencies: g.inconsistencies ?? [], warnings: g.warnings ?? [], type_mismatch: g.type_mismatch } } : prev;
                                                    });
                                                  }
                                                }}
                                                className="text-[10px] text-emerald-400 hover:underline"
                                              >
                                                Confirm
                                              </button>
                                              <button
                                                type="button"
                                                onClick={async () => {
                                                  const val = prompt("Corrected value (or leave blank to keep):", f.value_text ?? String(f.value_number ?? f.value_date ?? ""));
                                                  if (val === null) return;
                                                  const { data: sessionData } = await supabase.auth.getSession();
                                                  const token = sessionData.session?.access_token;
                                                  const res = await fetch(`/api/ocr/fields/${f.id}/correct`, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ corrected_value: val || f.value_text, reason: "User correction" }) });
                                                  if (res.ok) {
                                                    const j = await fetch(`/api/documents/${d.id}/ocr`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
                                                    const jd = await j.json();
                                                    const g = jd.data ?? jd;
                                                    setOcrByDocId((prev) => {
                                                      const cur = prev[d.id];
                                                      return cur ? { ...prev, [d.id]: { ...cur, fields: g.fields ?? cur.fields, inconsistencies: g.inconsistencies ?? [], warnings: g.warnings ?? [], type_mismatch: g.type_mismatch } } : prev;
                                                    });
                                                  }
                                                }}
                                                className="text-[10px] text-amber-400 hover:underline"
                                              >
                                                Correct
                                              </button>
                                              <button
                                                type="button"
                                                onClick={async () => {
                                                  if (!confirm("Reject this extracted value?")) return;
                                                  const { data: sessionData } = await supabase.auth.getSession();
                                                  const token = sessionData.session?.access_token;
                                                  const res = await fetch(`/api/ocr/fields/${f.id}/reject`, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: "{}" });
                                                  if (res.ok) {
                                                    const j = await fetch(`/api/documents/${d.id}/ocr`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
                                                    const jd = await j.json();
                                                    const g = jd.data ?? jd;
                                                    setOcrByDocId((prev) => {
                                                      const cur = prev[d.id];
                                                      return cur ? { ...prev, [d.id]: { ...cur, fields: g.fields ?? cur.fields, inconsistencies: g.inconsistencies ?? [], warnings: g.warnings ?? [], type_mismatch: g.type_mismatch } } : prev;
                                                    });
                                                  }
                                                }}
                                                className="text-[10px] text-red-400 hover:underline"
                                              >
                                                Reject
                                              </button>
                                            </>
                                          )}
                                        </td>
                                      )}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </>
                          )}
                        </>
                        );
                      })()}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* Secure messages */}
      <section
        className={`rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/90 p-5 ${
          activeTab !== "messages" ? "hidden" : ""
        }`}
      >
        <h2 className="text-sm font-semibold text-[var(--color-navy)] mb-2">Secure messages</h2>
        <p className="text-[11px] text-[var(--color-muted)] mb-3">
          When there are no messages yet, victims and advocates can start the thread here.
        </p>
        <CaseMessagesPanel caseId={caseId} />
      </section>

      {/* Timeline */}
      <section
        className={`bg-[var(--color-warm-cream)]/90 border border-[var(--color-border-light)] rounded-2xl p-5 text-xs space-y-2 ${
          activeTab !== "timeline" ? "hidden" : ""
        }`}
      >
        <h2 className="text-sm font-semibold text-[var(--color-navy)]">Case timeline</h2>
        {timelineEvents.length === 0 ? (
          <p className="text-[var(--color-muted)]">No timeline events yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border-light)] space-y-2">
            {timelineEvents.map((e) => (
              <li key={e.id} className="py-2 first:pt-0">
                <p className="text-[11px] text-[var(--color-muted)]">
                  {new Date(e.created_at).toLocaleString()}
                  {e.actor_role ? ` · ${e.actor_role}` : ""}
                </p>
                <p className="font-medium text-[var(--color-charcoal)]">{e.title}</p>
                {e.description && (
                  <p className="text-[var(--color-muted)] mt-0.5">{e.description}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Internal notes (advocates/admins only) */}
      {canViewNotes && (
        <section
          className={`bg-[var(--color-warm-cream)]/90 border border-[var(--color-border-light)] rounded-2xl p-5 text-xs space-y-3 ${
            activeTab !== "notes" ? "hidden" : ""
          }`}
        >
          <h2 className="text-sm font-semibold text-[var(--color-navy)]">Internal notes</h2>
          <div>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Add an internal note…"
              rows={2}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-cream)]/80 px-3 py-2 text-[var(--color-navy)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-teal)]"
            />
            <button
              type="button"
              onClick={handleAddNote}
              disabled={!noteContent.trim() || noteActioning === "add"}
              className="mt-2 rounded-lg bg-[var(--color-teal-deep)] px-3 py-1.5 text-[11px] font-medium text-white hover:bg-[var(--color-teal)] disabled:opacity-50"
            >
              {noteActioning === "add" ? "Adding…" : "Add note"}
            </button>
          </div>
          {notes.length === 0 ? (
            <p className="text-[var(--color-muted)]">
              No internal notes yet. Add a note above for handoffs and follow-ups your team should
              see.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border-light)] space-y-3">
              {notes.map((n) => (
                <li key={n.id} className="py-2">
                  {editingNoteId === n.id ? (
                    <div>
                      <textarea
                        value={editingNoteContent}
                        onChange={(e) => setEditingNoteContent(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-cream)]/80 px-3 py-2 text-[var(--color-navy)]"
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditNote(n.id)}
                          disabled={noteActioning === n.id}
                          className="text-[11px] text-emerald-400 hover:text-emerald-300"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNoteId(null);
                            setEditingNoteContent("");
                          }}
                          className="text-[11px] text-[var(--color-muted)] hover:text-[var(--color-slate)]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-[11px] text-[var(--color-muted)]">
                        {new Date(n.created_at).toLocaleString()}
                        {n.author_role ? ` · ${n.author_role}` : ""}
                        {n.status === "edited" && n.edited_at
                          ? ` · edited ${new Date(n.edited_at).toLocaleString()}`
                          : ""}
                      </p>
                      <p className="text-[var(--color-charcoal)] whitespace-pre-wrap">{n.content}</p>
                      <div className="mt-1 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNoteId(n.id);
                            setEditingNoteContent(n.content);
                          }}
                          disabled={noteActioning === n.id}
                          className="text-[11px] text-amber-400 hover:text-amber-300"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(n.id)}
                          disabled={noteActioning === n.id}
                          className="text-[11px] text-red-400 hover:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Certification */}
      <section
        className={`bg-[var(--color-warm-cream)]/90 border border-[var(--color-border-light)] rounded-2xl p-5 text-xs space-y-1.5 ${
          activeTab !== "intake" ? "hidden" : ""
        }`}
      >
        <h2 className="text-sm font-semibold text-[var(--color-navy)]">
          Certification snapshot
        </h2>
        <p className="text-[var(--color-slate)]">
          Signature: {certification.applicantSignatureName || "—"} · Date:{" "}
          {certification.applicantSignatureDate || "—"}
        </p>
        <p className="text-[11px] text-[var(--color-muted)]">
          Subrogation acknowledged:{" "}
          {certification.acknowledgesSubrogation ? "Yes" : "No / not marked"};
          {" · "}
          Release acknowledged:{" "}
          {certification.acknowledgesRelease ? "Yes" : "No / not marked"};
          {" · "}
          Perjury warning acknowledged:{" "}
          {certification.acknowledgesPerjury ? "Yes" : "No / not marked"}
        </p>
      </section>

      {/* Case access */}
      <section
        className={`rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/90 p-5 text-xs space-y-2 ${
          activeTab !== "access" ? "hidden" : ""
        }`}
      >
        <h2 className="text-sm font-semibold text-[var(--color-navy)]">Access</h2>
        <p className="text-[var(--color-muted)]">
          Who can see and edit this case in the platform. Advocate connections and sharing are
          managed from case access rules in your workflow.
        </p>
        {caseAccess ? (
          <ul className="text-[var(--color-slate)] space-y-1 list-disc list-inside">
            <li>Role: {caseAccess.role}</li>
            <li>Can view: {caseAccess.can_view ? "Yes" : "No"}</li>
            <li>Can edit: {caseAccess.can_edit ? "Yes" : "No"}</li>
          </ul>
        ) : (
          <p className="text-[var(--color-muted)]">No access details loaded.</p>
        )}
        <p className="text-[11px] text-[var(--color-muted)] pt-2">
          Open the guided intake with this case:{" "}
          <a
            href={`/compensation/intake?case=${caseId}`}
            className="text-emerald-400 hover:underline"
          >
            /compensation/intake?case={caseId.slice(0, 8)}…
          </a>
        </p>
      </section>

      {/* Appointments — UI not wired on this page; placeholder keeps tab usable */}
      <section
        className={`rounded-2xl border border-[var(--color-border-light)] bg-[var(--color-warm-cream)]/90 p-5 text-xs space-y-2 ${
          activeTab !== "appointments" ? "hidden" : ""
        }`}
      >
        <h2 className="text-sm font-semibold text-[var(--color-navy)]">Appointments</h2>
        <p className="text-[var(--color-muted)]">
          No appointments listed in this view yet. Appointment scheduling may appear in other tools
          or future releases.
        </p>
      </section>
    </div>
  </main>
);
}