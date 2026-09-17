import type { InterfaceScreen } from "@/types";
import { cn } from "@/lib/cn";

/* ==========================================================================
   Interface previews.

   These are DOM/CSS constructions, not screenshots. That is deliberate: they
   stay sharp at any size, cost no image request, adapt to the viewport, and
   cannot become stale relative to the product.

   REPLACEABLE: when real product screenshots are supplied, swap the body of
   each variant for an <Image>. The surrounding chrome can stay.
   ========================================================================== */

export function ScreenMock({ screen }: { screen: InterfaceScreen }) {
  return (
    <figure className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl border border-line bg-surface-sunken">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-line bg-surface px-4 py-2.5">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="size-2 rounded-full bg-line-strong" />
            <span className="size-2 rounded-full bg-line-strong" />
            <span className="size-2 rounded-full bg-line-strong" />
          </span>
          <span className="ml-2 truncate font-mono text-[0.625rem] tracking-wider text-fg-subtle">
            {screen.title}
          </span>
        </div>

        <div className="p-4 sm:p-5">
          <MockBody variant={screen.mock} />
        </div>
      </div>

      <figcaption className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-fg">{screen.title}</span>
        <span className="text-sm leading-relaxed text-fg-muted">
          {screen.description}
        </span>
      </figcaption>
    </figure>
  );
}

/* -------------------------------------------------------------------------- */

function MockBody({ variant }: { variant: InterfaceScreen["mock"] }) {
  switch (variant) {
    case "menu":
      return <MenuMock />;
    case "checkout":
      return <CheckoutMock />;
    case "admin":
      return <AdminMock />;
    case "kitchen":
      return <KitchenMock />;
    case "course":
      return <CourseMock />;
    case "dashboard":
      return <DashboardMock />;
  }
}

const Bar = ({ w, tone = "muted" }: { w: string; tone?: "muted" | "faint" | "accent" }) => (
  <span
    aria-hidden="true"
    className={cn(
      "block h-1.5 rounded-full",
      tone === "muted" && "bg-line-strong",
      tone === "faint" && "bg-line",
      tone === "accent" && "bg-primary/60",
    )}
    style={{ width: w }}
  />
);

function MenuMock() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5">
        {["Pizza", "Pasta", "Salads", "Drinks"].map((c, i) => (
          <span
            key={c}
            className={cn(
              "rounded px-2 py-1 text-[0.625rem] font-medium",
              i === 0
                ? "bg-primary/18 text-accent"
                : "border border-line text-fg-subtle",
            )}
          >
            {c}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-md border border-line bg-surface p-2.5"
          >
            <span
              aria-hidden="true"
              className="h-10 rounded bg-linear-to-br from-line to-surface-sunken"
            />
            <Bar w="72%" />
            <div className="flex items-center justify-between gap-2">
              <Bar w="34%" tone="faint" />
              <span className="font-mono text-[0.5625rem] text-accent">
                €{(8 + i * 1.5).toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CheckoutMock() {
  return (
    <div className="grid gap-3 sm:grid-cols-[1.2fr_1fr]">
      <div className="flex flex-col gap-2.5">
        {["Name", "Phone", "Address", "Notes"].map((label) => (
          <div key={label} className="flex flex-col gap-1">
            <span className="text-[0.5625rem] text-fg-subtle">{label}</span>
            <span
              aria-hidden="true"
              className="h-6 rounded border border-line bg-surface"
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-line bg-surface p-3">
        <span className="font-mono text-[0.5625rem] tracking-wider text-fg-subtle uppercase">
          Summary
        </span>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <Bar w="52%" tone="faint" />
            <span className="font-mono text-[0.5625rem] text-fg-muted">
              €{(9 + i * 2).toFixed(2)}
            </span>
          </div>
        ))}
        <span aria-hidden="true" className="my-1 h-px bg-line" />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[0.625rem] font-medium text-fg">Total</span>
          <span className="font-mono text-[0.6875rem] font-semibold text-accent">
            €33.00
          </span>
        </div>
        <span className="mt-1 rounded bg-primary/20 py-1.5 text-center text-[0.5625rem] font-medium text-accent">
          Server-verified
        </span>
      </div>
    </div>
  );
}

function AdminMock() {
  return (
    <div className="grid gap-2.5 sm:grid-cols-[80px_1fr]">
      <div className="hidden flex-col gap-1.5 sm:flex">
        {["Orders", "Menu", "Staff", "Hours", "Reports"].map((item, i) => (
          <span
            key={item}
            className={cn(
              "rounded px-1.5 py-1 text-[0.5625rem]",
              i === 0 ? "bg-primary/18 text-accent" : "text-fg-subtle",
            )}
          >
            {item}
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-4 gap-1.5 border-b border-line pb-1.5 font-mono text-[0.5rem] tracking-wider text-fg-subtle uppercase">
          <span>Order</span>
          <span>Items</span>
          <span>Status</span>
          <span className="text-right">Total</span>
        </div>
        {[
          { id: "#1284", status: "Preparing", tone: "warn" },
          { id: "#1283", status: "Ready", tone: "ok" },
          { id: "#1282", status: "Completed", tone: "muted" },
          { id: "#1281", status: "Completed", tone: "muted" },
        ].map((row, i) => (
          <div
            key={row.id}
            className="grid grid-cols-4 items-center gap-1.5 rounded bg-surface px-1.5 py-1.5"
          >
            <span className="font-mono text-[0.5625rem] text-fg-muted">
              {row.id}
            </span>
            <Bar w="60%" tone="faint" />
            <span
              className={cn(
                "text-[0.5625rem]",
                row.tone === "warn" && "text-signal-warn",
                row.tone === "ok" && "text-signal-ok",
                row.tone === "muted" && "text-fg-subtle",
              )}
            >
              {row.status}
            </span>
            <span className="text-right font-mono text-[0.5625rem] text-fg-muted">
              €{(24 + i * 6).toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function KitchenMock() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {[
        { id: "#1284", state: "New", tone: "accent" },
        { id: "#1283", state: "Preparing", tone: "warn" },
        { id: "#1282", state: "Ready", tone: "ok" },
      ].map((order) => (
        <div
          key={order.id}
          className={cn(
            "flex flex-col gap-2 rounded-md border bg-surface p-2.5",
            order.tone === "accent" && "border-primary/50",
            order.tone === "warn" && "border-signal-warn/40",
            order.tone === "ok" && "border-signal-ok/40",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[0.5625rem] text-fg-muted">
              {order.id}
            </span>
            <span
              className={cn(
                "text-[0.5rem] font-medium tracking-wider uppercase",
                order.tone === "accent" && "text-accent",
                order.tone === "warn" && "text-signal-warn",
                order.tone === "ok" && "text-signal-ok",
              )}
            >
              {order.state}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <Bar w="86%" tone="faint" />
            <Bar w="64%" tone="faint" />
            <Bar w="72%" tone="faint" />
          </div>
          <span className="mt-auto rounded bg-surface-sunken py-1 text-center text-[0.5rem] text-fg-subtle">
            Print ticket
          </span>
        </div>
      ))}
    </div>
  );
}

function CourseMock() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-md border border-line bg-surface p-2.5"
        >
          <span
            aria-hidden="true"
            className="h-12 rounded bg-linear-to-br from-primary/25 to-surface-sunken"
          />
          <Bar w="80%" />
          <Bar w="55%" tone="faint" />
          <div className="mt-1 flex items-center justify-between">
            <span className="font-mono text-[0.5625rem] text-accent">
              €{[180, 260, 420][i]}
            </span>
            <span className="rounded bg-primary/18 px-1.5 py-0.5 text-[0.5rem] text-accent">
              Enrol
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function DashboardMock() {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Enrolments", value: "128" },
          { label: "Revenue", value: "€24k" },
          { label: "Active", value: "94" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col gap-1 rounded-md border border-line bg-surface p-2.5"
          >
            <span className="text-[0.5rem] tracking-wider text-fg-subtle uppercase">
              {stat.label}
            </span>
            <span className="font-display text-sm font-semibold text-fg">
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      <div className="flex h-16 items-end gap-1 rounded-md border border-line bg-surface p-2.5">
        {[38, 52, 44, 68, 58, 82, 74, 92, 66, 78].map((h, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="flex-1 rounded-t bg-linear-to-t from-primary/30 to-primary/70"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}
