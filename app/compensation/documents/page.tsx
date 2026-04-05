// app/compensation/documents/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/components/i18n/i18nProvider";

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

const DOCS_STORAGE_KEY = "nxtstps_docs_v1";

export default function DocumentsPage() {
  const { t } = useI18n();
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [selectedType, setSelectedType] = useState<DocumentType>("police_report");
  const [description, setDescription] = useState("");

    useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(DOCS_STORAGE_KEY);
      if (!raw) return;
      const parsed: UploadedDoc[] = JSON.parse(raw);
      setDocs(parsed);
    } catch (err) {
      console.error("Failed to load docs from localStorage", err);
    }
  }, []);

    useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(DOCS_STORAGE_KEY, JSON.stringify(docs));
    } catch (err) {
      console.error("Failed to save docs to localStorage", err);
    }
  }, [docs]);

const handleFiles = async (files: FileList | null) => {
  if (!files) return;

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    alert(t("compensationDocumentsPage.loginToUpload"));
    return;
  }

  const uploads: UploadedDoc[] = [];

  Array.from(files).forEach((file) => {
    const localDoc: UploadedDoc = {
      id: `${file.name}-${file.lastModified}-${Math.random()
        .toString(36)
        .slice(2)}`,
      type: selectedType,
      description: description.trim(),
      fileName: file.name,
      fileSize: file.size,
      lastModified: file.lastModified,
    };
    uploads.push(localDoc);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("docType", selectedType);
    formData.append("description", description);

    fetch("/api/compensation/upload-document", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg =
            json?.error?.message ??
            json?.message ??
            t("compensationDocumentsPage.uploadFailedGeneric");
          alert(msg);
          return;
        }
        const { document } = json;
        if (document?.id) {
          setDocs((prev) => prev.map((d) => (d.id === localDoc.id ? { ...d, id: document.id } : d)));
        }
      })
      .catch((err) => {
        console.error("Error uploading document", err);
        alert(t("compensationDocumentsPage.networkError"));
      });
  });

  setDocs((prev) => [...prev, ...uploads]);
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
    <main className="min-h-screen bg-[var(--color-warm-white)] text-[var(--color-navy)] px-4 sm:px-8 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <p className="text-xs tracking-[0.25em] uppercase text-[var(--color-muted)]">
            Documents · Optional but Recommended
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Upload supporting documents for your claim
          </h1>
          <p className="text-sm text-[var(--color-slate)]">
            You can upload copies of police reports, medical bills, funeral
            bills, wage proof, or other documents that support your Crime
            Victims Compensation application. You do not need everything to move
            forward, but the Attorney General&apos;s office will eventually need
            these to review your claim.
          </p>
        </header>

        <section className="bg-[var(--color-warm-cream)]/90 border border-[var(--color-border-light)] rounded-2xl p-5 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--color-navy)]">
            Add documents
          </h2>

          <div className="grid gap-3 sm:grid-cols-2 text-xs">
            <label className="block space-y-1 text-[var(--color-charcoal)]">
              <span>Document type</span>
              <select
                value={selectedType}
                onChange={(e) =>
                  setSelectedType(e.target.value as DocumentType)
                }
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-cream)]/80 px-3 py-2 text-xs text-[var(--color-navy)] focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400"
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

            <label className="block space-y-1 text-[var(--color-charcoal)]">
              <span>Short description (optional)</span>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. ER bill from 1/12/2025"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-warm-cream)]/80 px-3 py-2 text-xs text-[var(--color-navy)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400"
              />
            </label>
          </div>

          <div className="space-y-2 text-xs">
            <label className="block space-y-1 text-[var(--color-charcoal)]">
              <span>Select file(s)</span>
              <input
                type="file"
                multiple
                onChange={(e) => handleFiles(e.target.files)}
                className="block w-full text-[11px] text-[var(--color-slate)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-teal-deep)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-[var(--color-teal)]"
              />
            </label>
            <p className="text-[11px] text-[var(--color-muted)]">
              Allowed: PDF, JPG, PNG (max 15 MB). Files are stored securely and
              can be attached to your case when you save.
            </p>
          </div>
        </section>

        <section className="bg-[var(--color-warm-cream)]/90 border border-[var(--color-border-light)] rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-[var(--color-navy)]">
            Documents added in this session
          </h2>
          {docs.length === 0 ? (
            <p className="text-xs text-[var(--color-muted)]">
              No documents added yet. When you select files above, they will be
              listed here with their type and description.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border-light)] text-xs">
              {docs.map((doc) => (
                <li
                  key={doc.id}
                  className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-[var(--color-navy)]">
                      {humanTypeLabel(doc.type)}
                    </p>
                    <p className="text-[var(--color-slate)]">
                      {doc.fileName} · {formatSize(doc.fileSize)}
                    </p>
                    {doc.description && (
                      <p className="text-[11px] text-[var(--color-muted)]">
                        {doc.description}
                      </p>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--color-muted)]">
                    Added:{" "}
                    {new Date(doc.lastModified).toLocaleDateString("en-US")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-[11px] text-[var(--color-muted)]">
          In a future version, NxtStps will securely upload, classify, and
          analyze these documents (police reports, bills, etc.) to check for
          missing information and match them to your application.
        </p>
      </div>
    </main>
  );
}