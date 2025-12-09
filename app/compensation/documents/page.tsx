"use client";

import { useState } from "react";

type DocumentType =
  | "police_report"
  | "medical_bill"
  | "funeral_bill"
  | "death_certificate"
  | "id"
  | "wage_proof"
  | "other";

interface UploadedDoc {
  id: string;
  type: DocumentType;
  description: string;
  fileName: string;
  fileSize: number;
  lastModified: number;
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [selectedType, setSelectedType] = useState<DocumentType>("police_report");
  const [description, setDescription] = useState("");

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    const newDocs: UploadedDoc[] = [];
    Array.from(files).forEach((file) => {
      newDocs.push({
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        type: selectedType,
        description: description.trim(),
        fileName: file.name,
        fileSize: file.size,
        lastModified: file.lastModified,
      });
    });

    setDocs((prev) => [...prev, ...newDocs]);
    setDescription("");
  };

  const humanTypeLabel = (type: DocumentType) => {
    switch (type) {
      case "police_report":
        return "Police report";
      case "medical_bill":
        return "Medical bill";
      case "funeral_bill":
        return "Funeral / cemetery bill";
      case "death_certificate":
        return "Death certificate";
      case "id":
        return "ID / identification";
      case "wage_proof":
        return "Wage / employment proof";
      default:
        return "Other";
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 sm:px-8 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <p className="text-xs tracking-[0.25em] uppercase text-slate-400">
            Documents · Optional but Recommended
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Upload supporting documents for your claim
          </h1>
          <p className="text-sm text-slate-300">
            You can upload copies of police reports, medical bills, funeral
            bills, wage proof, or other documents that support your Crime
            Victims Compensation application. You do not need everything to move
            forward, but the Attorney General&apos;s office will eventually need
            these to review your claim.
          </p>
        </header>

        <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-lg font-semibold text-slate-50">
            Add documents
          </h2>

          <div className="grid gap-3 sm:grid-cols-2 text-xs">
            <label className="block space-y-1 text-slate-200">
              <span>Document type</span>
              <select
                value={selectedType}
                onChange={(e) =>
                  setSelectedType(e.target.value as DocumentType)
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400"
              >
                <option value="police_report">Police report</option>
                <option value="medical_bill">Medical bill</option>
                <option value="funeral_bill">Funeral / cemetery bill</option>
                <option value="death_certificate">Death certificate</option>
                <option value="id">ID / identification</option>
                <option value="wage_proof">Wage / employment proof</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="block space-y-1 text-slate-200">
              <span>Short description (optional)</span>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. ER bill from 1/12/2025"
                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400"
              />
            </label>
          </div>

          <div className="space-y-2 text-xs">
            <label className="block space-y-1 text-slate-200">
              <span>Select file(s)</span>
              <input
                type="file"
                multiple
                onChange={(e) => handleFiles(e.target.files)}
                className="block w-full text-[11px] text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-500 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-950 hover:file:bg-emerald-400"
              />
            </label>
            <p className="text-[11px] text-slate-500">
              Files are not being uploaded to a server yet in this early version
              – they are only listed here in your browser session. In a future
              release, they will be securely stored and shared with advocates.
            </p>
          </div>
        </section>

        <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-50">
            Documents added in this session
          </h2>
          {docs.length === 0 ? (
            <p className="text-xs text-slate-400">
              No documents added yet. When you select files above, they will be
              listed here with their type and description.
            </p>
          ) : (
            <ul className="divide-y divide-slate-800 text-xs">
              {docs.map((doc) => (
                <li
                  key={doc.id}
                  className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-100">
                      {humanTypeLabel(doc.type)}
                    </p>
                    <p className="text-slate-300">
                      {doc.fileName} · {formatSize(doc.fileSize)}
                    </p>
                    {doc.description && (
                      <p className="text-[11px] text-slate-400">
                        {doc.description}
                      </p>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Added:{" "}
                    {new Date(doc.lastModified).toLocaleDateString("en-US")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-[11px] text-slate-500">
          In a future version, NxtStps will securely upload, classify, and
          analyze these documents (police reports, bills, etc.) to check for
          missing information and match them to your application.
        </p>
      </div>
    </main>
  );
}