"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { FolderOpen } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import {
  ExternalLink,
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
    new Set()
  );
  const [selectedPhases, setSelectedPhases] = useState<Set<string>>(new Set());
  const [selectedRoleTypes, setSelectedRoleTypes] = useState<Set<string>>(
    new Set()
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
    desired: boolean
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
            prev.map((c) => (c.id === card.id ? { ...c, hasLiked: last } : c))
          );
        } else if (action === "repost") {
          setRepostedCards((prev) =>
            prev.map((c) =>
              c.id === card.id ? { ...c, hasReposted: last } : c
            )
          );
        } else {
          setSavedCards((prev) =>
            prev.map((c) => (c.id === card.id ? { ...c, hasSaved: last } : c))
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
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await axios.post(
        `/nest-api/likes/homefeed/${user.username}/${item.id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } else {
      await axios.delete(
        `/nest-api/likes/homefeed/${user.username}/${item.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      await axios.delete(
        `/nest-api/orgs/${orgId}/profilefeed/${user.username}/liked/${item.profileFeedItemId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
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
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await axios.post(
        `/nest-api/reposts/homefeed/${user.username}/${item.id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } else {
      await axios.delete(
        `/nest-api/reposts/homefeed/${user.username}/${item.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      await axios.delete(
        `/nest-api/orgs/${orgId}/profilefeed/${user.username}/reposted/${item.profileFeedItemId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
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
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await axios.post(
        `/nest-api/saves/homefeed/${user.username}/${item.id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } else {
      await axios.delete(
        `/nest-api/saves/homefeed/${user.username}/${item.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      await axios.delete(
        `/nest-api/orgs/${orgId}/profilefeed/${user.username}/saved/${item.profileFeedItemId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
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
        const layerId = localStorage.getItem("lastVisitedCardLayerid");

        const response = await fetch(
          `/nest-api/orgs/${orgId}/homefeed/layers/${layerId}/cards?username=${user.username}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: abort.signal,
          }
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
          setTimeout(() => router.replace("/"), 1000);
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

    fetchHomeFeedData();
    return () => abort.abort();
  }, [user, router]);

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
          (item.category && String(item.category).trim()) || "uncategorized"
      )
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
                  "uncategorized") === cat.id
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
        selectedPhase === "all" || item.phase === selectedPhase;

      // role types (any match)
      const matchesRoleTypes =
        selectedRoleTypes.size === 0 ||
        (item.roleTypes &&
          Array.from(selectedRoleTypes).some((rt: string) =>
            item.roleTypes?.includes(rt)
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
              }
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
              }
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
              }
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
          ]
        );

        setLikedCards(likedResults);
        setRepostedCards(repostedResults);
        setSavedCards(savedResults);

        const m: Record<string, boolean> = {};
        likedResults.forEach((c) => (m[keyOf("like", c.id)] = !!c.hasLiked));
        repostedResults.forEach(
          (c) => (m[keyOf("repost", c.id)] = !!c.hasReposted)
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
        : [...prev, { id: item.id, hasLiked: desired }]
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
            c.id === item.id ? { ...c, hasReposted: desired } : c
          )
        : [...prev, { id: item.id, hasReposted: desired }]
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
        : [...prev, { id: item.id, hasSaved: desired }]
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

  const handleCardTagClick = (cardId: number) => {
    scrollToCard(cardId, "smooth");
    setSelectedCard(homeFeed.find((c) => c.id === cardId) || null);
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

  // Filter logic
  const filteredCards = useMemo(() => {
    return displayCards.filter((card) => {
      const categoryMatch =
        selectedCategories.size === 0 ||
        selectedCategories.has(card.category || "");
      const phaseMatch =
        selectedPhases.size === 0 || selectedPhases.has(card.phase || "");
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Desktop Navbar - Hidden on Mobile */}
      <nav className="hidden md:block fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <Link href="/explore" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">C</span>
                </div>
                <span className="font-bold text-xl text-gray-900">
                  Collabrr
                </span>
              </Link>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center space-x-1">
              {[
                { name: "Home", href: "/home", key: "home" },
                { name: "Explore", href: "/explore", key: "explore" },
                { name: "Create", href: "/create", key: "create" },
              ].map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-md mx-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-full text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all duration-200"
                />
              </div>
            </div>

            {/* Action Icons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsNotificationsPopupOpen(true)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all duration-200 relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
                )}
              </button>

              <button
                onClick={() => setIsInboxPopupOpen(true)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all duration-200 relative"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></span>
              </button>

              <Link
                href="/profile"
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all duration-200"
              >
                <User className="w-5 h-5" />
              </Link>

              <button
                onClick={() => setIsSettingsPopupOpen(true)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all duration-200"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Header - Hidden on Desktop */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="px-4 py-3 space-y-3">
          {/* Top Row - Back, Logo and Menu */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <Link href="/explore" className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-blue-600 rounded-md flex items-center justify-center">
                  <span className="text-white font-bold text-xs">C</span>
                </div>
                <span className="font-bold text-lg text-gray-900">
                  Collection
                </span>
              </Link>
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-0 rounded-full text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all duration-200"
            />
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
          <div className="absolute top-0 right-0 w-64 h-full bg-white shadow-xl">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">Menu</span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <Link
                href="/home"
                className="flex items-center space-x-3 p-3 hover:bg-gray-100 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Home className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900">Home</span>
              </Link>
              <Link
                href="/explore"
                className="flex items-center space-x-3 p-3 hover:bg-gray-100 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Compass className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900">Explore</span>
              </Link>
              <Link
                href="/create"
                className="flex items-center space-x-3 p-3 hover:bg-gray-100 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Plus className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900">Create</span>
              </Link>
              <Link
                href="/profile"
                className="flex items-center space-x-3 p-3 hover:bg-gray-100 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <User className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900">Profile</span>
              </Link>
              <button
                onClick={() => {
                  setIsNotificationsPopupOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center space-x-3 p-3 hover:bg-gray-100 rounded-lg w-full text-left"
              >
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900">Notifications</span>
                {unreadCount > 0 && (
                  <span className="ml-auto w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
              <button
                onClick={() => {
                  setIsInboxPopupOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center space-x-3 p-3 hover:bg-gray-100 rounded-lg w-full text-left"
              >
                <MessageCircle className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900">Messages</span>
                <span className="ml-auto w-2 h-2 bg-blue-500 rounded-full"></span>
              </button>
              <Link
                href="/"
                className="flex items-center space-x-3 p-3 hover:bg-gray-100 rounded-lg"
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("user");
                  setIsMobileMenuOpen(false);
                }}
              >
                <User className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900">Logout</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="pt-34 md:pt-24 px-4 pb-8">
        <div className="max-w-7xl mx-auto">
          {/* Sophisticated Collection Header */}
          <div className="mb-8">
            {/* Connection Visualization */}
            <div className="relative mb-6 ">
              <div className="flex items-center justify-center px-4">
                <div className="flex items-center space-x-2 sm:space-x-4 max-w-full">
                  {/* Connection nodes */}
                  <div className="flex -space-x-1 sm:-space-x-2">
                    {contributors.slice(0, 3).map((username, index) => (
                      <div
                        key={username}
                        className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full border-2 sm:border-4 border-white shadow-lg bg-gradient-to-br ${
                          index === 0
                            ? "from-purple-400 to-pink-400"
                            : index === 1
                            ? "from-blue-400 to-cyan-400"
                            : "from-green-400 to-emerald-400"
                        } flex items-center justify-center text-white font-bold text-xs sm:text-sm z-${
                          10 + index
                        }`}
                      >
                        {username.charAt(0).toUpperCase()}
                      </div>
                    ))}
                    {displayCards.length > 3 && (
                      <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full border-2 sm:border-4 border-white text-white shadow-lg bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                        +{displayCards.length - 1}
                      </div>
                    )}
                  </div>

                  {/* Connection lines */}
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <div className="w-4 sm:w-8 h-0.5 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full"></div>
                    <Link2 className="w-4 h-4 sm:w-6 sm:h-6 text-purple-500 animate-pulse" />
                    <div className="w-4 sm:w-8 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
                  </div>

                  {/* Central connection hub */}
                  <div className="relative">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 shadow-2xl flex items-center justify-center">
                      <Layers className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-6 sm:h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                      <Sparkles className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating connection indicators */}
              <div className="absolute top-0 left-1/4 animate-bounce delay-100">
                <div className="w-2 h-2 bg-purple-400 rounded-full opacity-60"></div>
              </div>
              <div className="absolute top-4 right-1/3 animate-bounce delay-300">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full opacity-60"></div>
              </div>
              <div className="absolute bottom-2 left-1/3 animate-bounce delay-500">
                <div className="w-1 h-1 bg-cyan-400 rounded-full opacity-60"></div>
              </div>
            </div>

            {/* Collection Info Panel */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-4 sm:p-6 mb-6 mx-auto max-w-full overflow-hidden">
              <div className="flex flex-col lg:flex-row items-center justify-between space-y-4 lg:space-y-0">
                {/* Main Info */}
                <div className="text-center lg:text-left w-full lg:w-auto">
                  <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
                      Connected Collection
                    </h1>
                    {stats.isLocked && (
                      <div className="flex items-center space-x-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-medium">
                        <Lock className="w-4 h-4" />
                        <span>Curated</span>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm sm:text-base lg:text-lg">
                    Discover interconnected perspectives and ideas in this
                    collaborative space
                  </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center border border-purple-200">
                    <div className="flex items-center justify-center mb-1 sm:mb-2">
                      <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                    </div>
                    <div className="text-lg sm:text-2xl font-bold text-purple-700">
                      {stats.totalCards}
                    </div>
                    <div className="text-xs text-purple-600 font-medium">
                      Cards
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center border border-blue-200">
                    <div className="flex items-center justify-center mb-1 sm:mb-2">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    </div>
                    <div className="text-lg sm:text-2xl font-bold text-blue-700">
                      {stats.contributors}
                    </div>
                    <div className="text-xs text-blue-600 font-medium">
                      Contributors
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center border border-green-200">
                    <div className="flex items-center justify-center mb-1 sm:mb-2">
                      <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    </div>
                    <div className="text-lg sm:text-2xl font-bold text-green-700">
                      {stats.hasWeblinks}
                    </div>
                    <div className="text-xs text-green-600 font-medium">
                      Links
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center border border-orange-200">
                    <div className="flex items-center justify-center mb-1 sm:mb-2">
                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                    </div>
                    <div className="text-lg sm:text-2xl font-bold text-orange-700">
                      {Math.floor(Math.random() * 100) + 50}%
                    </div>
                    <div className="text-xs text-orange-600 font-medium">
                      Engagement
                    </div>
                  </div>
                </div>
              </div>

              {/* Contributors Preview */}
              {contributors.length > 0 && (
                <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                  {/* Contributors */}
                  <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 w-full">
                    <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-600">
                          Contributors:
                        </span>
                        <div className="flex -space-x-1 sm:-space-x-2">
                          {contributors.map((username, index) => (
                            <div
                              key={username}
                              className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-white shadow-md bg-gradient-to-br ${
                                index % 4 === 0
                                  ? "from-purple-400 to-pink-400"
                                  : index % 4 === 1
                                  ? "from-blue-400 to-cyan-400"
                                  : index % 4 === 2
                                  ? "from-green-400 to-emerald-400"
                                  : "from-orange-400 to-red-400"
                              } flex items-center justify-center text-white font-bold text-xs`}
                              title={username}
                            >
                              {username.charAt(0).toUpperCase()}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center  ">
                    {/* Category pill */}
                    <div className="mt-1 lg:mt-6 pt-1 lg:pt-6 inline-flex items-center ml-4">
                      <span className="text-sm font-medium text-gray-600 mr-2">
                        Category:
                      </span>
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${collectionCategory.bgColor} ${collectionCategory.color}`}
                      >
                        <CategoryIcon className="w-4 h-4" />
                        <span>{collectionCategory.name}</span>
                      </span>
                    </div>

                    {/* Invite button */}
                    <div className="mt-2 lg:mt-6 pt-2 lg:pt-6">
                      <button
                        onClick={() => setShowInvite(true)}
                        className="ml-0 lg:ml-4 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-full hover:bg-purple-700"
                      >
                        Invite
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4">
                  {/* <div className="flex items-center gap-3">
                  <SlidersHorizontal className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    Filters
                  </span>
                  {activeFilterCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-purple-600 text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </div> */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowFilters((v) => !v)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition ${
                        showFilters
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <FilterIcon className="w-4 h-4" />
                      <span>{showFilters ? "Hide" : "Show"} Filters</span>
                    </button>
                    <button
                      onClick={clearAllFilters}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                {showFilters && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Phase */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                          <Workflow className="w-4 h-4 text-purple-600" />
                          <span>Phase</span>
                          <span className="text-xs text-gray-500 font-normal">
                            (Work cycle stage)
                          </span>
                        </label>
                        <div className="relative">
                          <select
                            value={selectedPhase}
                            onChange={(e) => setSelectedPhase(e.target.value)}
                            className="w-full bg-gray-50 text-gray-600 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none pr-10"
                          >
                            <option value="all">All Phases</option>
                            {PHASE_OPTIONS.map((phase) => (
                              <option key={phase.id} value={phase.id}>
                                {phase.order}. {phase.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                        {selectedPhase !== "all" && (
                          <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="text-purple-600 font-medium">
                              {
                                PHASE_OPTIONS.find(
                                  (p) => p.id === selectedPhase
                                )?.name
                              }
                            </span>
                            <button
                              onClick={() => setSelectedPhase("all")}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              Clear
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
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
                          className="w-full bg-gray-50 text-gray-600 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                              <label className="block text-xs text-gray-500 mb-1">
                                From
                              </label>
                              <input
                                type="date"
                                value={customStart}
                                max={customEnd || undefined}
                                onChange={(e) => setCustomStart(e.target.value)}
                                className="w-full bg-gray-50 text-gray-600 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">
                                To
                              </label>
                              <input
                                type="date"
                                value={customEnd}
                                min={customStart || undefined}
                                max={new Date().toISOString().slice(0, 10)}
                                onChange={(e) => setCustomEnd(e.target.value)}
                                className="w-full bg-gray-50 text-gray-600 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                                  className="text-xs text-gray-500 hover:text-gray-700"
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
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                          <Tag className="w-4 h-4 text-blue-600" />
                          <span>Role / Type</span>
                          <span className="text-xs text-gray-500 font-normal">
                            (What the card contributes)
                          </span>
                          {selectedRoleTypes.size > 0 && (
                            <span className="ml-auto text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                              {selectedRoleTypes.size} selected
                            </span>
                          )}
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                          {ROLE_TYPE_OPTIONS.map((roleType) => {
                            const isSelected = selectedRoleTypes.has(
                              roleType.id
                            );
                            return (
                              <button
                                key={roleType.id}
                                onClick={() => toggleRoleType(roleType.id)}
                                className={`relative flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                                  isSelected
                                    ? "bg-blue-100 text-blue-700 border-2 border-blue-300"
                                    : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
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
                              className="text-xs text-gray-500 hover:text-gray-700"
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
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs">
                              <Workflow className="w-3 h-3" />
                              <span>
                                {
                                  PHASE_OPTIONS.find(
                                    (p) => p.id === selectedPhase
                                  )?.name
                                }
                              </span>
                              <button
                                onClick={() => setSelectedPhase("all")}
                                className="ml-1 hover:bg-purple-200 rounded-full p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          )}
                          {[...selectedRoleTypes].map((rtId) => {
                            const roleType = ROLE_TYPE_OPTIONS.find(
                              (rt) => rt.id === rtId
                            );
                            return (
                              <span
                                key={rtId}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs"
                              >
                                <Tag className="w-3 h-3" />
                                <span>{roleType?.name}</span>
                                <button
                                  onClick={() => toggleRoleType(rtId)}
                                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            );
                          })}
                          {dateFilter === "custom" &&
                            (customStart || customEnd) && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs">
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
                                  className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            )}
                        </div>
                        <button
                          onClick={clearAllFilters}
                          className="text-sm text-gray-600 hover:text-gray-900"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="h-48 bg-gray-200"></div>
                    <div className="p-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <div className="text-red-500 text-lg mb-2">
                Error loading cards
              </div>
              <div className="text-gray-500 text-sm mb-4">{error}</div>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <MasonryGrid>
              {filteredCards.map((item, index) => (
                <div
                  id={`card-${item.id}`}
                  className="group relative scroll-mt-28 md:scroll-mt-28"
                  key={item.id}
                >
                  {/* Card Wrapper with hover detection */}
                  <div className="relative transition-all duration-300">
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
                    />
                  </div>
                </div>
              ))}
            </MasonryGrid>
          )}

          {filteredCards.length === 0 && !isLoading && (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <Layers className="w-12 h-12 text-gray-400" />
              </div>
              <div className="text-gray-400 text-lg mb-2">
                No cards match your filters
              </div>
              <div className="text-gray-500 text-sm">
                Try adjusting your search criteria
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Enhanced Floating Add Button */}
      <button
        onClick={handleCreate}
        className="fixed bottom-6 right-6 w-20 h-20 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300 flex items-center justify-center z-30 group"
      >
        <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full animate-pulse"></div>
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
