"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  Search,
  Filter,
  Grid3X3,
  List,
  SlidersHorizontal,
  Bell,
  MessageCircle,
  User,
  ChevronDown,
  X,
  Plus,
  Menu,
  ChevronRight,
  Home,
  Compass,
  Workflow,
  Tag,
  Check,
  Calendar,
} from "lucide-react";
import Card from "@/components/card";
import InboxPopup from "@/components/popups/inbox-popup";
import SettingsPopup from "@/components/popups/settings-popup";
import NotificationsPopup from "@/components/popups/notifications-popup";
import MasonryGrid from "@/components/masonry-grid";
import {
  type Category,
  DEFAULT_CATEGORIES,
  sortOptions,
} from "@/utils/filters";
import {
  getSavedCustomCats,
  ensureSaved,
  hydrateForUI,
} from "@/utils/customCategories";
import { FolderOpen } from "lucide-react";
import AppNav from "@/components/app/AppNav";
import { PixelLabel, btn } from "@/components/app/ui";
import { LogoBitmap } from "@/components/marketing/Bitmap";
import SpaceIdeasPanel, {
  SpaceIdeasButton,
  type SpaceIdea,
} from "@/components/ai/SpaceIdeas";
import {
  type CategoryCount,
  type FeedFilters,
  SessionExpiredError,
  fetchCategoryCounts,
  useDebounced,
  useLoadMoreSentinel,
  usePagedFeed,
} from "@/lib/feed";

interface CardItem {
  id: number;
  title: string;
  description: string;
  text?: string;
  image?: string;
  username: string;
  picture?: string;
  parent: number;
  layer: Record<string, any>;
  weblink?: string;
  privacy?: boolean;
  createdAt?: string;
  category?: string;
  phase?: string;
  roleTypes?: string[];
}

const PHASE_OPTIONS = [
  { id: "backlog", name: "Backlog/ Pending", order: 0 },
  { id: "seed-initial-discuss", name: "Seed / Initial Discuss", order: 1 },
  { id: "discovery-brainstorm", name: "Discovery / Brainstorm", order: 2 },
  { id: "hypothesis-options", name: "Hypothesis / Options", order: 3 },
  { id: "specs-solutioning", name: "Specs / Solutioning", order: 4 },
  { id: "decision", name: "Decision", order: 5 },
  { id: "task-execution", name: "Task / Execution", order: 6 },
  {
    id: "documentation-narrative",
    name: "Documentation / Narrative",
    order: 7,
  },
  { id: "retro-learning", name: "Retro / Learning", order: 8 },
];

type PhaseMap = {
  id: string; // backend id (unchanged)
  name: string; // normal name (what you already show today)
  order: number;
  roadmapPhase: "Backlog" | "Planned" | "In Progress" | "Completed";
};

const PHASE_OPTIONS_MAPPING: PhaseMap[] = [
  {
    id: "backlog",
    name: "Backlog/ Pending",
    order: 0,
    roadmapPhase: "Backlog",
  },
  {
    id: "seed-initial-discuss",
    name: "Seed / Initial Discuss",
    order: 1,
    roadmapPhase: "Planned",
  },
  {
    id: "discovery-brainstorm",
    name: "Discovery / Brainstorm",
    order: 2,
    roadmapPhase: "Planned",
  },
  {
    id: "hypothesis-options",
    name: "Hypothesis / Options",
    order: 3,
    roadmapPhase: "Planned",
  },
  {
    id: "specs-solutioning",
    name: "Specs / Solutioning",
    order: 4,
    roadmapPhase: "In Progress",
  },
  { id: "decision", name: "Decision", order: 5, roadmapPhase: "In Progress" },
  {
    id: "task-execution",
    name: "Task / Execution",
    order: 6,
    roadmapPhase: "In Progress",
  },
  {
    id: "documentation-narrative",
    name: "Documentation / Narrative",
    order: 7,
    roadmapPhase: "In Progress",
  },
  {
    id: "retro-learning",
    name: "Retro / Learning",
    order: 8,
    roadmapPhase: "Completed",
  },
];

// helpers
const PHASE_ID_TO_ROADMAP: Record<string, string> = Object.fromEntries(
  PHASE_OPTIONS_MAPPING.map((p) => [p.id, p.roadmapPhase])
);

const ROADMAP_PHASE_ORDER = {
  Backlog: 0,
  Planned: 1,
  "In Progress": 2,
  Completed: 3,
} as const;
const ROADMAP_PHASE_OPTIONS = Object.keys(ROADMAP_PHASE_ORDER)
  .map((name) => ({
    id: name,
    name,
    order: ROADMAP_PHASE_ORDER[name as keyof typeof ROADMAP_PHASE_ORDER],
  }))
  .sort((a, b) => a.order - b.order);

const ROLE_TYPE_OPTIONS = [
  { id: "feature", name: "Feature" },
  { id: "bug", name: "Bug" },
  { id: "question", name: "Question" },
  { id: "claim", name: "Claim" },
  { id: "counter-claim", name: "Counter-claim" },
  { id: "evidence", name: "Evidence" },
  { id: "risk", name: "Risk" },
  { id: "mitigation", name: "Mitigation" },
  { id: "assumption", name: "Assumption" },
  { id: "decision-rationale", name: "Decision Rationale" },
  { id: "customer-voice", name: "Customer Voice" },
  { id: "design-artifact", name: "Design Artifact" },
  { id: "experiment", name: "Experiment" },
  { id: "blocker", name: "Blocker" },
  { id: "dependency", name: "Dependency" },
  { id: "status-update", name: "Status Update" },
];

// Common aliases → your default ids (extend as you like)
const CATEGORY_ALIASES: Record<string, string> = {
  "company-os": "company-os",
  "company operating system": "company-os",
  product: "product",
  roadmap: "roadmap",
  documentation: "docs",
  docs: "docs",
  engineering: "engineering",
  marketing: "marketing",
  design: "design",
  operations: "operations",
  ops: "operations",
  meetings: "meetings",
  data: "data",
  "data-analytics": "data",
  "data & analytics": "data",
  data_and_analytics: "data",
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeCategoryId = (raw?: string | null) => {
  const s = (raw ?? "").trim();
  if (!s) return "uncategorized";
  const slug = slugify(s);
  return CATEGORY_ALIASES[slug] ?? slug;
};

export default function ExplorePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [isCategorySidebarOpen, setIsCategorySidebarOpen] = useState(true);

  // Popup states
  const [isInboxPopupOpen, setIsInboxPopupOpen] = useState(false);
  const [isSettingsPopupOpen, setIsSettingsPopupOpen] = useState(false);
  const [isNotificationsPopupOpen, setIsNotificationsPopupOpen] =
    useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Filter states
  const [dateFilter, setDateFilter] = useState<
    "all" | "today" | "week" | "month" | "custom"
  >("all");
  const [customStart, setCustomStart] = useState<string>(""); // YYYY-MM-DD
  const [customEnd, setCustomEnd] = useState<string>("");
  const [contentTypeFilter, setContentTypeFilter] = useState("all");
  const [engagementFilter, setEngagementFilter] = useState("all");
  const [selectedPhase, setSelectedPhase] = useState<string>("all");
  const [selectedRoleTypes, setSelectedRoleTypes] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [unreadCount, setUnreadCount] = useState(0);
  // Inline "suggested new space" section; closes when the category changes.
  const [ideasOpen, setIdeasOpen] = useState(false);
  useEffect(() => setIdeasOpen(false), [selectedCategory]);

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem("profileUser");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("selectedCategory", selectedCategory);
  }, [selectedCategory]);

  // NEW helpers
  const PALETTE = [
    { color: "text-gray-700", bgColor: "bg-gray-100" },
    { color: "text-emerald-700", bgColor: "bg-emerald-100" },
    { color: "text-blue-700", bgColor: "bg-blue-100" },
    { color: "text-indigo-700", bgColor: "bg-indigo-100" },
    { color: "text-orange-700", bgColor: "bg-orange-100" },
    { color: "text-purple-700", bgColor: "bg-purple-100" },
    { color: "text-pink-700", bgColor: "bg-pink-100" },
    { color: "text-cyan-700", bgColor: "bg-cyan-100" },
    { color: "text-red-700", bgColor: "bg-red-100" },
    { color: "text-amber-700", bgColor: "bg-amber-100" },
    { color: "text-slate-700", bgColor: "bg-slate-100" },
  ];

  const hashCode = (str: string) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  };

  const toTitleCase = (id: string) =>
    id.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const makeCustomCategory = (id: string): Category => {
    const palette = PALETTE[hashCode(id) % PALETTE.length];
    return {
      id,
      name: toTitleCase(id),
      icon: FolderOpen,
      color: palette.color,
      bgColor: palette.bgColor,
      description: "Custom category",
      isCustom: true,
      count: 0,
    };
  };

  type ActiveOrg = { id: number; name: string; slug: string } | null;

  const getActiveOrgId = (): number | null => {
    const raw = localStorage.getItem("activeOrg");
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as ActiveOrg | number;
      // handle both shapes: whole object or just an id
      if (typeof parsed === "number") return parsed || null;
      return parsed?.id ?? null;
    } catch {
      // fallback: maybe an id as plain string
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    }
  };

  async function refreshUnread() {
    const orgId = getActiveOrgId();
    if (!orgId || !user) return;
    try {
      const res = await fetch(
        `/nest-api/orgs/${orgId}/notifications/user/${user.username}/unread-count`
      );
      const { count } = await res.json();
      setUnreadCount(count || 0);
    } catch (e) {
      console.error("unread-count failed", e);
    }
  }

  // poll occasionally (optional) and on mount/user change
  useEffect(() => {
    if (!user) return;
    refreshUnread();
    const id = setInterval(refreshUnread, 30000);
    return () => clearInterval(id);
  }, [user]);

  // Session expired: toast, clear auth, back to sign-in.
  const onSessionExpired = useCallback(() => {
    try {
      toast.error("Session expired. Please sign in again.");
    } catch {
      console.warn("Toast system not available");
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("profileUser");
    setTimeout(() => router.replace("/login"), 1000);
  }, [router]);

  // Card counts per category, over everything the user can see.
  const [categoryCounts, setCategoryCounts] = useState<{
    total: number;
    categories: CategoryCount[];
  } | null>(null);
  useEffect(() => {
    if (!user) return;
    const ac = new AbortController();
    fetchCategoryCounts(ac.signal)
      .then(setCategoryCounts)
      .catch((e) => {
        if (e instanceof SessionExpiredError) onSessionExpired();
        else if (e?.name !== "AbortError")
          console.error("Error fetching categories:", e);
      });
    return () => ac.abort();
  }, [user, onSessionExpired]);

  // Filters run on the server; the feed loads a page at a time.
  const debouncedSearch = useDebounced(searchTerm, 300);
  const feedFilters = useMemo<FeedFilters>(() => {
    const day = 24 * 60 * 60 * 1000;
    let from: string | undefined;
    let to: string | undefined;
    if (dateFilter === "custom") {
      if (customStart) from = new Date(`${customStart}T00:00:00`).toISOString();
      if (customEnd) to = new Date(`${customEnd}T23:59:59.999`).toISOString();
    } else if (dateFilter === "today" || dateFilter === "week" || dateFilter === "month") {
      // same windows as checkDateFilter: under 1, 8 and 31 whole days old
      const days = { today: 1, week: 8, month: 31 }[dateFilter];
      from = new Date(Date.now() - days * day).toISOString();
    }
    const phases =
      selectedPhase === "all"
        ? undefined
        : selectedCategory === "roadmap"
          ? // a roadmap bucket covers several phases
            Object.keys(PHASE_ID_TO_ROADMAP).filter(
              (id) => PHASE_ID_TO_ROADMAP[id] === selectedPhase
            )
          : [selectedPhase];
    return {
      category: selectedCategory,
      q: debouncedSearch,
      phases,
      roles: selectedRoleTypes,
      from,
      to,
      content: contentTypeFilter,
    };
  }, [
    selectedCategory,
    debouncedSearch,
    selectedPhase,
    selectedRoleTypes,
    dateFilter,
    customStart,
    customEnd,
    contentTypeFilter,
  ]);

  const feed = usePagedFeed<CardItem>(feedFilters, !!user, onSessionExpired);
  const isLoading = feed.loading || (!!user && feed.total === null && !feed.error);
  const filteredFeed = useMemo(
    () =>
      feed.items.map((item: any) => ({
        ...item,
        _rawCategory: item.category ?? null,
        category: normalizeCategoryId(item.category),
      })) as CardItem[],
    [feed.items]
  );
  const sentinelRef = useLoadMoreSentinel(
    feed.loadMore,
    feed.hasMore && !feed.loading,
    feed.items.length
  );

  const DEFAULT_IDS = new Set<string>(
    DEFAULT_CATEGORIES.map((c) => c.id).concat(["uncategorized"])
  );

  // Categories: defaults + saved custom ones + any the server reports,
  // with counts over every card the user can see (not just loaded pages).
  useEffect(() => {
    if (!categoryCounts) return;
    const countOf = new Map(
      categoryCounts.categories.map((c) => [c.id, c.count])
    );
    const idsFromServer = categoryCounts.categories.map((c) => c.id);

    // Persist any *new* non-default ids (dedup handled inside helper)
    const toSave = idsFromServer.filter((id) => id && !DEFAULT_IDS.has(id));
    if (toSave.length) {
      ensureSaved(toSave); // writes only what's missing
    }

    const savedCustomHydrated = hydrateForUI(getSavedCustomCats(), FolderOpen);

    const dedup = new Map<string, Category>();
    [...DEFAULT_CATEGORIES, ...savedCustomHydrated].forEach((c) =>
      dedup.set(c.id, c)
    );
    const base = Array.from(dedup.values());

    if (!base.some((c) => c.id === "uncategorized")) {
      base.push({
        id: "uncategorized",
        name: "Uncategorized",
        icon: FolderOpen,
        color: "text-gray-700",
        bgColor: "bg-gray-100",
        description: "Items without a category",
        count: 0,
      });
    }

    idsFromServer.forEach((id) => {
      if (!base.some((c) => c.id === id)) {
        base.push(makeCustomCategory(id));
      }
    });

    const withCounts = base.map((cat) => ({
      ...cat,
      count: cat.id === "all" ? categoryCounts.total : countOf.get(cat.id) ?? 0,
    }));

    setCategories(withCounts);

    if (!withCounts.some((c) => c.id === selectedCategory)) {
      setSelectedCategory("all");
    }
  }, [categoryCounts, selectedCategory]);


  const toggleRoleType = (roleTypeId: string) => {
    setSelectedRoleTypes((prev) =>
      prev.includes(roleTypeId)
        ? prev.filter((id) => id !== roleTypeId)
        : [...prev, roleTypeId]
    );
  };

  const handleCardClick = (item: CardItem) => {
    localStorage.setItem("lastVisitedCardLayerid", item.layer.id);
    router.push(`/event/${item.id}`);
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSortBy("recent");
    setDateFilter("all");
    setContentTypeFilter("all");
    setEngagementFilter("all");
    setSelectedPhase("all");
    setSelectedRoleTypes([]);
    setCustomStart("");
    setCustomEnd("");
  };

  if (!user) {
    return (
      <div className="mk-grid flex min-h-screen items-center justify-center bg-[var(--mk-paper)]">
        <div className="text-center">
          <LogoBitmap className="mx-auto w-16" />
          <p className="mt-4 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-[var(--mk-ink-2)]">Loading…</p>
        </div>
      </div>
    );
  }

  const handleUserTagClick = (username: string) => {
    if (username === user?.username) {
      router.push("/profile");
    } else {
      localStorage.setItem("profileUsername", username);
      router.push("/profile/user");
    }
  };

  // @id link: open that card in its own space, selected.
  const handleCardTagClick = (cardId: number) => {
    router.push(`/event/${cardId}`);
  };

  // "Start this space": open Create with the idea's opening card filled in.
  // No selectedCard, so Create starts a new space in this category.
  const startSpaceFromIdea = (
    idea: SpaceIdea,
    category: { id: string; name: string }
  ) => {
    localStorage.removeItem("selectedCard");
    localStorage.setItem("selectedCategory", category.id);
    localStorage.setItem(
      "aiDraftCard",
      JSON.stringify({
        title: idea.title,
        description: idea.description,
        text: idea.text,
        phase: idea.seedPhase,
        roleTypes: idea.roleTypes,
        category: category.id,
        categoryName: category.name,
        newSpace: true,
        at: Date.now(),
      })
    );
    router.push("/create");
  };

  const handleMobileCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setIsMobileSidebarOpen(false); // Auto-close on mobile after selection
  };

  const selectedCategoryData =
    categories.find((cat) => cat.id === selectedCategory) ||
    categories[0] ||
    DEFAULT_CATEGORIES[0];

  const SelectedIcon = selectedCategoryData.icon;

  const activeFilterCount = [
    selectedPhase !== "all" ? 1 : 0,
    selectedRoleTypes.length,
    dateFilter === "custom"
      ? customStart || customEnd
        ? 1
        : 0
      : dateFilter !== "all"
      ? 1
      : 0,
    contentTypeFilter !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const isRoadmap = selectedCategory === "roadmap";
  const PHASE_OPTIONS_FOR_UI = isRoadmap
    ? ROADMAP_PHASE_OPTIONS
    : PHASE_OPTIONS;

  return (
    <div className="min-h-screen bg-[var(--mk-paper)]">
      <AppNav
        active="explore"
        search={{ value: searchTerm, onChange: setSearchTerm, placeholder: "Search whiteboards, people, topics…" }}
        unreadCount={unreadCount}
        onNotifications={() => setIsNotificationsPopupOpen(true)}
        onInbox={() => setIsInboxPopupOpen(true)}
        onSettings={() => setIsSettingsPopupOpen(true)}
        mobileExtra={
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="flex w-full items-center gap-2 rounded-[4px] border border-[var(--mk-ink)] bg-white px-3 py-2 text-left text-[14px] font-semibold tracking-tight"
          >
            <selectedCategoryData.icon className="h-4 w-4 shrink-0 text-[var(--mk-indigo)]" />
            <span className="flex-1 truncate">{selectedCategoryData.name}</span>
            <span className="tabular-nums text-[var(--mk-ink-2)]">{selectedCategoryData.count ?? 0}</span>
            <ChevronRight className="h-4 w-4 shrink-0" />
          </button>
        }
      />

      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-[var(--mk-ink)]/40" onClick={() => setIsMobileSidebarOpen(false)} />
          <div className="absolute inset-0 flex flex-col bg-white">
            <div className="flex items-center justify-between border-b border-[var(--mk-ink)] px-5 py-4">
              <PixelLabel>Categories</PixelLabel>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-[4px] border border-[var(--mk-ink)]"
                aria-label="Close categories"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {categories.map((category) => {
                const IconComponent = category.icon;
                const isSelected = selectedCategory === category.id;
                return (
                  <div key={category.id}>
                  <button
                    onClick={() => handleMobileCategorySelect(category.id)}
                    className={`flex w-full items-center gap-3 px-5 py-4 text-left ${
                      isSelected ? "bg-[var(--mk-ink)] text-white" : "hover:bg-[var(--mk-indigo-soft)]"
                    }`}
                  >
                    <IconComponent className={`h-4 w-4 shrink-0 ${isSelected ? "text-[#8fe3f3]" : "text-[var(--mk-indigo)]"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold tracking-tight">{category.name}</span>
                      <span className={`block truncate text-[12.5px] tracking-tight ${isSelected ? "text-white/70" : "text-[var(--mk-ink-2)]"}`}>{category.description}</span>
                    </span>
                    <span className={`tabular-nums text-[13px] ${isSelected ? "text-white/80" : "text-[var(--mk-ink-2)]"}`}>
                      {category.count || 0}
                    </span>
                  </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Layout with Sidebar */}
      <div className="flex pt-16 md:pt-16">
        <aside
          className={`fixed left-0 top-16 hidden h-[calc(100vh-4rem)] overflow-y-auto border-r border-[var(--mk-ink)] bg-white transition-[width] duration-200 md:block ${
            isCategorySidebarOpen ? "w-72" : "w-16"
          }`}
        >
          <div className={`flex items-center pb-4 pt-6 ${isCategorySidebarOpen ? "justify-between px-5" : "justify-center px-2"}`}>
            {isCategorySidebarOpen && <PixelLabel>Categories</PixelLabel>}
            <button
              onClick={() => setIsCategorySidebarOpen(!isCategorySidebarOpen)}
              className="grid h-8 w-8 place-items-center rounded-[4px] border border-[var(--mk-ink)] hover:bg-[var(--mk-indigo-soft)]"
              aria-label={isCategorySidebarOpen ? "Collapse categories" : "Expand categories"}
            >
              <ChevronRight className={`h-4 w-4 transition-transform ${isCategorySidebarOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
          <div className="border-t border-[var(--mk-ink)]">
            {categories.map((category) => {
              const IconComponent = category.icon;
              const isSelected = selectedCategory === category.id;
              return (
                <div key={category.id}>
                <button
                  onClick={() => setSelectedCategory(category.id)}
                  title={category.description}
                  className={`flex w-full items-center gap-3 py-3.5 text-left transition-colors ${
                    isCategorySidebarOpen ? "px-5" : "justify-center px-2"
                  } ${isSelected ? "bg-[var(--mk-ink)] text-white" : "hover:bg-[var(--mk-indigo-soft)]"}`}
                >
                  <IconComponent className={`h-4 w-4 shrink-0 ${isSelected ? "text-[#8fe3f3]" : "text-[var(--mk-indigo)]"}`} />
                  {isCategorySidebarOpen && (
                    <>
                      <span className="flex-1 truncate text-[15px] font-semibold tracking-tight">{category.name}</span>
                      <span className={`tabular-nums text-[13px] ${isSelected ? "text-white/80" : "text-[var(--mk-ink-2)]"}`}>
                        {category.count || 0}
                      </span>
                    </>
                  )}
                </button>
                </div>
              );
            })}
          </div>
          {isCategorySidebarOpen && (
            <div className="p-5">
              <LogoBitmap className="w-20" />
            </div>
          )}
        </aside>

        <main
          className={`mt-[7.25rem] min-w-0 flex-1 transition-[margin] duration-200 md:mt-0 ${
            isCategorySidebarOpen ? "md:ml-72" : "md:ml-16"
          }`}
        >
          <div className="mk-grid border-b border-[var(--mk-ink)] px-4 pb-8 pt-8 md:px-10 md:pb-9 md:pt-9">
            <PixelLabel>
              {selectedCategoryData.id === "all"
                ? "All categories"
                : `Category ${Math.max(0, categories.findIndex((c) => c.id === selectedCategoryData.id))}`}
            </PixelLabel>
            <div className="mt-4 flex flex-wrap items-end gap-5">
              <div className="min-w-0 flex-1">
                <h1 className="mk-display truncate text-[2.6rem] md:text-[3.6rem]">
                  {selectedCategoryData.name}
                  <span className="mk-cursor" aria-hidden />
                </h1>
                <p className="mt-3 max-w-xl text-[15.5px] leading-relaxed tracking-tight text-[var(--mk-ink-2)] md:text-[16.5px]">
                  {selectedCategoryData.description}
                </p>
                <p className="mt-3 text-[12.5px] tabular-nums tracking-tight text-[#868a9c]">
                  {feed.total ?? filteredFeed.length} whiteboards · updated {new Date().toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              {selectedCategoryData.id !== "all" && (
                <SpaceIdeasButton
                  open={ideasOpen}
                  onToggle={() => setIdeasOpen((o) => !o)}
                  categoryName={selectedCategoryData.name}
                />
              )}
            </div>
          </div>

          <div className="px-4 py-8 md:px-10">
            {/* Suggested new space: in the page, above the cards */}
            {ideasOpen && selectedCategoryData.id !== "all" && (
              <SpaceIdeasPanel
                key={selectedCategoryData.id}
                category={{
                  id: selectedCategoryData.id,
                  name: selectedCategoryData.name,
                  description: selectedCategoryData.description,
                }}
                viewer={{ username: user.username, picture: user.image }}
                tone={{
                  color: selectedCategoryData.color,
                  bgColor: selectedCategoryData.bgColor,
                }}
                categoryName={(id) =>
                  categories.find((c) => c.id === id)?.name ?? id
                }
                phaseLabel={
                  selectedCategoryData.id === "roadmap"
                    ? (id) => PHASE_ID_TO_ROADMAP[id]
                    : undefined
                }
                onOpenCard={(id) => router.push(`/event/${id}`)}
                onStart={startSpaceFromIdea}
                onClose={() => setIdeasOpen(false)}
              />
            )}

            {/* Controls Bar */}
            <div className="mb-6">
              <div className="flex flex-wrap items-center gap-3 border-b border-[var(--mk-ink)] pb-3 text-[14px] tracking-tight">
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-[var(--mk-ink-2)]">Sort</span>
                <span className="font-semibold">Most recent</span>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center gap-2 rounded-[4px] border border-[var(--mk-ink)] px-3 py-1.5 text-[13.5px] font-semibold transition-colors ${
                    showFilters ? "bg-[var(--mk-ink)] text-white" : "bg-white hover:bg-[var(--mk-indigo-soft)]"
                  }`}
                  aria-expanded={showFilters}
                >
                  <Filter className="h-3.5 w-3.5" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className={`tabular-nums ${showFilters ? "text-[#8fe3f3]" : "text-[var(--mk-indigo)]"}`}>{activeFilterCount}</span>
                  )}
                </button>
                <span className="ml-auto tabular-nums text-[var(--mk-ink-2)]">{feed.total ?? filteredFeed.length} results</span>
              </div>

              {showFilters && (
                <div className="mk-hard-sm mt-4 rounded-[5px] bg-white p-5">
                  {/* 2 columns on sm+, Role/Type spans both on row 2 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Phase Filter (left of first row) */}
                    <div>
                      <label className="flex items-center space-x-2 text-sm font-medium text-[var(--mk-ink)] mb-2">
                        <Workflow className="w-4 h-4 text-[var(--mk-indigo)]" />
                        <span>Phase</span>
                        <span className="text-xs text-[var(--mk-ink-2)] font-normal">
                          (Work cycle stage)
                        </span>
                      </label>
                      <div className="relative">
                        <select
                          value={selectedPhase}
                          onChange={(e) => setSelectedPhase(e.target.value)}
                          className="w-full bg-white text-[var(--mk-ink-2)] border border-[var(--mk-ink)] rounded-[4px] px-3 py-2.5 text-sm focus:outline-none  focus:shadow-[3px_3px_0_var(--mk-indigo)] focus:ring-0 appearance-none pr-10"
                        >
                          <option value="all">
                            {isRoadmap ? "All Roadmap Phases" : "All Phases"}
                          </option>
                          {PHASE_OPTIONS_FOR_UI.map((phase) => (
                            <option
                              key={phase.id}
                              value={isRoadmap ? phase.name : phase.id} // IMPORTANT
                            >
                              {isRoadmap
                                ? phase.name
                                : `${phase.order}. ${phase.name}`}
                            </option>
                          ))}
                        </select>

                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--mk-ink-2)] pointer-events-none" />
                      </div>
                      {selectedPhase !== "all" && (
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span className="text-[var(--mk-indigo)] font-medium">
                            {isRoadmap
                              ? selectedPhase // "Backlog" / "Planned" / ...
                              : PHASE_OPTIONS.find(
                                  (p) => p.id === selectedPhase
                                )?.name}
                          </span>
                          <button
                            onClick={() => setSelectedPhase("all")}
                            className="text-[var(--mk-ink-2)] hover:text-[var(--mk-ink)]"
                          >
                            Clear
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Date Filter (right of first row) */}
                    <div>
                      <label className="block text-sm font-medium text-[var(--mk-ink)] mb-2">
                        Date Range
                      </label>
                      <select
                        value={dateFilter}
                        onChange={(e) => {
                          setDateFilter(e.target.value as any);
                          // optional: clear previous custom dates when changing away from custom
                          if (e.target.value !== "custom") {
                            setCustomStart("");
                            setCustomEnd("");
                          }
                        }}
                        className="w-full bg-white text-[var(--mk-ink-2)] border border-[var(--mk-ink)] rounded-[4px] px-3 py-2 text-sm focus:outline-none  focus:shadow-[3px_3px_0_var(--mk-indigo)] focus:ring-0"
                      >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="custom">Custom range…</option>{" "}
                      </select>

                      {dateFilter === "custom" && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-[var(--mk-ink-2)] mb-1">
                              From
                            </label>
                            <input
                              type="date"
                              value={customStart}
                              max={customEnd || undefined}
                              onChange={(e) => setCustomStart(e.target.value)}
                              className="w-full bg-white text-[var(--mk-ink-2)] border border-[var(--mk-ink)] rounded-[4px] px-3 py-2 text-sm focus:outline-none  focus:shadow-[3px_3px_0_var(--mk-indigo)] focus:ring-0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-[var(--mk-ink-2)] mb-1">
                              To
                            </label>
                            <input
                              type="date"
                              value={customEnd}
                              min={customStart || undefined}
                              max={new Date().toISOString().slice(0, 10)} // prevent future dates
                              onChange={(e) => setCustomEnd(e.target.value)}
                              className="w-full bg-white text-[var(--mk-ink-2)] border border-[var(--mk-ink)] rounded-[4px] px-3 py-2 text-sm focus:outline-none  focus:shadow-[3px_3px_0_var(--mk-indigo)] focus:ring-0"
                            />
                          </div>
                          {(customStart || customEnd) && (
                            <div className="col-span-2 flex justify-end">
                              <button
                                onClick={() => {
                                  setCustomStart("");
                                  setCustomEnd("");
                                }}
                                className="text-xs text-[var(--mk-ink-2)] hover:text-[var(--mk-ink)]"
                              >
                                Clear custom range
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Role / Type Filter (second row, spans both columns) */}
                    <div className="sm:col-span-2">
                      <label className="flex items-center space-x-2 text-sm font-medium text-[var(--mk-ink)] mb-2">
                        <Tag className="w-4 h-4 text-[var(--mk-cyan)]" />
                        <span>Role / Type</span>
                        <span className="text-xs text-[var(--mk-ink-2)] font-normal">
                          (What the card contributes)
                        </span>
                        {selectedRoleTypes.length > 0 && (
                          <span className="ml-auto text-xs px-2 py-0.5 bg-[var(--mk-cyan-soft)] text-[var(--mk-cyan-deep)] rounded-[4px]">
                            {selectedRoleTypes.length} selected
                          </span>
                        )}
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {ROLE_TYPE_OPTIONS.map((roleType) => {
                          const isSelected = selectedRoleTypes.includes(
                            roleType.id
                          );
                          return (
                            <button
                              key={roleType.id}
                              onClick={() => toggleRoleType(roleType.id)}
                              className={`relative flex items-center justify-between px-3 py-2 rounded-[4px] text-xs font-medium transition-all duration-200 ${
                                isSelected
                                  ? "bg-[var(--mk-cyan-soft)] text-[var(--mk-cyan-deep)] border border-[var(--mk-cyan)]"
                                  : "bg-white text-[var(--mk-ink-2)] border border-[var(--mk-ink)] hover:bg-white border border-[var(--mk-rule)]"
                              }`}
                            >
                              <span className="truncate">{roleType.name}</span>
                              {isSelected && (
                                <Check className="w-3 h-3 flex-shrink-0 ml-1" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {selectedRoleTypes.length > 0 && (
                        <div className="mt-2 flex items-center justify-end">
                          <button
                            onClick={() => setSelectedRoleTypes([])}
                            className="text-xs text-[var(--mk-ink-2)] hover:text-[var(--mk-ink)]"
                          >
                            Clear all role types
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Active Filter Badges */}
                  <div className="flex justify-between items-center mt-4">
                    <div className="flex flex-wrap gap-2">
                      {selectedPhase !== "all" && (
                        <span className="inline-flex items-center space-x-1 px-2 py-1 bg-[var(--mk-indigo-soft)] text-[var(--mk-indigo-deep)] rounded-[4px] text-xs">
                          <Workflow className="w-3 h-3" />
                          <span>
                            {isRoadmap
                              ? selectedPhase
                              : PHASE_OPTIONS.find(
                                  (p) => p.id === selectedPhase
                                )?.name}
                          </span>
                          <button
                            onClick={() => setSelectedPhase("all")}
                            className="ml-1 hover:bg-[var(--mk-indigo-soft)] rounded-[4px] p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}

                      {selectedRoleTypes.map((rtId) => {
                        const roleType = ROLE_TYPE_OPTIONS.find(
                          (rt) => rt.id === rtId
                        );
                        return (
                          <span
                            key={rtId}
                            className="inline-flex items-center space-x-1 px-2 py-1 bg-[var(--mk-cyan-soft)] text-[var(--mk-cyan-deep)] rounded-[4px] text-xs"
                          >
                            <Tag className="w-3 h-3" />
                            <span>{roleType?.name}</span>
                            <button
                              onClick={() => toggleRoleType(rtId)}
                              className="ml-1 hover:bg-[var(--mk-cyan-soft)] rounded-[4px] p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}
                      {dateFilter === "custom" &&
                        (customStart || customEnd) && (
                          <span className="inline-flex items-center space-x-1 px-2 py-1 bg-white border border-[var(--mk-rule)] text-[var(--mk-ink)] rounded-[4px] text-xs">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {customStart
                                ? new Date(customStart).toLocaleDateString()
                                : "…"}{" "}
                              –{" "}
                              {customEnd
                                ? new Date(customEnd).toLocaleDateString()
                                : "…"}
                            </span>
                            <button
                              onClick={() => {
                                setDateFilter("all");
                                setCustomStart("");
                                setCustomEnd("");
                              }}
                              className="ml-1 hover:bg-[var(--mk-indigo-soft)] rounded-[4px] p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        )}
                    </div>
                    <button
                      onClick={clearAllFilters}
                      className="px-4 py-2 text-sm text-[var(--mk-ink-2)] hover:text-[var(--mk-ink)] transition-colors whitespace-nowrap"
                    >
                      Clear All Filters
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Content Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(8)].map((_, index) => (
                  <div key={index} className="animate-pulse rounded-[5px] border border-[var(--mk-rule)] bg-white p-5">
                    <div className="h-2.5 w-1/3 bg-[var(--mk-indigo-soft)]" />
                    <div className="mt-4 h-4 w-5/6 bg-[var(--mk-rule)]" />
                    <div className="mt-2 h-4 w-2/3 bg-[var(--mk-rule)]" />
                    <div className="mt-4 h-3 w-full bg-[#eceef3]" />
                    <div className="mt-2 h-3 w-11/12 bg-[#eceef3]" />
                    <div className="mt-6 h-3 w-1/2 bg-[#eceef3]" />
                  </div>
                ))}
              </div>
            ) : filteredFeed.length > 0 ? (
              <div className="w-full overflow-visible">
                <MasonryGrid>
                  {filteredFeed.map((item) => (
                    <Card
                      key={item.id}
                      user={item.username}
                      title={item.title}
                      description={item.description}
                      text={item.text}
                      image={item.image}
                      picture={item.picture}
                      onClick={() => handleCardClick(item)}
                      onUserTagClick={handleUserTagClick}
                      onCardTagClick={handleCardTagClick}
                      phaseId={item.phase ?? undefined}
                      roleTypeId={item.roleTypes ?? undefined}
                      phaseLabelOverride={
                        item.category === "roadmap"
                          ? PHASE_ID_TO_ROADMAP[item.phase ?? ""]
                          : undefined
                      }
                      cardData={item}
                      feed="explore"
                    />
                  ))}
                </MasonryGrid>
                {/* Loads the next page as this nears the viewport */}
                <div ref={sentinelRef} aria-hidden className="h-px" />
                {feed.loadingMore && (
                  <div className="flex justify-center py-6 text-[13px] tracking-tight text-[var(--mk-ink-2)]">Loading more…</div>
                )}
                {feed.error && !feed.loadingMore && (
                  <div className="flex justify-center py-6 text-[14px] tracking-tight text-[var(--mk-amber)]">
                    {feed.error}.{" "}
                    <button type="button" onClick={feed.loadMore} className="ml-2 font-semibold underline underline-offset-4">
                      Retry
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="mx-auto max-w-lg py-16 text-center">
                <LogoBitmap className="mx-auto w-24 opacity-90" />
                <h2 className="mk-display mt-6 text-[1.8rem]">No whiteboards found</h2>
                <p className="mt-3 text-[15px] tracking-tight text-[var(--mk-ink-2)]">
                  {searchTerm
                    ? `No whiteboards match "${searchTerm}" in ${selectedCategoryData.name}.`
                    : `No whiteboards in ${selectedCategoryData.name} yet.`}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button onClick={clearAllFilters} className={`${btn.plain} px-4 py-2 text-[14px]`}>
                    Clear filters
                  </button>
                  <Link href="/create" className={`${btn.primary} px-4 py-2 text-[14px]`}>
                    Create a whiteboard
                  </Link>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Popups */}
        <InboxPopup
          isOpen={isInboxPopupOpen}
          onClose={() => setIsInboxPopupOpen(false)}
        />
        <SettingsPopup
          isOpen={isSettingsPopupOpen}
          onClose={() => setIsSettingsPopupOpen(false)}
        />
        <NotificationsPopup
          isOpen={isNotificationsPopupOpen}
          onClose={() => setIsNotificationsPopupOpen(false)}
        />
      </div>
    </div>
  );
}
