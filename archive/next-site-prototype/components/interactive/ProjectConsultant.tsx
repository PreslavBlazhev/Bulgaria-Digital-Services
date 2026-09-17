"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Copy, RotateCcw, Send, Sparkles } from "lucide-react";
import {
  briefToText,
  getConsultantEngine,
  type ConsultantState,
  type ProjectBrief,
} from "@/lib/consultant-engine";
import { writeHandoff } from "@/lib/handoff";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Toast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

const engine = getConsultantEngine();

const COMPLEXITY_TONE = {
  Foundation: "ok",
  Advanced: "primary",
  Complex: "warn",
  Platform: "down",
} as const;

export function ProjectConsultant() {
  const router = useRouter();
  // The greeting uses fixed message ids, so it is safe to build during the
  // initial render on both the server and the client.
  const [state, setState] = useState<ConsultantState>(() => engine.greet());
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [state.messages.length, thinking]);

  async function send(text: string) {
    if (thinking) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    if (!started) {
      track("consultant_started");
      setStarted(true);
    }

    setInput("");
    setThinking(true);

    // A brief pause so the reply does not appear before the question has been
    // read. Cosmetic, and short enough not to be an obstacle.
    await new Promise((resolve) => setTimeout(resolve, 420));

    const nextState = await engine.respond(state, trimmed);
    setState(nextState);
    setThinking(false);

    if (nextState.complete) track("consultant_completed");
    window.setTimeout(() => inputRef.current?.focus(), 40);
  }

  function restart() {
    setState(engine.greet());
    setInput("");
    setStarted(false);
    setToast("Conversation reset.");
  }

  const brief: ProjectBrief | null = engine.brief(state);
  const suggestions = engine.suggestions(state);

  async function copyBrief() {
    if (!brief) return;
    try {
      await navigator.clipboard.writeText(briefToText(brief));
      setToast("Project brief copied to clipboard.");
    } catch {
      setToast("Clipboard unavailable — select and copy the brief manually.");
    }
  }

  function sendBrief() {
    if (!brief) return;

    writeHandoff({
      source: "consultant",
      title: "Your project brief",
      facts: [
        { label: "Business type", value: brief.businessType },
        { label: "Locations", value: brief.locations },
        { label: "Recommended", value: brief.recommendedSolution },
        { label: "Complexity", value: brief.complexity },
      ],
      summary: briefToText(brief),
      createdAt: new Date().toISOString(),
    });

    router.push("/contact?from=consultant");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      {/* ---------------- Conversation ---------------- */}
      <div className="flex min-h-[36rem] flex-col overflow-hidden rounded-xl border border-line bg-surface">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-md border border-primary/40 bg-primary/10 text-accent">
              <Sparkles aria-hidden="true" className="size-3.5" />
            </span>
            <span className="text-sm font-medium text-fg">
              BDS Digital Project Consultant
            </span>
          </div>

          <button
            type="button"
            onClick={restart}
            className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs text-fg-subtle transition-colors hover:text-fg"
          >
            <RotateCcw aria-hidden="true" className="size-3" />
            Restart
          </button>
        </div>

        <div
          ref={logRef}
          role="log"
          aria-live="polite"
          aria-label="Consultation"
          className="flex-1 space-y-4 overflow-y-auto px-5 py-5"
        >
          {state.messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.speaker === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed",
                  msg.speaker === "user"
                    ? "rounded-br-sm bg-primary/15 text-fg"
                    : "rounded-bl-sm border border-line bg-surface-sunken text-fg-muted",
                )}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {thinking ? (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-xl rounded-bl-sm border border-line bg-surface-sunken px-4 py-3.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    aria-hidden="true"
                    className="size-1.5 animate-pulse rounded-full bg-fg-subtle"
                    style={{ animationDelay: `${i * 160}ms` }}
                  />
                ))}
                <span className="sr-only">Consultant is responding</span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && !thinking ? (
          <div className="shrink-0 border-t border-line px-5 py-3">
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => send(suggestion)}
                  className="cursor-pointer rounded-md border border-line bg-surface-sunken px-2.5 py-1.5 text-left text-xs text-fg-muted transition-colors hover:border-primary/45 hover:text-accent"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex shrink-0 items-end gap-2 border-t border-line p-3"
        >
          <label htmlFor="consultant-input" className="sr-only">
            Your message
          </label>
          <textarea
            id="consultant-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            disabled={state.complete}
            placeholder={
              state.complete
                ? "The brief is ready — see the panel."
                : "Type your answer…"
            }
            className="max-h-32 min-h-11 flex-1 resize-none rounded-md border border-line bg-surface-sunken px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-subtle focus:border-primary focus:ring-2 focus:ring-primary/25 focus:outline-none disabled:opacity-50"
          />
          <Button
            type="submit"
            size="md"
            disabled={state.complete || thinking || input.trim().length === 0}
            aria-label="Send message"
            className="shrink-0"
          >
            <Send aria-hidden="true" className="size-4" />
          </Button>
        </form>
      </div>

      {/* ---------------- Brief panel ---------------- */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface-sunken">
        <div className="shrink-0 border-b border-line px-5 py-3.5">
          <span className="font-mono text-[0.625rem] tracking-[0.14em] text-fg-subtle uppercase">
            Project brief
          </span>
        </div>

        {brief ? (
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
            <Row label="Business type" value={brief.businessType} />
            <Row label="Locations" value={brief.locations} />
            <Row label="Primary goal" value={brief.primaryGoal} />

            <div className="flex flex-col gap-1.5">
              <Label>Recommended solution</Label>
              <Link
                href={`/solutions/${brief.solutionSlug}`}
                className="text-sm font-medium text-fg transition-colors hover:text-accent"
              >
                {brief.recommendedSolution}
              </Link>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Complexity</Label>
              <span>
                <Badge
                  tone={
                    COMPLEXITY_TONE[
                      brief.complexity as keyof typeof COMPLEXITY_TONE
                    ] ?? "neutral"
                  }
                  dot
                >
                  {brief.complexity}
                </Badge>
              </span>
            </div>

            <Chips label="Required modules" items={brief.requiredModules} />
            <Chips label="Optional modules" items={brief.optionalModules} dashed />
            <Chips label="Integrations" items={brief.integrations} />

            <div className="flex flex-col gap-2">
              <Label>Key risks</Label>
              <ul className="flex flex-col gap-2">
                {brief.risks.map((risk) => (
                  <li
                    key={risk}
                    className="border-l-2 border-signal-warn/50 pl-3 text-xs leading-relaxed text-fg-muted"
                  >
                    {risk}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Recommended next step</Label>
              <p className="text-xs leading-relaxed text-fg-muted">
                {brief.nextStep}
              </p>
            </div>

            <div className="mt-auto flex flex-col gap-2 border-t border-line pt-4">
              <Button onClick={sendBrief} withArrow className="w-full">
                Send this brief to BDS
              </Button>
              <Button variant="secondary" onClick={copyBrief} className="w-full">
                <Copy aria-hidden="true" className="size-3.5" />
                Copy brief
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col justify-center gap-3 p-8 text-center">
            <p className="text-sm text-fg-muted">
              The brief builds as the conversation goes.
            </p>
            <p className="text-xs leading-relaxed text-fg-subtle">
              Answer the questions on the left and this panel fills with the
              recommended solution, the modules it implies, integrations,
              complexity and the risks worth naming before a price is discussed.
            </p>
          </div>
        )}
      </div>

      <Toast
        open={toast !== null}
        message={toast ?? ""}
        tone="success"
        onClose={() => setToast(null)}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[0.625rem] tracking-[0.14em] text-fg-subtle uppercase">
      {children}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <p className="text-sm leading-snug text-fg-muted">{value}</p>
    </div>
  );
}

function Chips({
  label,
  items,
  dashed,
}: {
  label: string;
  items: string[];
  dashed?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className={cn(
              "rounded border px-2 py-1 font-mono text-[0.625rem] text-fg-muted",
              dashed
                ? "border-dashed border-line-strong"
                : "border-line bg-surface",
            )}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
