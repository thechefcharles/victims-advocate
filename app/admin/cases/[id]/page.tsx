"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { designationTierTrustLabel } from "@/lib/matchingTrustLabels";

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
  const [loading, setLoading] = useState(true);

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
    capacity_signal: string | null;
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
          setLoadedCase((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
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
        alert(err?.error?.message ?? "Failed to add note.");
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
        alert(err?.error?.message ?? "Failed to update note.");
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
        alert(err?.error?.message ?? "Failed to delete note.");
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
        alert("Please log in again.");
        return;
      }
      const res = await fetch("/api/documents/access-url", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ document_id: docId, access_type: accessType }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json?.error?.message ?? "Could not open document.");
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
      alert("Something went wrong opening the document.");
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
      else alert((await res.json())?.error?.message ?? "Failed to delete.");
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
      else alert((await res.json())?.error?.message ?? "Failed to update.");
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
        alert("There was an issue generating the PDF. Please try again.");
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
      alert("Something went wrong generating the PDF.");
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

  if (loading) {
    return (
      <main className=" min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-8 py-8">
        <div className="max-w-3xl mx-auto">Loading case…</div>
      </main>
    );
  }

  if (!loadedCase) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-8 py-8">
        <div className="max-w-3xl mx-auto space-y-4">
          <header className="space-y-2">
            <p className="text-xs tracking-[0.25em] uppercase text-slate-400">
              Admin · Case Not Found
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold">
              Case could not be found
            </h1>
          </header>
          <p className="text-sm text-slate-300">
            This case ID could not be loaded from the server. It may have been
            removed or you may be using a different environment.
          </p>
          <a
            href="/admin/cases"
            className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 transition"
          >
            ← Back to all cases
          </a>
        </div>
              {/* Advocate NxtGuide chat widget */}
      <div className="fixed bottom-4 right-4 z-40">
        {chatOpen ? (
          <div className="w-72 sm:w-80 rounded-2xl border border-slate-700 bg-[#020b16] shadow-lg shadow-black/40 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-[#0A2239]">
              <div className="text-[11px]">
                <div className="font-semibold text-slate-50">NxtGuide</div>
                <div className="text-slate-300">
                  Advocate view – case support
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 text-[11px]">
              {chatMessages.length === 0 && (
                <p className="text-slate-400">
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
                        ? "bg-[#1C8C8C] text-slate-950"
                        : "bg-slate-900 text-slate-100 border border-slate-700"
                    } text-[11px] whitespace-pre-wrap`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <p className="text-[11px] text-slate-400">
                  NxtGuide is typing…
                </p>
              )}
            </div>

            <form onSubmit={handleChatSubmit} className="border-t border-slate-800 p-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask NxtGuide about this case..."
                className="w-full rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-[11px] text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#1C8C8C] focus:border-[#1C8C8C]"
              />
            </form>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="inline-flex items-center rounded-full bg-[#1C8C8C] px-3 py-2 text-[11px] font-semibold text-slate-950 shadow-md shadow-black/40 hover:bg-[#21a3a3] transition"
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
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-8 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-2">
          <p className="text-xs tracking-[0.25em] uppercase text-slate-400">
            Admin · Case Detail
          </p>
          <h1 className="text-2xl sm:px-auto text-slate-200">
            {victim.firstName || victim.lastName
              ? `${victim.firstName || ""} ${victim.lastName || ""}`.trim()
              : "Unknown victim"}
          </h1>
          <p className="text-sm text-slate-300">
            Case ID:{" "}
            <span className="font-mono text-[11px] text-slate-400">
              {loadedCase.id}
            </span>
          </p>
          <p className="text-[11px] text-slate-500">
            Created: {formatDate(loadedCase.createdAt)} · Status:{" "}
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 ${
                loadedCase.status === "ready_for_review"
                  ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
                  : "bg-slate-800 text-slate-300 border border-slate-600"
              }`}
            >
              {loadedCase.status === "ready_for_review"
                ? "Ready for review"
                : loadedCase.status}
            </span>
          </p>

          <div className="flex flex-wrap gap-2 mt-2">
            <a
              href="/admin/cases"
              className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] text-slate-200 hover:bg-slate-800 transition"
            >
              ← Back to all cases
            </a>
            <button
              type="button"
              onClick={handleDownloadSummaryPdf}
              className="inline-flex items-center rounded-lg border border-emerald-500 bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 transition"
            >
              Download summary PDF
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
                      alert(err?.error?.message ?? "Routing failed");
                    }
                  } finally {
                    setRoutingLoading(false);
                  }
                }}
                className="inline-flex items-center rounded-lg border border-[#1C8C8C] bg-[#1C8C8C] px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-[#21a3a3] disabled:opacity-50 transition"
              >
                {routingLoading ? "Evaluating…" : "Evaluate programs"}
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
                      alert(err?.error?.message ?? "Completeness evaluation failed");
                    }
                  } finally {
                    setCompletenessLoading(false);
                  }
                }}
                className="inline-flex items-center rounded-lg border border-amber-500/60 bg-amber-500/20 px-3 py-1.5 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/30 disabled:opacity-50 transition"
              >
                {completenessLoading ? "Evaluating…" : "Evaluate completeness"}
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
                      alert(err?.error?.message ?? "Organization matching failed");
                    }
                  } finally {
                    setOrgMatchingRunLoading(false);
                  }
                }}
                className="inline-flex items-center rounded-lg border border-violet-500/60 bg-violet-500/20 px-3 py-1.5 text-[11px] font-semibold text-violet-200 hover:bg-violet-500/30 disabled:opacity-50 transition"
              >
                {orgMatchingRunLoading ? "Matching…" : "Find matching organizations"}
              </button>
            )}
          </div>
        </header>

        {/* Victim & applicant */}
        <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 text-xs space-y-2">
          <h2 className="text-sm font-semibold text-slate-50">
            Victim & applicant
          </h2>
          <p className="text-slate-200">
            Victim: {victim.firstName || "—"} {victim.lastName || ""}
          </p>
          <p className="text-slate-300">
            DOB: {victim.dateOfBirth || "—"} · City: {victim.city || "—"},{" "}
            {victim.state || "—"}
          </p>
          {applicant.isSameAsVictim ? (
            <p className="text-slate-300">
              Applicant is the same as the victim.
            </p>
          ) : (
            <>
              <p className="text-slate-200">
                Applicant: {applicant.firstName || "—"}{" "}
                {applicant.lastName || ""}
              </p>
              <p className="text-slate-300">
                Relationship: {applicant.relationshipToVictim || "Not provided"}
                · Phone: {applicant.cellPhone || "—"}
              </p>
            </>
          )}
        </section>

        {/* Crime */}
        <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 text-xs space-y-2">
          <h2 className="text-sm font-semibold text-slate-50">Crime</h2>
          <p className="text-slate-300">
            Date of crime: {crime.dateOfCrime || "—"}
          </p>
          <p className="text-slate-300">
            Location: {crime.crimeAddress || "—"}, {crime.crimeCity || "—"}
            {crime.crimeCounty ? ` (${crime.crimeCounty})` : ""}
          </p>
          <p className="text-slate-300">
            Reported to: {crime.reportingAgency || "—"} · Police report #:{" "}
            {crime.policeReportNumber || "—"}
          </p>
          {crime.crimeDescription && (
            <p className="text-slate-300">
              Description: {crime.crimeDescription}
              {fieldState["crime.crimeDescription"]?.status === "amended" && (
                <span className="ml-2 text-amber-300 text-[10px]">(Amended)</span>
              )}
            </p>
          )}
          {crime.injuryDescription && (
            <p className="text-slate-300">
              Injuries: {crime.injuryDescription}
              {fieldState["crime.injuryDescription"]?.status === "amended" && (
                <span className="ml-2 text-amber-300 text-[10px]">(Amended)</span>
              )}
            </p>
          )}
        </section>

        {/* Phase 8: Advocate amend intake */}
        {canAmendIntake && (
          <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 text-xs space-y-3">
            <h2 className="text-sm font-semibold text-slate-50">Amend intake field</h2>
            <p className="text-slate-400">
              Change a value with a required reason. Original value is preserved in the audit trail.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="block text-slate-400 mb-1">Field</label>
                <select
                  value={amendFieldKey}
                  onChange={(e) => {
                    setAmendFieldKey(e.target.value);
                    const val = e.target.value ? getNested(app, e.target.value) : "";
                    setAmendNewValue(typeof val === "string" ? val : val != null ? String(val) : "");
                  }}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200"
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
                    <label className="block text-slate-400 mb-1">Current value</label>
                    <p className="text-slate-200 break-words">
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
                    <label className="block text-slate-400 mb-1">New value</label>
                    <input
                      type="text"
                      value={amendNewValue}
                      onChange={(e) => setAmendNewValue(e.target.value)}
                      className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200"
                      placeholder="Enter new value"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-400 mb-1">Reason (required)</label>
                    <textarea
                      value={amendReason}
                      onChange={(e) => setAmendReason(e.target.value)}
                      rows={2}
                      className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200"
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
                      className="rounded border border-emerald-500 bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
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
        {(routingResult || canRunRouting) && (
          <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 text-xs space-y-3">
            <h2 className="text-sm font-semibold text-slate-50">Program routing</h2>
            {routingRunAt && (
              <p className="text-[11px] text-slate-500">
                Last evaluated: {formatDate(routingRunAt)}
              </p>
            )}
            {!routingResult ? (
              <p className="text-slate-400">
                Run &quot;Evaluate programs&quot; to see which programs may apply based on this intake.
              </p>
            ) : (
              <ul className="divide-y divide-slate-800 space-y-4">
                {routingResult.programs.map((prog) => (
                  <li key={prog.program_key} className="py-3 first:pt-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-100">{prog.program_name}</span>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] ${
                          prog.eligibility_status === "likely_eligible"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : prog.eligibility_status === "possibly_eligible"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : prog.eligibility_status === "insufficient_information"
                                ? "bg-slate-500/20 text-slate-300 border border-slate-500/40"
                                : "bg-red-500/20 text-red-300 border border-red-500/40"
                        }`}
                      >
                        {prog.eligibility_status.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-slate-500">confidence: {prog.confidence}</span>
                    </div>
                    {prog.explanation && (
                      <p className="text-slate-400 mt-1">{prog.explanation}</p>
                    )}
                    {prog.missing_requirements.length > 0 && (
                      <div className="mt-2">
                        <p className="text-slate-500 text-[10px] uppercase tracking-wide">Missing / unknown</p>
                        <ul className="list-disc list-inside text-slate-400 mt-0.5">
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
                      <p className="mt-1.5 text-slate-400">
                        <span className="text-slate-500">Required documents:</span>{" "}
                        {prog.required_documents.join(", ")}
                      </p>
                    )}
                    {prog.deadline_summary && (
                      <p className="mt-1 text-slate-400">
                        <span className="text-slate-500">Deadline:</span> {prog.deadline_summary}
                      </p>
                    )}
                    {prog.next_steps.length > 0 && (
                      <div className="mt-1.5">
                        <p className="text-slate-500 text-[10px] uppercase tracking-wide">Next steps</p>
                        <ul className="list-disc list-inside text-slate-400 mt-0.5">
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
        {(orgMatches.length > 0 || orgMatchGlobalFlags.length > 0 || canRunOrgMatching) && (
          <section className="bg-slate-900/70 border border-violet-900/40 rounded-2xl p-5 text-xs space-y-3">
            <h2 className="text-sm font-semibold text-slate-50">Recommended organizations</h2>
            <p className="text-slate-400 text-[11px]">
              Based on this application&apos;s needs — not rankings or public ratings. Confirm fit directly
              with each organization.{" "}
              <a
                href="/help/how-matching-works"
                className="text-violet-300 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                How recommendations work
              </a>
            </p>
            {orgMatchRunAt && (
              <p className="text-[11px] text-slate-500">Last run: {formatDate(orgMatchRunAt)}</p>
            )}
            {orgMatchGlobalFlags.map((f, i) => (
              <p key={i} className="text-amber-200/90 text-[11px]">
                {f}
              </p>
            ))}
            {orgMatches.length === 0 && !orgMatchGlobalFlags.length && canRunOrgMatching && (
              <p className="text-slate-400">
                Use &quot;Find matching organizations&quot; above to suggest organizations that may help with
                this case.
              </p>
            )}
            {orgMatches.length > 0 && (
              <ul className="divide-y divide-slate-800 space-y-3">
                {orgMatches.map((m) => (
                  <li key={m.organization_id} className="pt-3 first:pt-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-100">{m.organization_name}</span>
                      {m.strong_match && (
                        <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 text-[10px]">
                          Good fit
                        </span>
                      )}
                      {m.possible_match && !m.strong_match && (
                        <span className="rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 px-2 py-0.5 text-[10px]">
                          Possible fit
                        </span>
                      )}
                      {m.limited_match && (
                        <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 text-[10px]">
                          Tentative
                        </span>
                      )}
                      {m.language_match && (
                        <span className="text-[10px] text-slate-400 border border-slate-600 rounded px-1.5 py-0.5">
                          Language
                        </span>
                      )}
                      {m.capacity_signal && (
                        <span className="text-[10px] text-slate-400 border border-slate-600 rounded px-1.5 py-0.5">
                          {m.capacity_signal === "accepting"
                            ? "Accepting clients"
                            : m.capacity_signal}
                        </span>
                      )}
                      {designationTierTrustLabel(m.designation_tier) && (
                        <span
                          className="text-[10px] text-slate-500 border border-slate-600/80 rounded px-1.5 py-0.5"
                          title="Platform readiness context — not a ranking"
                        >
                          {designationTierTrustLabel(m.designation_tier)}
                        </span>
                      )}
                    </div>
                    {m.designation_summary && (
                      <p className="text-slate-500 text-[10px] mt-1 line-clamp-2 max-w-xl">
                        {m.designation_summary}
                      </p>
                    )}
                    {m.designation_reason && (
                      <p className="text-slate-400 text-[11px] mt-1 max-w-xl">{m.designation_reason}</p>
                    )}
                    {(m.designation_influenced_match ||
                      designationTierTrustLabel(m.designation_tier)) && (
                      <p className="text-[10px] mt-0.5">
                        <a
                          href="/help/how-designations-work"
                          className="text-violet-400/90 hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          How designation is used
                        </a>
                      </p>
                    )}
                    {m.service_overlap.length > 0 && (
                      <p className="text-slate-400 mt-1">
                        <span className="text-slate-500">Services aligned:</span>{" "}
                        {m.service_overlap.map((s) => s.replace(/_/g, " ")).join(", ")}
                      </p>
                    )}
                    {m.reasons.length > 0 && (
                      <ul className="list-disc list-inside text-slate-300 mt-1.5 space-y-0.5">
                        {m.reasons.slice(0, 6).map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    )}
                    {m.flags.length > 0 && (
                      <ul className="mt-1.5 text-amber-200/80 text-[11px] list-disc list-inside">
                        {m.flags.slice(0, 4).map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Phase 12: Documentation completeness */}
        {(completenessResult || canRunCompleteness) && (
          <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 text-xs space-y-3">
            <h2 className="text-sm font-semibold text-slate-50">Documentation completeness</h2>
            {completenessRunAt && (
              <p className="text-[11px] text-slate-500">
                Last evaluated: {formatDate(completenessRunAt)}
              </p>
            )}
            {!completenessResult ? (
              <p className="text-slate-400">
                Run &quot;Evaluate completeness&quot; to see what documents and information are missing. Run &quot;Evaluate programs&quot; first.
              </p>
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
                            : "bg-slate-500/20 text-slate-300 border border-slate-500/40"
                    }`}
                  >
                    {completenessResult.overall_status.replace(/_/g, " ")}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Blocking: {completenessResult.summary_counts.blocking_count} · Warnings: {completenessResult.summary_counts.warning_count} · Info: {completenessResult.summary_counts.informational_count}
                  </span>
                </div>
                {completenessResult.recommended_next_actions.length > 0 && (
                  <div>
                    <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">Recommended next actions</p>
                    <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                      {completenessResult.recommended_next_actions.slice(0, 5).map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-3">
                  {completenessResult.missing_items.filter((m) => m.type === "missing_document").length > 0 && (
                    <div>
                      <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">Missing documents</p>
                      <ul className="text-slate-400 space-y-0.5">
                        {completenessResult.missing_items
                          .filter((m) => m.type === "missing_document")
                          .slice(0, 6)
                          .map((m, i) => (
                            <li key={i}>{m.message}</li>
                          ))}
                      </ul>
                      <p className="text-[10px] text-slate-500 mt-1">
                        <a href="/compensation/documents" className="text-amber-400 hover:underline">Upload document</a>
                      </p>
                    </div>
                  )}
                  {completenessResult.missing_items.filter((m) => m.type === "missing_field").length > 0 && (
                    <div>
                      <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">Missing information</p>
                      <ul className="text-slate-400 space-y-0.5">
                        {completenessResult.missing_items
                          .filter((m) => m.type === "missing_field")
                          .slice(0, 6)
                          .map((m, i) => (
                            <li key={i}>{m.message}</li>
                          ))}
                      </ul>
                      <p className="text-[10px] text-slate-500 mt-1">
                        <a href={`/compensation/intake?case=${caseId}`} className="text-amber-400 hover:underline">Go to intake</a>
                      </p>
                    </div>
                  )}
                  {completenessResult.inconsistencies.length > 0 && (
                    <div>
                      <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">Warnings / inconsistencies</p>
                      <ul className="text-slate-400 space-y-0.5">
                        {completenessResult.inconsistencies.slice(0, 4).map((m, i) => (
                          <li key={i}>{m.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {completenessResult.program_results.length > 0 && (
                  <div className="border-t border-slate-800 pt-3 mt-3">
                    <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-2">By program</p>
                    <ul className="space-y-3">
                      {completenessResult.program_results.map((prog) => (
                        <li key={prog.program_key} className="border border-slate-700 rounded-lg p-3">
                          <p className="font-medium text-slate-200">{prog.program_name}</p>
                          {prog.missing_documents.length > 0 && (
                            <p className="text-[11px] text-slate-400 mt-1">
                              Missing docs: {prog.missing_documents.join(", ")}
                            </p>
                          )}
                          {prog.missing_fields.length > 0 && (
                            <p className="text-[11px] text-slate-400">
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
        <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 text-xs space-y-2">
          <h2 className="text-sm font-semibold text-slate-50">
            Losses claimed
          </h2>
          {selectedLossTypes.length === 0 ? (
            <p className="text-slate-300">No losses selected.</p>
          ) : (
            <p className="text-slate-300">{selectedLossTypes.join(", ")}</p>
          )}
        </section>

        {/* Medical / Employment / Funeral */}
        <section className="grid gap-4 md:grid-cols-3 text-xs">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-1.5">
            <h2 className="text-sm font-semibold text-slate-50">
              Medical / counseling
            </h2>
            {primaryProvider && primaryProvider.providerName ? (
              <>
                <p className="text-slate-300">
                  Provider: {primaryProvider.providerName}
                </p>
                <p className="text-slate-300">
                  City: {primaryProvider.city || "—"} · Phone:{" "}
                  {primaryProvider.phone || "—"}
                </p>
                <p className="text-slate-300">
                  Dates: {primaryProvider.serviceDates || "—"}
                </p>
                <p className="text-slate-300">
                  Bill:{" "}
                  {primaryProvider.amountOfBill != null
                    ? `$${primaryProvider.amountOfBill}`
                    : "—"}
                </p>
              </>
            ) : (
              <p className="text-slate-300">No provider entered.</p>
            )}
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-1.5">
            <h2 className="text-sm font-semibold text-slate-50">
              Work & income
            </h2>
            {primaryJob && primaryJob.employerName ? (
              <>
                <p className="text-slate-300">
                  Employer: {primaryJob.employerName}
                </p>
                <p className="text-slate-300">
                  Phone: {primaryJob.employerPhone || "—"}
                </p>
                <p className="text-slate-300">
                  Net monthly wages:{" "}
                  {primaryJob.netMonthlyWages != null
                    ? `$${primaryJob.netMonthlyWages}`
                    : "—"}
                </p>
              </>
            ) : (
              <p className="text-slate-300">No employment info entered.</p>
            )}
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-1.5">
            <h2 className="text-sm font-semibold text-slate-50">
              Funeral / burial
            </h2>
            {funeral.funeralHomeName || funeral.funeralBillTotal ? (
              <>
                <p className="text-slate-300">
                  Funeral home: {funeral.funeralHomeName || "—"}
                </p>
                <p className="text-slate-300">
                  Phone: {funeral.funeralHomePhone || "—"}
                </p>
                <p className="text-slate-300">
                  Total funeral bill:{" "}
                  {funeral.funeralBillTotal != null
                    ? `$${funeral.funeralBillTotal}`
                    : "—"}
              </p>
              {primaryFuneralPayer && primaryFuneralPayer.payerName ? (
                <p className="text-slate-300">
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
            <p className="text-slate-300">No funeral information entered.</p>
          )}
        </div>
      </section>

      {/* Documents */}
      <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 text-xs space-y-2">
        <h2 className="text-sm font-semibold text-slate-50">
          Documents attached
        </h2>
        {docs.length === 0 ? (
          <p className="text-slate-300">No documents attached.</p>
        ) : (
          <>
            <p className="text-slate-300">
              {docs.length} document{docs.length > 1 ? "s" : ""} attached.
            </p>
            {Object.keys(docTypeCounts).length > 0 && (
              <p className="text-[11px] text-slate-400">
                By type:{" "}
                {Object.entries(docTypeCounts)
                  .map(([t, n]) => `${t.replace(/_/g, " ")} (${n})`)
                  .join(", ")}
              </p>
            )}
            <ul className="divide-y divide-slate-800 mt-2">
              {docs.map((d) => (
                <li
                  key={d.id}
                  className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-100">
                        {d.type.replace(/_/g, " ")}
                      </p>
                      {d.status === "restricted" && (
                        <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Restricted
                        </span>
                      )}
                      {d.status === "deleted" && (
                        <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] bg-slate-600 text-slate-400">
                          Deleted
                        </span>
                      )}
                    </div>
                    <p className="text-slate-300 truncate">{d.fileName}</p>
                    {d.description && (
                      <p className="text-[11px] text-slate-400">
                        {d.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[11px] text-slate-500">
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
                                  alert(data?.error?.message ?? "OCR failed");
                                }
                              } catch (e) {
                                alert("OCR request failed");
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
                    <div className="sm:col-span-2 mt-2 pt-2 border-t border-slate-800">
                      {ocrLoadingDocId === d.id ? (
                        <p className="text-slate-500 text-[11px]">Running OCR…</p>
                      ) : !ocrByDocId[d.id] ? null : (() => {
                        const ocrData = ocrByDocId[d.id]!;
                        return (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] text-slate-500">
                              OCR: {ocrData.run.status} · {ocrData.fields.length} field(s)
                            </span>
                            <button type="button" onClick={() => setOcrExpandedDocId((prev) => (prev === d.id ? null : d.id))} className="text-[10px] text-slate-400 hover:text-slate-300">
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
                                    <p key={i} className="text-[11px] text-slate-400">{w}</p>
                                  ))}
                                </div>
                              )}
                              <table className="w-full text-[11px] border border-slate-700 rounded overflow-hidden">
                                <thead>
                                  <tr className="bg-slate-800/80 text-left">
                                    <th className="p-1.5 text-slate-400">Field</th>
                                    <th className="p-1.5 text-slate-400">Value</th>
                                    <th className="p-1.5 text-slate-400">Conf.</th>
                                    <th className="p-1.5 text-slate-400">Status</th>
                                    {canRunOcr && <th className="p-1.5 text-slate-400">Actions</th>}
                                  </tr>
                                </thead>
                                <tbody>
                                  {ocrData.fields.map((f) => (
                                    <tr key={f.id} className="border-t border-slate-700">
                                      <td className="p-1.5 text-slate-300">{f.field_label ?? f.field_key}</td>
                                      <td className="p-1.5 text-slate-200">
                                        {f.value_text ?? (f.value_number != null ? String(f.value_number) : f.value_date ?? "—")}
                                      </td>
                                      <td className="p-1.5 text-slate-400">{f.confidence_score != null ? Math.round(f.confidence_score * 100) + "%" : "—"}</td>
                                      <td className="p-1.5 text-slate-400">{f.status}</td>
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

      {/* Timeline */}
      <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 text-xs space-y-2">
        <h2 className="text-sm font-semibold text-slate-50">Case timeline</h2>
        {timelineEvents.length === 0 ? (
          <p className="text-slate-400">No timeline events yet.</p>
        ) : (
          <ul className="divide-y divide-slate-800 space-y-2">
            {timelineEvents.map((e) => (
              <li key={e.id} className="py-2 first:pt-0">
                <p className="text-[11px] text-slate-500">
                  {new Date(e.created_at).toLocaleString()}
                  {e.actor_role ? ` · ${e.actor_role}` : ""}
                </p>
                <p className="font-medium text-slate-200">{e.title}</p>
                {e.description && (
                  <p className="text-slate-400 mt-0.5">{e.description}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Internal notes (advocates/admins only) */}
      {canViewNotes && (
        <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 text-xs space-y-3">
          <h2 className="text-sm font-semibold text-slate-50">Internal notes</h2>
          <div>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Add an internal note…"
              rows={2}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
            <button
              type="button"
              onClick={handleAddNote}
              disabled={!noteContent.trim() || noteActioning === "add"}
              className="mt-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {noteActioning === "add" ? "Adding…" : "Add note"}
            </button>
          </div>
          {notes.length === 0 ? (
            <p className="text-slate-400">No internal notes.</p>
          ) : (
            <ul className="divide-y divide-slate-800 space-y-3">
              {notes.map((n) => (
                <li key={n.id} className="py-2">
                  {editingNoteId === n.id ? (
                    <div>
                      <textarea
                        value={editingNoteContent}
                        onChange={(e) => setEditingNoteContent(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-slate-100"
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
                          className="text-[11px] text-slate-400 hover:text-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-[11px] text-slate-500">
                        {new Date(n.created_at).toLocaleString()}
                        {n.author_role ? ` · ${n.author_role}` : ""}
                        {n.status === "edited" && n.edited_at
                          ? ` · edited ${new Date(n.edited_at).toLocaleString()}`
                          : ""}
                      </p>
                      <p className="text-slate-200 whitespace-pre-wrap">{n.content}</p>
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
      <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 text-xs space-y-1.5">
        <h2 className="text-sm font-semibold text-slate-50">
          Certification snapshot
        </h2>
        <p className="text-slate-300">
          Signature: {certification.applicantSignatureName || "—"} · Date:{" "}
          {certification.applicantSignatureDate || "—"}
        </p>
        <p className="text-[11px] text-slate-400">
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

      <p className="text-[11px] text-slate-500">
        This view reads from your Supabase backend. In a production version,
        cases, documents, and notes would be available to authorized advocates
        across your organization with full audit logging and permissions.
      </p>
    </div>
  </main>
);
}