export type Phase = { id: string; name: string; description: string };
export type RoleType = { id: string; name: string; description: string };

export const PHASES: Phase[] = [
  {
    id: "backlog",
    name: "Backlog/ Pending",
    description: "Items pending from earlier workflow",
  },
  {
    id: "seed-initial-discuss",
    name: "Seed / Initial Discuss",
    description: "Initial exploration and discussion",
  },
  {
    id: "discovery-brainstorm",
    name: "Discovery / Brainstorm",
    description: "Exploring possibilities and ideas",
  },
  {
    id: "hypothesis-options",
    name: "Hypothesis / Options",
    description: "Forming hypotheses and considering options",
  },
  {
    id: "specs-solutioning",
    name: "Specs / Solutioning",
    description: "Defining specifications and solutions",
  },
  {
    id: "decision",
    name: "Decision",
    description: "Making key decisions",
  },
  {
    id: "task-execution",
    name: "Task / Execution",
    description: "Executing tasks and implementation",
  },
  {
    id: "documentation-narrative",
    name: "Documentation / Narrative",
    description: "Documenting outcomes and narratives",
  },
  {
    id: "retro-learning",
    name: "Retro / Learning",
    description: "Reflecting and learning from outcomes",
  },
];

export const ROLE_TYPES: RoleType[] = [
  { id: "feature", name: "Feature", description: "Proposing feature request" },
  { id: "bug", name: "Bug", description: "Notifying/Solving a bug" },
  {
    id: "question",
    name: "Question",
    description: "Asking questions",
  },
  {
    id: "claim",
    name: "Claim",
    description: "Making claims",
  },
  {
    id: "counter-claim",
    name: "Counter-claim",
    description: "Presenting counter-arguments",
  },
  {
    id: "evidence",
    name: "Evidence",
    description: "Providing evidence",
  },
  {
    id: "risk",
    name: "Risk",
    description: "Identifying risks",
  },
  {
    id: "mitigation",
    name: "Mitigation",
    description: "Proposing mitigations",
  },
  {
    id: "assumption",
    name: "Assumption",
    description: "Stating assumptions",
  },
  {
    id: "decision-rationale",
    name: "Decision Rationale",
    description: "Explaining decision reasoning",
  },
  {
    id: "customer-voice",
    name: "Customer Voice",
    description: "Sharing customer feedback",
  },
  {
    id: "design-artifact",
    name: "Design Artifact",
    description: "Presenting design work",
  },
  {
    id: "experiment",
    name: "Experiment",
    description: "Proposing or sharing experiments",
  },
  {
    id: "blocker",
    name: "Blocker",
    description: "Identifying blockers",
  },
  {
    id: "dependency",
    name: "Dependency",
    description: "Noting dependencies",
  },
  {
    id: "status-update",
    name: "Status Update",
    description: "Providing status updates",
  },
];

// Optional helpers
export const getPhaseById = (id?: string | null) =>
  PHASES.find((p) => p.id === id);
export const getRoleTypeById = (id?: string | null) =>
  ROLE_TYPES.find((r) => r.id === id);
