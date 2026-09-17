"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export interface MultiSelectOption {
  value: string;
  label: string;
  description?: string;
}

/**
 * Toggle-chip multi-select built on real checkboxes, so it is keyboard
 * operable and announced correctly without any ARIA gymnastics.
 */
export function MultiSelect({
  options,
  selected,
  onChange,
  className,
  columns = 2,
  name,
}: {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  className?: string;
  columns?: 1 | 2 | 3;
  name?: string;
}) {
  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  }

  return (
    <div
      className={cn(
        "grid gap-2",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        return (
          <label
            key={option.value}
            className={cn(
              "group flex cursor-pointer items-start gap-3 rounded-md border p-3.5",
              "transition-[border-color,background-color] duration-200",
              isSelected
                ? "border-primary/55 bg-primary/10"
                : "border-line bg-surface-sunken hover:border-line-strong hover:bg-surface",
            )}
          >
            <input
              type="checkbox"
              name={name}
              value={option.value}
              checked={isSelected}
              onChange={() => toggle(option.value)}
              className="sr-only"
            />

            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 grid size-4 shrink-0 place-items-center rounded border transition-colors duration-200",
                isSelected
                  ? "border-primary bg-primary text-white"
                  : "border-line-strong bg-transparent",
              )}
            >
              {isSelected ? <Check className="size-3" strokeWidth={3} /> : null}
            </span>

            <span className="flex flex-col gap-0.5">
              <span
                className={cn(
                  "text-sm leading-snug font-medium transition-colors",
                  isSelected ? "text-fg" : "text-fg-muted group-hover:text-fg",
                )}
              >
                {option.label}
              </span>
              {option.description ? (
                <span className="text-xs leading-snug text-fg-subtle">
                  {option.description}
                </span>
              ) : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}

/** Single-choice variant with the same visual language. */
export function OptionCards({
  options,
  selected,
  onChange,
  columns = 2,
  className,
}: {
  options: MultiSelectOption[];
  selected: string | null;
  onChange: (value: string) => void;
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "grid gap-2",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {options.map((option) => {
        const isSelected = option.value === selected;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.value)}
            className={cn(
              "group flex cursor-pointer flex-col gap-1 rounded-md border p-4 text-left",
              "transition-[border-color,background-color,transform] duration-200",
              isSelected
                ? "border-primary/55 bg-primary/10"
                : "border-line bg-surface-sunken hover:border-line-strong hover:bg-surface",
            )}
          >
            <span
              className={cn(
                "text-sm font-medium transition-colors",
                isSelected ? "text-accent" : "text-fg group-hover:text-accent",
              )}
            >
              {option.label}
            </span>
            {option.description ? (
              <span className="text-xs leading-snug text-fg-subtle">
                {option.description}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
