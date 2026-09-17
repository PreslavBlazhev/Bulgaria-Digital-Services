import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface CardProps {
  children: ReactNode;
  className?: string;
  /**
   * `raised` sits above the page, `sunken` recedes into it,
   * `outline` is a frame with no fill.
   */
  surface?: "default" | "raised" | "sunken" | "outline";
  /** Adds hover treatment. Only use on cards that actually do something. */
  interactive?: boolean;
  padded?: boolean;
}

const SURFACES = {
  default: "bg-surface border-line",
  raised: "bg-surface-raised border-line-strong shadow-[var(--shadow-raised)]",
  sunken: "bg-surface-sunken border-line-soft",
  outline: "bg-transparent border-line",
} as const;

export function Card({
  children,
  className,
  surface = "default",
  interactive,
  padded = true,
}: CardProps) {
  return (
    <div
      className={cn(
        "relative rounded-lg border",
        SURFACES[surface],
        padded && "p-6",
        interactive &&
          "transition-[border-color,background-color,transform] duration-300 ease-[var(--ease-out-quart)] hover:-translate-y-0.5 hover:border-primary/45 hover:bg-surface-raised",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Card that is entirely a link. Keeps one accessible target per card. */
export function LinkCard({
  href,
  children,
  className,
  surface = "default",
  padded = true,
}: Omit<CardProps, "interactive"> & { href: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative block rounded-lg border",
        SURFACES[surface],
        padded && "p-6",
        "transition-[border-color,background-color,transform] duration-300 ease-[var(--ease-out-quart)]",
        "hover:-translate-y-0.5 hover:border-primary/45 hover:bg-surface-raised",
        className,
      )}
    >
      {children}
    </Link>
  );
}
