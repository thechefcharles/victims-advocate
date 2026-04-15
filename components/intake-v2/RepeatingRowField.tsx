"use client";

/**
 * Tabular repeating-row input group. Rendered when a cvc_form_fields row has
 * field_type = 'repeating_rows'. Value in the session answers map is a plain
 * array of row objects — Record<string, string>[] — keyed by the per-column
 * fieldKey.
 *
 * Layout: stacked cards on narrow viewports, compact multi-column grid on
 * wider ones (md+). "Remove" appears on every row past the first; "Add
 * another" disables at maxRows.
 */

import { useEffect } from "react";

export type RowColumnType = "text" | "currency" | "date" | "phone";

export interface RowColumn {
  fieldKey: string;
  label: string;
  fieldType: RowColumnType;
  placeholder?: string;
}

export interface RepeatingRowFieldProps {
  groupKey: string;
  groupLabel: string;
  helpText?: string | null;
  rowFields: RowColumn[];
  maxRows: number;
  minRows: number;
  value: Record<string, string>[];
  onChange: (rows: Record<string, string>[]) => void;
  onBlur?: () => void;
  disabled?: boolean;
}

const baseInput =
  "w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none";

function blankRow(cols: RowColumn[]): Record<string, string> {
  const row: Record<string, string> = {};
  for (const c of cols) row[c.fieldKey] = "";
  return row;
}

function coerceCurrencyInput(s: string): string {
  return s.replace(/[^0-9.]/g, "");
}

function coercePhoneInput(s: string): string {
  return s.replace(/[^0-9+\-().\s]/g, "").slice(0, 24);
}

export function RepeatingRowField(props: RepeatingRowFieldProps) {
  const {
    groupKey,
    groupLabel,
    helpText,
    rowFields,
    maxRows,
    minRows,
    value,
    onChange,
    onBlur,
    disabled,
  } = props;

  // Normalize: always show at least minRows cards, never exceed maxRows.
  const rows = Array.isArray(value) ? value : [];
  useEffect(() => {
    if (rows.length < minRows) {
      const padded = [...rows];
      while (padded.length < minRows) padded.push(blankRow(rowFields));
      onChange(padded);
    }
    // Only pad on mount / when col shape changes — not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minRows, rowFields.length]);

  function updateCell(rowIdx: number, colKey: string, newValue: string) {
    const next = rows.map((r, i) => (i === rowIdx ? { ...r, [colKey]: newValue } : r));
    onChange(next);
  }

  function addRow() {
    if (rows.length >= maxRows) return;
    onChange([...rows, blankRow(rowFields)]);
  }

  function removeRow(idx: number) {
    const next = rows.filter((_, i) => i !== idx);
    onChange(next.length < minRows ? [...next, blankRow(rowFields)] : next);
  }

  function renderCell(row: Record<string, string>, rowIdx: number, col: RowColumn) {
    const fieldId = `${groupKey}-${rowIdx}-${col.fieldKey}`;
    const val = row[col.fieldKey] ?? "";
    const common = {
      id: fieldId,
      name: fieldId,
      disabled,
      onBlur,
      placeholder: col.placeholder,
    };
    switch (col.fieldType) {
      case "date":
        return (
          <input
            {...common}
            type="date"
            className={baseInput}
            value={val}
            onChange={(e) => updateCell(rowIdx, col.fieldKey, e.target.value)}
          />
        );
      case "currency":
        return (
          <div className="relative">
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">
              $
            </span>
            <input
              {...common}
              type="text"
              inputMode="decimal"
              className={`${baseInput} pl-5`}
              value={val}
              onChange={(e) => updateCell(rowIdx, col.fieldKey, coerceCurrencyInput(e.target.value))}
            />
          </div>
        );
      case "phone":
        return (
          <input
            {...common}
            type="tel"
            className={baseInput}
            value={val}
            onChange={(e) => updateCell(rowIdx, col.fieldKey, coercePhoneInput(e.target.value))}
          />
        );
      case "text":
      default:
        return (
          <input
            {...common}
            type="text"
            className={baseInput}
            value={val}
            onChange={(e) => updateCell(rowIdx, col.fieldKey, e.target.value)}
          />
        );
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <label className="block text-sm font-medium text-gray-800">{groupLabel}</label>
        <span className="text-xs text-gray-500">
          {rows.length} of {maxRows}
        </span>
      </div>
      {helpText && <p className="text-xs text-gray-500">{helpText}</p>}

      <div className="space-y-2">
        {rows.map((row, rowIdx) => (
          <div
            key={rowIdx}
            className="rounded-md border border-gray-200 bg-gray-50 p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {groupLabel} #{rowIdx + 1}
              </span>
              {rows.length > minRows && rowIdx >= minRows - 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(rowIdx)}
                  className="text-xs font-medium text-red-700 hover:underline"
                  disabled={disabled}
                >
                  Remove
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {rowFields.map((col) => (
                <div key={col.fieldKey} className="space-y-1">
                  <label
                    htmlFor={`${groupKey}-${rowIdx}-${col.fieldKey}`}
                    className="block text-xs font-medium text-gray-700"
                  >
                    {col.label}
                  </label>
                  {renderCell(row, rowIdx, col)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        disabled={disabled || rows.length >= maxRows}
        className="rounded-md border border-blue-600 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
      >
        + Add another {groupLabel.toLowerCase()}
      </button>
    </div>
  );
}
