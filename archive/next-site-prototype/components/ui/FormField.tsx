"use client";

import type {
  InputHTMLAttributes,
  ReactNode,
  Ref,
  TextareaHTMLAttributes,
} from "react";
import { useId } from "react";
import { cn } from "@/lib/cn";

const CONTROL =
  "w-full rounded-md border bg-surface-sunken px-3.5 py-2.5 text-sm text-fg " +
  "placeholder:text-fg-subtle transition-colors duration-200 " +
  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 " +
  "disabled:opacity-50";

interface FieldShellProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: (props: {
    id: string;
    describedBy: string | undefined;
    invalid: boolean;
  }) => ReactNode;
  className?: string;
}

/**
 * Owns the label / error / hint wiring so every control in the app gets
 * correct `aria-describedby` and `aria-invalid` without repeating it.
 */
export function FormField({
  label,
  error,
  hint,
  required,
  children,
  className,
}: FieldShellProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-accent">
            *
          </span>
        ) : (
          <span className="ml-1.5 text-xs font-normal text-fg-subtle">
            optional
          </span>
        )}
      </label>

      {children({ id, describedBy, invalid: Boolean(error) })}

      {hint && !error ? (
        <p id={hintId} className="text-xs leading-snug text-fg-subtle">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="text-xs leading-snug text-signal-down">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({
  className,
  invalid,
  ref,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
  ref?: Ref<HTMLInputElement>;
}) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        CONTROL,
        invalid ? "border-signal-down/60" : "border-line",
        className,
      )}
      {...props}
    />
  );
}

export function TextArea({
  className,
  invalid,
  ref,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
}) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        CONTROL,
        "min-h-28 resize-y",
        invalid ? "border-signal-down/60" : "border-line",
        className,
      )}
      {...props}
    />
  );
}

export { CONTROL as FIELD_CONTROL_CLASS };
