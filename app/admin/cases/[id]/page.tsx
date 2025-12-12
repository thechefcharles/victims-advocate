"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type CaseStatus = "draft" | "ready_for_review" | "submitted" | "closed";

interface UploadedDoc {
  id: string;
  type: string;
  description: string;
  fileName: string;
  fileSize: number;
  lastModified: number;
}

interface SavedCase {
  id: string;
  createdAt: string;
  status: CaseStatus;
  application: any; // matches CompensationApplication shape
  documents?: UploadedDoc[];
}

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>();
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

  // Load case + docs from API instead of localStorage
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/compensation/cases/${caseId}`);
        if (!res.ok) {
          console.error("Failed to fetch case", await res.text());
          setLoadedCase(null);
          return;
        }

        const json = await res.json();
        const caseRow = json.case;
        const docs = (json.documents ?? []) as any[];

        if (!caseRow) {
          setLoadedCase(null);
          return;
        }

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
            fileSize: d.file_size,
            lastModified:
              typeof d.lastModified === "number"
                ? d.lastModified
                : Date.parse(d.created_at || new Date().toISOString()),
          })),
        };

        setLoadedCase(mappedCase);
      } catch (err) {
        console.error("Failed to load case from API", err);
        setLoadedCase(null);
      } finally {
        setLoading(false);
      }
    };

    if (caseId) {
      load();
    }
  }, [caseId]);

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
      const res = await fetch("/api/nxtguide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          currentRoute: "/admin/cases", // we don't need the full path; just signal it's advocate-side
          currentStep: null,
          caseId, // 👈 let NxtGuide load and analyze this case
        }),
      });

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
  const victim = app.victim || {};
  const applicant = app.applicant || {};
  const crime = app.crime || {};
  const losses = app.losse || app.losses || {};
  const medical = app.medical || {};
  const employment = app.employment || {};
  const funeral = app.funeral || {};
  const certification = app.certification || {};
  const docs: UploadedDoc[] = loadedCase.documents || [];

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
            </p>
          )}
          {crime.injuryDescription && (
            <p className="text-slate-300">
              Injuries: {crime.injuryDescription}
            </p>
          )}
        </section>

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
                  className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-100">
                      {d.type.replace(/_/g, " ")}
                    </p>
                    <p className="text-slate-300">{d.fileName}</p>
                    {d.description && (
                      <p className="text-[11px] text-slate-400">
                        {d.description}
                      </p>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Added:{" "}
                    {new Date(d.lastModified).toLocaleDateString("en-US")}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

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