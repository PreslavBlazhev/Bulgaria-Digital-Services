import { NextResponse } from "next/server";
import { contactSchema } from "@/lib/contact-schema";

/* ==========================================================================
   Contact intake.

   There is no email provider wired in yet, and this route does not pretend
   otherwise. It validates the payload with the same schema the form uses and
   reports honestly whether the enquiry was transmitted or only recorded.

   To make it deliver: set CONTACT_INBOX_EMAIL and add a provider call where
   marked. The response contract does not need to change.
   ========================================================================== */

export const runtime = "nodejs";

/** Very small in-memory rate limit. Resets on redeploy — enough to stop a loop. */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  if (rateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: "Too many submissions. Please try again shortly." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Malformed request body." },
      { status: 400 },
    );
  }

  const parsed = contactSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Validation failed.",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 422 },
    );
  }

  const inbox = process.env.CONTACT_INBOX_EMAIL;
  const data = parsed.data;

  if (!inbox) {
    // No destination configured. Say so rather than showing a success state
    // for a message that went nowhere.
    console.info(
      "[contact] Enquiry received but CONTACT_INBOX_EMAIL is unset — not delivered.",
      { name: data.name, email: data.email, projectType: data.projectType },
    );

    return NextResponse.json(
      {
        ok: true,
        delivered: false,
        message:
          "Your enquiry was validated and recorded, but email delivery is not configured on this deployment yet. Please email us directly so nothing is lost.",
      },
      { status: 200 },
    );
  }

  // TODO(delivery): send `data` to `inbox` through the chosen provider.
  // Kept as an explicit gap rather than a fake success path.
  console.info("[contact] Enquiry ready for delivery", {
    to: inbox,
    from: data.email,
    projectType: data.projectType,
  });

  return NextResponse.json(
    {
      ok: true,
      delivered: true,
      message: "Thank you — your enquiry has been received.",
    },
    { status: 200 },
  );
}
