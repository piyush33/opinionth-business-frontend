"use client";

import type React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  Bell,
  MessageCircle,
  UserIcon,
  ChevronDown,
  ArrowLeft,
  X,
  Home,
  Compass,
  Plus,
  Heart,
  Share,
  Bookmark,
  MoreHorizontal,
  ExternalLink,
} from "lucide-react";
import MasonryGrid from "@/components/masonry-grid";
import { CommentSection } from "@/components/comment-section";
import { PopupMenu } from "@/components/popup-menu";
import Card from "@/components/card";
import InboxPopup from "@/components/popups/inbox-popup";
import SettingsPopup from "@/components/popups/settings-popup";
import NotificationsPopup from "@/components/popups/notifications-popup";
import axios from "axios";

// Types
interface CardData {
  id: number;
  title: string;
  description: string;
  text?: string;
  image?: string;
  username: string;
  picture?: string;
  layer: Record<string, any>;
  createdAt?: string;
  weblink?: string;
  reposted: boolean;
}

interface Comment {
  id: string;
  username: string;
  image?: string;
  comment: string;
  replies: Reply[];
  createdAt?: string;
}

interface Reply {
  id: string;
  username: string;
  image?: string;
  reply: string;
  createdAt?: string;
}

interface UserProfile {
  id: string;
  username: string;
  image?: string;
  followers?: number;
}

interface InteractionState {
  id: number;
  hasLiked?: boolean;
  hasSaved?: boolean;
}

// Constants
const API_BASE_URL = "https://dn2h1x2q2afc3.cloudfront.net";

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

// Custom hooks
const useAuth = () => {
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("token");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }, []);

  const getUser = useCallback((): UserProfile | null => {
    const userData = localStorage.getItem("profileUser");
    return userData ? JSON.parse(userData) : null;
  }, []);

  return { getAuthHeaders, getUser };
};

// API service
const createApiService = (
  getAuthHeaders: () => Record<string, string>,
  getUser: () => UserProfile | null,
  onUnauthorized: () => void
) => ({
  fetchHomeFeed: async (): Promise<CardData[]> => {
    const orgId = getActiveOrgId();
    const user = getUser();

    const response = await fetch(
      `${API_BASE_URL}/orgs/${orgId}/homefeed/user/${user?.username}`,
      {
        headers: getAuthHeaders(),
      }
    );
    if (response.status === 401) {
      onUnauthorized();
      throw new Error("Unauthorized");
    }
    if (!response.ok) throw new Error("Failed to fetch home feed");
    return response.json();
  },

  fetchComments: async (cardId: number): Promise<Comment[]> => {
    const response = await fetch(`${API_BASE_URL}/comments/${cardId}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch comments");
    return response.json();
  },

  postComment: async (
    cardId: number,
    username: string,
    image: string,
    comment: string
  ) => {
    const response = await fetch(`${API_BASE_URL}/comments/${cardId}`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ username, image, comment }),
    });
    if (!response.ok) throw new Error("Failed to post comment");
    return response.json();
  },

  postReply: async (
    commentId: string,
    username: string,
    image: string,
    reply: string
  ) => {
    const response = await fetch(
      `${API_BASE_URL}/comments/${commentId}/replies`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ username, image, reply }),
      }
    );
    if (!response.ok) throw new Error("Failed to post reply");
    return response.json();
  },

  deleteCardByContent: async (card: CardData, username: string) => {
    const token = localStorage.getItem("token");
    const orgId = getActiveOrgId();
    const headers = { Authorization: `Bearer ${token}` };

    try {
      // Fetch all profile feeds
      const [createdResponse, repostedResponse, likedResponse, savedResponse] =
        await Promise.allSettled([
          axios.get(
            `${API_BASE_URL}/orgs/${orgId}/profilefeed/${username}/created`,
            {
              headers,
            }
          ),
          axios.get(
            `${API_BASE_URL}/orgs/${orgId}/profilefeed/${username}/reposted`,
            {
              headers,
            }
          ),
          axios.get(
            `${API_BASE_URL}/orgs/${orgId}/profilefeed/${username}/liked`,
            {
              headers,
            }
          ),
          axios.get(
            `${API_BASE_URL}/orgs/${orgId}/profilefeed/${username}/saved`,
            {
              headers,
            }
          ),
        ]);

      const deletePromises = [];

      // Find and delete from created feed
      if (createdResponse.status === "fulfilled") {
        const createdItem = createdResponse.value.data.find(
          (item: any) =>
            item.title === card.title &&
            item.description === card.description &&
            item.layerKey === card.layer.key
        );
        if (createdItem) {
          deletePromises.push(
            axios.delete(
              `${API_BASE_URL}/orgs/${orgId}/profilefeed/${username}/created/${createdItem.id}`,
              { headers }
            )
          );
        }
      }

      // Find and delete from reposted feed
      if (repostedResponse.status === "fulfilled") {
        const repostedItem = repostedResponse.value.data.find(
          (item: any) =>
            item.title === card.title &&
            item.description === card.description &&
            item.layerKey === card.layer.key
        );
        if (repostedItem) {
          deletePromises.push(
            axios.delete(
              `${API_BASE_URL}/orgs/${orgId}/profilefeed/${username}/reposted/${repostedItem.id}`,
              { headers }
            )
          );
        }
      }

      // Find and delete from liked feed
      if (likedResponse.status === "fulfilled") {
        const likedItem = likedResponse.value.data.find(
          (item: any) =>
            item.title === card.title &&
            item.description === card.description &&
            item.layerKey === card.layer.key
        );
        if (likedItem) {
          deletePromises.push(
            axios.delete(
              `${API_BASE_URL}/orgs/${orgId}/profilefeed/${username}/liked/${likedItem.id}`,
              { headers }
            )
          );
        }
      }

      // Find and delete from saved feed
      if (savedResponse.status === "fulfilled") {
        const savedItem = savedResponse.value.data.find(
          (item: any) =>
            item.title === card.title &&
            item.description === card.description &&
            item.layerKey === card.layer.key
        );
        if (savedItem) {
          deletePromises.push(
            axios.delete(
              `${API_BASE_URL}/orgs/${orgId}/profilefeed/${username}/saved/${savedItem.id}`,
              { headers }
            )
          );
        }
      }

      // Delete from homefeed using original card ID
      deletePromises.push(
        axios.delete(
          `${API_BASE_URL}/orgs/${orgId}/homefeed/item/${card.id}/user/${username}`,
          { headers }
        )
      );

      // Execute all delete operations
      await Promise.allSettled(deletePromises);
    } catch (error) {
      console.error("Error in deleteCardByContent:", error);
      throw error;
    }
  },
});

export default function CardExpansionPage() {
  // Auth and API
  const { getAuthHeaders, getUser } = useAuth();
  const apiService = useMemo(
    () => createApiService(getAuthHeaders, getUser, handleUnauthorized),
    [getAuthHeaders]
  );

  // Router
  const router = useRouter();

  // Core state
  const [card, setCard] = useState<CardData | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [feedCards, setFeedCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Comment state
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // UI state
  const [showPopupMenu, setShowPopupMenu] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Popup states
  const [isNotificationsPopupOpen, setIsNotificationsPopupOpen] =
    useState(false);
  const [isInboxPopupOpen, setIsInboxPopupOpen] = useState(false);
  const [isSettingsPopupOpen, setIsSettingsPopupOpen] = useState(false);

  // Interaction states
  const [likedCards, setLikedCards] = useState<InteractionState[]>([]);
  const [savedCards, setSavedCards] = useState<InteractionState[]>([]);
  const [likesCount, setLikesCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  // Central handler
  const handleUnauthorized = useCallback(() => {
    try {
      toast.error("Session expired. Please sign in again.");
    } catch {}
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("profileUser");
    setTimeout(() => router.replace("/"), 1000);
  }, [router]);

  // Initialize user and cleanup
  useEffect(() => {
    const user = getUser();
    if (user) {
      setUserProfile(user);
    }

    // Cleanup
    return () => {
      localStorage.removeItem("selectedCard");
    };
  }, [getUser]);

  async function refreshUnread() {
    const orgId = getActiveOrgId();
    if (!orgId || !userProfile) return;
    try {
      const res = await fetch(
        `/nest-api/orgs/${orgId}/notifications/user/${userProfile.username}/unread-count`
      );
      const { count } = await res.json();
      setUnreadCount(count || 0);
    } catch (e) {
      console.error("unread-count failed", e);
    }
  }

  // poll occasionally (optional) and on mount/user change
  useEffect(() => {
    if (!userProfile) return;
    refreshUnread();
    const id = setInterval(refreshUnread, 30000);
    return () => clearInterval(id);
  }, [userProfile]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get selected card from localStorage
        const cardData = localStorage.getItem("expandedCard");
        if (!cardData) {
          throw new Error("No card selected");
        }

        const selectedCard = JSON.parse(cardData);
        setCard(selectedCard);
        setLikesCount(Math.floor(Math.random() * 100) + 10);

        // Load comments and feed data in parallel
        const [commentsData, feedData] = await Promise.all([
          apiService.fetchComments(selectedCard.id),
          apiService.fetchHomeFeed(),
        ]);

        feedData.sort((a, b) => b.id - a.id);

        setComments(commentsData);
        setFeedCards(feedData);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An error occurred";
        setError(errorMessage);
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [apiService]);

  // Fetch interaction states
  useEffect(() => {
    const fetchInteractionStates = async () => {
      if (!userProfile || !card) return;

      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        const [likedResponse, savedResponse] = await Promise.allSettled([
          axios.get(
            `${API_BASE_URL}/likes/homefeed/${userProfile.username}/${card.id}`,
            { headers }
          ),
          axios.get(
            `${API_BASE_URL}/saves/homefeed/${userProfile.username}/${card.id}`,
            { headers }
          ),
        ]);

        const likedResult =
          likedResponse.status === "fulfilled"
            ? likedResponse.value.data.hasLiked
            : false;

        const savedResult =
          savedResponse.status === "fulfilled"
            ? savedResponse.value.data.hasSaved
            : false;

        setLikedCards([{ id: card.id, hasLiked: likedResult }]);
        setSavedCards([{ id: card.id, hasSaved: savedResult }]);
      } catch (error) {
        console.error("Error fetching interaction states:", error);
      }
    };

    fetchInteractionStates();
  }, [userProfile, card]);

  // Helper functions
  const isLiked = useCallback(
    (id: number) => {
      return likedCards.find((card) => card.id === id)?.hasLiked ?? false;
    },
    [likedCards]
  );

  const isSaved = useCallback(
    (id: number) => {
      return savedCards.find((card) => card.id === id)?.hasSaved ?? false;
    },
    [savedCards]
  );

  // Event handlers
  const handleAddComment = useCallback(async () => {
    if (!newComment.trim() || !card || !userProfile) return;

    try {
      await apiService.postComment(
        card.id,
        userProfile.username,
        userProfile.image || "",
        newComment
      );
      setNewComment("");

      // Refresh comments
      const updatedComments = await apiService.fetchComments(card.id);
      setComments(updatedComments);
    } catch (err) {
      console.error("Error posting comment:", err);
    }
  }, [newComment, card, userProfile, apiService]);

  const handleAddReply = useCallback(
    async (commentId: string) => {
      if (!replyText.trim() || !userProfile) return;

      try {
        await apiService.postReply(
          commentId,
          userProfile.username,
          userProfile.image || "",
          replyText
        );
        setReplyText("");
        setReplyingTo(null);

        // Refresh comments
        if (card) {
          const updatedComments = await apiService.fetchComments(card.id);
          setComments(updatedComments);
        }
      } catch (err) {
        console.error("Error posting reply:", err);
      }
    },
    [replyText, userProfile, card, apiService]
  );

  const handleMoreClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      setPopupPosition({ x: event.clientX, y: event.clientY });
      setShowPopupMenu(!showPopupMenu);
    },
    [showPopupMenu]
  );

  const handleDeleteCard = useCallback(async () => {
    if (!card || !userProfile) return;

    try {
      await apiService.deleteCardByContent(card, userProfile.username);
      setShowPopupMenu(false);
      router.push("/home");
    } catch (err) {
      console.error("Error deleting card:", err);
    }
  }, [card, userProfile, apiService, router]);

  const handleCardClick = useCallback(
    (cardData: CardData) => {
      localStorage.setItem("expandedCard", JSON.stringify(cardData));
      router.push(`/event/${cardData.id}`);
    },
    [router]
  );

  const handleUserClick = useCallback(() => {
    if (!card || !userProfile) return;

    localStorage.setItem("profileUsername", card.username);
    if (card.username === userProfile.username) {
      router.push("/profile");
    } else {
      router.push("/profile/user");
    }
  }, [card, userProfile, router]);

  const handleUserTagClick = useCallback(
    (username: string) => {
      if (!userProfile) return;

      if (username === userProfile.username) {
        router.push("/profile");
      } else {
        localStorage.setItem("profileUsername", username);
        router.push("/profile/user");
      }
    },
    [userProfile, router]
  );

  const handleLike = useCallback(
    async (e: React.MouseEvent, item: CardData) => {
      e.stopPropagation();
      if (!userProfile) return;

      const isCurrentlyLiked = isLiked(item.id);
      const token = localStorage.getItem("token");
      const orgId = getActiveOrgId();
      const headers = { Authorization: `Bearer ${token}` };

      // Optimistic update
      setLikedCards((prev) =>
        prev.map((card) =>
          card.id === item.id ? { ...card, hasLiked: !isCurrentlyLiked } : card
        )
      );

      try {
        if (!isCurrentlyLiked) {
          // Like the item
          await Promise.all([
            axios.post(
              `${API_BASE_URL}/orgs/${orgId}/profilefeed/${userProfile.username}/liked`,
              item,
              { headers }
            ),
            axios.post(
              `${API_BASE_URL}/likes/homefeed/${userProfile.username}/${item.id}`,
              {},
              { headers }
            ),
          ]);
        } else {
          // Unlike the item
          await axios.delete(
            `${API_BASE_URL}/likes/homefeed/${userProfile.username}/${item.id}`,
            { headers }
          );

          // Also remove from profile liked feed
          try {
            const profileLikedResponse = await axios.get(
              `${API_BASE_URL}/orgs/${orgId}/profilefeed/${userProfile.username}/liked`,
              {
                headers,
              }
            );
            const likedItem = profileLikedResponse.data.find(
              (likedPost: any) =>
                likedPost.title === item.title &&
                likedPost.description === item.description &&
                likedPost.layerKey === item.layer.key
            );
            if (likedItem) {
              await axios.delete(
                `${API_BASE_URL}/orgs/${orgId}/profilefeed/${userProfile.username}/liked/${likedItem.id}`,
                {
                  headers,
                }
              );
            }
          } catch (error) {
            console.warn("Error removing from profile liked feed:", error);
          }
        }
      } catch (error) {
        console.error("Error handling like:", error);
        // Rollback on error
        setLikedCards((prev) =>
          prev.map((card) =>
            card.id === item.id ? { ...card, hasLiked: isCurrentlyLiked } : card
          )
        );
      }
    },
    [userProfile, isLiked]
  );

  const handleSave = useCallback(
    async (e: React.MouseEvent, item: CardData) => {
      e.stopPropagation();
      if (!userProfile) return;

      const isCurrentlySaved = isSaved(item.id);
      const token = localStorage.getItem("token");
      const orgId = getActiveOrgId();
      const headers = { Authorization: `Bearer ${token}` };

      // Optimistic update
      setSavedCards((prev) =>
        prev.map((card) =>
          card.id === item.id ? { ...card, hasSaved: !isCurrentlySaved } : card
        )
      );

      try {
        if (!isCurrentlySaved) {
          await Promise.all([
            axios.post(
              `${API_BASE_URL}/orgs/${orgId}/profilefeed/${userProfile.username}/saved`,
              item,
              { headers }
            ),
            axios.post(
              `${API_BASE_URL}/saves/homefeed/${userProfile.username}/${item.id}`,
              {},
              { headers }
            ),
          ]);
        } else {
          await axios.delete(
            `${API_BASE_URL}/saves/homefeed/${userProfile.username}/${item.id}`,
            { headers }
          );

          // Also remove from profile saved feed
          try {
            const profileSavedResponse = await axios.get(
              `${API_BASE_URL}/orgs/${orgId}/profilefeed/${userProfile.username}/saved`,
              {
                headers,
              }
            );
            const savedItem = profileSavedResponse.data.find(
              (savedPost: any) =>
                savedPost.title === item.title &&
                savedPost.description === item.description &&
                savedPost.layerKey === item.layer.key
            );
            if (savedItem) {
              await axios.delete(
                `${API_BASE_URL}/orgs/${orgId}/profilefeed/${userProfile.username}/saved/${savedItem.id}`,
                {
                  headers,
                }
              );
            }
          } catch (error) {
            console.warn("Error removing from profile saved feed:", error);
          }
        }
      } catch (error) {
        console.error("Error handling save:", error);
        // Rollback on error
        setSavedCards((prev) =>
          prev.map((card) =>
            card.id === item.id ? { ...card, hasSaved: isCurrentlySaved } : card
          )
        );
      }
    },
    [userProfile, isSaved]
  );

  const handleShare = useCallback(() => {
    if (!card) return;

    if (navigator.share) {
      navigator
        .share({
          title: card.title,
          text: card.description,
          url: window.location.href,
        })
        .catch((err) => console.log("Error sharing:", err));
    } else {
      // Fallback to clipboard
      navigator.clipboard
        .writeText(window.location.href)
        .then(() => console.log("URL copied to clipboard"))
        .catch((err) => console.error("Failed to copy URL:", err));
    }
  }, [card]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <header className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-md">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => router.back()}
              className="p-2 text-white hover:bg-white/10 rounded-full"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <button className="p-2 text-white hover:bg-white/10 rounded-full">
              <MoreHorizontal className="w-6 h-6" />
            </button>
          </div>
        </header>

        <div className="pt-16 flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !card || !userProfile) {
    return (
      <div className="min-h-screen bg-black text-white">
        <header className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-md">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => router.back()}
              className="p-2 text-white hover:bg-white/10 rounded-full"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          </div>
        </header>

        <div className="pt-16 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-4">
              {error ? "Error" : "No Card Selected"}
            </h2>
            <p className="text-gray-400 mb-4">
              {error || "Please select a card to view"}
            </p>
            <button
              onClick={() =>
                error ? window.location.reload() : router.push("/home")
              }
              className="px-6 py-2 bg-white text-black rounded-full font-medium"
            >
              {error ? "Retry" : "Go Home"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white">
      {/* Desktop Navbar */}
      <nav className="hidden md:block fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <Link href="/explore" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">O</span>
                </div>
                <span className="font-bold text-xl text-gray-900">
                  Collabrr
                </span>
              </Link>
            </div>

            <div className="flex items-center space-x-1">
              {[
                { name: "Home", href: "/home" },
                { name: "Explore", href: "/explore" },
                { name: "Create", href: "/create" },
              ].map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
                >
                  {item.name}
                </Link>
              ))}
            </div>

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
                <UserIcon className="w-5 h-5" />
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

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/80 via-black/40 to-transparent backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.back()}
            className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <button
            onClick={handleMoreClick}
            className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <MoreHorizontal className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
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
              {[
                { name: "Home", href: "/home", icon: Home },
                { name: "Explore", href: "/explore", icon: Compass },
                { name: "Create", href: "/create", icon: Plus },
                { name: "Profile", href: "/profile", icon: UserIcon },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center space-x-3 p-3 hover:bg-gray-100 rounded-lg"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className="w-5 h-5 text-gray-600" />
                    <span className="text-gray-900">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="md:pt-20 bg-white">
        {/* Desktop Layout */}
        <div className="hidden md:block container mx-auto px-4 py-8 max-w-7xl">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 mb-12">
            <div className="flex h-[600px]">
              {card.image ? (
                <>
                  {/* Image Layout */}
                  <div className="w-1/2 relative bg-gray-100">
                    <Image
                      src={card.image || "/placeholder.svg"}
                      alt={card.title}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        e.currentTarget.src =
                          "/placeholder.svg?height=600&width=600";
                      }}
                    />
                  </div>
                  <div className="w-1/2 flex flex-col">
                    <div className="p-6 border-b border-gray-100 flex-shrink-0">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h1 className="text-xl font-bold text-gray-900 mb-2">
                            {card.title}
                          </h1>
                          <p className="text-gray-600 text-sm mb-3">
                            {card.description}
                          </p>
                          {card.text && (
                            <p className="text-gray-700 text-sm">{card.text}</p>
                          )}
                        </div>
                        <button
                          onClick={handleMoreClick}
                          className="ml-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-all duration-200 flex-shrink-0"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </div>
                      <div
                        className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity duration-200"
                        onClick={handleUserClick}
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center overflow-hidden">
                          {card.picture ? (
                            <Image
                              src={card.picture || "/placeholder.svg"}
                              alt={card.username}
                              width={40}
                              height={40}
                              className="object-cover"
                            />
                          ) : (
                            <span className="text-white font-semibold text-sm">
                              {card.username.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">
                            {card.username}
                          </p>
                          <p className="text-xs text-gray-500">View profile</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                      <CommentSection
                        comments={comments}
                        newComment={newComment}
                        setNewComment={setNewComment}
                        replyingTo={replyingTo}
                        setReplyingTo={setReplyingTo}
                        replyText={replyText}
                        setReplyText={setReplyText}
                        onAddComment={handleAddComment}
                        onAddReply={handleAddReply}
                        currentUser={userProfile}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Text-only Layout */}
                  <div className="w-1/2 flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
                    <div className="flex-1 overflow-y-auto p-8">
                      {card.text && (
                        <div className="space-y-4">
                          <div className="text-sm text-gray-500 uppercase tracking-wide font-medium">
                            Content
                          </div>
                          <div className="prose prose-gray max-w-none">
                            <p className="text-gray-800 text-lg leading-relaxed whitespace-pre-wrap">
                              {card.text}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="w-1/2 flex flex-col">
                    <div className="p-6 border-b border-gray-100 flex-shrink-0">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h1 className="text-2xl font-bold text-gray-900 mb-3">
                            {card.title}
                          </h1>
                          <p className="text-gray-600 text-base leading-relaxed">
                            {card.description}
                          </p>
                        </div>
                        <button
                          onClick={handleMoreClick}
                          className="ml-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-all duration-200 flex-shrink-0"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </div>
                      <div
                        className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity duration-200"
                        onClick={handleUserClick}
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center overflow-hidden">
                          {card.picture ? (
                            <Image
                              src={card.picture || "/placeholder.svg"}
                              alt={card.username}
                              width={40}
                              height={40}
                              className="object-cover"
                            />
                          ) : (
                            <span className="text-white font-semibold text-sm">
                              {card.username.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">
                            {card.username}
                          </p>
                          <p className="text-xs text-gray-500">View profile</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                      <CommentSection
                        comments={comments}
                        newComment={newComment}
                        setNewComment={setNewComment}
                        replyingTo={replyingTo}
                        setReplyingTo={setReplyingTo}
                        replyText={replyText}
                        setReplyText={setReplyText}
                        onAddComment={handleAddComment}
                        onAddReply={handleAddReply}
                        currentUser={userProfile}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Related Cards Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Related Posts
            </h2>
            <MasonryGrid>
              {feedCards.map((item) => (
                <Card
                  key={item.id}
                  user={item.username}
                  title={item.title}
                  description={item.description}
                  text={item.text}
                  image={item.image}
                  picture={item.picture}
                  reposted={item.reposted}
                  onClick={() => handleCardClick(item)}
                  onUserTagClick={handleUserTagClick}
                  onCardTagClick={() => {}}
                  cardData={item}
                />
              ))}
            </MasonryGrid>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden">
          {card.image ? (
            /* Image-based mobile layout */
            <div className="relative w-full h-screen">
              <Image
                src={card.image || "/placeholder.svg"}
                alt={card.title}
                fill
                className="object-cover"
                priority
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.svg?height=800&width=600";
                }}
              />

              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent h-1/3 pointer-events-none" />

              <div className="absolute bottom-0 left-0 right-0 p-4 space-y-4">
                <div
                  className="flex items-center space-x-3 cursor-pointer"
                  onClick={handleUserClick}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center overflow-hidden">
                    {card.picture ? (
                      <Image
                        src={card.picture || "/placeholder.svg"}
                        alt={card.username}
                        width={40}
                        height={40}
                        className="object-cover"
                      />
                    ) : (
                      <span className="text-white font-semibold text-sm">
                        {card.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">
                      {card.username}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h1 className="text-white font-bold text-lg leading-tight">
                    {card.title}
                  </h1>
                  <p className="text-white/90 text-sm leading-relaxed">
                    {card.description}
                  </p>
                  {card.text && (
                    <p className="text-white/80 text-sm leading-relaxed">
                      {card.text}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center space-x-6">
                    <button
                      onClick={(e) => handleLike(e, card)}
                      className="flex items-center space-x-2 text-white hover:scale-110 transition-transform"
                    >
                      <Heart
                        className={`w-7 h-7 ${
                          isLiked(card.id) ? "fill-red-500 text-red-500" : ""
                        }`}
                      />
                      <span className="text-sm font-medium">{likesCount}</span>
                    </button>

                    <button
                      onClick={() => setShowComments(true)}
                      className="flex items-center space-x-2 text-white hover:scale-110 transition-transform"
                    >
                      <MessageCircle className="w-7 h-7" />
                      <span className="text-sm font-medium">
                        {comments.length}
                      </span>
                    </button>

                    <button
                      onClick={handleShare}
                      className="text-white hover:scale-110 transition-transform"
                    >
                      <Share className="w-7 h-7" />
                    </button>
                  </div>

                  <div className="flex items-center space-x-4">
                    {card.weblink && (
                      <a
                        href={card.weblink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:scale-110 transition-transform"
                      >
                        <ExternalLink className="w-6 h-6" />
                      </a>
                    )}

                    <button
                      onClick={(e) => handleSave(e, card)}
                      className="text-white hover:scale-110 transition-transform"
                    >
                      <Bookmark
                        className={`w-6 h-6 ${
                          isSaved(card.id) ? "fill-white" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Text-only mobile layout */
            <div className="bg-white">
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 pt-16 pb-6">
                <div className="p-4 space-y-4">
                  {/* User info */}
                  <div
                    className="flex items-center space-x-3 cursor-pointer"
                    onClick={handleUserClick}
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center overflow-hidden">
                      {card.picture ? (
                        <Image
                          src={card.picture || "/placeholder.svg"}
                          alt={card.username}
                          width={48}
                          height={48}
                          className="object-cover"
                        />
                      ) : (
                        <span className="text-white font-semibold text-base">
                          {card.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-base">
                        {card.username}
                      </p>
                      <p className="text-sm text-gray-500">View profile</p>
                    </div>
                  </div>

                  {/* Title and Description */}
                  <div className="space-y-3">
                    <h1 className="text-gray-900 font-bold text-2xl leading-tight">
                      {card.title}
                    </h1>
                    <p className="text-gray-700 text-base leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Text Content - Only show if exists */}
              {card.text && (
                <div className="p-4 bg-white">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <div className="prose prose-gray max-w-none">
                      <p className="text-gray-800 text-base leading-relaxed whitespace-pre-wrap m-0">
                        {card.text}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="p-4 bg-white border-t border-gray-100 sticky bottom-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <button
                      onClick={(e) => handleLike(e, card)}
                      className="flex items-center space-x-2 text-gray-700 hover:text-red-500 transition-colors"
                    >
                      <Heart
                        className={`w-7 h-7 ${
                          isLiked(card.id) ? "fill-red-500 text-red-500" : ""
                        }`}
                      />
                      <span className="text-sm font-medium">{likesCount}</span>
                    </button>

                    <button
                      onClick={() => setShowComments(true)}
                      className="flex items-center space-x-2 text-gray-700 hover:text-blue-500 transition-colors"
                    >
                      <MessageCircle className="w-7 h-7" />
                      <span className="text-sm font-medium">
                        {comments.length}
                      </span>
                    </button>

                    <button
                      onClick={handleShare}
                      className="text-gray-700 hover:text-purple-500 transition-colors"
                    >
                      <Share className="w-7 h-7" />
                    </button>
                  </div>

                  <div className="flex items-center space-x-4">
                    {card.weblink && (
                      <a
                        href={card.weblink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-700 hover:text-purple-500 transition-colors"
                      >
                        <ExternalLink className="w-6 h-6" />
                      </a>
                    )}

                    <button
                      onClick={(e) => handleSave(e, card)}
                      className="text-gray-700 hover:text-blue-500 transition-colors"
                    >
                      <Bookmark
                        className={`w-6 h-6 ${
                          isSaved(card.id) ? "fill-current" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* More to Explore Section */}
          <div className="p-4  bg-white border-t border-gray-200">
            <h3 className="text-black font-semibold text-lg mb-6 mt-6 text-center">
              More to explore
            </h3>
            <MasonryGrid>
              {feedCards.map((item) => (
                <Card
                  key={item.id}
                  user={item.username}
                  title={item.title}
                  description={item.description}
                  text={item.text}
                  image={item.image}
                  picture={item.picture}
                  reposted={item.reposted}
                  onClick={() => handleCardClick(item)}
                  onUserTagClick={handleUserTagClick}
                  onCardTagClick={() => {}}
                  cardData={item}
                />
              ))}
            </MasonryGrid>
          </div>
        </div>
      </main>

      {/* Mobile Comments Modal */}
      {showComments && (
        <div className="md:hidden fixed inset-0 z-50 bg-black">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <button
                onClick={() => setShowComments(false)}
                className="text-white hover:bg-white/10 p-2 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-white font-semibold">Comments</h2>
              <div className="w-10" />
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <CommentSection
                comments={comments}
                newComment={newComment}
                setNewComment={setNewComment}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                replyText={replyText}
                setReplyText={setReplyText}
                onAddComment={handleAddComment}
                onAddReply={handleAddReply}
                currentUser={userProfile}
              />
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
        onAllRead={() => setUnreadCount(0)}
      />

      {/* Popup Menu */}
      {showPopupMenu && (
        <PopupMenu
          position={popupPosition}
          onClose={() => setShowPopupMenu(false)}
          onDelete={handleDeleteCard}
          canDelete={card.username === userProfile.username}
        />
      )}
    </div>
  );
}
