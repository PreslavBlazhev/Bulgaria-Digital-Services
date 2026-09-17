import { cn } from "@/lib/cn";

/* ==========================================================================
   PLACEHOLDER BRAND MARK — REPLACEABLE ASSET

   Built from the stated brand concept: a horizontal ellipse with BDS as the
   focus and the full name beneath. It is drawn as SVG rather than shipped as
   an image so it stays crisp, inherits theme colour and costs no request.

   When a final logo asset exists, replace the <svg> body here and in
   `app/icon.svg`. Nothing else references the mark directly.
   ========================================================================== */

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 40"
      role="img"
      aria-label="BDS"
      className={cn("h-8 w-auto", className)}
    >
      <defs>
        <linearGradient id="bds-mark-stroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>

      <ellipse
        cx="32"
        cy="20"
        rx="30.25"
        ry="18.25"
        fill="none"
        stroke="url(#bds-mark-stroke)"
        strokeWidth="1.5"
      />

      <text
        x="32"
        y="20"
        textAnchor="middle"
        dominantBaseline="central"
        fill="currentColor"
        fontSize="15.5"
        fontWeight="700"
        letterSpacing="1.6"
        fontFamily="var(--font-display), sans-serif"
      >
        BDS
      </text>
    </svg>
  );
}

/** Header lockup: mark plus short name. */
export function LogoCompact({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5 text-fg", className)}>
      <LogoMark className="h-7" />
      <span className="sr-only">Bulgaria Digital Services</span>
      <span
        aria-hidden="true"
        className="hidden font-mono text-[0.625rem] leading-tight tracking-[0.16em] text-fg-subtle uppercase sm:block"
      >
        Bulgaria
        <br />
        Digital Services
      </span>
    </span>
  );
}

/** Footer lockup: mark above the full name. */
export function LogoFull({ className }: { className?: string }) {
  return (
    <span className={cn("flex flex-col gap-3 text-fg", className)}>
      <LogoMark className="h-10" />
      <span className="font-display text-sm font-semibold tracking-tight text-fg">
        Bulgaria Digital Services
      </span>
    </span>
  );
}
