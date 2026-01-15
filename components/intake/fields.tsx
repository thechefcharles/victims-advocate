// components/intake/fields.tsx
"use client";

import * as React from "react";
import type { FieldError } from "react-hook-form";

type FieldProps = {
  label: string;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  error?: FieldError | string;
  children: React.ReactNode;
};

export function Field({
  label,
  htmlFor,
  hint,
  required,
  error,
  children,
}: FieldProps) {
  const errMsg = typeof error === "string" ? error : error?.message;

  return (
    <div className="space-y-1">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-slate-900"
      >
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </label>

      {hint ? <p className="text-xs text-slate-600">{hint}</p> : null}

      {children}

      {errMsg ? (
        <p className="text-sm text-red-600" role="alert">
          {errMsg}
        </p>
      ) : null}
    </div>
  );
}

type TextInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput({ className, error, ...props }, ref) {
    return (
      <input
        ref={ref}
        {...props}
        className={[
          "w-full rounded-md border px-3 py-2 text-sm outline-none",
          error
            ? "border-red-500 focus:ring-2 focus:ring-red-200"
            : "border-slate-300 focus:ring-2 focus:ring-slate-200",
          className ?? "",
        ].join(" ")}
      />
    );
  }
);