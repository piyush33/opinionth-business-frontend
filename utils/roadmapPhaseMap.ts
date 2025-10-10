// utils/roadmapPhaseMap.ts
export type RoadmapBucketId =
  | "backlog"
  | "planned"
  | "in-progress"
  | "completed";

export const ROADMAP_BUCKETS: Record<
  RoadmapBucketId,
  { label: string; backendIds: string[]; primary: string }
> = {
  backlog: {
    label: "Backlog",
    backendIds: ["backlog"],
    primary: "backlog",
  },
  planned: {
    label: "Planned",
    backendIds: [
      "seed-initial-discuss",
      "discovery-brainstorm",
      "hypothesis-options",
    ],
    primary: "seed-initial-discuss",
  },
  "in-progress": {
    label: "In Progress",
    backendIds: [
      "specs-solutioning",
      "decision",
      "task-execution",
      "documentation-narrative",
    ],
    primary: "decision",
  },
  completed: {
    label: "Completed",
    backendIds: ["retro-learning"],
    primary: "retro-learning",
  },
};

// For UI selects when category === "roadmap"
export const ROADMAP_BUCKET_OPTIONS = (
  ["backlog", "planned", "in-progress", "completed"] as const
).map((id) => ({ id, name: ROADMAP_BUCKETS[id].label }));

// Backend ↔ UI helpers
export const mapBucketToBackendPrimary = (bucketId?: RoadmapBucketId | null) =>
  bucketId ? ROADMAP_BUCKETS[bucketId].primary : null;

export const backendToBucket = (
  backendPhaseId?: string | null
): RoadmapBucketId | null => {
  if (!backendPhaseId) return null;
  const hit = (Object.keys(ROADMAP_BUCKETS) as RoadmapBucketId[]).find((k) =>
    ROADMAP_BUCKETS[k].backendIds.includes(backendPhaseId)
  );
  return hit ?? null;
};

export const isBackendInBucket = (
  backendId: string,
  bucketId: RoadmapBucketId
) => ROADMAP_BUCKETS[bucketId].backendIds.includes(backendId);
