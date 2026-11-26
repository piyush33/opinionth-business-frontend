"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { lookupFeedCard } from "@/lib/feed";
import { toast } from "sonner";
import {
  MessageCircle,
  Share,
  MoreHorizontal,
  MessageSquare,
  Heart,
  Bookmark,
  UserPlus,
  UserMinus,
  ArrowLeft,
  X,
  SparklesIcon as Bubbles,
} from "lucide-react";
import Image from "next/image";
import Card from "@/components/card";
import MasonryGrid from "@/components/masonry-grid";
import InboxPopup from "@/components/popups/inbox-popup";
import SettingsPopup from "@/components/popups/settings-popup";
import NotificationsPopup from "@/components/popups/notifications-popup";
import FollowersModal from "@/components/modals/followers-modal";
import FollowingModal from "@/components/modals/following-modal";
import ChatInterface from "@/components/popups/chat-interface";
import axios from "axios";
import AppNav from "@/components/app/AppNav";
import { PixelLabel, Window, btn, tag } from "@/components/app/ui";

interface CardItem {
  id: number;
  title: string;
  description: string;
  text?: string;
  image?: string;
  username: string;
  picture?: string;
  parent: number;
  weblink?: string;
  privacy?: boolean;
  reposted?: boolean;
}

interface ProfileStats {
  totalPosts: number;
  totalLikes: number;
  totalViews: number;
  totalReposts: number;
  totalSaves: number;
  engagementRate: number;
}

// add this helper inside your component file
const getActiveOrgId = (): number | null => {
  if (typeof window === "undefined") return null; // guard SSR
  const raw = window.localStorage.getItem("activeOrg");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { id: number } | number;
    return typeof parsed === "number" ? parsed || null : parsed?.id ?? null;
  } catch {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
};

export default function ProfileUserPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null); // Current logged-in user
  const [profileUser, setProfileUser] = useState<any>(null); // User being viewed
  const [activeTab, setActiveTab] = useState("opinion");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showChatInterface, setShowChatInterface] = useState(false);

  // Profile data states
  const [createdPosts, setCreatedPosts] = useState<CardItem[]>([]);
  const [likedPosts, setLikedPosts] = useState<CardItem[]>([]);
  const [savedPosts, setSavedPosts] = useState<CardItem[]>([]);
  const [repostedPosts, setRepostedPosts] = useState<CardItem[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [profileStats, setProfileStats] = useState<ProfileStats>({
    totalPosts: 0,
    totalLikes: 0,
    totalViews: 0,
    totalReposts: 0,
    totalSaves: 0,
    engagementRate: 0,
  });

  // Modal states
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [isInboxPopupOpen, setIsInboxPopupOpen] = useState(false);
  const [isSettingsPopupOpen, setIsSettingsPopupOpen] = useState(false);
  const [isNotificationsPopupOpen, setIsNotificationsPopupOpen] =
    useState(false);
  const [orgId, setOrgId] = useState<number | null>(() => getActiveOrgId());
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setOrgId(getActiveOrgId());
  }, []);

  type ActiveOrg = { id: number; name: string; slug: string } | null;

  const handleUnauthorized = () => {
    toast.error("Session expired. Please sign in again.");
    localStorage.removeItem("token");
    localStorage.removeItem("profileUser");
    setTimeout(() => router.replace("/login"), 1000);
  };

  // Combined opinion posts (created + reposted)
  const opinionPosts = [...createdPosts, ...repostedPosts].sort((a, b) => {
    // Sort by creation date if available, otherwise by id
    return b.id - a.id;
  });

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

  const tabs = [
    {
      id: "opinion",
      name: "Opinion",
      icon: Bubbles,
      count: opinionPosts.length,
    },
    { id: "liked", name: "Liked", icon: Heart, count: likedPosts.length },
    { id: "saved", name: "Saved", icon: Bookmark, count: savedPosts.length },
  ];

  useEffect(() => {
    // Get current user from localStorage
    const userData = localStorage.getItem("profileUser");
    if (userData) {
      setUser(JSON.parse(userData));
    }

    // Get profile username from localStorage
    const profileUsername = localStorage.getItem("profileUsername");
    if (profileUsername) {
      fetchProfileUser(profileUsername);
    } else {
      router.push("/profile");
    }
  }, [router, orgId]);

  const fetchProfileUser = async (username: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `/nest-api/orgs/${orgId}/profileusers/${username}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProfileUser(response.data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        handleUnauthorized();
        return;
      }
      console.error("Error fetching profile user:", error);
      router.push("/profile");
    }
  };

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!profileUser || !user) return;

      setIsLoading(true);
      try {
        const token = localStorage.getItem("token");

        // Check if current user is following this profile user
        const followingResponse = await fetch(
          `/nest-api/orgs/${orgId}/profileusers/${user.username}/following`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const followingDataInitial = await followingResponse.json();
        const isCurrentlyFollowing = followingDataInitial.some(
          (item: any) => item.username === profileUser.username
        );
        setIsFollowing(isCurrentlyFollowing);

        // Fetch profile data (only public posts for other users)
        const [createdRes, repostedRes, followersRes, followingRes] =
          await Promise.all([
            fetch(
              `/nest-api/orgs/${orgId}/profilefeed/${profileUser.username}/created`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            ),
            fetch(
              `/nest-api/orgs/${orgId}/profilefeed/${profileUser.username}/reposted`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            ),
            fetch(
              `/nest-api/orgs/${orgId}/profileusers/${profileUser.username}/followers`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            ),
            fetch(
              `/nest-api/orgs/${orgId}/profileusers/${profileUser.username}/following`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            ),
          ]);

        const [created, reposted, followersData, followingData] =
          await Promise.all([
            createdRes.json(),
            repostedRes.json(),
            followersRes.json(),
            followingRes.json(),
          ]);

        // Filter only public posts for other users
        const publicCreated = created.filter((item: any) => !item.privacy);
        const publicReposted = reposted
          .filter((item: any) => !item.privacy)
          .map((item: any) => ({ ...item, reposted: true }));

        setCreatedPosts(publicCreated);
        setRepostedPosts(publicReposted);

        // For other users, we don't show liked/saved (privacy)
        setLikedPosts([]);
        setSavedPosts([]);

        setFollowers(followersData);
        setFollowing(followingData);

        // Calculate stats
        const totalPosts = publicCreated.length + publicReposted.length;
        const totalLikes = Math.floor(Math.random() * 1000) + 100;
        const totalViews = Math.floor(Math.random() * 5000) + 500;
        const totalReposts = publicReposted.length;
        const totalSaves = Math.floor(Math.random() * 200) + 20;
        const engagementRate =
          totalPosts > 0
            ? ((totalLikes + totalReposts + totalSaves) / totalPosts) * 10
            : 0;

        setProfileStats({
          totalPosts,
          totalLikes,
          totalViews,
          totalReposts,
          totalSaves,
          engagementRate: Math.min(engagementRate, 100),
        });
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [profileUser, user]);

  const getCurrentTabData = () => {
    const allData = {
      opinion: opinionPosts,
      liked: likedPosts,
      saved: savedPosts,
    };

    const data = allData[activeTab as keyof typeof allData] || [];

    return data.filter((item) => {
      return (
        !searchTerm ||
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.text?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  };

  // Open the feed card behind this profile post, in its own space. The
  // server finds it by the profile item, else by title/description/author
  // (reposts), across all cards rather than just the newest few.
  const handleCardClick = async (item: CardItem) => {
    try {
      const hit = await lookupFeedCard(item);
      if (hit.layerId)
        localStorage.setItem("lastVisitedCardLayerid", String(hit.layerId));
      router.push(`/event/${hit.id}`);
    } catch (error) {
      console.error("Could not find matching homefeed item", error);
      toast.error("Couldn't open this card. It may have been removed.");
    }
  };

  const handleFollowToggle = async () => {
    if (!user || !profileUser) return;

    const token = localStorage.getItem("token");

    // Optimistic update
    setIsFollowing(!isFollowing);

    try {
      if (!isFollowing) {
        // Follow
        await axios.post(
          `/nest-api/orgs/${orgId}/profileusers/${profileUser.username}/followers`,
          {
            username: user.username,
            name: user.name,
            image: user.image,
            isFollowing: false,
          }
        );
        await axios.post(
          `/nest-api/orgs/${orgId}/profileusers/${user.username}/following`,
          {
            username: profileUser.username,
            name: profileUser.name,
            image: profileUser.image,
          }
        );
        setFollowers((prev) => [
          ...prev,
          { username: user.username, name: user.name, image: user.image },
        ]);
      } else {
        // Unfollow
        const followingResponse = await axios.get(
          `/nest-api/orgs/${orgId}/profileusers/${user.username}/following`
        );
        const followingItem = followingResponse.data.find(
          (item: any) => item.username === profileUser.username
        );

        if (followingItem) {
          await axios.delete(
            `/nest-api/orgs/${orgId}/profileusers/${user.username}/following/${followingItem.id}`
          );

          const followersResponse = await axios.get(
            `/nest-api/orgs/${orgId}/profileusers/${profileUser.username}/followers`
          );
          const followerItem = followersResponse.data.find(
            (item: any) => item.username === user.username
          );

          if (followerItem) {
            await axios.delete(
              `/nest-api/orgs/${orgId}/profileusers/${profileUser.username}/followers/${followerItem.id}`
            );
          }
        }
        setFollowers((prev) =>
          prev.filter((f) => f.username !== user.username)
        );
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      // Rollback
      setIsFollowing(isFollowing);
    }
  };

  const handleMessageClick = () => {
    setShowChatInterface(true);
  };

  if (!user || !profileUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--mk-paper)]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-[3px] border-2 border-[var(--mk-rule)] border-t-[var(--mk-indigo)]"></div>
          <p className="tracking-tight text-[var(--mk-ink-2)]">Loading...</p>
        </div>
      </div>
    );
  }

  const currentTabData = getCurrentTabData();

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

  const iconBtn =
    "grid h-9 w-9 place-items-center rounded-[4px] border border-[var(--mk-ink)] bg-white text-[var(--mk-ink)] hover:bg-[var(--mk-indigo-soft)]";
  const statCell = "border-b border-r border-[var(--mk-ink)] px-4 py-3 text-left";

  return (
    <div className="min-h-screen bg-[var(--mk-paper)] text-[var(--mk-ink)]">
      <AppNav
        active={null}
        search={{ value: searchTerm, onChange: setSearchTerm, placeholder: "Search posts..." }}
        unreadCount={unreadCount}
        onNotifications={() => setIsNotificationsPopupOpen(true)}
        onInbox={() => setIsInboxPopupOpen(true)}
        onSettings={() => setIsSettingsPopupOpen(true)}
      />

      {/* Chat Interface Modal */}
      {showChatInterface && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-[var(--mk-ink)]/40"
            onClick={() => setShowChatInterface(false)}
          ></div>

          <Window
            title={`chat://${profileUser.username}`}
            className="absolute right-4 top-20 h-[600px] w-[calc(100%-2rem)] max-w-md"
          >
            {/* Chat Header */}
            <div className="flex h-[56px] items-center gap-3 border-b border-[var(--mk-ink)] px-3">
              <button
                onClick={() => setShowChatInterface(false)}
                aria-label="Close chat"
                className={`${iconBtn} h-8 w-8`}
              >
                <X className="w-4 h-4" />
              </button>
              {profileUser.image ? (
                <Image
                  src={profileUser.image || "/placeholder.svg"}
                  alt={profileUser.name}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-[3px] border border-[var(--mk-ink)] object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-[3px] border border-[var(--mk-ink)] bg-[var(--mk-indigo)]">
                  <span className="text-[13px] font-bold text-white">
                    {profileUser.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="font-bold tracking-[-0.03em] text-[var(--mk-ink)]">
                {profileUser.name}
              </span>
            </div>

            {/* Chat Interface */}
            <div className="h-[calc(100%-56px-31px)]">
              <ChatInterface selectedUser={profileUser} />
            </div>
          </Window>
        </div>
      )}

      {/* Main Content */}
      <main className="pt-34 md:pt-20 px-4 pb-8">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => router.back()}
            className={`${btn.plain} mb-4 px-3 py-1.5 text-[14px]`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {/* Profile Header */}
          <Window title={`profile://${profileUser.username}`} className="mb-8">
            <div className="flex flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:items-start lg:gap-8">
              {/* Profile Picture */}
              <div className="relative self-center lg:self-start">
                <div className="h-24 w-24 overflow-hidden rounded-[4px] border border-[var(--mk-ink)] sm:h-32 sm:w-32">
                  {profileUser.image ? (
                    <Image
                      src={
                        profileUser.image ||
                        "/placeholder.svg?height=128&width=128"
                      }
                      alt={profileUser.name}
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[var(--mk-indigo)]">
                      <span className="mk-display text-[2rem] text-white">
                        {profileUser.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Profile Info */}
              <div className="w-full flex-1 text-center lg:text-left">
                <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <PixelLabel className="mb-3 justify-center lg:justify-start">Profile</PixelLabel>
                    <h1 className="mk-display text-[2rem] text-[var(--mk-ink)] sm:text-[2.6rem]">
                      {profileUser.name}
                    </h1>
                    <p className="mt-2 text-[15px] font-semibold tracking-tight text-[var(--mk-indigo)]">
                      @{profileUser.username}
                    </p>
                    {profileUser.tagline && (
                      <p className="mt-2 max-w-xl text-[15px] tracking-[-0.01em] text-[var(--mk-ink-2)]">
                        {profileUser.tagline}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-end">
                    <button
                      onClick={handleFollowToggle}
                      className={`${isFollowing ? btn.plain : btn.primary} px-4 py-1.5 text-[14px]`}
                    >
                      {isFollowing ? (
                        <>
                          <UserMinus className="w-4 h-4" />
                          <span>Unfollow</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>Follow</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleMessageClick}
                      className={`${btn.plain} px-4 py-1.5 text-[14px]`}
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Message</span>
                    </button>

                    <button aria-label="Share profile" className={iconBtn}>
                      <Share className="w-4 h-4" />
                    </button>
                    <button aria-label="More options" className={iconBtn}>
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Stats: ruled grid */}
                <div className="grid grid-cols-2 border-l border-t border-[var(--mk-ink)] bg-white sm:grid-cols-5">
                  <div className={statCell}>
                    <span className="block mk-display text-[1.8rem] tabular-nums text-[var(--mk-ink)]">
                      {profileStats.totalPosts}
                    </span>
                    <span className={`${tag} mt-1 block`}>Posts</span>
                  </div>
                  <button
                    onClick={() => setShowFollowersModal(true)}
                    className={`${statCell} transition-colors hover:bg-[var(--mk-indigo-soft)]`}
                  >
                    <span className="block mk-display text-[1.8rem] tabular-nums text-[var(--mk-indigo)]">
                      {followers.length}
                    </span>
                    <span className={`${tag} mt-1 block`}>Followers</span>
                  </button>
                  <button
                    onClick={() => setShowFollowingModal(true)}
                    className={`${statCell} transition-colors hover:bg-[var(--mk-indigo-soft)]`}
                  >
                    <span className="block mk-display text-[1.8rem] tabular-nums text-[var(--mk-indigo)]">
                      {following.length}
                    </span>
                    <span className={`${tag} mt-1 block`}>Following</span>
                  </button>
                  <div className={statCell}>
                    <span className="block mk-display text-[1.8rem] tabular-nums text-[var(--mk-ink)]">
                      {profileStats.totalViews}
                    </span>
                    <span className={`${tag} mt-1 block`}>Views</span>
                  </div>
                  <div className={`${statCell} col-span-2 sm:col-span-1`}>
                    <span className="block mk-display text-[1.8rem] tabular-nums text-[var(--mk-cyan-deep)]">
                      {profileStats.engagementRate.toFixed(1)}%
                    </span>
                    <span className={`${tag} mt-1 block`}>Engagement</span>
                  </div>
                </div>
              </div>
            </div>
          </Window>

          {/* Tabs */}
          <div className="mb-8 flex justify-center">
            <div
              role="tablist"
              className="mk-hard-sm flex max-w-full gap-1 overflow-x-auto rounded-[6px] border border-[var(--mk-ink)] bg-white p-1 scrollbar-hide"
            >
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                const selected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex flex-shrink-0 items-center gap-2 rounded-[4px] px-3 py-2 text-[14px] font-semibold tracking-tight transition-colors sm:px-5 ${
                      selected
                        ? "bg-[var(--mk-ink)] text-white"
                        : "text-[var(--mk-ink-2)] hover:bg-[var(--mk-indigo-soft)]"
                    }`}
                  >
                    <IconComponent className="w-4 h-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">{tab.name}</span>
                    <span
                      className={`text-[12px] tabular-nums ${
                        selected ? "text-white/70" : "text-[var(--mk-ink-2)]"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, index) => (
                <div key={index}>
                  <div className="overflow-hidden rounded-[5px] border border-[var(--mk-rule)] bg-white">
                    <div className="h-48 bg-[var(--mk-paper)]"></div>
                    <div className="p-4">
                      <div className="mb-2 h-4 w-3/4 rounded-[3px] bg-[var(--mk-rule)]"></div>
                      <div className="h-3 w-1/2 rounded-[3px] bg-[var(--mk-rule)]"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : currentTabData.length > 0 ? (
            <MasonryGrid>
              {currentTabData.map((item) => (
                <Card
                  key={`${item.id}-${item.reposted ? "repost" : "created"}`}
                  user={item.username}
                  title={item.title}
                  description={item.description}
                  text={item.text}
                  image={item.image}
                  picture={item.picture}
                  reposted={item.reposted}
                  onClick={() => handleCardClick(item)}
                  onUserTagClick={handleUserTagClick}
                  onCardTagClick={handleCardTagClick}
                />
              ))}
            </MasonryGrid>
          ) : (
            <div className="mk-hard-sm mx-auto max-w-md rounded-[6px] border border-[var(--mk-ink)] bg-white px-6 py-12 text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-[4px] border border-[var(--mk-ink)] bg-[var(--mk-indigo-soft)]">
                <MessageSquare className="h-8 w-8 text-[var(--mk-indigo)]" />
              </div>
              <div className="mb-2 text-[18px] font-bold tracking-[-0.03em] text-[var(--mk-ink)]">
                No {activeTab} yet
              </div>
              <div className="text-[14px] tracking-tight text-[var(--mk-ink-2)]">
                {activeTab === "opinion"
                  ? `${profileUser.name} hasn't shared any opinions yet.`
                  : `No ${activeTab} posts available.`}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Followers/Following Modals */}
      <FollowersModal
        isOpen={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        username={profileUser.username}
        isOwnProfile={false}
      />
      <FollowingModal
        isOpen={showFollowingModal}
        onClose={() => setShowFollowingModal(false)}
        username={profileUser.username}
        isOwnProfile={false}
      />

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
    </div>
  );
}
