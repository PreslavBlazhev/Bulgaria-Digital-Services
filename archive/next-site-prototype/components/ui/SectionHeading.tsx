import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: "left" | "center";
  className?: string;
  /** Renders as h1 on pages where this is the page title. */
  as?: "h1" | "h2";
  children?: ReactNode;
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "left",
  className,
  as: Tag = "h2",
  children,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      {eyebrow ? (
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="h-px w-6 bg-linear-to-r from-transparent to-accent"
          />
          <span className="eyebrow">{eyebrow}</span>
        </div>
      ) : null}

      <Tag
        className={cn(
          "font-semibold text-fg",
          Tag === "h1"
            ? "text-4xl leading-[1.08] sm:text-5xl lg:text-[3.5rem]"
            : "text-3xl leading-[1.12] sm:text-4xl lg:text-[2.75rem]",
        )}
      >
        {title}
      </Tag>

      {lead ? (
        <p
          className={cn(
            "text-base leading-relaxed text-fg-muted sm:text-lg",
            align === "center" ? "max-w-2xl" : "max-w-2xl",
          )}
        >
          {lead}
        </p>
      ) : null}

      {children}
    </div>
  );
}
