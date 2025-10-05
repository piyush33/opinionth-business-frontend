"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import Card from "@/components/card";
import InboxPopup from "@/components/popups/inbox-popup";
import SettingsPopup from "@/components/popups/settings-popup";
import NotificationsPopup from "@/components/popups/notifications-popup";
import MasonryGrid from "@/components/masonry-grid";
import {
  type Category,
  DEFAULT_CATEGORIES,
  checkDateFilter,
  checkContentType,
  sortOptions,
} from "@/utils/filters";
import {
  getSavedCustomCats,
  ensureSaved,
  hydrateForUI,
} from "@/utils/customCategories";
import { FolderOpen } from "lucide-react";

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
  const [homeFeed, setHomeFeed] = useState<CardItem[]>([]);
  const [filteredFeed, setFilteredFeed] = useState<CardItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCategorySidebarOpen, setIsCategorySidebarOpen] = useState(true);

  // Popup states
  const [isInboxPopupOpen, setIsInboxPopupOpen] = useState(false);
  const [isSettingsPopupOpen, setIsSettingsPopupOpen] = useState(false);
  const [isNotificationsPopupOpen, setIsNotificationsPopupOpen] =
    useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Filter states
  const [dateFilter, setDateFilter] = useState("all");
  const [contentTypeFilter, setContentTypeFilter] = useState("all");
  const [engagementFilter, setEngagementFilter] = useState("all");
  const [selectedPhase, setSelectedPhase] = useState<string>("all");
  const [selectedRoleTypes, setSelectedRoleTypes] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem("profileUser");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

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

  useEffect(() => {
    const fetchHomeFeedData = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        const token = localStorage.getItem("token");
        const orgId = getActiveOrgId();
        const response = await fetch(
          `/nest-api/orgs/${orgId}/homefeed/user/${user.username}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        const enrichedData = data.map((item: any) => {
          const normalized = normalizeCategoryId(item.category);
          return {
            ...item,
            _rawCategory: item.category ?? null, // optional: keep original for UI if needed
            category: normalized, // the id we use everywhere
            createdAt: item.createdAt,
          };
        });

        setHomeFeed(enrichedData);
      } catch (error) {
        console.error("Error fetching home feed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHomeFeedData();
  }, [user]);

  const DEFAULT_IDS = new Set<string>(
    DEFAULT_CATEGORIES.map((c) => c.id).concat(["uncategorized"])
  );

  // NEW: derive categories from defaults + cookie + feed, and persist new ones
  useEffect(() => {
    // Collect category ids from feed (fallback to 'uncategorized')
    const idsFromFeed = new Set<string>(
      homeFeed.map(
        (item) =>
          (item.category && String(item.category).trim()) || "uncategorized"
      )
    );

    // Persist any *new* non-default ids from feed into the cookie (dedup handled inside helper)
    const toSave = [...idsFromFeed].filter((id) => id && !DEFAULT_IDS.has(id));
    if (toSave.length) {
      ensureSaved(toSave); // writes only what's missing
    }

    // Pull the full saved list (now includes any just-saved ids) and hydrate with FolderOpen icon for Explore
    const savedCustomHydrated = hydrateForUI(getSavedCustomCats(), FolderOpen);

    // Start with defaults + saved customs; dedupe by id
    const dedup = new Map<string, Category>();
    [...DEFAULT_CATEGORIES, ...savedCustomHydrated].forEach((c) =>
      dedup.set(c.id, c)
    );
    const base = Array.from(dedup.values());

    // Ensure 'uncategorized' exists
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

    // Add any remaining feed categories that aren't in base yet (these will also have been saved above)
    idsFromFeed.forEach((id) => {
      if (!base.some((c) => c.id === id)) {
        base.push(makeCustomCategory(id));
      }
    });

    // Recalculate counts immutably
    const withCounts = base.map((cat) => ({
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

    setCategories(withCounts);

    // Keep selection valid
    if (!withCounts.some((c) => c.id === selectedCategory)) {
      setSelectedCategory("all");
    }
  }, [homeFeed, selectedCategory]);

  useEffect(() => {
    const filtered = homeFeed.filter((item) => {
      // Privacy check
      const isAllowedToView =
        item.privacy === true ? item.username === user?.username : true;

      if (!isAllowedToView) return false;

      // Search filter
      const matchesSearch =
        !searchTerm ||
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.username?.toLowerCase().includes(searchTerm.toLowerCase());

      // Category filter
      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;

      // Phase filter
      const matchesPhase =
        selectedPhase === "all" || item.phase === selectedPhase;

      // Role Types filter (multi-select - item must have at least one selected role type)
      const matchesRoleTypes =
        selectedRoleTypes.length === 0 ||
        (item.roleTypes &&
          selectedRoleTypes.some((rt) => item.roleTypes?.includes(rt)));

      // Date filter
      const matchesDate =
        dateFilter === "all" || checkDateFilter(item.createdAt, dateFilter);

      // Content type filter
      const matchesContentType =
        contentTypeFilter === "all" ||
        checkContentType(item, contentTypeFilter);

      // Engagement filter
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

    // Sort filtered results
    filtered.sort((a, b) => b.id - a.id); // Sort by id descending

    setFilteredFeed(filtered);
  }, [
    homeFeed,
    searchTerm,
    selectedCategory,
    selectedPhase,
    selectedRoleTypes,
    sortBy,
    dateFilter,
    contentTypeFilter,
    engagementFilter,
    user,
  ]);

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
  };

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

  const handleUserTagClick = (username: string) => {
    if (username === user?.username) {
      router.push("/profile");
    } else {
      localStorage.setItem("profileUsername", username);
      router.push("/profile/user");
    }
  };

  const handleCardTagClick = (cardId: number) => {
    const cardElement = document.getElementById(`card-${cardId}`);
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
    dateFilter !== "all" ? 1 : 0,
    contentTypeFilter !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Navbar - Hidden on Mobile */}
      <nav className="hidden md:block fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-full mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <Link href="/explore" className="flex items-center space-x-3">
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
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    item.key === "explore"
                      ? "bg-gray-900 text-white shadow-lg"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Enhanced Search Bar */}
            <div className="flex-1 max-w-md mx-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search whiteboards, users, topics..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white focus:border-purple-300 transition-all duration-200"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Action Icons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsNotificationsPopupOpen(true)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
                )}
              </button>

              <button
                onClick={() => setIsInboxPopupOpen(true)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 relative"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></span>
              </button>

              <Link
                href="/profile"
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                <User className="w-5 h-5" />
              </Link>

              <button
                onClick={() => setIsSettingsPopupOpen(true)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Header - Hidden on Desktop */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-3 space-y-3">
          {/* Top Row - Logo and Menu */}
          <div className="flex items-center justify-between">
            <Link href="/explore" className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-blue-600 rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-xs">C</span>
              </div>
              <span className="font-bold text-lg text-gray-900">Explore</span>
            </Link>

            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex-1 ${selectedCategoryData.bgColor} ${selectedCategoryData.color}`}
            >
              <selectedCategoryData.icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{selectedCategoryData.name}</span>
              <ChevronRight className="w-4 h-4 flex-shrink-0" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search whiteboards, users, topics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {isMobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileSidebarOpen(false)}
          ></div>
          <div className="absolute inset-0 bg-white">
            {/* Mobile Sidebar Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Categories
                </h2>
                <p className="text-sm text-gray-500">
                  Organize your whiteboards
                </p>
              </div>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Mobile Category List */}
            <div className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-80px)]">
              {categories.map((category) => {
                const IconComponent = category.icon;
                const isSelected = selectedCategory === category.id;

                return (
                  <button
                    key={category.id}
                    onClick={() => handleMobileCategorySelect(category.id)}
                    className={`w-full flex items-center space-x-3 p-4 rounded-xl text-left transition-all duration-200 ${
                      isSelected
                        ? `${category.bgColor} ${category.color} shadow-sm`
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                        isSelected ? "bg-white/20" : category.bgColor
                      }`}
                    >
                      <IconComponent
                        className={`w-5 h-5 ${
                          isSelected ? "text-current" : category.color
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-base truncate">
                          {category.name}
                        </span>
                        <span
                          className={`text-sm px-2 py-1 rounded-full ${
                            isSelected
                              ? "bg-white/20 text-current"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {category.count || 0}
                        </span>
                      </div>
                      <p
                        className={`text-sm mt-1 ${
                          isSelected
                            ? "text-current opacity-80"
                            : "text-gray-500"
                        }`}
                      >
                        {category.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Layout with Sidebar */}
      <div className="flex pt-16 md:pt-16">
        <aside
          className={`hidden md:block fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 transition-all duration-300 ${
            isCategorySidebarOpen ? "w-80" : "w-16"
          } overflow-y-auto`}
        >
          <div className="p-4">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between mb-6">
              {isCategorySidebarOpen && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Categories
                  </h2>
                  <p className="text-sm text-gray-500">
                    Organize your whiteboards
                  </p>
                </div>
              )}
              <button
                onClick={() => setIsCategorySidebarOpen(!isCategorySidebarOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight
                  className={`w-4 h-4 text-gray-600 transition-transform ${
                    isCategorySidebarOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>

            {/* Category List */}
            <div className="space-y-1">
              {categories.map((category) => {
                const IconComponent = category.icon;
                const isSelected = selectedCategory === category.id;

                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-all duration-200 group ${
                      isSelected
                        ? `${category.bgColor} ${category.color} shadow-sm`
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                    title={!isCategorySidebarOpen ? category.name : ""}
                  >
                    <div
                      className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${
                        isSelected ? "bg-white/20" : category.bgColor
                      }`}
                    >
                      <IconComponent
                        className={`w-4 h-4 ${
                          isSelected ? "text-current" : category.color
                        }`}
                      />
                    </div>

                    {isCategorySidebarOpen && (
                      <>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm truncate">
                              {category.name}
                            </span>
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                isSelected
                                  ? "bg-white/20 text-current"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {category.count || 0}
                            </span>
                          </div>
                          <p
                            className={`text-xs mt-1 truncate ${
                              isSelected
                                ? "text-current opacity-80"
                                : "text-gray-500"
                            }`}
                          >
                            {category.description}
                          </p>
                        </div>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <main
          className={`flex-1 min-w-0 transition-all duration-300 mt-25 md:mt-0 ${
            isCategorySidebarOpen ? "md:ml-80" : "md:ml-16"
          }`}
        >
          <div className="p-4 md:p-6 ">
            <div className="mb-6 md:mb-8">
              <div className="flex items-center space-x-3 md:space-x-4 mb-3 md:mb-4">
                <div
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center ${selectedCategoryData.bgColor}`}
                >
                  <selectedCategoryData.icon
                    className={`w-5 h-5 md:w-6 md:h-6 ${selectedCategoryData.color}`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 truncate">
                    {selectedCategoryData.name}
                  </h1>
                  <p className="text-gray-600 mt-1 text-sm md:text-base line-clamp-2">
                    {selectedCategoryData.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 md:space-x-4 text-xs md:text-sm text-gray-500">
                <span>{filteredFeed.length} whiteboards</span>
                <span>•</span>
                <span className="hidden sm:inline">
                  Updated {new Date().toLocaleDateString()}
                </span>
                <span className="sm:hidden">Updated today</span>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 md:p-4 mb-4 md:mb-6">
              <div className="space-y-3 md:space-y-4">
                <div className="flex flex-col space-y-3 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
                  {/* Left Controls - Stack on mobile */}
                  <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
                    <div className="flex items-center space-x-2">
                      <SlidersHorizontal className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                        Sort by:
                      </span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 md:py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-0 flex-1"
                      >
                        {sortOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`flex items-center justify-center space-x-2 px-3 py-1.5 md:py-1 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                        showFilters
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <Filter className="w-4 h-4 flex-shrink-0" />
                      <span>Filters</span>
                      {activeFilterCount > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-purple-600 text-white text-xs rounded-full">
                          {activeFilterCount}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Right Controls - Stack on mobile */}
                  <div className="flex items-center justify-between sm:justify-end space-x-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <span className="whitespace-nowrap">
                        {filteredFeed.length} results
                      </span>
                    </div>

                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={`p-1.5 md:p-1 rounded ${
                          viewMode === "grid" ? "bg-white shadow-sm" : ""
                        }`}
                      >
                        <Grid3X3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        className={`p-1.5 md:p-1 rounded ${
                          viewMode === "list" ? "bg-white shadow-sm" : ""
                        }`}
                      >
                        <List className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {showFilters && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Phase Filter */}
                    <div className="sm:col-span-2 lg:col-span-1">
                      <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
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
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none pr-10"
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
                              PHASE_OPTIONS.find((p) => p.id === selectedPhase)
                                ?.name
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

                    {/* Role Type Filter */}
                    <div className="sm:col-span-2 lg:col-span-2">
                      <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                        <Tag className="w-4 h-4 text-blue-600" />
                        <span>Role / Type</span>
                        <span className="text-xs text-gray-500 font-normal">
                          (What the card contributes)
                        </span>
                        {selectedRoleTypes.length > 0 && (
                          <span className="ml-auto text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
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
                              className={`relative flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                                isSelected
                                  ? "bg-blue-100 text-blue-700 border-2 border-blue-300"
                                  : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
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
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Clear all role types
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date Range
                      </label>
                      <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Content Type
                      </label>
                      <select
                        value={contentTypeFilter}
                        onChange={(e) => setContentTypeFilter(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="all">All Types</option>
                        <option value="images">Images</option>
                        <option value="text">Text Only</option>
                        <option value="links">Links</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2 md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Engagement
                      </label>
                      <select
                        value={engagementFilter}
                        onChange={(e) => setEngagementFilter(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="all">All Levels</option>
                        <option value="high">High Engagement</option>
                        <option value="medium">Medium Engagement</option>
                        <option value="low">Low Engagement</option>
                      </select>
                    </div>
                  </div>

                  {/* Active Filter Badges */}
                  <div className="flex justify-between items-center mt-4">
                    <div className="flex flex-wrap gap-2">
                      {selectedPhase !== "all" && (
                        <span className="inline-flex items-center space-x-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs">
                          <Workflow className="w-3 h-3" />
                          <span>
                            {
                              PHASE_OPTIONS.find((p) => p.id === selectedPhase)
                                ?.name
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
                      {selectedRoleTypes.map((rtId) => {
                        const roleType = ROLE_TYPE_OPTIONS.find(
                          (rt) => rt.id === rtId
                        );
                        return (
                          <span
                            key={rtId}
                            className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs"
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
                    </div>
                    <button
                      onClick={clearAllFilters}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap"
                    >
                      Clear All Filters
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Content Grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
                {[...Array(12)].map((_, index) => (
                  <div key={index} className="animate-pulse">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="h-32 md:h-48 bg-gray-200"></div>
                      <div className="p-2 md:p-4">
                        <div className="h-3 md:h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-2 md:h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredFeed.length > 0 ? (
              <div className="w-full overflow-x-hidden">
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
                    />
                  ))}
                </MasonryGrid>
              </div>
            ) : (
              <div className="text-center py-12 md:py-16 px-4">
                <div
                  className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${selectedCategoryData.bgColor}`}
                >
                  <selectedCategoryData.icon
                    className={`w-10 h-10 md:w-12 md:h-12 ${selectedCategoryData.color}`}
                  />
                </div>
                <div className="text-gray-900 text-lg font-medium mb-2">
                  No whiteboards found
                </div>
                <div className="text-gray-500 text-sm mb-4 max-w-md mx-auto">
                  {searchTerm
                    ? `No whiteboards match "${searchTerm}" in ${selectedCategoryData.name}`
                    : `No whiteboards in ${selectedCategoryData.name} yet`}
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={clearAllFilters}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Clear Filters
                  </button>
                  <Link
                    href="/create"
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Create Whiteboard
                  </Link>
                </div>
              </div>
            )}
          </div>
        </main>

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
