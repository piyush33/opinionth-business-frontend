"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { lookupFeedCard } from "@/lib/feed";
import { toast } from "sonner";
import Link from "next/link";
import {
  Edit,
  Share,
  MoreHorizontal,
  Grid3X3,
  Heart,
  Bookmark,
  Camera,
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

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("opinion");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

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
  const [unreadCount, setUnreadCount] = useState(0);

  // Combined opinion posts (created + reposted)
  const opinionPosts = [...createdPosts, ...repostedPosts].sort((a, b) => {
    // Sort by creation date if available, otherwise by id
    return b.id - a.id;
  });

  const handleUnauthorized = () => {
    toast.error("Session expired. Please sign in again.");
    localStorage.removeItem("token");
    localStorage.removeItem("profileUser");
    setTimeout(() => router.replace("/login"), 1000);
  };

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
    // Get user from localStorage
    const userData = localStorage.getItem("profileUser");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

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
    const fetchProfileData = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        const token = localStorage.getItem("token");
        const orgId = getActiveOrgId();
        const headers = { Authorization: `Bearer ${token}` };

        const requests = [
          fetch(
            `/nest-api/orgs/${orgId}/profilefeed/${user.username}/created`,
            { headers }
          ),
          fetch(`/nest-api/orgs/${orgId}/profilefeed/${user.username}/liked`, {
            headers,
          }),
          fetch(`/nest-api/orgs/${orgId}/profilefeed/${user.username}/saved`, {
            headers,
          }),
          fetch(
            `/nest-api/orgs/${orgId}/profilefeed/${user.username}/reposted`,
            { headers }
          ),
          fetch(
            `/nest-api/orgs/${orgId}/profileusers/${user.username}/followers`,
            { headers }
          ),
          fetch(
            `/nest-api/orgs/${orgId}/profileusers/${user.username}/following`,
            { headers }
          ),
        ];

        const responses = await Promise.all(requests);

        // 🔐 If any call says unauthorized, show toast and redirect
        if (responses.some((r) => r.status === 401)) {
          handleUnauthorized();
          return;
        }

        // Generic error handling for any non-OK
        const bad = responses.find((r) => !r.ok);
        if (bad) {
          throw new Error(`HTTP error! status: ${bad.status}`);
        }

        const [created, liked, saved, reposted, followersData, followingData] =
          await Promise.all(responses.map((r) => r.json()));

        setCreatedPosts(created);
        setLikedPosts(liked);
        setSavedPosts(saved);
        setRepostedPosts(
          reposted.map((item: any) => ({ ...item, reposted: true }))
        );
        setFollowers(followersData);
        setFollowing(followingData);

        // Stats (demo calc)
        const totalPosts = created.length;
        const totalLikes = Math.floor(Math.random() * 1000) + 100;
        const totalViews = Math.floor(Math.random() * 5000) + 500;
        const totalReposts = reposted.length;
        const totalSaves = saved.length;
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
  }, [user]);

  const getCurrentTabData = () => {
    const allData = {
      opinion: opinionPosts,
      liked: likedPosts,
      saved: savedPosts,
    };

    let data = allData[activeTab as keyof typeof allData] || [];

    // Sort by id descending
    data = data.sort((a, b) => b.id - a.id);

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

  const handleEditProfile = () => {
    router.push("/profile/edit");
  };

  if (!user) {
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
        active="profile"
        search={{ value: searchTerm, onChange: setSearchTerm, placeholder: "Search your posts..." }}
        unreadCount={unreadCount}
        onNotifications={() => setIsNotificationsPopupOpen(true)}
        onInbox={() => setIsInboxPopupOpen(true)}
        onSettings={() => setIsSettingsPopupOpen(true)}
      />

      {/* Main Content */}
      <main className="pt-34 md:pt-20 px-4 pb-8">
        <div className="max-w-6xl mx-auto">
          {/* Profile Header */}
          <Window title={`profile://${user.username}`} className="mb-8">
            <div className="flex flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:items-start lg:gap-8">
              {/* Profile Picture */}
              <div className="relative group self-center lg:self-start">
                <div className="h-24 w-24 overflow-hidden rounded-[4px] border border-[var(--mk-ink)] sm:h-32 sm:w-32">
                  {user.image ? (
                    <Image
                      src={
                        user.image || "/placeholder.svg?height=128&width=128"
                      }
                      alt={user.name}
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[var(--mk-indigo)]">
                      <span className="mk-display text-[2rem] text-white">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  aria-label="Change photo"
                  className={`absolute bottom-1.5 right-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 ${iconBtn} h-8 w-8`}
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {/* Profile Info */}
              <div className="w-full flex-1 text-center lg:text-left">
                <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <PixelLabel className="mb-3 justify-center lg:justify-start">Profile</PixelLabel>
                    <h1 className="mk-display text-[2rem] text-[var(--mk-ink)] sm:text-[2.6rem]">
                      {user.name}
                    </h1>
                    <p className="mt-2 text-[15px] font-semibold tracking-tight text-[var(--mk-indigo)]">
                      @{user.username}
                    </p>
                    {user.tagline && (
                      <p className="mt-2 max-w-xl text-[15px] tracking-[-0.01em] text-[var(--mk-ink-2)]">{user.tagline}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-2 lg:justify-end">
                    <button
                      onClick={handleEditProfile}
                      className={`${btn.plain} px-3.5 py-1.5 text-[14px]`}
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
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
                  onCardTagClick={handleCardTagClick}
                />
              ))}
            </MasonryGrid>
          ) : (
            <div className="mk-hard-sm mx-auto max-w-md rounded-[6px] border border-[var(--mk-ink)] bg-white px-6 py-12 text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-[4px] border border-[var(--mk-ink)] bg-[var(--mk-indigo-soft)]">
                <Grid3X3 className="h-8 w-8 text-[var(--mk-indigo)]" />
              </div>
              <div className="mb-2 text-[18px] font-bold tracking-[-0.03em] text-[var(--mk-ink)]">
                No {activeTab} posts yet
              </div>
              <div className="mb-4 text-[14px] tracking-tight text-[var(--mk-ink-2)]">
                {activeTab === "created"
                  ? "Start creating amazing content!"
                  : `You haven't ${activeTab} any posts yet.`}
              </div>
              {activeTab === "created" && (
                <Link
                  href="/create"
                  className={`${btn.primary} px-4 py-2 text-[14px]`}
                >
                  <span>Create Your First Post</span>
                </Link>
              )}
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
        onAllRead={() => setUnreadCount(0)}
      />
      {/* Followers/Following Modals */}
      <FollowersModal
        isOpen={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        username={user.username}
        isOwnProfile={true}
      />
      <FollowingModal
        isOpen={showFollowingModal}
        onClose={() => setShowFollowingModal(false)}
        username={user.username}
        isOwnProfile={true}
      />
    </div>
  );
}
