"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  Heart,
  Repeat2,
  Bookmark,
  Share,
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
} from "lucide-react";
import axios from "axios";
import Card from "@/components/card";
import InboxPopup from "@/components/popups/inbox-popup";
import SettingsPopup from "@/components/popups/settings-popup";
import NotificationsPopup from "@/components/popups/notifications-popup";
import MasonryGrid from "@/components/masonry-grid";
import LayerInviteModal from "@/components/modals/LayerInviteModal";

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
}

export interface InteractionState {
  id: number;
  hasLiked?: boolean;
  hasReposted?: boolean;
  hasSaved?: boolean;
}

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
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await axios.delete(
        `/nest-api/orgs/${orgId}/profilefeed/${user.username}/liked/${item.profileFeedItemId}`,
        { headers: { Authorization: `Bearer ${token}` } }
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
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await axios.delete(
        `/nest-api/orgs/${orgId}/profilefeed/${user.username}/reposted/${item.profileFeedItemId}`,
        { headers: { Authorization: `Bearer ${token}` } }
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
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await axios.delete(
        `/nest-api/orgs/${orgId}/profilefeed/${user.username}/saved/${item.profileFeedItemId}`,
        { headers: { Authorization: `Bearer ${token}` } }
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
              { headers: { Authorization: `Bearer ${token}` } }
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
              { headers: { Authorization: `Bearer ${token}` } }
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
              { headers: { Authorization: `Bearer ${token}` } }
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
        likedCards.forEach((c) => (m[keyOf("like", c.id)] = !!c.hasLiked));
        repostedCards.forEach(
          (c) => (m[keyOf("repost", c.id)] = !!c.hasReposted)
        );
        savedCards.forEach((c) => (m[keyOf("save", c.id)] = !!c.hasSaved));
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
                        +{displayCards.length - 3}
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
                <div className="flex flex-row items-center justify-between ">
                  <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
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
                  <div className="mt-4 pt-4">
                    <button
                      onClick={() => setShowInvite(true)}
                      className="ml-0  lg:ml-4 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-full hover:bg-purple-700"
                    >
                      Invite
                    </button>
                  </div>
                </div>
              )}
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
              {displayCards.map((item, index) => (
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
                    />
                  </div>
                </div>
              ))}
            </MasonryGrid>
          )}

          {displayCards.length === 0 && !isLoading && (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <Layers className="w-12 h-12 text-gray-400" />
              </div>
              <div className="text-gray-400 text-lg mb-2">
                No connected cards found
              </div>
              <div className="text-gray-500 text-sm">
                This collection is waiting for its first connection
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
