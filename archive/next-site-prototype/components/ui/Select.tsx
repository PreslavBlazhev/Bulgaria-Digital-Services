"use client";

import type { Ref, SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { FIELD_CONTROL_CLASS } from "./FormField";

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Native <select> under a styled shell. A custom listbox would look tidier and
 * behave worse on mobile — the native control wins on accessibility and on
 * every touch keyboard.
 */
export function Select({
  options,
  placeholder,
  className,
  invalid,
  ref,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  options: SelectOption[];
  placeholder?: string;
  invalid?: boolean;
  ref?: Ref<HTMLSelectElement>;
}) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          FIELD_CONTROL_CLASS,
          "cursor-pointer appearance-none pr-10",
          invalid ? "border-signal-down/60" : "border-line",
          className,
        )}
        {...props}
      >
        {placeholder ? (
          <option value="">{placeholder}</option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-fg-subtle"
      />
    </div>
  );
}
