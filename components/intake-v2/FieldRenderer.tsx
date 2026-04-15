"use client";

/**
 * Renders a single intake field by field_type. Field-level state is owned
 * by the parent (page) — this component is purely presentational.
 */

import type { RenderField } from "./types";
import { RepeatingRowField, type RowColumn } from "./RepeatingRowField";

/**
 * A repeating_rows field stores its column definitions + min/max in
 * input_options via a schema the seed documents. We coerce the jsonb here
 * and fall back to a safe default if the shape is missing.
 */
interface RepeatingRowsConfig {
  columns: RowColumn[];
  minRows: number;
  maxRows: number;
}

function extractRepeatingConfig(field: RenderField): RepeatingRowsConfig | null {
  const opts = field.inputOptions as unknown;
  if (!opts || typeof opts !== "object") return null;
  const obj = opts as {
    columns?: unknown;
    minRows?: unknown;
    maxRows?: unknown;
  };
  if (!Array.isArray(obj.columns)) return null;
  const columns: RowColumn[] = [];
  for (const c of obj.columns) {
    if (!c || typeof c !== "object") continue;
    const col = c as { fieldKey?: unknown; label?: unknown; fieldType?: unknown; placeholder?: unknown };
    if (typeof col.fieldKey !== "string" || typeof col.label !== "string") continue;
    const ft =
      col.fieldType === "currency" || col.fieldType === "date" || col.fieldType === "phone"
        ? col.fieldType
        : "text";
    columns.push({
      fieldKey: col.fieldKey,
      label: col.label,
      fieldType: ft,
      placeholder: typeof col.placeholder === "string" ? col.placeholder : undefined,
    });
  }
  if (columns.length === 0) return null;
  const minRows = typeof obj.minRows === "number" && obj.minRows > 0 ? obj.minRows : 1;
  const maxRows =
    typeof obj.maxRows === "number" && obj.maxRows >= minRows ? obj.maxRows : Math.max(minRows, 5);
  return { columns, minRows, maxRows };
}

interface Props {
  field: RenderField;
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur?: () => void;
  disabled?: boolean;
  error?: string | null;
}

const baseInput =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

export function FieldRenderer({ field, value, onChange, onBlur, disabled, error }: Props) {
  const id = `intake-v2-${field.fieldKey}`;
  const ariaInvalid = error ? true : undefined;

  function inputElement() {
    const placeholder = field.placeholder ?? undefined;
    const isReadOnly = disabled === true;
    const common = {
      id,
      name: field.fieldKey,
      onBlur,
      disabled: isReadOnly,
      "aria-invalid": ariaInvalid,
      "aria-describedby": field.helpText ? `${id}-help` : undefined,
    };

    switch (field.fieldType) {
      case "repeating_rows": {
        const cfg = extractRepeatingConfig(field);
        if (!cfg) {
          return (
            <p className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800">
              This table field is misconfigured (missing column definitions). Contact support.
            </p>
          );
        }
        const rows = Array.isArray(value)
          ? (value as Record<string, string>[])
          : [];
        return (
          <RepeatingRowField
            groupKey={field.fieldKey}
            groupLabel={field.label}
            helpText={field.helpText}
            rowFields={cfg.columns}
            minRows={cfg.minRows}
            maxRows={cfg.maxRows}
            value={rows}
            onChange={(next) => onChange(next)}
            onBlur={onBlur}
            disabled={isReadOnly}
          />
        );
      }
      case "textarea":
        return (
          <textarea
            {...common}
            className={`${baseInput} min-h-[88px]`}
            placeholder={placeholder}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "checkbox":
        return (
          <label className="flex items-center gap-2 text-sm">
            <input
              {...common}
              type="checkbox"
              checked={value === true}
              onChange={(e) => onChange(e.target.checked)}
            />
            <span>{field.label}</span>
          </label>
        );
      case "date":
        return (
          <input
            {...common}
            type="date"
            className={baseInput}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "currency": {
        const display = typeof value === "number" || typeof value === "string" ? String(value) : "";
        return (
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              $
            </span>
            <input
              {...common}
              type="text"
              inputMode="decimal"
              className={`${baseInput} pl-6`}
              placeholder={placeholder ?? "0.00"}
              value={display}
              onChange={(e) => {
                const v = e.target.value;
                // Accept digits + single decimal — strip everything else.
                const cleaned = v.replace(/[^0-9.]/g, "");
                onChange(cleaned);
              }}
            />
          </div>
        );
      }
      case "signature":
        // Phase D: simple "I agree" checkbox stand-in. Full signature capture
        // lands in Phase F.
        return (
          <label className="flex items-start gap-2 text-sm">
            <input
              {...common}
              type="checkbox"
              checked={value === true}
              onChange={(e) => onChange(e.target.checked)}
            />
            <span>I confirm and electronically sign that the information above is accurate.</span>
          </label>
        );
      case "text":
      default:
        if (Array.isArray(field.inputOptions) && field.inputOptions.length > 0) {
          return (
            <select
              {...common}
              className={baseInput}
              value={typeof value === "string" ? value : ""}
              onChange={(e) => onChange(e.target.value)}
            >
              <option value="" disabled>
                {placeholder ?? "Select…"}
              </option>
              {field.inputOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          );
        }
        return (
          <input
            {...common}
            type="text"
            className={baseInput}
            placeholder={placeholder}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  }

  // Checkbox/signature variants render their own label inline; everything
  // else gets a top-of-field label.
  const inlineLabel =
    field.fieldType === "checkbox" ||
    field.fieldType === "signature" ||
    field.fieldType === "repeating_rows";

  return (
    <div className="space-y-1">
      {!inlineLabel && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-800">
          {field.label}
          {field.required && <span className="ml-1 text-red-600">*</span>}
        </label>
      )}
      {inputElement()}
      {field.helpText && (
        <p id={`${id}-help`} className="text-xs text-gray-500">
          {field.helpText}
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
