"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react";
import {
  BUSINESS_SIZES,
  EMPTY_BUILDER_STATE,
  INFRASTRUCTURES,
  MODULES,
  PROJECT_TYPES,
  buildRecommendation,
  moduleLabel,
  summariseProject,
  type BuilderState,
  type ModuleId,
} from "@/lib/builder-engine";
import { usePersistentState } from "@/hooks/usePersistentState";
import { writeHandoff } from "@/lib/handoff";
import { track } from "@/lib/analytics";
import { Button, LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { MultiSelect, OptionCards } from "@/components/ui/MultiSelect";
import { Toast } from "@/components/ui/Toast";
import { ArchitectureGraph } from "./ArchitectureGraph";
import { cn } from "@/lib/cn";

const STEPS = [
  { id: 1, title: "What are you building?", hint: "Project type" },
  { id: 2, title: "How big is the business?", hint: "Scale" },
  { id: 3, title: "What capabilities do you need?", hint: "Modules" },
  { id: 4, title: "What exists today?", hint: "Current infrastructure" },
  { id: 5, title: "Recommended architecture", hint: "Result" },
];

const COMPLEXITY_TONE = {
  Foundation: "ok",
  Advanced: "primary",
  Complex: "warn",
  Platform: "down",
} as const;

export function SolutionArchitect() {
  const router = useRouter();
  const [state, setState, clear] = usePersistentState<BuilderState>(
    "bds_builder_v1",
    EMPTY_BUILDER_STATE,
  );
  const [step, setStep] = useState(1);
  const [toast, setToast] = useState<string | null>(null);

  const recommendation = useMemo(() => buildRecommendation(state), [state]);

  const canAdvance =
    (step === 1 && state.projectType !== null) ||
    (step === 2 && state.businessSize !== null) ||
    step === 3 ||
    (step === 4 && state.infrastructure !== null);

  function next() {
    if (step === 1) track("solution_builder_started", { type: state.projectType ?? "" });
    track("solution_builder_step_completed", { step });

    if (step === 4) {
      track("solution_builder_completed", {
        complexity: recommendation?.complexity ?? "",
        modules: state.modules.length,
      });
    }
    setStep((s) => Math.min(5, s + 1));
  }

  function toggleModule(id: ModuleId) {
    setState((current) => {
      const has = current.modules.includes(id);
      track(has ? "project_module_removed" : "project_module_added", {
        module: id,
      });
      return {
        ...current,
        modules: has
          ? current.modules.filter((m) => m !== id)
          : [...current.modules, id],
      };
    });
  }

  async function copySummary() {
    if (!recommendation) return;
    const text = summariseProject(state, recommendation);
    try {
      await navigator.clipboard.writeText(text);
      setToast("Project summary copied to clipboard.");
    } catch {
      setToast("Clipboard unavailable — select and copy the summary manually.");
    }
  }

  function sendToContact() {
    if (!recommendation) return;

    writeHandoff({
      source: "builder",
      title: "Your project architecture",
      facts: [
        { label: "Recommended", value: recommendation.solution },
        { label: "Complexity", value: recommendation.complexity },
        {
          label: "Modules",
          value:
            Array.from(
              new Set([...recommendation.requiredModules, ...state.modules]),
            )
              .map(moduleLabel)
              .join(", ") || "None selected",
        },
        {
          label: "Architecture",
          value: `${recommendation.view.nodes.length} components · ${recommendation.view.edges.length} connections`,
        },
      ],
      summary: summariseProject(state, recommendation),
      createdAt: new Date().toISOString(),
    });

    router.push("/contact?from=build");
  }

  function reset() {
    clear();
    setStep(1);
    setToast("Project reset.");
  }

  return (
    <div className="flex flex-col gap-8">
      {/* -------- Progress -------- */}
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-mono text-[0.6875rem] tracking-[0.14em] text-accent uppercase">
            Step {step} of {STEPS.length}
          </span>
          <span className="font-mono text-[0.6875rem] text-fg-subtle">
            {STEPS[step - 1]?.hint}
          </span>
        </div>

        {/* The visible bar is 4px, but the button itself is padded to a real
            tap target — a 4px hit area is unusable on a touch screen. */}
        <div className="-my-2 flex gap-1.5">
          {STEPS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                // Backwards only — jumping ahead would skip required answers.
                if (s.id < step) setStep(s.id);
              }}
              disabled={s.id > step}
              aria-label={`Step ${s.id}: ${s.title}`}
              aria-current={s.id === step ? "step" : undefined}
              className={cn(
                "group flex flex-1 items-center py-2",
                s.id < step ? "cursor-pointer" : "cursor-default",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "h-1 w-full rounded-full transition-colors duration-500",
                  s.id < step && "bg-primary/60 group-hover:bg-primary",
                  s.id === step && "bg-linear-to-r from-primary to-accent",
                  s.id > step && "bg-line",
                )}
              />
            </button>
          ))}
        </div>
      </div>

      {/* -------- Step body -------- */}
      <div className="min-h-[22rem]">
        <h2 className="mb-6 text-2xl font-semibold text-fg sm:text-3xl">
          {STEPS[step - 1]?.title}
        </h2>

        {step === 1 ? (
          <OptionCards
            columns={3}
            selected={state.projectType}
            onChange={(value) =>
              setState((c) => ({
                ...c,
                projectType: value as BuilderState["projectType"],
              }))
            }
            options={PROJECT_TYPES.map((t) => ({
              value: t.value,
              label: t.label,
              description: t.description,
            }))}
          />
        ) : null}

        {step === 2 ? (
          <OptionCards
            columns={3}
            selected={state.businessSize}
            onChange={(value) =>
              setState((c) => ({
                ...c,
                businessSize: value as BuilderState["businessSize"],
              }))
            }
            options={BUSINESS_SIZES.map((s) => ({
              value: s.value,
              label: s.label,
              description: s.description,
            }))}
          />
        ) : null}

        {step === 3 ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-fg-muted">
              Select what the system needs to do. Anything essential to your
              project type is added automatically at the end, so nothing
              critical can be left out by accident.
            </p>
            <MultiSelect
              columns={3}
              selected={state.modules}
              onChange={(modules) =>
                setState((c) => ({ ...c, modules: modules as ModuleId[] }))
              }
              options={MODULES.map((m) => ({
                value: m.value,
                label: m.label,
                description: m.description,
              }))}
            />
          </div>
        ) : null}

        {step === 4 ? (
          <OptionCards
            columns={3}
            selected={state.infrastructure}
            onChange={(value) =>
              setState((c) => ({
                ...c,
                infrastructure: value as BuilderState["infrastructure"],
              }))
            }
            options={INFRASTRUCTURES.map((i) => ({
              value: i.value,
              label: i.label,
              description: i.description,
            }))}
          />
        ) : null}

        {step === 5 && recommendation ? (
          <div className="flex flex-col gap-10">
            {/* Summary bar */}
            <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
              <div className="flex flex-col gap-2 bg-surface p-5">
                <span className="font-mono text-[0.625rem] tracking-[0.14em] text-fg-subtle uppercase">
                  Recommended solution
                </span>
                <Link
                  href={`/solutions/${recommendation.solutionSlug}`}
                  className="text-base font-semibold text-fg transition-colors hover:text-accent"
                >
                  {recommendation.solution}
                </Link>
              </div>

              <div className="flex flex-col gap-2 bg-surface p-5">
                <span className="font-mono text-[0.625rem] tracking-[0.14em] text-fg-subtle uppercase">
                  Complexity
                </span>
                <span>
                  <Badge tone={COMPLEXITY_TONE[recommendation.complexity]} dot>
                    {recommendation.complexity}
                  </Badge>
                </span>
              </div>

              <div className="flex flex-col gap-2 bg-surface p-5">
                <span className="font-mono text-[0.625rem] tracking-[0.14em] text-fg-subtle uppercase">
                  Indicative cost
                </span>
                <span className="text-base font-semibold text-fg">
                  Custom scope required
                </span>
              </div>
            </div>

            <p className="max-w-3xl text-base leading-relaxed text-fg-muted">
              {recommendation.summary}
            </p>

            {/* Live architecture */}
            <section className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <h3 className="text-xl font-semibold text-fg">
                  Recommended digital architecture
                </h3>
                <p className="text-sm text-fg-muted">
                  {recommendation.view.description}
                </p>
              </div>

              <ArchitectureGraph view={recommendation.view} />
            </section>

            {/* Simulator */}
            <section className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <h3 className="text-xl font-semibold text-fg">
                  Live project simulator
                </h3>
                <p className="text-sm text-fg-muted">
                  Add or remove a module and the architecture above rebuilds —
                  new components, new connections, recalculated complexity.
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
                  <span className="font-mono text-[0.625rem] tracking-[0.14em] text-fg-subtle uppercase">
                    Modules
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {MODULES.map((module) => {
                      const isRequired = recommendation.requiredModules.includes(
                        module.value,
                      );
                      const isActive =
                        isRequired || state.modules.includes(module.value);

                      return (
                        <button
                          key={module.value}
                          type="button"
                          disabled={isRequired}
                          onClick={() => toggleModule(module.value)}
                          title={
                            isRequired
                              ? "Required for this project type"
                              : undefined
                          }
                          className={cn(
                            "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors duration-200",
                            isRequired
                              ? "cursor-not-allowed border-primary/40 bg-primary/10 text-accent opacity-80"
                              : isActive
                                ? "cursor-pointer border-primary/50 bg-primary/12 text-accent hover:border-signal-down/50 hover:text-signal-down"
                                : "cursor-pointer border-line bg-surface-sunken text-fg-subtle hover:border-primary/40 hover:text-fg",
                          )}
                        >
                          {isRequired ? (
                            <Check aria-hidden="true" className="size-3" />
                          ) : isActive ? (
                            <Minus aria-hidden="true" className="size-3" />
                          ) : (
                            <Plus aria-hidden="true" className="size-3" />
                          )}
                          {module.label}
                        </button>
                      );
                    })}
                  </div>

                  <p className="mt-1 text-xs text-fg-subtle">
                    Modules marked with a tick are required for this project
                    type and cannot be removed.
                  </p>
                </div>

                <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface-sunken p-5">
                  <span className="font-mono text-[0.625rem] tracking-[0.14em] text-fg-subtle uppercase">
                    Worth considering
                  </span>
                  {recommendation.suggestedModules.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {recommendation.suggestedModules.map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleModule(id)}
                          className="flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-line-strong px-2.5 py-1.5 text-xs text-fg-muted transition-colors hover:border-primary/50 hover:text-accent"
                        >
                          <Plus aria-hidden="true" className="size-3" />
                          {moduleLabel(id)}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-fg-subtle">
                      Nothing obvious is missing from this configuration.
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Considerations */}
            <section className="flex flex-col gap-4">
              <h3 className="text-xl font-semibold text-fg">
                Engineering considerations
              </h3>
              <ul className="flex flex-col gap-2.5">
                {recommendation.considerations.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 rounded-lg border border-line bg-surface p-4"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1.5 size-1 shrink-0 rounded-full bg-primary"
                    />
                    <span className="text-sm leading-relaxed text-fg-muted">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Next step */}
            <section className="flex flex-col gap-4 rounded-xl border border-primary/30 bg-primary/[0.06] p-6 sm:p-7">
              <span className="font-mono text-[0.625rem] tracking-[0.14em] text-accent uppercase">
                Next step
              </span>
              <p className="max-w-3xl text-base leading-relaxed text-fg-muted">
                {recommendation.nextStep}
              </p>

              <div className="mt-1 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
                <Button onClick={sendToContact} withArrow>
                  Discuss this architecture with BDS
                </Button>
                <Button variant="secondary" onClick={copySummary}>
                  <Copy aria-hidden="true" className="size-3.5" />
                  Copy project summary
                </Button>
                <Button variant="ghost" onClick={reset}>
                  <RotateCcw aria-hidden="true" className="size-3.5" />
                  Reset project
                </Button>
              </div>
            </section>
          </div>
        ) : null}
      </div>

      {/* -------- Navigation -------- */}
      {step < 5 ? (
        <div className="flex items-center justify-between gap-4 border-t border-line pt-6">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            <ArrowLeft aria-hidden="true" className="size-3.5" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            {step === 3 && state.modules.length === 0 ? (
              <span className="hidden text-xs text-fg-subtle sm:block">
                You can skip this — essentials are added automatically.
              </span>
            ) : null}
            <Button onClick={next} disabled={!canAdvance}>
              {step === 4 ? "Generate architecture" : "Continue"}
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 border-t border-line pt-6">
          <Button variant="ghost" onClick={() => setStep(4)}>
            <ArrowLeft aria-hidden="true" className="size-3.5" />
            Change answers
          </Button>
          <LinkButton href="/consultant" variant="secondary">
            Talk it through instead
          </LinkButton>
        </div>
      )}

      <Toast
        open={toast !== null}
        message={toast ?? ""}
        tone="success"
        onClose={() => setToast(null)}
      />
    </div>
  );
}
