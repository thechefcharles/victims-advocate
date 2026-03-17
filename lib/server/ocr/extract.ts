/**
 * Phase 13: Heuristic extraction of structured fields from OCR text.
 * Conservative: only return values we have some basis for.
 */

import type { ExtractedFieldCandidate } from "./types";

const FIELD_KEYS = {
  police_report_number: "police_report.report_number",
  crime_date: "crime.date",
  event_date: "crime.date",
  provider_name: "provider.name",
  billed_amount: "expense.amount",
  charge_amount: "expense.amount",
  service_date: "service.date",
  claimant_name: "claimant.name",
  victim_name: "claimant.name",
  reporting_agency: "police_report.reporting_agency",
} as const;

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function parseAmount(text: string): number | null {
  const match = text.replace(/,/g, "").match(/\$?\s*(\d+\.?\d*)/);
  if (!match) return null;
  const n = parseFloat(match[1]);
  return Number.isFinite(n) ? n : null;
}

function parseDate(text: string): string | null {
  const trimmed = text.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return trimmed;
  const mdy = trimmed.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (mdy) {
    const [, m, d, y] = mdy;
    const year = y!.length === 2 ? `20${y}` : y!;
    const month = m!.padStart(2, "0");
    const day = d!.padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return null;
}

/** Heuristic confidence 0–1 from match strength. */
function confidence(matchLength: number, patternLength: number): number {
  if (patternLength === 0) return 0.5;
  const ratio = matchLength / patternLength;
  return Math.min(1, Math.max(0.3, 0.3 + ratio * 0.6));
}

/**
 * Extract field candidates from raw OCR text. Document-type aware: we try all patterns
 * but can prioritize or filter by docType later.
 */
export function extractFieldsFromText(rawText: string): ExtractedFieldCandidate[] {
  const out: ExtractedFieldCandidate[] = [];
  const text = normalizeWhitespace(rawText);
  if (!text.length) return out;

  // Police / report number: "Report # 12345", "Case No. 2024-123", "Report Number: 123"
  const reportNumMatch = text.match(/(?:report\s*#?|case\s*(?:no\.?|number)|report\s*number)\s*:?\s*([A-Z0-9\-]+)/i);
  if (reportNumMatch) {
    out.push({
      field_key: FIELD_KEYS.police_report_number,
      field_label: "Police report number",
      value_text: reportNumMatch[1].trim(),
      value_number: null,
      value_date: null,
      confidence_score: confidence(reportNumMatch[1].length, 4),
    });
  }

  // Date: ISO or MM/DD/YYYY
  const dateMatch = text.match(/(?:date|incident|event|service)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})/i);
  if (dateMatch) {
    const parsed = parseDate(dateMatch[1]);
    if (parsed) {
      out.push({
        field_key: FIELD_KEYS.crime_date,
        field_label: "Crime / event date",
        value_text: parsed,
        value_number: null,
        value_date: parsed,
        confidence_score: 0.7,
      });
    }
  }

  // Amount: $1,234.56 or Total 1234.56
  const amountMatch = text.match(/(?:total|amount|balance|due|charge|billed)\s*:?\s*\$?\s*[\d,]+\.?\d*/i);
  if (amountMatch) {
    const num = parseAmount(amountMatch[0]);
    if (num != null) {
      out.push({
        field_key: FIELD_KEYS.billed_amount,
        field_label: "Billed amount",
        value_text: amountMatch[0].replace(/\s+/g, " ").trim(),
        value_number: num,
        value_date: null,
        confidence_score: 0.6,
      });
    }
  }

  // Provider / agency name: "Provider: X" or "Agency: X" or "Hospital: X"
  const providerMatch = text.match(/(?:provider|hospital|agency|facility)\s*:?\s*([A-Za-z0-9\s&',.\-]{2,50})/i);
  if (providerMatch) {
    const name = providerMatch[1].trim().slice(0, 200);
    if (name.length >= 2) {
      out.push({
        field_key: FIELD_KEYS.provider_name,
        field_label: "Provider name",
        value_text: name,
        value_number: null,
        value_date: null,
        confidence_score: 0.65,
      });
    }
  }

  // Reporting agency (police)
  const agencyMatch = text.match(/(?:reporting\s*agency|department|pd)\s*:?\s*([A-Za-z0-9\s&',.\-]{2,50})/i);
  if (agencyMatch) {
    const name = agencyMatch[1].trim().slice(0, 200);
    if (name.length >= 2) {
      out.push({
        field_key: FIELD_KEYS.reporting_agency,
        field_label: "Reporting agency",
        value_text: name,
        value_number: null,
        value_date: null,
        confidence_score: 0.6,
      });
    }
  }

  // Claimant / victim name: "Claimant:" or "Victim:"
  const nameMatch = text.match(/(?:claimant|victim|patient)\s*:?\s*([A-Za-z\s\-']{2,80})/i);
  if (nameMatch) {
    const name = nameMatch[1].trim().slice(0, 120);
    if (name.length >= 2) {
      out.push({
        field_key: FIELD_KEYS.claimant_name,
        field_label: "Claimant / victim name",
        value_text: name,
        value_number: null,
        value_date: null,
        confidence_score: 0.55,
      });
    }
  }

  // Service date (separate from crime date if present)
  const serviceDateMatch = text.match(/(?:service\s*date|date\s*of\s*service)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
  if (serviceDateMatch && !out.some((f) => f.field_key === "service.date")) {
    const parsed = parseDate(serviceDateMatch[1]);
    if (parsed) {
      out.push({
        field_key: "service.date",
        field_label: "Service date",
        value_text: parsed,
        value_number: null,
        value_date: parsed,
        confidence_score: 0.65,
      });
    }
  }

  return out;
}
