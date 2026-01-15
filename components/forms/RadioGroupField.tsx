"use client";

import { Controller, type Control } from "react-hook-form";

export function RadioGroupField({
  control,
  name,
  label,
  options,
}: {
  control: Control<any>;
  name: string;
  label: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="space-y-2">
          <div className="text-sm font-medium">{label}</div>
          <div className="flex flex-wrap gap-3">
            {options.map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  value={o.value}
                  checked={field.value === o.value}
                  onChange={() => field.onChange(o.value)}
                />
                {o.label}
              </label>
            ))}
          </div>
        </div>
      )}
    />
  );
}