"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Info, X } from "lucide-react";
import {
  BUDGET_OPTIONS,
  FEATURE_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  TIMELINE_OPTIONS,
  contactSchema,
  type ContactInput,
} from "@/lib/contact-schema";
import { useHandoff } from "@/hooks/useHandoff";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/Button";
import { FormField, TextArea, TextInput } from "@/components/ui/FormField";
import { Select } from "@/components/ui/Select";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { SITE } from "@/lib/site";

type SubmitState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "done"; delivered: boolean; message: string }
  | { status: "error"; message: string };

export function ContactForm() {
  const [storedHandoff, clearStoredHandoff] = useHandoff();
  const [detached, setDetached] = useState(false);
  const handoff = detached ? null : storedHandoff;

  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
  });
  const [touchedOnce, setTouchedOnce] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      company: "",
      email: "",
      phone: "",
      projectType: undefined,
      budget: undefined,
      timeline: undefined,
      situation: "",
      goals: "",
      features: [],
      context: "",
      attachedSummary: "",
      website: "",
    },
  });

  function detachSummary() {
    clearStoredHandoff();
    setDetached(true);
  }

  async function onSubmit(values: ContactInput) {
    // The attached summary is not a form field — it is merged at submit time
    // from whatever handoff is currently shown.
    const payload: ContactInput = {
      ...values,
      attachedSummary: handoff?.summary ?? "",
    };

    setSubmitState({ status: "sending" });
    track("contact_submitted", {
      projectType: String(values.projectType ?? ""),
      hasSummary: Boolean(payload.attachedSummary),
    });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as {
        ok: boolean;
        delivered?: boolean;
        message?: string;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        setSubmitState({
          status: "error",
          message:
            result.error ??
            "Something went wrong sending your enquiry. Please email us directly.",
        });
        return;
      }

      setSubmitState({
        status: "done",
        delivered: Boolean(result.delivered),
        message: result.message ?? "Your enquiry has been received.",
      });
    } catch {
      setSubmitState({
        status: "error",
        message:
          "The request could not be sent. Please check your connection or email us directly.",
      });
    }
  }

  function onFirstInteraction() {
    if (touchedOnce) return;
    setTouchedOnce(true);
    track("contact_started");
  }

  /* ---------------- Success state ---------------- */
  if (submitState.status === "done") {
    return (
      <div className="flex flex-col items-start gap-5 rounded-xl border border-signal-ok/35 bg-signal-ok/[0.06] p-8">
        <span className="grid size-11 place-items-center rounded-full border border-signal-ok/40 bg-signal-ok/10 text-signal-ok">
          <CheckCircle2 aria-hidden="true" className="size-5" />
        </span>

        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-fg">
            {submitState.delivered
              ? "Enquiry received"
              : "Enquiry validated"}
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-fg-muted">
            {submitState.message}
          </p>
        </div>

        {!submitState.delivered ? (
          <a
            href={`mailto:${SITE.email}`}
            className="text-sm font-medium text-accent underline underline-offset-4 hover:text-primary"
          >
            {SITE.email}
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      onChange={onFirstInteraction}
      noValidate
      className="flex flex-col gap-8"
    >
      {/* ---------------- Attached summary ---------------- */}
      {handoff ? (
        <section className="rounded-xl border border-primary/35 bg-primary/[0.06] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Info
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-accent"
              />
              <div className="flex flex-col gap-1">
                <h2 className="text-sm font-semibold text-fg">
                  {handoff.title}
                </h2>
                <p className="text-xs text-fg-muted">
                  Carried over from the{" "}
                  {handoff.source === "builder"
                    ? "Solution Architect"
                    : "project consultant"}
                  . It will be sent with your enquiry.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={detachSummary}
              aria-label="Remove attached summary"
              className="shrink-0 cursor-pointer rounded p-1 text-fg-subtle transition-colors hover:text-fg"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </div>

          <dl className="mt-4 grid gap-3 border-t border-primary/20 pt-4 sm:grid-cols-2">
            {handoff.facts.map((fact) => (
              <div key={fact.label} className="flex flex-col gap-0.5">
                <dt className="font-mono text-[0.625rem] tracking-[0.12em] text-fg-subtle uppercase">
                  {fact.label}
                </dt>
                <dd className="text-sm text-fg-muted">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {/* ---------------- About you ---------------- */}
      <fieldset className="flex flex-col gap-5">
        <legend className="mb-1 font-mono text-[0.625rem] tracking-[0.14em] text-accent uppercase">
          About you
        </legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Name" required error={errors.name?.message}>
            {({ id, describedBy, invalid }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                autoComplete="name"
                placeholder="Your name"
                {...register("name")}
              />
            )}
          </FormField>

          <FormField label="Company" error={errors.company?.message}>
            {({ id, describedBy, invalid }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                autoComplete="organization"
                placeholder="Business name"
                {...register("company")}
              />
            )}
          </FormField>

          <FormField label="Email" required error={errors.email?.message}>
            {({ id, describedBy, invalid }) => (
              <TextInput
                id={id}
                type="email"
                aria-describedby={describedBy}
                invalid={invalid}
                autoComplete="email"
                placeholder="you@company.com"
                {...register("email")}
              />
            )}
          </FormField>

          <FormField label="Phone" error={errors.phone?.message}>
            {({ id, describedBy, invalid }) => (
              <TextInput
                id={id}
                type="tel"
                aria-describedby={describedBy}
                invalid={invalid}
                autoComplete="tel"
                placeholder="+359 …"
                {...register("phone")}
              />
            )}
          </FormField>
        </div>
      </fieldset>

      {/* ---------------- The project ---------------- */}
      <fieldset className="flex flex-col gap-5">
        <legend className="mb-1 font-mono text-[0.625rem] tracking-[0.14em] text-accent uppercase">
          The project
        </legend>

        <div className="grid gap-5 sm:grid-cols-3">
          <FormField
            label="Project type"
            required
            error={errors.projectType?.message}
          >
            {({ id, describedBy, invalid }) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                placeholder="Select…"
                options={[...PROJECT_TYPE_OPTIONS]}
                {...register("projectType")}
              />
            )}
          </FormField>

          <FormField
            label="Budget range"
            required
            error={errors.budget?.message}
          >
            {({ id, describedBy, invalid }) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                placeholder="Select…"
                options={[...BUDGET_OPTIONS]}
                {...register("budget")}
              />
            )}
          </FormField>

          <FormField
            label="Timeline"
            required
            error={errors.timeline?.message}
          >
            {({ id, describedBy, invalid }) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                placeholder="Select…"
                options={[...TIMELINE_OPTIONS]}
                {...register("timeline")}
              />
            )}
          </FormField>
        </div>

        <FormField
          label="Current situation"
          required
          hint="What exists today, and which part of it is costing you the most time or money?"
          error={errors.situation?.message}
        >
          {({ id, describedBy, invalid }) => (
            <TextArea
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              placeholder="We take orders by phone during service and write them down…"
              {...register("situation")}
            />
          )}
        </FormField>

        <FormField
          label="Project goals"
          required
          hint="What would make this clearly worth doing?"
          error={errors.goals?.message}
        >
          {({ id, describedBy, invalid }) => (
            <TextArea
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              placeholder="Stop paying commission on every order and own the customer relationship…"
              {...register("goals")}
            />
          )}
        </FormField>

        <div className="flex flex-col gap-2.5">
          <span className="text-sm font-medium text-fg">
            Required features
            <span className="ml-1.5 text-xs font-normal text-fg-subtle">
              optional
            </span>
          </span>
          <Controller
            control={control}
            name="features"
            render={({ field }) => (
              <MultiSelect
                columns={3}
                options={[...FEATURE_OPTIONS]}
                selected={field.value ?? []}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        <FormField
          label="Additional context"
          hint="Anything else that matters — constraints, deadlines, existing suppliers."
          error={errors.context?.message}
        >
          {({ id, describedBy, invalid }) => (
            <TextArea
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              {...register("context")}
            />
          )}
        </FormField>
      </fieldset>

      {/* Honeypot — visually and semantically hidden from real users. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website-field">Website</label>
        <input
          id="website-field"
          tabIndex={-1}
          autoComplete="off"
          {...register("website")}
        />
      </div>

      {submitState.status === "error" ? (
        <p
          role="alert"
          className="rounded-lg border border-signal-down/40 bg-signal-down/[0.07] px-4 py-3 text-sm text-signal-down"
        >
          {submitState.message}
        </p>
      ) : null}

      <div className="flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-xs leading-relaxed text-fg-subtle">
          We reply to every enquiry. If BDS is not the right fit for what you
          need, the reply will say so and point you somewhere better.
        </p>

        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting || submitState.status === "sending"}
          withArrow
          className="shrink-0"
        >
          {submitState.status === "sending" ? "Sending…" : "Send enquiry"}
        </Button>
      </div>
    </form>
  );
}
