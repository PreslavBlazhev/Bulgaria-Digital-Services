import type { Insight } from "@/types";

export const INSIGHTS: Insight[] = [
  {
    slug: "website-vs-business-system",
    title: "A website presents a business. A system operates it.",
    excerpt:
      "The distinction sounds semantic until you look at where the work actually happens. One of these can be replaced in a weekend; the other one is the company.",
    category: "Architecture",
    readingTime: "6 min",
    publishedAt: "August 2026",
    date: "2026-08-04",
    body: [
      {
        type: "p",
        text: "Most companies buy a website when what they need is a system, and the confusion is understandable — both are things that live on the internet and cost money. But they answer different questions. A website answers 'what does this business do?'. A system answers 'how does this business do it?'.",
      },
      {
        type: "p",
        text: "You can tell which one you have by asking what happens if it disappears at nine in the morning. If the answer is that marketing stops, you have a website. If the answer is that nobody can take an order, check a status, or find out what a customer paid, you have a system — whether you meant to build one or not.",
      },
      { type: "h2", text: "The spreadsheet is already your system" },
      {
        type: "p",
        text: "Almost every business already operates a system. It is usually a spreadsheet, a shared inbox and two people who know how it works. It has state, rules and permissions. What it lacks is enforcement: nothing stops a price being wrong, nothing records who changed it, and nothing prevents two people editing the same row.",
      },
      {
        type: "p",
        text: "This works well at low volume. It fails in a specific, predictable way — not with a dramatic collapse, but with an accumulation of small reconciliation tasks. Someone spends an hour a day making two records agree. That hour is the cost of not having built the system deliberately.",
      },
      { type: "h2", text: "What changes when it is engineered" },
      {
        type: "list",
        items: [
          "Rules are enforced rather than remembered. A price cannot be wrong in one place and right in another because there is only one place.",
          "State is explicit. 'In progress' means something specific that both the customer and the staff can see.",
          "Access is a permission, not a convention. The person who should not change prices cannot change prices.",
          "History exists. Who changed what and when is a lookup rather than a disagreement.",
        ],
      },
      { type: "h2", text: "The practical test" },
      {
        type: "p",
        text: "Before commissioning either, write down the three questions about your operation you currently cannot answer without asking a person. If those questions are about what your business offers, you need a website. If they are about what your business is currently doing, no amount of website will help.",
      },
      {
        type: "quote",
        text: "Websites present businesses. Systems operate them. Confusing the two is how companies end up with a beautiful brochure and a spreadsheet holding up the actual company.",
      },
    ],
  },
  {
    slug: "restaurants-should-own-their-ordering-infrastructure",
    title: "Why restaurants should own their ordering infrastructure",
    excerpt:
      "Delivery platforms solve a real problem and charge a permanent price for it. The question is not whether to use them, but whether they should be the only door into your business.",
    category: "Restaurant Technology",
    readingTime: "7 min",
    publishedAt: "July 2026",
    date: "2026-07-21",
    body: [
      {
        type: "p",
        text: "A delivery marketplace is an excellent customer acquisition channel. It puts a restaurant in front of people who were not looking for it, handles the payment, and provides drivers. For a new venue, that is genuinely valuable and worth paying for.",
      },
      {
        type: "p",
        text: "The problem is what happens on the two-hundredth order from the same customer. The marketplace still takes its percentage, still owns the relationship, and still decides what the restaurant is allowed to change. Acquisition pricing has quietly become retention pricing.",
      },
      { type: "h2", text: "What you are actually renting" },
      {
        type: "list",
        items: [
          "The customer relationship. You do not have their contact details; the platform does.",
          "The order history. You cannot see that this person orders the same thing every Thursday.",
          "Pricing control. Menu prices are frequently inflated to absorb commission, which your regular customers notice.",
          "Operational flexibility. Changing how orders reach the kitchen requires the platform to support it.",
        ],
      },
      { type: "h2", text: "Owning the infrastructure does not mean leaving" },
      {
        type: "p",
        text: "The useful position is not marketplace or nothing. It is having your own ordering channel that regular customers can use, alongside the marketplace that keeps bringing new ones. The marketplace becomes what it is good at — acquisition — instead of being the entire business.",
      },
      {
        type: "p",
        text: "The economics are unsentimental. If a fifth of the order value goes to commission, the direct channel pays for itself somewhere in the low hundreds of orders. Every order after that is margin the restaurant keeps.",
      },
      { type: "h2", text: "What owning it actually requires" },
      {
        type: "p",
        text: "A menu with real structure — categories, variants, extras, allergens — rather than a photographed page. Server-side pricing, so a total cannot be manipulated from a browser. An explicit order lifecycle both the customer and the kitchen can see. And an order arriving on a device the kitchen is already watching, because an ordering system that works everywhere except the kitchen has not solved the problem.",
      },
      {
        type: "quote",
        text: "Use marketplaces to be found. Own the infrastructure that keeps the people who found you.",
      },
    ],
  },
  {
    slug: "what-happens-behind-an-online-order",
    title: "What actually happens behind an online order",
    excerpt:
      "Between a customer tapping 'Place order' and a kitchen starting to cook, a surprising number of things have to be true. Most ordering failures are one of them being false.",
    category: "Engineering",
    readingTime: "8 min",
    publishedAt: "July 2026",
    date: "2026-07-09",
    body: [
      {
        type: "p",
        text: "From the customer's side, placing an order is one button. From the system's side it is a sequence of steps, each of which can fail in a way that produces a different kind of bad day.",
      },
      { type: "h2", text: "The cart is a proposal, not a fact" },
      {
        type: "p",
        text: "This is the single most important thing to get right. The cart a browser submits is user input. It arrives with product IDs, quantities, selected variants and — if the system is naive — prices. Those prices must be discarded.",
      },
      {
        type: "p",
        text: "The server recalculates the entire order from its own catalogue: base price, variant modifier, each extra, quantity, delivery. If the recalculated total differs from what the customer was shown, the customer is told rather than silently charged something else. This single decision eliminates an entire class of exploit, and it costs one database read.",
      },
      { type: "h2", text: "Availability is a moving target" },
      {
        type: "p",
        text: "Between adding an item to a cart and completing checkout, a product can sell out, a venue can close, and a delivery zone can stop being served. Every one of those has to be rechecked at submission — not at the point the item entered the cart.",
      },
      { type: "h2", text: "The order has to become a record" },
      {
        type: "list",
        items: [
          "Written in one transaction, so a partially created order cannot exist.",
          "Assigned an explicit initial state, not an implicit one.",
          "Immutable in its priced lines — later menu edits must not rewrite history.",
          "Immediately visible to the operation, without a synchronisation step.",
        ],
      },
      { type: "h2", text: "Then it has to reach a human" },
      {
        type: "p",
        text: "A correct order that nobody sees is a lost order. The delivery mechanism matters more than it seems: an email into a shared inbox during service will be missed, and a browser tab on a kitchen tablet will go to sleep. This is why the kitchen surface is often the part that has to be native.",
      },
      {
        type: "quote",
        text: "An ordering system is judged in the kitchen, not on the product page.",
      },
    ],
  },
  {
    slug: "analytics-should-influence-product-decisions",
    title: "If your analytics has never changed a decision, it is decoration",
    excerpt:
      "Most measurement fails in one of two directions: nothing is tracked, or everything is tracked and none of it is actionable. Both produce the same outcome.",
    category: "Analytics",
    readingTime: "5 min",
    publishedAt: "June 2026",
    date: "2026-06-27",
    body: [
      {
        type: "p",
        text: "Installing analytics is easy enough that most sites have it. Using it is rare enough that most sites cannot name a single decision it produced. The gap is not tooling — it is that measurement was added after the product instead of designed with it.",
      },
      { type: "h2", text: "Start from the decision, not the event" },
      {
        type: "p",
        text: "Useful measurement begins with a question the business genuinely cannot answer: which step loses the most people, whether a second language earned its cost, whether the enquiry form is too long. Each question implies specific events. Events that do not answer a question do not get implemented.",
      },
      {
        type: "p",
        text: "This inverts the usual order, in which every interaction is tracked in case it becomes interesting. It does not become interesting. It becomes a dashboard nobody opens.",
      },
      { type: "h2", text: "Name events before implementing them" },
      {
        type: "p",
        text: "Events named during development stop meaning anything within two months. Two engineers produce 'checkout_start' and 'begin_checkout' for the same action, and any comparison over time becomes archaeology. Agreeing a schema first is unglamorous and saves the entire dataset.",
      },
      { type: "h2", text: "Consent is a technical requirement" },
      {
        type: "p",
        text: "A consent banner that does not change what is collected is a liability wearing the costume of a solution. Consent state has to reach the measurement layer and change its behaviour. Under Consent Mode v2 that means denied categories genuinely alter collection — with the trade-off that some analytics becomes modelled rather than observed.",
      },
      {
        type: "p",
        text: "That trade is correct. Slightly less certain data that is legally defensible beats precise data collected without permission.",
      },
      {
        type: "quote",
        text: "If you cannot name a decision your analytics changed this quarter, you do not have measurement. You have a subscription.",
      },
    ],
  },
  {
    slug: "when-a-business-needs-a-custom-system",
    title: "When a business actually needs a custom system",
    excerpt:
      "Custom software is frequently the wrong answer. Knowing the specific conditions under which it becomes the right one saves a great deal of money.",
    category: "Strategy",
    readingTime: "6 min",
    publishedAt: "June 2026",
    date: "2026-06-12",
    body: [
      {
        type: "p",
        text: "Anyone who builds custom systems for a living should be able to tell you when not to buy one. Off-the-shelf software is cheaper, tested by thousands of other companies, and maintained by someone else. The default answer should be to use it.",
      },
      { type: "h2", text: "Four conditions that change the answer" },
      {
        type: "list",
        items: [
          "The process is the competitive advantage. If how you operate is why customers choose you, generic software will flatten it to match everyone else.",
          "The tools do not talk to each other. Three good SaaS products with a person copying between them is a system with a human integration layer.",
          "The cost of the workaround exceeds the cost of the software. An hour a day of reconciliation is roughly a quarter of a salary.",
          "You are paying a percentage rather than a fee. Commission scales with success; a system does not.",
        ],
      },
      { type: "h2", text: "Three conditions that mean you should not" },
      {
        type: "list",
        items: [
          "The process is genuinely standard. Accounting and payroll are solved. Do not rebuild them.",
          "Nobody can describe the current process. Custom software encodes a process — an undefined one cannot be encoded, only guessed at expensively.",
          "The requirement is a feeling rather than a constraint. 'Something more professional' is a design brief, not a systems brief.",
        ],
      },
      { type: "h2", text: "The middle path is usually correct" },
      {
        type: "p",
        text: "Most businesses do not need everything custom. They need one part built properly — the ordering flow, the client portal, the operational dashboard — connected to the standard tools that already work. That is a smaller project with most of the benefit, and it leaves the boring problems to software that has already solved them.",
      },
      {
        type: "quote",
        text: "Build the part that is yours. Buy the part that is everybody's.",
      },
    ],
  },
];

export function getInsight(slug: string): Insight | undefined {
  return INSIGHTS.find((i) => i.slug === slug);
}

export function getSortedInsights(): Insight[] {
  return [...INSIGHTS].sort((a, b) => b.date.localeCompare(a.date));
}
