import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const BASE =
  "relative inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap rounded-md " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-[var(--ease-out-quart)] " +
  "disabled:pointer-events-none disabled:opacity-45 active:translate-y-px";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-primary text-white shadow-[0_8px_24px_-12px_rgb(59_130_246/0.9)] " +
    "hover:bg-primary-hover hover:shadow-[0_10px_30px_-10px_rgb(59_130_246/0.85)]",
  secondary:
    "border border-line-strong bg-surface/60 text-fg hover:border-primary/60 hover:bg-surface-raised",
  ghost: "text-fg-muted hover:text-fg hover:bg-surface/70",
  danger: "border border-signal-down/40 text-signal-down hover:bg-signal-down/10",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[0.8125rem]",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-[0.9375rem]",
};

interface SharedProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  /** Appends a right arrow that nudges on hover. */
  withArrow?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  withArrow,
  ...props
}: SharedProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(BASE, VARIANTS[variant], SIZES[size], "group", className)}
      {...props}
    >
      {children}
      {withArrow ? <Arrow /> : null}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  withArrow,
  external,
}: SharedProps & { href: string; external?: boolean }) {
  const classes = cn(BASE, VARIANTS[variant], SIZES[size], "group", className);

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
      >
        {children}
        {withArrow ? <Arrow /> : null}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
      {withArrow ? <Arrow /> : null}
    </Link>
  );
}

function Arrow() {
  return (
    <ArrowRight
      aria-hidden="true"
      className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
    />
  );
}
