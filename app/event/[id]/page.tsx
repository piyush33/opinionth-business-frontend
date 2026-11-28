"use client";

import type React from "react";
import AppNav from "@/components/app/AppNav";
import { PixelLabel, btn } from "@/components/app/ui";
import { LogoBitmap, PixelIcon } from "@/components/marketing/Bitmap";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { FolderOpen } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import {
  ExternalLink,
  GitMerge,
  Plus,
  Bell,
  MessageCircle,
  User,
  ChevronDown,
  Search,
  ArrowLeft,
  Lock,
  Link2,
  Users,
  Layers,
  Sparkles,
  TrendingUp,
  Home,
  Compass,
  Menu,
  X,
  FilterIcon,
  SlidersHorizontal,
  Workflow,
  Tag,
  Check,
  Calendar,
} from "lucide-react";
import axios from "axios";
import Card from "@/components/card";
import InboxPopup from "@/components/popups/inbox-popup";
import SettingsPopup from "@/components/popups/settings-popup";
import NotificationsPopup from "@/components/popups/notifications-popup";
import MasonryGrid from "@/components/masonry-grid";
import LayerInviteModal from "@/components/modals/LayerInviteModal";
import ConvergePanel from "@/components/ai/ConvergePanel";
import ConvergeButton from "@/components/ai/ConvergeButton";
import { useConvergence, ACROSS } from "@/lib/ai/useConvergence";
import ConvergeTimerDock from "@/components/ai/ConvergeTimerDock";
import CardSuggestionHover, {
  type CardSuggestion,
} from "@/components/ai/CardSuggestionHover";
import SpaceSummaryModal, {
  useSpaceSummary,
  type SummaryCardInput,
} from "@/components/modals/SpaceSummaryModal";
import {
  type Category,
  DEFAULT_CATEGORIES,
  checkDateFilter,
  checkContentType,
} from "@/utils/filters";

export interface CardItem {
  id: number;
  title: string;
  description: string;
  text?: string;
  image?: string;
  username: string;
  picture?: string;
  layer: Record<string, any>;
  weblink?: string;
  lock?: boolean;
  privacy?: boolean;
  profileFeedItemId?: number;
  category?: string;
  createdAt?: string;
  phase?: string;
  roleTypes?: string[];
}

// Define InteractionState interface to fix the undeclared variable error
interface InteractionState {
  id: number;
  hasLiked?: boolean;
  hasReposted?: boolean;
  hasSaved?: boolean;
}

// Small alias map to normalize common variations
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

// simple palette for custom categories
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

const getCategoryMeta = (idRaw?: string | null): Category => {
  const id = normalizeCategoryId(idRaw);
  if (id === "uncategorized") {
    return {
      id,
      name: "Uncategorized",
      icon: FolderOpen,
      color: "text-gray-700",
      bgColor: "bg-gray-100",
      description: "Items without a category",
      count: 0,
    } as Category;
  }
  const found = DEFAULT_CATEGORIES.find((c) => c.id === id);
  return found ?? makeCustomCategory(id);
};

export default function EventPage() {
  const params = useParams();
  const router = useRouter();
  const cardId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [homeFeed, setHomeFeed] = useState<CardItem[]>([]);
  const [displayCards, setDisplayCards] = useState<CardItem[]>([]);
  const [selectedCard, setSelectedCard] = useState<CardItem | null>(null);
  const [likedCards, setLikedCards] = useState<InteractionState[]>([]);
  const [repostedCards, setRepostedCards] = useState<InteractionState[]>([]);
  const [savedCards, setSavedCards] = useState<InteractionState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Popup states
  const [isInboxPopupOpen, setIsInboxPopupOpen] = useState(false);
  const [isSettingsPopupOpen, setIsSettingsPopupOpen] = useState(false);
  const [isNotificationsPopupOpen, setIsNotificationsPopupOpen] =
    useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  // Converge panel: closed (false), the whole space (null) or one phase (its label).
  const [convergeScope, setConvergeScope] = useState<string | null | false>(false);
  const [orgId, setOrgId] = useState<number | null>(null);
  const [layerId, setLayerId] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const debounceTimersRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});
  const lastCommittedRef = useRef<Record<string, boolean>>({});
  const hasAutoScrolledRef = useRef(false);

  // Filters state
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [selectedPhases, setSelectedPhases] = useState<Set<string>>(new Set());
  const [selectedRoleTypes, setSelectedRoleTypes] = useState<Set<string>>(
    new Set(),
  );
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    null,
    null,
  ]);
  const [showExternalLinksOnly, setShowExternalLinksOnly] = useState(false);
  const [showLockedOnly, setShowLockedOnly] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [dateFilter, setDateFilter] = useState<
    "all" | "today" | "week" | "month" | "custom"
  >("all");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [contentTypeFilter, setContentTypeFilter] = useState("all");
  const [engagementFilter, setEngagementFilter] = useState("all");
  const [selectedPhase, setSelectedPhase] = useState<string>("all");
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);

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

  // Keep your PHASE_OPTIONS as-is (for non-roadmap)

  type RoadmapBucket = "Backlog" | "Planned" | "In Progress" | "Completed";
  type PhaseMap = {
    id: string; // backend id (unchanged)
    name: string; // your normal label
    order: number;
    roadmapPhase: RoadmapBucket;
  };

  const PHASE_ORDER_MAP: Record<string, number> = Object.fromEntries(
    PHASE_OPTIONS.map((p) => [p.id, p.order]),
  );

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
  const PHASE_ID_TO_ROADMAP: Record<string, RoadmapBucket | undefined> =
    Object.fromEntries(
      PHASE_OPTIONS_MAPPING.map((p) => [p.id, p.roadmapPhase]),
    );

  const ROADMAP_PHASE_ORDER: Record<RoadmapBucket, number> = {
    Backlog: 0,
    Planned: 1,
    "In Progress": 2,
    Completed: 3,
  };
  const ROADMAP_PHASE_OPTIONS = (
    Object.keys(ROADMAP_PHASE_ORDER) as RoadmapBucket[]
  )
    .map((name) => ({ id: name, name, order: ROADMAP_PHASE_ORDER[name] }))
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

  // Pick the category from the selected card; if missing, fall back to the first card with a category.
  const collectionCategory = useMemo(() => {
    const fromSelected = selectedCard?.category;
    const fromAny = homeFeed.find((c) => c.category)?.category;
    return getCategoryMeta(fromSelected || fromAny || "");
  }, [selectedCard?.category, homeFeed]);

  const CategoryIcon = collectionCategory.icon;

  const scrollToCard = (id: number, behavior: ScrollBehavior = "smooth") => {
    if (typeof window === "undefined") return;
    const el = document.getElementById(`card-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior, block: "center", inline: "nearest" });
  };

  // Build a stable action key per card/action
  const keyOf = (action: "like" | "repost" | "save", cardId: number) =>
    `${action}:${cardId}`;

  // Schedule a trailing commit after 3s; coalesce updates within the window
  function scheduleCommit(
    action: "like" | "repost" | "save",
    card: CardItem,
    desired: boolean,
  ) {
    const k = keyOf(action, card.id);

    // Clear any existing timer & set the latest desired state into ref
    if (debounceTimersRef.current[k])
      clearTimeout(debounceTimersRef.current[k]);
    // Stash latest desired state so the timer closure can read it
    (scheduleCommit as any)[k] = desired;

    debounceTimersRef.current[k] = setTimeout(async () => {
      const finalDesired: boolean = (scheduleCommit as any)[k];

      // Avoid redundant calls if server already matches
      const last = lastCommittedRef.current[k];
      if (last === finalDesired) return;

      try {
        if (action === "like") {
          await commitLike(card, finalDesired);
        } else if (action === "repost") {
          await commitRepost(card, finalDesired);
        } else {
          await commitSave(card, finalDesired);
        }
        lastCommittedRef.current[k] = finalDesired; // mark as synced
      } catch (e) {
        console.error(`Commit failed for ${k}`, e);
        // Roll back optimistic UI to lastCommitted
        if (action === "like") {
          setLikedCards((prev) =>
            prev.map((c) => (c.id === card.id ? { ...c, hasLiked: last } : c)),
          );
        } else if (action === "repost") {
          setRepostedCards((prev) =>
            prev.map((c) =>
              c.id === card.id ? { ...c, hasReposted: last } : c,
            ),
          );
        } else {
          setSavedCards((prev) =>
            prev.map((c) => (c.id === card.id ? { ...c, hasSaved: last } : c)),
          );
        }
      }
    }, 3000);
  }

  async function commitLike(item: CardItem, shouldLike: boolean) {
    const token = localStorage.getItem("token");
    const orgId = getActiveOrgId();
    if (!token || !orgId || !user) return;

    if (shouldLike) {
      await axios.post(
        `/nest-api/orgs/${orgId}/profilefeed/${user.username}/liked`,
        { feedItemId: item.profileFeedItemId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      await axios.post(
        `/nest-api/likes/homefeed/${user.username}/${item.id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } else {
      await axios.delete(
        `/nest-api/likes/homefeed/${user.username}/${item.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      await axios.delete(
        `/nest-api/orgs/${orgId}/profilefeed/${user.username}/liked/${item.profileFeedItemId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
    }
  }

  async function commitRepost(item: CardItem, shouldRepost: boolean) {
    const token = localStorage.getItem("token");
    const orgId = getActiveOrgId();
    if (!token || !orgId || !user) return;

    if (shouldRepost) {
      await axios.post(
        `/nest-api/orgs/${orgId}/profilefeed/${user.username}/reposted`,
        { feedItemId: item.profileFeedItemId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      await axios.post(
        `/nest-api/reposts/homefeed/${user.username}/${item.id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } else {
      await axios.delete(
        `/nest-api/reposts/homefeed/${user.username}/${item.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      await axios.delete(
        `/nest-api/orgs/${orgId}/profilefeed/${user.username}/reposted/${item.profileFeedItemId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
    }
  }

  async function commitSave(item: CardItem, shouldSave: boolean) {
    const token = localStorage.getItem("token");
    const orgId = getActiveOrgId();
    if (!token || !orgId || !user) return;

    if (shouldSave) {
      await axios.post(
        `/nest-api/orgs/${orgId}/profilefeed/${user.username}/saved`,
        { feedItemId: item.profileFeedItemId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      await axios.post(
        `/nest-api/saves/homefeed/${user.username}/${item.id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } else {
      await axios.delete(
        `/nest-api/saves/homefeed/${user.username}/${item.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      await axios.delete(
        `/nest-api/orgs/${orgId}/profilefeed/${user.username}/saved/${item.profileFeedItemId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
    }
  }

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
        `/nest-api/orgs/${orgId}/notifications/user/${user.username}/unread-count`,
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

  useEffect(() => {
    const id = getActiveOrgId();
    setOrgId(id);
    const layerid = Number(localStorage.getItem("lastVisitedCardLayerid") || 0);
    setLayerId(layerid);
  }, []);

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem("profileUser");
    if (userData) {
      setUser(JSON.parse(userData));
    }
    localStorage.removeItem("selectedCard");
  }, []);

  // Fetch home feed data
  useEffect(() => {
    const abort = new AbortController();

    const fetchHomeFeedData = async () => {
      if (!user) return;

      setIsLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("token");
        const org = JSON.parse(localStorage.getItem("activeOrg") || "{}");
        const orgId = org?.id;
        // Show the space the card in the URL belongs to. The stored id is
        // only a fallback: it is whatever space was opened last, which is
        // wrong after creating a new space or following an @id link.
        let layerId = localStorage.getItem("lastVisitedCardLayerid");
        if (cardId) {
          try {
            const own = await fetch(
              `/nest-api/orgs/${orgId}/homefeed/item/${cardId}/user/${user.username}`,
              {
                headers: { Authorization: `Bearer ${token}` },
                signal: abort.signal,
              },
            );
            if (own.ok) {
              const card = await own.json();
              if (card?.layer?.id) layerId = String(card.layer.id);
            }
          } catch (e: any) {
            if (e?.name === "AbortError") throw e;
          }
        }
        if (layerId) {
          localStorage.setItem("lastVisitedCardLayerid", layerId);
          setLayerId(Number(layerId));
        }

        const response = await fetch(
          `/nest-api/orgs/${orgId}/homefeed/layers/${layerId}/cards?username=${user.username}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: abort.signal,
          },
        );

        if (response.status === 401) {
          // session expired → toast + redirect
          try {
            toast.error("Session expired. Please sign in again.");
          } catch {
            alert("Session expired. Please sign in again.");
          }

          // clear auth
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("profileUser");

          setIsLoading(false);
          setTimeout(() => router.replace("/login"), 1000);
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setHomeFeed(data);
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.error("Error fetching home feed:", err);
          setError("Failed to load cards");
        }
      } finally {
        setIsLoading(false);
      }
    };

    // A new card id (e.g. an @id link into another space) starts fresh.
    hasAutoScrolledRef.current = false;
    setSelectedCard(null);
    fetchHomeFeedData();
    return () => abort.abort();
  }, [user, router, cardId]);

  // Filter cards based on selected card's parent
  useEffect(() => {
    if (cardId && homeFeed.length > 0) {
      const selectedCard = homeFeed.find((card) => card.id === Number(cardId));
      setSelectedCard(selectedCard || null);
      setDisplayCards(homeFeed);
    }
  }, [cardId, homeFeed]);

  // Build categories similar to Explore (no cookie persistence needed here)
  useEffect(() => {
    const idsFromFeed = new Set<string>(
      homeFeed.map(
        (item) =>
          (item.category && String(item.category).trim()) || "uncategorized",
      ),
    );

    // dedupe defaults + from feed
    const dedup = new Map<string, Category>();
    DEFAULT_CATEGORIES.forEach((c) => dedup.set(c.id, c));

    idsFromFeed.forEach((id) => {
      if (!dedup.has(id)) {
        dedup.set(id, makeCustomCategory(id));
      }
    });

    // ensure 'uncategorized'
    if (!dedup.has("uncategorized")) {
      dedup.set("uncategorized", {
        id: "uncategorized",
        name: "Uncategorized",
        icon: FolderOpen,
        color: "text-gray-700",
        bgColor: "bg-gray-100",
        description: "Items without a category",
        count: 0,
      } as Category);
    }

    const base = Array.from(dedup.values()).map((cat) => ({
      ...cat,
      count:
        cat.id === "all"
          ? homeFeed.length
          : homeFeed.filter(
              (i) =>
                ((i.category && String(i.category).trim()) ||
                  "uncategorized") === cat.id,
            ).length,
    }));

    setCategories(base);

    // keep category selection valid
    if (!base.some((c) => c.id === selectedCategory)) {
      setSelectedCategory("all");
    }
  }, [homeFeed, selectedCategory]);

  // Filter cards (replicates Explore logic; writes into displayCards)
  useEffect(() => {
    const filtered = homeFeed.filter((item) => {
      // privacy check: if item is private, only owner can see
      const isAllowedToView =
        item.privacy === true ? item.username === user?.username : true;
      if (!isAllowedToView) return false;

      // search
      const matchesSearch =
        !searchTerm ||
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.username?.toLowerCase().includes(searchTerm.toLowerCase());

      // category
      const matchesCategory =
        selectedCategory === "all" ||
        (item.category &&
          normalizeCategoryId(item.category) === selectedCategory) ||
        (!item.category && selectedCategory === "uncategorized");

      // phase
      const matchesPhase =
        selectedPhase === "all" ||
        (isRoadmap
          ? // selectedPhase is a roadmap bucket name here
            PHASE_ID_TO_ROADMAP[item.phase ?? ""] === selectedPhase
          : // normal behavior (selectedPhase is backend id)
            item.phase === selectedPhase);

      // role types (any match)
      const matchesRoleTypes =
        selectedRoleTypes.size === 0 ||
        (item.roleTypes &&
          Array.from(selectedRoleTypes).some((rt: string) =>
            item.roleTypes?.includes(rt),
          ));

      // date
      const matchesDate = (() => {
        if (dateFilter === "custom") {
          if (!item.createdAt) return true;
          const created = new Date(item.createdAt);
          if (customStart) {
            const start = new Date(`${customStart}T00:00:00`);
            if (created < start) return false;
          }
          if (customEnd) {
            const end = new Date(`${customEnd}T23:59:59.999`);
            if (created > end) return false;
          }
          return true;
        }
        return (
          dateFilter === "all" || checkDateFilter(item.createdAt, dateFilter)
        );
      })();

      // content type
      const matchesContentType =
        contentTypeFilter === "all" ||
        checkContentType(item as any, contentTypeFilter);

      // engagement (placeholder: pass-through like Explore page)
      const matchesEngagement = engagementFilter === "all";

      return (
        matchesSearch &&
        matchesCategory &&
        matchesPhase &&
        matchesRoleTypes &&
        matchesDate &&
        matchesContentType &&
        matchesEngagement
      );
    });

    // simple sort (by id desc as in Explore)
    filtered.sort((a, b) => b.id - a.id);
    setDisplayCards(filtered);
  }, [
    homeFeed,
    user,
    searchTerm,
    selectedCategory,
    selectedPhase,
    selectedRoleTypes,
    dateFilter,
    customStart,
    customEnd,
    contentTypeFilter,
    engagementFilter,
  ]);

  // Fetch interaction states
  useEffect(() => {
    const fetchInteractionStates = async () => {
      if (!user || displayCards.length === 0) return;

      try {
        const token = localStorage.getItem("token");

        // Fetch liked status
        const likedPromises = displayCards.map(async (item) => {
          try {
            const response = await axios.get(
              `/nest-api/likes/homefeed/${user.username}/${item.id}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );
            return { id: item.id, hasLiked: response.data.hasLiked };
          } catch (error) {
            return { id: item.id, hasLiked: false };
          }
        });

        // Fetch reposted status
        const repostedPromises = displayCards.map(async (item) => {
          try {
            const response = await axios.get(
              `/nest-api/reposts/homefeed/${user.username}/${item.id}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );
            return { id: item.id, hasReposted: response.data.hasReposted };
          } catch (error) {
            return { id: item.id, hasReposted: false };
          }
        });

        // Fetch saved status
        const savedPromises = displayCards.map(async (item) => {
          try {
            const response = await axios.get(
              `/nest-api/saves/homefeed/${user.username}/${item.id}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );
            return { id: item.id, hasSaved: response.data.hasSaved };
          } catch (error) {
            return { id: item.id, hasSaved: false };
          }
        });

        const [likedResults, repostedResults, savedResults] = await Promise.all(
          [
            Promise.all(likedPromises),
            Promise.all(repostedPromises),
            Promise.all(savedPromises),
          ],
        );

        setLikedCards(likedResults);
        setRepostedCards(repostedResults);
        setSavedCards(savedResults);

        const m: Record<string, boolean> = {};
        likedResults.forEach((c) => (m[keyOf("like", c.id)] = !!c.hasLiked));
        repostedResults.forEach(
          (c) => (m[keyOf("repost", c.id)] = !!c.hasReposted),
        );
        savedResults.forEach((c) => (m[keyOf("save", c.id)] = !!c.hasSaved));
        lastCommittedRef.current = { ...lastCommittedRef.current, ...m };
      } catch (error) {
        console.error("Error fetching interaction states:", error);
      }
    };

    fetchInteractionStates();
  }, [user, displayCards]);

  // Interaction handlers
  const handleLike = (e: React.MouseEvent, item: CardItem) => {
    e.stopPropagation();
    if (!user) return;

    const current = isLiked(item.id);
    const desired = !current;

    // optimistic UI
    setLikedCards((prev) =>
      prev.some((c) => c.id === item.id)
        ? prev.map((c) => (c.id === item.id ? { ...c, hasLiked: desired } : c))
        : [...prev, { id: item.id, hasLiked: desired }],
    );

    // debounce the server commit
    scheduleCommit("like", item, desired);
  };

  const handleRepost = (e: React.MouseEvent, item: CardItem) => {
    e.stopPropagation();
    if (!user) return;

    const current = isReposted(item.id);
    const desired = !current;

    setRepostedCards((prev) =>
      prev.some((c) => c.id === item.id)
        ? prev.map((c) =>
            c.id === item.id ? { ...c, hasReposted: desired } : c,
          )
        : [...prev, { id: item.id, hasReposted: desired }],
    );

    scheduleCommit("repost", item, desired);
  };

  const handleSave = (e: React.MouseEvent, item: CardItem) => {
    e.stopPropagation();
    if (!user) return;

    const current = isSaved(item.id);
    const desired = !current;

    setSavedCards((prev) =>
      prev.some((c) => c.id === item.id)
        ? prev.map((c) => (c.id === item.id ? { ...c, hasSaved: desired } : c))
        : [...prev, { id: item.id, hasSaved: desired }],
    );

    scheduleCommit("save", item, desired);
  };

  const handleCreate = () => {
    if (!selectedCard) return;

    if (selectedCard.lock && selectedCard.username !== user?.username) {
      alert("The card is locked! Only certain users can add to the catalogue");
      return;
    }

    // Store selected card data and navigate to create page
    localStorage.setItem("selectedCard", JSON.stringify(selectedCard));
    router.push("/create");
  };

  // "Draft this card" from an AI suggestion: open Create prefilled, linked
  // into this space through the hovered card (same as handleCreate).
  const draftFromSuggestion = (cardId: number, s: CardSuggestion, phase?: string) => {
    const item = homeFeed.find((c) => c.id === cardId);
    if (!item) return;
    if (item.lock && item.username !== user?.username) {
      toast.error("This space is locked. Only certain users can add cards.");
      return;
    }
    localStorage.setItem(
      "selectedCard",
      JSON.stringify({
        ...item,
        ...(phase ? { phase } : {}),
        roleTypes: s.roleTypes.length ? s.roleTypes : item.roleTypes,
      }),
    );
    localStorage.setItem(
      "aiDraftCard",
      JSON.stringify({
        title: s.title,
        description: s.description,
        text: s.text,
        at: Date.now(),
      }),
    );
    router.push("/create");
  };

  const handleUserClick = (e: React.MouseEvent, item: CardItem) => {
    e.stopPropagation();
    if (item.username === user?.username) {
      router.push("/profile");
    } else {
      localStorage.setItem("profileUsername", item.username);
      router.push("/profile/user");
    }
  };

  const handleUserTagClick = (username: string) => {
    if (username === user?.username) {
      router.push("/profile");
    } else {
      localStorage.setItem("profileUsername", username);
      router.push("/profile/user");
    }
  };

  // @id link: select the card here if it's in this space, otherwise open
  // the space it belongs to with it selected.
  const handleCardTagClick = (cardId: number) => {
    const here = homeFeed.find((c) => c.id === cardId);
    if (!here) {
      router.push(`/event/${cardId}`);
      return;
    }
    scrollToCard(cardId, "smooth");
    setSelectedCard(here);
  };

  useEffect(() => {
    if (!selectedCard || !displayCards.length || hasAutoScrolledRef.current)
      return;

    // try immediately after paint, then again after small delays
    const run = () => scrollToCard(selectedCard.id, "smooth");
    const r1 = requestAnimationFrame(run);
    const t1 = setTimeout(run, 300);
    const t2 = setTimeout(run, 1000);

    hasAutoScrolledRef.current = true;

    return () => {
      cancelAnimationFrame(r1);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [selectedCard, displayCards.length]);

  const handleShare = (e: React.MouseEvent, item: CardItem) => {
    e.stopPropagation();
    const url = `${window.location.origin}/event/${item.id}`;
    navigator.clipboard.writeText(url);
    // You could show a toast notification here
  };

  // Helper functions
  const isLiked = (id: number) => {
    const card = likedCards.find((card) => card.id === id);
    return card ? card.hasLiked : false;
  };

  const isReposted = (id: number) => {
    const card = repostedCards.find((card) => card.id === id);
    return card ? card.hasReposted : false;
  };

  const isSaved = (id: number) => {
    const card = savedCards.find((card) => card.id === id);
    return card ? card.hasSaved : false;
  };

  // Get unique contributors
  const getUniqueContributors = () => {
    const contributors = [
      ...new Set(displayCards.map((card) => card.username)),
    ];
    return contributors.slice(0, 10); // Show max 5 contributors
  };

  // Get collection stats
  const getCollectionStats = () => {
    const totalCards = displayCards.length;
    const contributors = getUniqueContributors().length;
    const hasWeblinks = displayCards.filter((card) => card.weblink).length;
    const isLocked = selectedCard?.lock || false;

    return { totalCards, contributors, hasWeblinks, isLocked };
  };

  const isRoadmap = collectionCategory.id === "roadmap";

  const PHASE_OPTIONS_FOR_UI = isRoadmap
    ? ROADMAP_PHASE_OPTIONS
    : PHASE_OPTIONS;

  // Filter logic
  const filteredCards = useMemo(() => {
    return displayCards.filter((card) => {
      const categoryMatch =
        selectedCategories.size === 0 ||
        selectedCategories.has(card.category || "");
      const phaseKey = isRoadmap
        ? PHASE_ID_TO_ROADMAP[card.phase ?? ""] // -> bucket name or undefined
        : (card.phase ?? ""); // -> backend id or ""

      const phaseMatch =
        selectedPhases.size === 0 ||
        (!!phaseKey && selectedPhases.has(phaseKey));
      const roleTypeMatch =
        selectedRoleTypes.size === 0 ||
        (card.roleTypes &&
          card.roleTypes.some((role) => selectedRoleTypes.has(role)));
      const dateMatch = (() => {
        if (!card.createdAt) return true;
        const created = new Date(card.createdAt);
        const [start, end] = dateRange;
        if (start && created < start) return false;
        if (end) {
          // end is inclusive, so set to end of day
          const endOfDay = new Date(end);
          endOfDay.setHours(23, 59, 59, 999);
          if (created > endOfDay) return false;
        }
        return true;
      })();
      const contentTypeMatch = !showExternalLinksOnly || !!card.weblink;
      const lockMatch = !showLockedOnly || !!card.lock;

      return (
        categoryMatch &&
        phaseMatch &&
        roleTypeMatch &&
        dateMatch &&
        contentTypeMatch &&
        lockMatch
      );
    });
  }, [
    displayCards,
    selectedCategories,
    selectedPhases,
    selectedRoleTypes,
    dateRange,
    showExternalLinksOnly,
    showLockedOnly,
  ]);

  const groupedCards = useMemo(() => {
    const map = new Map<string, CardItem[]>();

    filteredCards.forEach((card) => {
      let key = "Uncategorized";

      if (isRoadmap) {
        key = PHASE_ID_TO_ROADMAP[card.phase ?? ""] || "Uncategorized";
      } else {
        const phase = PHASE_OPTIONS.find((p) => p.id === card.phase);
        key = phase?.name || "Uncategorized";
      }

      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key)!.push(card);
    });

    // Convert to ordered array
    if (isRoadmap) {
      return [...ROADMAP_PHASE_OPTIONS]
        .sort((a, b) => b.order - a.order) // 🔥 descending
        .map((p) => ({
          title: p.name,
          items: map.get(p.name) || [],
        }));
    }

    return [...PHASE_OPTIONS]
      .sort((a, b) => b.order - a.order) // 🔥 descending
      .map((p) => ({
        title: p.name,
        items: map.get(p.name) || [],
      }));
  }, [filteredCards, isRoadmap]);

  // AI summary input: every card the viewer may see (ignores UI filters),
  // grouped by the same phase labels the page uses, in workflow order.
  const summaryInput = useMemo(() => {
    const visible = homeFeed.filter((item) =>
      item.privacy === true ? item.username === user?.username : true,
    );
    const phaseLabelOf = (card: CardItem) =>
      isRoadmap
        ? PHASE_ID_TO_ROADMAP[card.phase ?? ""] || "Uncategorized"
        : PHASE_OPTIONS.find((p) => p.id === card.phase)?.name ||
          "Uncategorized";
    const ordered = isRoadmap
      ? ROADMAP_PHASE_OPTIONS.map((p) => p.name)
      : [...PHASE_OPTIONS].sort((a, b) => a.order - b.order).map((p) => p.name);

    const cards: SummaryCardInput[] = visible.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      text: c.text,
      username: c.username,
      category: c.category,
      phase: phaseLabelOf(c),
      roleTypes: c.roleTypes,
      createdAt: c.createdAt,
      weblink: c.weblink,
    }));
    const present = new Set(cards.map((c) => c.phase));
    const phases = [...ordered, "Uncategorized"].filter((p) => present.has(p));
    return { cards, phases };
  }, [homeFeed, user?.username, isRoadmap]);

  // Spaces with enough cards get their summary topic/tagline as the header.
  const SUMMARY_HEADER_MIN_CARDS = 10;
  const summaryHeaderOn = summaryInput.cards.length >= SUMMARY_HEADER_MIN_CARDS;
  const spaceSummary = useSpaceSummary({
    layerId,
    category: collectionCategory.name,
    phases: summaryInput.phases,
    cards: summaryInput.cards,
    auto: summaryHeaderOn,
  });
  const headerSummary = summaryHeaderOn ? spaceSummary.data : null;

  // Converge: open points per phase and the votes on them (shared state).
  const convergence = useConvergence({
    layerId,
    cards: summaryInput.cards,
    phases: summaryInput.phases,
    category: collectionCategory.name,
    topic: headerSummary?.topic,
    username: user?.username,
  });
  const headerLoading = summaryHeaderOn && !spaceSummary.data && !spaceSummary.error;

  const phaseAnchorId = (title: string) => `phase-${slugify(title)}`;

  const jumpToPhaseSection = (phase: string) => {
    document
      .getElementById(phaseAnchorId(phase))
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Same behaviour as card linkages (@id): move the selection to the card
  // and keep it there.
  const jumpToCardFromSummary = (id: number) => {
    // make sure UI filters don't hide the card we're pointing at
    if (!filteredCards.some((c) => c.id === id)) clearAllFilters();
    setTimeout(() => handleCardTagClick(id), 60);
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

  const stats = getCollectionStats();
  const contributors = getUniqueContributors();

  const handleCardClick = (item: CardItem) => {
    localStorage.setItem("expandedCard", JSON.stringify(item));
    router.push(`/card/${item.id}`);
  };

  // Toggle handlers for filters
  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const togglePhase = (phase: string) => {
    setSelectedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phase)) {
        next.delete(phase);
      } else {
        next.add(phase);
      }
      return next;
    });
  };

  const toggleRoleType = (roleTypeId: string) => {
    setSelectedRoleTypes((prev) => {
      const next = new Set(prev);
      if (next.has(roleTypeId)) {
        next.delete(roleTypeId);
      } else {
        next.add(roleTypeId);
      }
      return next;
    });
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setDateFilter("all");
    setCustomStart("");
    setCustomEnd("");
    setContentTypeFilter("all");
    setEngagementFilter("all");
    setSelectedPhase("all");
    setSelectedRoleTypes(new Set());
  };

  const activeFilterCount = [
    selectedPhase !== "all" ? 1 : 0,
    selectedRoleTypes.size,
    dateFilter === "custom"
      ? customStart || customEnd
        ? 1
        : 0
      : dateFilter !== "all"
        ? 1
        : 0,
    contentTypeFilter !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-[var(--mk-paper)]">
      <div data-summary-clear>
        <AppNav
          active={null}
          search={{ value: searchTerm, onChange: setSearchTerm, placeholder: "Search this space…" }}
          unreadCount={unreadCount}
          onNotifications={() => setIsNotificationsPopupOpen(true)}
          onInbox={() => setIsInboxPopupOpen(true)}
          onSettings={() => setIsSettingsPopupOpen(true)}
        />
      </div>

      {/* Main Content */}
      <main className="mk-grid px-4 pb-24 pt-32 md:pt-24">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() =>
              // Opened straight from a shared link: nothing to go back to, so go to Explore.
              window.history.length > 1 ? router.back() : router.push("/explore")
            }
            className={`${btn.plain} mb-4 px-3 py-1.5 text-[14px]`}
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
          {/* Sophisticated Collection Header */}
          <div className="mb-8">
            <div className="mk-hard overflow-hidden rounded-[6px] bg-white">
              <div className="flex items-center gap-2 border-b border-[var(--mk-ink)] px-3 py-1.5">
                <span className="flex gap-1" aria-hidden>
                  <span className="h-2 w-2 bg-[var(--mk-ink)]" />
                  <span className="h-2 w-2 bg-[#868896]" />
                  <span className="h-2 w-2 bg-[#c2c4cc]" />
                </span>
                <span className="truncate text-[10.5px] font-semibold uppercase tracking-[0.09em]">
                  space://{(headerSummary?.topic ?? "connected-collection").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}
                </span>
                {stats.isLocked && (
                  <span className="ml-auto inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-[var(--mk-amber)]">
                    <Lock className="h-3 w-3" /> Curated
                  </span>
                )}
              </div>

              <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <PixelLabel>Space · {collectionCategory.name}</PixelLabel>
                  {headerSummary ? (
                    <h1 className="mt-4">
                      <button
                        type="button"
                        onClick={() => setShowSummary(true)}
                        className="mk-display group inline text-left text-[2.2rem] transition-colors hover:text-[var(--mk-indigo)] sm:text-[3rem]"
                        title="Open space summary"
                      >
                        {/* The spark flows with the text and stays glued to the
                            last word, so it sits right after the title however
                            it wraps, raised like a superscript. */}
                        {(() => {
                          const words = headerSummary.topic.trim().split(/\s+/);
                          const last = words.pop();
                          return (
                            <>
                              {words.length > 0 && `${words.join(" ")} `}
                              <span className="whitespace-nowrap">
                                {last}
                                <span
                                  aria-hidden
                                  className="ml-2 inline-block align-top opacity-70 transition group-hover:rotate-12 group-hover:opacity-100 motion-reduce:transition-none"
                                >
                                  <PixelIcon name="spark" color="var(--mk-indigo)" className="h-7 w-7 sm:h-8 sm:w-8" />
                                </span>
                              </span>
                            </>
                          );
                        })()}
                      </button>
                    </h1>
                  ) : headerLoading ? (
                    <div className="mt-4 h-10 w-72 max-w-full animate-pulse bg-[var(--mk-indigo-soft)]" aria-label="Loading space topic" />
                  ) : (
                    <h1 className="mk-display mt-4 text-[2.2rem] sm:text-[3rem]">Connected Collection</h1>
                  )}
                  {headerSummary ? (
                    <button
                      type="button"
                      onClick={() => setShowSummary(true)}
                      className="mt-4 block max-w-2xl text-left text-[16px] leading-relaxed tracking-tight text-[var(--mk-ink-2)] hover:text-[var(--mk-ink)] sm:text-[16.5px]"
                    >
                      {headerSummary.tagline || "Discover interconnected perspectives and ideas in this collaborative space"}
                    </button>
                  ) : headerLoading ? (
                    <div className="mt-4 h-4 w-96 max-w-full animate-pulse bg-[#eceef3]" />
                  ) : (
                    <p className="mt-4 max-w-2xl text-[16px] leading-relaxed tracking-tight text-[var(--mk-ink-2)]">
                      Discover interconnected perspectives and ideas in this collaborative space
                    </p>
                  )}
                  {headerSummary && (
                    <p className="mt-3 flex items-center gap-1.5 text-[12.5px] tracking-tight text-[#868a9c]">
                      <PixelIcon name="spark" color="var(--mk-indigo)" className="h-3 w-3" />
                      Title and summary derived from the cards
                    </p>
                  )}

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button onClick={() => setShowSummary(true)} className={`${btn.plain} px-3.5 py-1.5 text-[14px]`} title="Summary of this space" aria-label="Open space summary">
                      <PixelIcon name="spark" color="var(--mk-indigo)" className="h-3.5 w-3.5" /> Summary
                    </button>
                    {/* Converge, only when there's something to converge on */}
                    {convergence.points.length > 0 && (
                      <ConvergeButton
                        count={convergence.points.length}
                        onClick={() => setConvergeScope(null)}
                        className="px-3.5 py-1.5 text-[14px]"
                      />
                    )}
                    <button onClick={() => setShowInvite(true)} className={`${btn.primary} px-3.5 py-1.5 text-[14px]`}>
                      Invite
                    </button>
                    <span className="inline-flex items-center gap-1.5 rounded-[4px] border border-[var(--mk-ink)] px-2 py-1 text-[13px] font-semibold tracking-tight">
                      <CategoryIcon className="h-3.5 w-3.5 text-[var(--mk-indigo)]" />
                      {collectionCategory.name}
                    </span>
                    {contributors.length > 0 && (
                      <span className="flex items-center gap-1 pl-1">
                        {contributors.slice(0, 8).map((username, index) => (
                          <span
                            key={username}
                            title={`@${username}`}
                            className="grid h-7 w-7 place-items-center rounded-[3px] border border-[var(--mk-ink)] text-[11px] font-bold text-white"
                            style={{ background: ["var(--mk-indigo)", "var(--mk-cyan)", "#d8628a", "#6b5a3e"][index % 4] }}
                          >
                            {username.charAt(0).toUpperCase()}
                          </span>
                        ))}
                        {contributors.length > 8 && (
                          <span className="pl-1 text-[12.5px] tabular-nums text-[var(--mk-ink-2)]">+{contributors.length - 8}</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                <dl className="grid grid-cols-2 self-start border-l border-t border-[var(--mk-ink)] lg:w-[300px]">
                  {[
                    { label: "Cards", value: stats.totalCards, color: "var(--mk-ink)" },
                    { label: "Contributors", value: stats.contributors, color: "var(--mk-ink)" },
                    { label: "Links", value: stats.hasWeblinks, color: "var(--mk-indigo)" },
                    { label: "Phases", value: groupedCards.filter((g) => g.items.length > 0).length, color: "var(--mk-cyan)" },
                  ].map((st) => (
                    <div key={st.label} className="border-b border-r border-[var(--mk-ink)] px-4 py-3">
                      <dd className="mk-display text-[2rem] tabular-nums" style={{ color: st.color }}>{st.value}</dd>
                      <dt className="mt-1 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-[var(--mk-ink-2)]">{st.label}</dt>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="border-t border-[var(--mk-ink)] px-5 py-3 sm:px-8">
                <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setShowFilters((v) => !v)}
                      className={`inline-flex items-center gap-2 rounded-[4px] border border-[var(--mk-ink)] px-3 py-1.5 text-[13.5px] font-semibold tracking-tight transition-colors ${
                        showFilters ? "bg-[var(--mk-ink)] text-white" : "bg-white hover:bg-[var(--mk-indigo-soft)]"
                      }`}
                      aria-expanded={showFilters}
                    >
                      <FilterIcon className="h-3.5 w-3.5" />
                      {showFilters ? "Hide filters" : "Filters"}
                    </button>
                    <button onClick={clearAllFilters} className="text-[13.5px] font-semibold tracking-tight text-[var(--mk-ink-2)] hover:text-[var(--mk-ink)]">
                      Clear all
                    </button>
                </div>
                {showFilters && (
                  <div className="mt-4 border-t border-[var(--mk-rule)] pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Phase */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-[var(--mk-ink)] mb-2">
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
                                // IMPORTANT: for roadmap we store bucket name (Backlog/Planned/...)
                                value={
                                  isRoadmap
                                    ? (phase as any).name
                                    : (phase as any).id
                                }
                              >
                                {isRoadmap
                                  ? (phase as any).name
                                  : `${(phase as any).order}. ${
                                      (phase as any).name
                                    }`}
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
                                    (p) => p.id === selectedPhase,
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

                      {/* Date */}
                      <div>
                        <label className="block text-sm font-medium text-[var(--mk-ink)] mb-2">
                          Date Range
                        </label>
                        <select
                          value={dateFilter}
                          onChange={(e) => {
                            const v = e.target.value as typeof dateFilter;
                            setDateFilter(v);
                            if (v !== "custom") {
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
                          <option value="custom">Custom range…</option>
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
                                max={new Date().toISOString().slice(0, 10)}
                                onChange={(e) => setCustomEnd(e.target.value)}
                                className="w-full bg-white text-[var(--mk-ink-2)] border border-[var(--mk-ink)] rounded-[4px] px-3 py-2 text-sm focus:outline-none  focus:shadow-[3px_3px_0_var(--mk-indigo)] focus:ring-0"
                              />
                            </div>
                            {(customStart || customEnd) && (
                              <div className="col-span-2 flex justify-end">
                                <button
                                  onClick={() => {
                                    setDateFilter("all");
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

                      {/* Role / Type */}
                      <div className="sm:col-span-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-[var(--mk-ink)] mb-2">
                          <Tag className="w-4 h-4 text-[var(--mk-cyan)]" />
                          <span>Role / Type</span>
                          <span className="text-xs text-[var(--mk-ink-2)] font-normal">
                            (What the card contributes)
                          </span>
                          {selectedRoleTypes.size > 0 && (
                            <span className="ml-auto text-xs px-2 py-0.5 bg-[var(--mk-cyan-soft)] text-[var(--mk-cyan-deep)] rounded-[4px]">
                              {selectedRoleTypes.size} selected
                            </span>
                          )}
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                          {ROLE_TYPE_OPTIONS.map((roleType) => {
                            const isSelected = selectedRoleTypes.has(
                              roleType.id,
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
                                <span className="truncate">
                                  {roleType.name}
                                </span>
                                {isSelected && (
                                  <Check className="w-3 h-3 flex-shrink-0 ml-1" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                        {selectedRoleTypes.size > 0 && (
                          <div className="mt-2 flex items-center justify-end">
                            <button
                              onClick={() => setSelectedRoleTypes(new Set())}
                              className="text-xs text-[var(--mk-ink-2)] hover:text-[var(--mk-ink)]"
                            >
                              Clear all role types
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Active badges */}
                      <div className="sm:col-span-2 flex justify-between items-center">
                        <div className="flex flex-wrap gap-2">
                          {selectedPhase !== "all" && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--mk-indigo-soft)] text-[var(--mk-indigo-deep)] rounded-[4px] text-xs">
                              <Workflow className="w-3 h-3" />
                              <span>
                                {isRoadmap
                                  ? selectedPhase
                                  : PHASE_OPTIONS.find(
                                      (p) => p.id === selectedPhase,
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

                          {[...selectedRoleTypes].map((rtId) => {
                            const roleType = ROLE_TYPE_OPTIONS.find(
                              (rt) => rt.id === rtId,
                            );
                            return (
                              <span
                                key={rtId}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--mk-cyan-soft)] text-[var(--mk-cyan-deep)] rounded-[4px] text-xs"
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
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-[var(--mk-rule)] text-[var(--mk-ink)] rounded-[4px] text-xs">
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
                          className="text-sm text-[var(--mk-ink-2)] hover:text-[var(--mk-ink)]"
                        >
                          Clear All Filters
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, index) => (
                <div key={index} className="animate-pulse rounded-[5px] border border-[var(--mk-rule)] bg-white p-5">
                  <div className="h-2.5 w-1/3 bg-[var(--mk-indigo-soft)]" />
                  <div className="mt-4 h-4 w-5/6 bg-[var(--mk-rule)]" />
                  <div className="mt-2 h-4 w-2/3 bg-[var(--mk-rule)]" />
                  <div className="mt-4 h-3 w-full bg-[#eceef3]" />
                  <div className="mt-6 h-3 w-1/2 bg-[#eceef3]" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="mx-auto max-w-md py-16 text-center">
              <h2 className="mk-display text-[1.8rem]">Couldn&apos;t load this space</h2>
              <p className="mt-3 text-[15px] tracking-tight text-[var(--mk-ink-2)]">{error}</p>
              <button onClick={() => window.location.reload()} className={`${btn.primary} mt-6 px-4 py-2 text-[14px]`}>
                Retry
              </button>
            </div>
          ) : (
            <div className="space-y-14">
              {/* Sections are listed newest phase first. Number them in
                  workflow order among the phases shown, so the earliest phase
                  (e.g. Seed) is §1 and empty phases don't leave gaps. */}
              {groupedCards
                .filter((group) => group.items.length > 0)
                .map((group, index, shown) => {
                  const sectionNo = shown.length - index;

                return (
                  <div key={group.title}>
                    {/* Phase header: numbered, like sections of a report */}
                    <div
                      id={phaseAnchorId(group.title)}
                      className="mb-6 flex scroll-mt-28 items-center gap-3 border-b border-[var(--mk-ink)] pb-3"
                    >
                      <PixelLabel>{`§${sectionNo} ${group.title}`}</PixelLabel>
                      {(convergence.countByPhase.get(group.title) ?? 0) > 0 && (
                        <ConvergeButton
                          count={convergence.countByPhase.get(group.title)!}
                          onClick={() => setConvergeScope(group.title)}
                          className="px-2.5 py-1 text-[12.5px]"
                        />
                      )}
                      <span className="ml-auto text-[12px] font-semibold tabular-nums tracking-tight text-[var(--mk-ink-2)]">
                        {group.items.length} {group.items.length === 1 ? "card" : "cards"}
                      </span>
                    </div>

                    {/* Cards */}
                    <MasonryGrid>
                      {group.items.map((item) => (
                        <div
                          id={`card-${item.id}`}
                          key={item.id}
                          data-suggest-id={item.id}
                          className="group relative scroll-mt-28"
                        >
                          <Card
                            user={item.username}
                            title={item.title}
                            description={item.description}
                            text={item.text}
                            image={item.image}
                            picture={item.picture}
                            selected={
                              (selectedCard?.id || Number(cardId)) === item.id
                            }
                            onClick={() => handleCardClick(item)}
                            onUserTagClick={handleUserTagClick}
                            onCardTagClick={handleCardTagClick}
                            showActions={true}
                            onLike={handleLike}
                            onRepost={handleRepost}
                            onSave={handleSave}
                            onShare={handleShare}
                            isLiked={isLiked(item.id)}
                            isReposted={isReposted(item.id)}
                            isSaved={isSaved(item.id)}
                            cardData={item}
                            weblink={item.weblink}
                            onUserClick={handleUserClick}
                            phaseId={item.phase ?? undefined}
                            roleTypeId={item.roleTypes ?? undefined}
                            phaseLabelOverride={
                              (item.category
                                ? normalizeCategoryId(item.category)
                                : collectionCategory.id) === "roadmap"
                                ? PHASE_ID_TO_ROADMAP[item.phase ?? ""]
                                : undefined
                            }
                          />
                        </div>
                      ))}
                    </MasonryGrid>
                  </div>
                );
              })}
            </div>
          )}

          {filteredCards.length === 0 && !isLoading && (
            <div className="mx-auto max-w-md py-16 text-center">
              <LogoBitmap className="mx-auto w-24 opacity-90" />
              <h2 className="mk-display mt-6 text-[1.8rem]">No cards match your filters</h2>
              <p className="mt-3 text-[15px] tracking-tight text-[var(--mk-ink-2)]">Try adjusting your search or clearing filters.</p>
            </div>
          )}
        </div>
      </main>

      {/* Convergence timers under 24h, floating above "Add a card".
          A converged point (or one whose card was posted) drops out. */}
      <ConvergeTimerDock
        items={convergence.points
          .filter((p) => convergence.timers[p.id] && convergence.tallyOf(p).winner == null)
          .map((p) => ({ point: p, timer: convergence.timers[p.id] }))}
        onOpen={(p) => setConvergeScope(p.phase === ACROSS ? null : p.phase)}
        onTimer={(id, op) => convergence.timer(id, op)}
      />

      {/* Add a card */}
      <button
        onClick={handleCreate}
        className={`${btn.primary} fixed bottom-6 right-6 z-30 px-4 py-3 text-[14px]`}
        aria-label="Add a card to this space"
      >
        <Plus className="h-4 w-4" /> Add a card
      </button>

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
        onAllRead={() => setUnreadCount(0)}
      />

      <CardSuggestionHover
        layerId={layerId}
        category={collectionCategory.name}
        phases={summaryInput.phases}
        cards={summaryInput.cards}
        disabled={showSummary}
        onDraft={draftFromSuggestion}
      />

      <SpaceSummaryModal
        open={showSummary}
        onClose={() => setShowSummary(false)}
        summary={spaceSummary}
        phases={summaryInput.phases}
        cards={summaryInput.cards}
        onJumpToPhase={jumpToPhaseSection}
        onJumpToCard={jumpToCardFromSummary}
        category={collectionCategory.name}
        layerId={layerId}
        onDraft={draftFromSuggestion}
        convergeCountByPhase={convergence.countByPhase}
        onConverge={(phase) => setConvergeScope(phase)}
      />

      <ConvergePanel
        open={convergeScope !== false}
        phase={convergeScope || null}
        convergence={convergence}
        onClose={() => setConvergeScope(false)}
        cards={summaryInput.cards}
        category={collectionCategory.name}
        topic={headerSummary?.topic}
        onJumpToCard={jumpToCardFromSummary}
        onDraft={(anchorId, card, phase) => draftFromSuggestion(anchorId, card, phase)}
      />

      {showInvite && (
        <LayerInviteModal
          layerId={layerId ?? 0}
          orgId={orgId!}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  );
}
