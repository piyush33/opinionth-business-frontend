"use client";

import type React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import {
  MessageCircle,
  ArrowLeft,
  X,
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
import ZoomPanImage from "@/components/ZoomPanImage";
import AppNav from "@/components/app/AppNav";
import { PixelLabel, Window, btn, tag } from "@/components/app/ui";

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
    setTimeout(() => router.replace("/login"), 1000);
  }, [router]);

  const apiService = useMemo(
    () => createApiService(getAuthHeaders, getUser, handleUnauthorized),
    [getAuthHeaders]
  );

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

  const navProps = {
    active: null,
    search: {
      value: searchTerm,
      onChange: setSearchTerm,
      placeholder: "Search posts...",
    },
    unreadCount,
    onNotifications: () => setIsNotificationsPopupOpen(true),
    onInbox: () => setIsInboxPopupOpen(true),
    onSettings: () => setIsSettingsPopupOpen(true),
  } as const;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--mk-paper)] text-[var(--mk-ink)]">
        <AppNav {...navProps} />
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 pt-16">
          <div
            className="h-10 w-10 animate-spin border-2 border-[var(--mk-ink)] border-t-transparent motion-reduce:animate-none"
            aria-hidden
          />
          <span className={tag} role="status">
            Loading card…
          </span>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !card || !userProfile) {
    return (
      <div className="min-h-screen bg-[var(--mk-paper)] text-[var(--mk-ink)]">
        <AppNav {...navProps} />
        <div className="flex min-h-screen items-center justify-center px-4 pt-16">
          <Window title="card://error" className="w-full max-w-sm">
            <div className="p-6 text-center">
              <h2 className="mb-2 text-xl font-bold tracking-[-0.03em]">
                {error ? "Error" : "No Card Selected"}
              </h2>
              <p className="mb-5 text-[14px] tracking-tight text-[var(--mk-ink-2)]">
                {error || "Please select a card to view"}
              </p>
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => router.back()}
                  className={`${btn.plain} px-4 py-2 text-[14px]`}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  onClick={() =>
                    error ? window.location.reload() : router.push("/home")
                  }
                  className={`${btn.primary} px-4 py-2 text-[14px]`}
                >
                  {error ? "Retry" : "Go Home"}
                </button>
              </div>
            </div>
          </Window>
        </div>
      </div>
    );
  }

  const iconBtn =
    "grid h-9 w-9 shrink-0 place-items-center rounded-[4px] border border-[var(--mk-ink)] bg-white text-[var(--mk-ink)] transition-colors hover:bg-[var(--mk-indigo-soft)]";

  const authorRow = (size: number) => (
    <button
      type="button"
      className="flex items-center gap-3 text-left transition-colors hover:text-[var(--mk-indigo-deep)]"
      onClick={handleUserClick}
    >
      <span
        className="grid shrink-0 place-items-center overflow-hidden rounded-[4px] border border-[var(--mk-ink)] bg-[var(--mk-indigo-soft)]"
        style={{ width: size, height: size }}
      >
        {card.picture ? (
          <Image
            src={card.picture || "/placeholder.svg"}
            alt={card.username}
            width={size}
            height={size}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-[14px] font-bold text-[var(--mk-indigo-deep)]">
            {card.username.charAt(0).toUpperCase()}
          </span>
        )}
      </span>
      <span>
        <span className="block text-[14px] font-bold tracking-[-0.01em]">
          {card.username}
        </span>
        <span className={tag}>View profile</span>
      </span>
    </button>
  );

  const comments_ = (
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
  );

  const feedGrid = (
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
  );

  const actionBtn =
    "flex items-center gap-1.5 rounded-[4px] px-2 py-1.5 text-[var(--mk-ink)] transition-colors hover:bg-[var(--mk-indigo-soft)]";

  return (
    <div className="min-h-screen bg-[var(--mk-paper)] text-[var(--mk-ink)]">
      <AppNav {...navProps} />

      {/* Main Content */}
      <main className="pt-[7.5rem] md:pt-20">
        {/* Desktop Layout */}
        <div className="container mx-auto hidden max-w-7xl px-4 py-8 md:block">
          <div className="mb-4 flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className={iconBtn}
              aria-label="Go back"
            >
              <ArrowLeft className="h-[18px] w-[18px]" />
            </button>
            <span className={tag}>Back to feed</span>
          </div>

          <Window title={`card://${card.id}`} className="mb-12">
            <div className="flex h-[600px]">
              {card.image ? (
                /* Image Layout */
                <div className="relative w-1/2 border-r border-[var(--mk-ink)] bg-[var(--mk-paper)]">
                  <div className="absolute inset-0">
                    <ZoomPanImage
                      src={card.image!}
                      alt={card.title}
                      // optional tweaks:
                      minScale={0.5}
                      maxScale={10}
                    />
                  </div>
                </div>
              ) : (
                /* Text-only Layout */
                <div className="mk-grid flex w-1/2 flex-col border-r border-[var(--mk-ink)] bg-[var(--mk-paper)]">
                  <div className="flex-1 overflow-y-auto p-8">
                    {card.text && (
                      <div className="space-y-4">
                        <PixelLabel>CONTENT</PixelLabel>
                        <p className="whitespace-pre-wrap text-lg leading-relaxed tracking-[-0.01em] text-[var(--mk-ink)]">
                          {card.text}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex w-1/2 flex-col">
                <div className="flex-shrink-0 border-b border-[var(--mk-ink)] p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex-1">
                      <h1
                        className={`mk-display mb-2 ${
                          card.image ? "text-[1.5rem]" : "text-[1.85rem]"
                        }`}
                      >
                        {card.title}
                      </h1>
                      <p
                        className={`tracking-[-0.01em] text-[var(--mk-ink-2)] ${
                          card.image ? "mb-3 text-[14px]" : "text-[15px] leading-relaxed"
                        }`}
                      >
                        {card.description}
                      </p>
                      {card.image && card.text && (
                        <p className="text-[14px] tracking-[-0.01em]">
                          {card.text}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleMoreClick}
                      className={`${iconBtn} ml-4`}
                      aria-label="More options"
                    >
                      <MoreHorizontal className="h-[18px] w-[18px]" />
                    </button>
                  </div>
                  {authorRow(40)}
                </div>
                <div className="flex-1 overflow-y-auto p-6">{comments_}</div>
              </div>
            </div>
          </Window>

          {/* Related Cards Section */}
          <div className="mb-8">
            <div className="mb-6 flex items-center justify-between border-b border-[var(--mk-ink)] pb-3">
              <h2 className="text-2xl font-bold tracking-[-0.03em]">
                Related Posts
              </h2>
              <PixelLabel color="var(--mk-cyan-deep)">FEED</PixelLabel>
            </div>
            {feedGrid}
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="px-4 pb-8 md:hidden">
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className={iconBtn}
              aria-label="Go back"
            >
              <ArrowLeft className="h-[18px] w-[18px]" />
            </button>
            <button
              onClick={handleMoreClick}
              className={iconBtn}
              aria-label="More options"
            >
              <MoreHorizontal className="h-[18px] w-[18px]" />
            </button>
          </div>

          <Window title={`card://${card.id}`}>
            {card.image && (
              /* Image-based mobile layout */
              <div className="relative h-[60vh] w-full border-b border-[var(--mk-ink)] bg-[var(--mk-paper)]">
                <Image
                  src={card.image || "/placeholder.svg"}
                  alt={card.title}
                  fill
                  className="object-cover"
                  priority
                  onError={(e) => {
                    e.currentTarget.src =
                      "/placeholder.svg?height=800&width=600";
                  }}
                />
              </div>
            )}

            <div className="space-y-4 p-4">
              {authorRow(card.image ? 40 : 48)}

              <div className="space-y-2">
                <h1 className="mk-display text-[1.6rem]">{card.title}</h1>
                <p className="text-[15px] leading-relaxed tracking-[-0.01em] text-[var(--mk-ink-2)]">
                  {card.description}
                </p>
              </div>

              {card.text &&
                (card.image ? (
                  <p className="text-[14px] leading-relaxed tracking-[-0.01em]">
                    {card.text}
                  </p>
                ) : (
                  <div className="rounded-[5px] border border-[var(--mk-rule)] bg-[var(--mk-paper)] p-4">
                    <p className="m-0 whitespace-pre-wrap text-[15px] leading-relaxed tracking-[-0.01em]">
                      {card.text}
                    </p>
                  </div>
                ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between border-t border-[var(--mk-ink)] px-2 py-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => handleLike(e, card)}
                  className={actionBtn}
                  aria-label={isLiked(card.id) ? "Unlike" : "Like"}
                  aria-pressed={isLiked(card.id)}
                >
                  <Heart
                    className={`h-6 w-6 ${
                      isLiked(card.id)
                        ? "fill-[var(--mk-indigo)] text-[var(--mk-indigo)]"
                        : ""
                    }`}
                  />
                  <span className="text-[14px] font-semibold">{likesCount}</span>
                </button>

                <button
                  onClick={() => setShowComments(true)}
                  className={actionBtn}
                  aria-label="Comments"
                >
                  <MessageCircle className="h-6 w-6" />
                  <span className="text-[14px] font-semibold">
                    {comments.length}
                  </span>
                </button>

                <button
                  onClick={handleShare}
                  className={actionBtn}
                  aria-label="Share"
                >
                  <Share className="h-6 w-6" />
                </button>
              </div>

              <div className="flex items-center gap-1">
                {card.weblink && (
                  <a
                    href={card.weblink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={actionBtn}
                    aria-label="Open link"
                  >
                    <ExternalLink className="h-5 w-5" />
                  </a>
                )}

                <button
                  onClick={(e) => handleSave(e, card)}
                  className={actionBtn}
                  aria-label={isSaved(card.id) ? "Unsave" : "Save"}
                  aria-pressed={isSaved(card.id)}
                >
                  <Bookmark
                    className={`h-5 w-5 ${
                      isSaved(card.id) ? "fill-[var(--mk-ink)]" : ""
                    }`}
                  />
                </button>
              </div>
            </div>
          </Window>

          {/* More to Explore Section */}
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between border-b border-[var(--mk-ink)] pb-3">
              <h3 className="text-lg font-bold tracking-[-0.03em]">
                More to explore
              </h3>
              <PixelLabel color="var(--mk-cyan-deep)">FEED</PixelLabel>
            </div>
            {feedGrid}
          </div>
        </div>
      </main>

      {/* Mobile Comments Modal */}
      {showComments && (
        <div className="fixed inset-0 z-50 bg-[var(--mk-paper)] md:hidden">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-[var(--mk-ink)] bg-white px-4 py-3">
              <button
                onClick={() => setShowComments(false)}
                className={iconBtn}
                aria-label="Close comments"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
              <h2 className={tag}>{`card://${card.id}/comments`}</h2>
              <div className="w-9" />
            </div>

            <div className="flex-1 overflow-y-auto bg-white p-4">
              {comments_}
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
