"use client";

import { Controller, type Control } from "react-hook-form";

export function TextField({
  control,
  name,
  label,
  placeholder,
  type = "text",
}: {
  control: Control<any>;
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div className="space-y-1">
          <label className="text-sm font-medium">{label}</label>
          <input
            {...field}
            type={type}
            placeholder={placeholder}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          {fieldState.error?.message ? (
            <p className="text-sm text-red-600">{fieldState.error.message}</p>
          ) : null}
        </div>
      )}
    />
  );
}