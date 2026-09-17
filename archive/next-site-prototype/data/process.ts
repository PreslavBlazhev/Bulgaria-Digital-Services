import type { ProcessStage } from "@/types";

export const PROCESS_STAGES: ProcessStage[] = [
  {
    id: "discovery",
    index: "01",
    name: "Discovery",
    focus: "Business, users, processes",
    description:
      "Before anything is designed, the current operation is documented as it actually runs — including the parts held together by a person remembering to do something. Most of the real requirements are found here, not in the brief.",
    activities: [
      "Map the existing process, including its informal steps",
      "Identify who does what, and what happens when they are away",
      "Establish the decisions the business needs to make and cannot",
      "Agree what success would look like in measurable terms",
    ],
    output: "A written scope with explicit boundaries and known unknowns.",
  },
  {
    id: "architecture",
    index: "02",
    name: "Architecture",
    focus: "Data, flows, infrastructure",
    description:
      "The data model is decided before the interface, because the data model is the part that is expensive to change later. Integration points, access rules and failure behaviour are specified while they are still cheap.",
    activities: [
      "Design the data model and its constraints",
      "Define system boundaries and integration contracts",
      "Specify the access and permission model",
      "Choose infrastructure against real operating requirements",
    ],
    output: "A system architecture with typed contracts between components.",
  },
  {
    id: "experience",
    index: "03",
    name: "Experience",
    focus: "UX, UI, interaction",
    description:
      "Interface design starts from the paths that carry business value — the order flow, the enquiry, the daily operational screen — and works outward. Motion is applied where it explains a relationship and nowhere else.",
    activities: [
      "Design the critical paths first, at real content density",
      "Design the operational screens for the conditions they run in",
      "Establish the component and token system",
      "Verify layouts from 360px upward, not downward from desktop",
    ],
    output: "A component system and designed critical paths.",
  },
  {
    id: "engineering",
    index: "04",
    name: "Engineering",
    focus: "Frontend, backend, integration",
    description:
      "Implementation against the agreed architecture, with validation at every external boundary. Business rules live on the server, where they cannot be edited by whoever is holding the browser.",
    activities: [
      "Build the data layer and its migrations",
      "Implement server-side business rules and validation",
      "Build interfaces against real data, not placeholder content",
      "Integrate external services behind stable interfaces",
    ],
    output: "A working system with its logic where it belongs.",
  },
  {
    id: "verification",
    index: "05",
    name: "Verification",
    focus: "QA, security, performance",
    description:
      "Testing covers the paths where failure costs money, the inputs a hostile client can send, and the devices the system will actually run on — including the older phone on a poor connection.",
    activities: [
      "Test critical business paths end to end",
      "Verify server-side authorization on every mutating endpoint",
      "Check performance and accessibility on real devices",
      "Confirm behaviour under failure: timeouts, retries, bad input",
    ],
    output: "A verified build with known limits documented.",
  },
  {
    id: "deployment",
    index: "06",
    name: "Deployment",
    focus: "Infrastructure, monitoring, analytics",
    description:
      "Going live includes the things that make the system supportable afterwards: environment configuration, monitoring, measurement and a documented rollback path.",
    activities: [
      "Configure production environments and secrets handling",
      "Deploy with a tested rollback path",
      "Activate measurement with consent handling in place",
      "Hand over documentation and administrative access",
    ],
    output: "A production system the client owns and can operate.",
  },
  {
    id: "evolution",
    index: "07",
    name: "Evolution",
    focus: "Optimization, automation, scaling",
    description:
      "A delivered system is a starting position. What it measures determines what gets improved next, and the architecture is expected to absorb new modules without being rebuilt.",
    activities: [
      "Review measurement against the decisions it was meant to inform",
      "Automate the manual steps that survived the first release",
      "Extend the system as the operation changes",
      "Plan capacity ahead of demand rather than after it",
    ],
    output: "A system that keeps pace with the business running it.",
  },
];
