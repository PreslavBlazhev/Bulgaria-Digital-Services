import {
  buildRecommendation,
  moduleLabel,
  type BusinessSize,
  type Infrastructure,
  type ModuleId,
  type ProjectType,
} from "./builder-engine";

/* ==========================================================================
   BDS Digital Project Consultant — conversation engine.

   This is a qualification instrument, not a chatbot. It asks the questions a
   scoping call asks, in the order that makes each answer useful, and stops
   when it has enough to produce a structured brief.

   The engine is a pure function over conversation state. Everything that
   would need to change for a model-backed implementation lives behind
   `ConsultantEngine` — the UI talks to that interface and knows nothing about
   which implementation is answering.
   ========================================================================== */

export type Speaker = "consultant" | "user";

export interface ConsultantMessage {
  id: string;
  speaker: Speaker;
  text: string;
}

export interface ConsultantState {
  messages: ConsultantMessage[];
  /** Answers keyed by question id. */
  facts: Record<string, string>;
  askedIds: string[];
  /** The question awaiting an answer, if any. */
  pendingId: string | null;
  complete: boolean;
}

export interface ProjectBrief {
  businessType: string;
  locations: string;
  primaryGoal: string;
  recommendedSolution: string;
  solutionSlug: string;
  requiredModules: string[];
  optionalModules: string[];
  integrations: string[];
  complexity: string;
  risks: string[];
  nextStep: string;
}

export interface ConsultantEngine {
  /** Opening turn, before any user input. */
  greet(): ConsultantState;
  /** Advance the conversation with a user message. */
  respond(state: ConsultantState, input: string): Promise<ConsultantState>;
  /** Available once `state.complete` is true. */
  brief(state: ConsultantState): ProjectBrief | null;
  /** Prompts offered under the input for the current turn. */
  suggestions(state: ConsultantState): string[];
}

/* -------------------------------------------------------------------------- */
/* Domain classification                                                       */
/* -------------------------------------------------------------------------- */

type Domain =
  | "restaurant"
  | "commerce"
  | "education"
  | "services"
  | "internal"
  | "general";

const DOMAIN_KEYWORDS: Record<Domain, string[]> = {
  restaurant: [
    "restaurant", "pizza", "pizzeria", "cafe", "café", "bar", "kitchen",
    "menu", "food", "takeaway", "delivery", "bistro", "diner", "catering",
  ],
  commerce: [
    "shop", "store", "ecommerce", "e-commerce", "sell", "selling", "product",
    "products", "catalogue", "catalog", "retail", "inventory", "stock",
  ],
  education: [
    "course", "courses", "academy", "training", "teach", "teaching", "school",
    "student", "students", "lesson", "lessons", "workshop", "learning",
  ],
  services: [
    "salon", "clinic", "booking", "appointment", "appointments", "barber",
    "spa", "consultation", "studio", "therapist", "schedule",
  ],
  internal: [
    "internal", "dashboard", "admin", "operations", "staff", "employees",
    "workflow", "erp", "crm", "portal", "back office", "back-office",
  ],
  general: [],
};

function classify(text: string): Domain {
  const lower = text.toLowerCase();
  let best: Domain = "general";
  let bestScore = 0;

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS) as [
    Domain,
    string[],
  ][]) {
    const score = keywords.reduce(
      (sum, keyword) => (lower.includes(keyword) ? sum + 1 : sum),
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      best = domain;
    }
  }

  return best;
}

function isAffirmative(text: string): boolean {
  return /\b(yes|yeah|yep|sure|definitely|absolutely|we do|i do|correct|right|da|да)\b/i.test(
    text,
  );
}

function isNegative(text: string): boolean {
  return /\b(no|nope|not really|we don'?t|i don'?t|never|ne|не)\b/i.test(text);
}

function mentionsMultiple(text: string): boolean {
  return /\b(two|three|four|five|several|multiple|locations|branches|venues|sites|\d+\s*(locations|branches|venues|shops|stores))\b/i.test(
    text,
  );
}

/* -------------------------------------------------------------------------- */
/* Question flow                                                               */
/* -------------------------------------------------------------------------- */

interface Question {
  id: string;
  prompt: string;
  suggestions?: string[];
}

const OPENING: Question = {
  id: "opening",
  prompt:
    "Tell me what you are trying to build, and a little about the business behind it. The more concrete the better — what it does, roughly how big it is, and what is not working today.",
  suggestions: [
    "I own a restaurant with two locations and want my own ordering platform.",
    "We sell products through a marketplace and want our own shop.",
    "I run a training academy and enrolment is all done by messages.",
    "Our team runs everything on spreadsheets and it has stopped scaling.",
  ],
};

const COMMON_TAIL: Question[] = [
  {
    id: "goal",
    prompt:
      "What would make this project clearly worth doing? One outcome — the thing you would point at in a year and say it paid for itself.",
    suggestions: [
      "Stop paying commission on every order",
      "Take the manual admin work out of the week",
      "Sell without a conversation for every sale",
      "See what is actually happening in the business",
    ],
  },
  {
    id: "existing",
    prompt:
      "What exists today? A website, a legacy system, a set of subscriptions, a marketplace listing — or nothing yet?",
    suggestions: [
      "Nothing yet",
      "A website that does nothing operational",
      "Several tools that do not talk to each other",
      "We depend on a marketplace",
    ],
  },
];

const DOMAIN_QUESTIONS: Record<Domain, Question[]> = {
  restaurant: [
    {
      id: "locations",
      prompt:
        "How many venues are we talking about, and do they all run the same menu?",
      suggestions: [
        "One venue",
        "Two venues, same menu",
        "Several venues with different menus",
      ],
    },
    {
      id: "delivery",
      prompt:
        "Do you deliver with your own drivers, use a courier service, or is it collection only?",
      suggestions: ["Our own drivers", "A courier service", "Collection only"],
    },
    {
      id: "payments",
      prompt:
        "Do you need card payments online, or is cash on delivery still how most orders are paid?",
      suggestions: [
        "Card payments online",
        "Mostly cash on delivery",
        "Both, depending on the order",
      ],
    },
    {
      id: "kitchen",
      prompt:
        "Does the kitchen need its own order screen, or would printed tickets be enough?",
      suggestions: [
        "A dedicated kitchen screen",
        "Printed tickets are enough",
        "Both — screen and printer",
      ],
    },
    {
      id: "accounts",
      prompt:
        "Do you want customer accounts with saved addresses and order history, or should ordering work without signing up?",
      suggestions: [
        "Accounts with order history",
        "Guest ordering, no accounts",
        "Both options",
      ],
    },
  ],
  commerce: [
    {
      id: "catalogue",
      prompt:
        "Roughly how many products, and do they have variants — sizes, colours, options?",
      suggestions: [
        "Under fifty, no variants",
        "A few hundred with variants",
        "Large catalogue, many variants",
      ],
    },
    {
      id: "payments",
      prompt:
        "How should customers pay — card online, bank transfer, cash on delivery, or a mix?",
      suggestions: ["Card online", "Cash on delivery", "A mix of methods"],
    },
    {
      id: "fulfilment",
      prompt:
        "How do orders get to customers, and does that need to connect to a courier system?",
      suggestions: [
        "Courier integration needed",
        "We ship manually",
        "Local delivery only",
      ],
    },
    {
      id: "accounts",
      prompt:
        "Do customers need accounts with order history and repeat ordering?",
      suggestions: ["Yes, accounts", "Guest checkout is fine"],
    },
    {
      id: "locations",
      prompt:
        "Is this one business selling one range, or several brands, warehouses or locations?",
      suggestions: ["One business, one range", "Multiple brands or locations"],
    },
  ],
  education: [
    {
      id: "delivery-mode",
      prompt:
        "Are the courses delivered online, in person, or a mix of both?",
      suggestions: ["Online", "In person", "A mix"],
    },
    {
      id: "payments",
      prompt:
        "Should students be able to pay on the site, or is payment arranged separately?",
      suggestions: [
        "Pay on the site",
        "Payment arranged separately",
        "Deposit online, balance later",
      ],
    },
    {
      id: "accounts",
      prompt:
        "Do students need accounts to access material after purchase, or is access sent by email?",
      suggestions: [
        "Accounts with course access",
        "Access sent by email",
      ],
    },
    {
      id: "scheduling",
      prompt:
        "Are there fixed dates and limited places, meaning the system has to manage availability?",
      suggestions: [
        "Yes, fixed dates and places",
        "No, self-paced",
      ],
    },
    {
      id: "locations",
      prompt: "Is this one academy, or several trainers and locations?",
      suggestions: ["One academy", "Several trainers or locations"],
    },
  ],
  services: [
    {
      id: "booking",
      prompt:
        "Should clients book appointments themselves, and does that need to respect individual staff calendars?",
      suggestions: [
        "Self-booking with staff calendars",
        "Self-booking, one shared calendar",
        "Requests only, we confirm",
      ],
    },
    {
      id: "payments",
      prompt:
        "Do you need deposits or full payment at booking, or is payment taken in person?",
      suggestions: ["Deposits online", "Full payment online", "Paid in person"],
    },
    {
      id: "accounts",
      prompt:
        "Do returning clients need accounts with their history and previous bookings?",
      suggestions: ["Yes, client accounts", "No, booking without accounts"],
    },
    {
      id: "locations",
      prompt: "One location, or several branches and teams?",
      suggestions: ["One location", "Several branches"],
    },
  ],
  internal: [
    {
      id: "process",
      prompt:
        "Which single process is costing the most time right now? Be specific — the one somebody complains about weekly.",
      suggestions: [
        "Order and job tracking",
        "Reporting and reconciliation",
        "Client communication and status",
      ],
    },
    {
      id: "users",
      prompt:
        "Who uses this — how many people, and do different roles need different access?",
      suggestions: [
        "A small team, same access",
        "Several roles with different permissions",
        "Staff plus external clients",
      ],
    },
    {
      id: "integrations",
      prompt:
        "Does it need to connect to anything you already run — accounting, CRM, a supplier system?",
      suggestions: [
        "Accounting integration",
        "CRM integration",
        "Nothing to connect yet",
      ],
    },
    {
      id: "reporting",
      prompt:
        "Do you need operational reporting out of it, or is the day-to-day working view enough?",
      suggestions: ["Reporting is essential", "Working view is enough"],
    },
    {
      id: "locations",
      prompt: "One site or team, or several?",
      suggestions: ["One", "Several"],
    },
  ],
  general: [
    {
      id: "process",
      prompt:
        "What does the business actually do day to day, and which part of it is currently the most manual?",
    },
    {
      id: "users",
      prompt:
        "Who would use this system — customers, staff, or both? And roughly how many people?",
      suggestions: ["Customers", "Staff", "Both"],
    },
    {
      id: "payments",
      prompt: "Does money change hands through this system at any point?",
      suggestions: ["Yes, payments online", "No payments involved"],
    },
    {
      id: "locations",
      prompt: "One location or team, or several?",
      suggestions: ["One", "Several"],
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Rule-based engine                                                           */
/* -------------------------------------------------------------------------- */

let messageCounter = 0;
function nextId(): string {
  messageCounter += 1;
  return `m${messageCounter}-${Date.now().toString(36)}`;
}

function message(speaker: Speaker, text: string): ConsultantMessage {
  return { id: nextId(), speaker, text };
}

function questionQueue(state: ConsultantState): Question[] {
  const domain = classify(state.facts.opening ?? "");
  return [...DOMAIN_QUESTIONS[domain], ...COMMON_TAIL];
}

/**
 * Rule-based consultant.
 *
 * Deterministic by design: the same answers always produce the same brief,
 * which is what makes the output defensible in a commercial conversation.
 */
export const ruleBasedConsultant: ConsultantEngine = {
  greet(): ConsultantState {
    // Fixed ids: the greeting must render identically on the server and on the
    // client, so it cannot use the time-based id generator.
    return {
      messages: [
        {
          id: "greet-intro",
          speaker: "consultant",
          text: "I am the BDS project consultant. I will ask a handful of questions about your business and what you are trying to build, then produce a structured project brief you can send to BDS or take away.",
        },
        { id: "greet-opening", speaker: "consultant", text: OPENING.prompt },
      ],
      facts: {},
      askedIds: [OPENING.id],
      pendingId: OPENING.id,
      complete: false,
    };
  },

  async respond(state, input) {
    const trimmed = input.trim();
    if (!trimmed || state.complete) return state;

    const facts = { ...state.facts };
    if (state.pendingId) facts[state.pendingId] = trimmed;

    const withUser: ConsultantMessage[] = [
      ...state.messages,
      message("user", trimmed),
    ];

    const queue = questionQueue({ ...state, facts });
    const nextQuestion = queue.find((q) => !state.askedIds.includes(q.id));

    // Acknowledge the first answer specifically — it is the one that sets
    // the direction of everything that follows.
    const acknowledgement =
      state.pendingId === "opening"
        ? acknowledgeOpening(trimmed)
        : null;

    if (!nextQuestion) {
      return {
        messages: [
          ...withUser,
          message(
            "consultant",
            "That is enough to work with. I have put together a project brief below — recommended solution, the modules it implies, the integrations involved, complexity, and the risks worth naming before anyone quotes a price.",
          ),
        ],
        facts,
        askedIds: state.askedIds,
        pendingId: null,
        complete: true,
      };
    }

    const responses: ConsultantMessage[] = [];
    if (acknowledgement) responses.push(message("consultant", acknowledgement));
    responses.push(message("consultant", nextQuestion.prompt));

    return {
      messages: [...withUser, ...responses],
      facts,
      askedIds: [...state.askedIds, nextQuestion.id],
      pendingId: nextQuestion.id,
      complete: false,
    };
  },

  suggestions(state) {
    if (state.complete) return [];
    if (state.pendingId === OPENING.id) return OPENING.suggestions ?? [];

    const queue = questionQueue(state);
    const pending = queue.find((q) => q.id === state.pendingId);
    return pending?.suggestions ?? [];
  },

  brief(state) {
    if (!state.complete) return null;

    const opening = state.facts.opening ?? "";
    const domain = classify(opening);
    const combined = Object.values(state.facts).join(" ").toLowerCase();

    const multiLocation =
      mentionsMultiple(state.facts.locations ?? "") ||
      mentionsMultiple(opening);

    const projectType = PROJECT_TYPE_BY_DOMAIN[domain];
    const businessSize: BusinessSize = multiLocation
      ? "multi-location"
      : /\b(enterprise|corporate|group)\b/i.test(combined)
        ? "enterprise"
        : /\b(startup|just me|solo|myself)\b/i.test(combined)
          ? "solo"
          : "small";

    const infrastructure = inferInfrastructure(state.facts.existing ?? "");
    const modules = inferModules(domain, state.facts, combined);

    const recommendation = buildRecommendation({
      projectType,
      businessSize,
      modules,
      infrastructure,
    });

    if (!recommendation) return null;

    const required = Array.from(
      new Set([...recommendation.requiredModules, ...modules]),
    );

    return {
      businessType: DOMAIN_LABEL[domain],
      locations: multiLocation ? "Multiple locations" : "Single location",
      primaryGoal: state.facts.goal?.trim() || "Not stated",
      recommendedSolution: recommendation.solution,
      solutionSlug: recommendation.solutionSlug,
      requiredModules: required.map(moduleLabel),
      optionalModules: recommendation.suggestedModules.map(moduleLabel),
      integrations: inferIntegrations(required, combined),
      complexity: recommendation.complexity,
      risks: inferRisks(state.facts, multiLocation, required, infrastructure),
      nextStep: recommendation.nextStep,
    };
  },
};

const DOMAIN_LABEL: Record<Domain, string> = {
  restaurant: "Hospitality / food service",
  commerce: "Retail / e-commerce",
  education: "Education / training",
  services: "Appointment-based services",
  internal: "Internal operations",
  general: "General business",
};

const PROJECT_TYPE_BY_DOMAIN: Record<Domain, ProjectType> = {
  restaurant: "restaurant",
  commerce: "ecommerce",
  education: "ecommerce",
  services: "business-system",
  internal: "internal-tool",
  general: "business-system",
};

function acknowledgeOpening(text: string): string {
  const domain = classify(text);

  switch (domain) {
    case "restaurant":
      return "Understood — hospitality. The parts that usually decide the shape of this are how many venues share a menu, how orders reach the kitchen, and whether you are trying to reduce marketplace commission.";
    case "commerce":
      return "Understood — selling directly. The catalogue structure and where pricing authority lives matter more here than anything on the front end.";
    case "education":
      return "Understood — courses. The interesting question is usually what happens between a payment arriving and a student getting access, because that gap is where the manual work hides.";
    case "services":
      return "Understood — appointment-based. Availability modelling is where these projects succeed or fail, so I will ask about calendars before anything else.";
    case "internal":
      return "Understood — internal operations. These are the projects with the clearest return, because the current cost is measurable in hours.";
    default:
      return "Understood. I will ask a few questions to work out whether this is a presentation problem or an operations problem — the answer changes what should be built.";
  }
}

function inferInfrastructure(text: string): Infrastructure {
  const lower = text.toLowerCase();
  if (/\bnothing|none|from scratch|clean\b/.test(lower)) return "nothing";
  if (/\blegacy|old system|outdated\b/.test(lower)) return "legacy";
  if (/\bmarketplace|glovo|takeaway|platform takes\b/.test(lower)) return "marketplace";
  if (/\bdisconnect|do not talk|don'?t talk|separate systems|several tools\b/.test(lower))
    return "disconnected";
  if (/\bsaas|subscription|tools\b/.test(lower)) return "saas";
  if (/\bwebsite|site\b/.test(lower)) return "website";
  return "website";
}

function inferModules(
  domain: Domain,
  facts: Record<string, string>,
  combined: string,
): ModuleId[] {
  const modules = new Set<ModuleId>(["analytics"]);

  if (domain === "restaurant") {
    modules.add("ordering");
    modules.add("admin");
    if (!isNegative(facts.delivery ?? "") && /driver|courier|deliver/i.test(combined)) {
      modules.add("delivery");
    }
  }

  if (domain === "commerce" || domain === "education") {
    modules.add("ordering");
    modules.add("admin");
  }

  if (domain === "services") {
    modules.add("booking");
    modules.add("admin");
  }

  if (domain === "internal") {
    modules.add("operations");
    modules.add("admin");
  }

  // Payments: only when the answer actually indicates online payment.
  const paymentAnswer = facts.payments ?? "";
  if (
    /card|online|deposit|stripe|pay on the site|both/i.test(paymentAnswer) ||
    /card payment|pay online/i.test(combined)
  ) {
    modules.add("payments");
  }

  if (
    isAffirmative(facts.accounts ?? "") ||
    /account|history|sign up|login|log in/i.test(facts.accounts ?? "") ||
    /account|portal|login/i.test(combined)
  ) {
    modules.add("accounts");
  }

  if (/screen|tablet|kitchen display/i.test(facts.kitchen ?? "")) {
    modules.add("mobile");
  }

  if (/report|reconcil|analytics|numbers|visibility/i.test(combined)) {
    modules.add("reporting");
  }

  if (/accounting|crm|erp|supplier|integrat/i.test(combined)) {
    modules.add("integrations");
  }

  if (/crm/i.test(combined)) modules.add("crm");

  if (/manual|by hand|copying|admin work|automat/i.test(combined)) {
    modules.add("automation");
  }

  if (/language|bilingual|english|bulgarian|multilingual/i.test(combined)) {
    modules.add("multilingual");
  }

  if (/role|permission|different access|staff access/i.test(combined)) {
    modules.add("accounts");
  }

  return Array.from(modules);
}

function inferIntegrations(modules: ModuleId[], combined: string): string[] {
  const integrations: string[] = [];

  if (modules.includes("payments")) integrations.push("Payment provider");
  if (modules.includes("delivery")) integrations.push("Delivery or courier service");
  if (modules.includes("crm")) integrations.push("CRM platform");
  if (modules.includes("analytics")) integrations.push("GA4 with Consent Mode v2");
  if (/accounting|invoic/i.test(combined)) integrations.push("Accounting system");
  if (/email|notification|sms|viber/i.test(combined)) {
    integrations.push("Transactional messaging");
  }
  if (modules.includes("mobile")) integrations.push("Kitchen or field hardware");

  return integrations.length > 0
    ? integrations
    : ["None identified at this stage"];
}

function inferRisks(
  facts: Record<string, string>,
  multiLocation: boolean,
  modules: ModuleId[],
  infrastructure: Infrastructure,
): string[] {
  const risks: string[] = [];

  if (multiLocation) {
    risks.push(
      "Multiple locations change the data model rather than the settings. Whether menus, pricing and staff are shared or separate must be decided in architecture, not discovered during build.",
    );
  }

  if (infrastructure === "legacy") {
    risks.push(
      "Legacy migration is the largest unknown here. Data extraction and behaviour parity need their own discovery before any delivery date is credible.",
    );
  }

  if (infrastructure === "marketplace") {
    risks.push(
      "Moving demand off a marketplace takes time. The direct channel should launch alongside it rather than replacing it on day one.",
    );
  }

  if (modules.includes("payments")) {
    risks.push(
      "Payments introduce financial risk from software defects. Server-side price authority and a provider-agnostic interface are non-negotiable in this scope.",
    );
  }

  if (modules.includes("mobile")) {
    risks.push(
      "A dedicated device application is a second codebase with its own release process. Worth it for hardware access; expensive if the requirement turns out to be a browser tab.",
    );
  }

  if (!facts.goal || facts.goal.trim().length < 12) {
    risks.push(
      "The success criterion is not yet specific enough to design against. Discovery should establish what measurable outcome makes this project worth doing.",
    );
  }

  if (risks.length === 0) {
    risks.push(
      "No structural risks identified from this conversation. Discovery would confirm the data model and the measurement plan before build.",
    );
  }

  return risks;
}

/* -------------------------------------------------------------------------- */

/**
 * Engine selection.
 *
 * When a server-side AI implementation is added, it goes here behind the same
 * interface and this function chooses between them. The UI does not change.
 */
export function getConsultantEngine(): ConsultantEngine {
  return ruleBasedConsultant;
}

/** Plain-text serialisation for the clipboard and the contact handoff. */
export function briefToText(brief: ProjectBrief): string {
  return [
    "BDS PROJECT BRIEF",
    "",
    `Business type:      ${brief.businessType}`,
    `Locations:          ${brief.locations}`,
    `Primary goal:       ${brief.primaryGoal}`,
    "",
    `Recommended:        ${brief.recommendedSolution}`,
    `Complexity:         ${brief.complexity}`,
    "",
    `Required modules:   ${brief.requiredModules.join(", ") || "—"}`,
    `Optional modules:   ${brief.optionalModules.join(", ") || "—"}`,
    `Integrations:       ${brief.integrations.join(", ")}`,
    "",
    "Key risks:",
    ...brief.risks.map((risk) => `  · ${risk}`),
    "",
    "Recommended next step:",
    brief.nextStep,
    "",
    "Scope and pricing are established in discovery — custom scope required.",
  ].join("\n");
}
