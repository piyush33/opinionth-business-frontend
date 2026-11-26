"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useDebounced, useLoadMoreSentinel, usePagedFeed } from "@/lib/feed";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Card from "@/components/card";
import MasonryGrid from "@/components/masonry-grid";
import InboxPopup from "@/components/popups/inbox-popup";
import SettingsPopup from "@/components/popups/settings-popup";
import NotificationsPopup from "@/components/popups/notifications-popup";
import AppNav from "@/components/app/AppNav";
import { btn } from "@/components/app/ui";

export default function HomePage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState<any>(null);
  const [isInboxPopupOpen, setIsInboxPopupOpen] = useState(false);
  const [isSettingsPopupOpen, setIsSettingsPopupOpen] = useState(false);
  const [isNotificationsPopupOpen, setIsNotificationsPopupOpen] =
    useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Check authentication and get user data
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("profileUser");

    if (!token) {
      router.push("/login");
      return;
    }

    if (userData) {
      setUser(JSON.parse(userData));
    }

    localStorage.removeItem("selectedCard");
  }, [router]);

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

  // Newest first, a page at a time; search runs on the server.
  const debouncedSearch = useDebounced(searchTerm, 300);
  const feedFilters = useMemo(() => ({ q: debouncedSearch }), [debouncedSearch]);
  const feed = usePagedFeed<any>(feedFilters, !!user, onSessionExpired);
  const isLoading = feed.loading || (!!user && feed.total === null && !feed.error);
  const error = feed.items.length === 0 ? feed.error : null;
  const sentinelRef = useLoadMoreSentinel(
    feed.loadMore,
    feed.hasMore && !feed.loading,
    feed.items.length
  );

  const handleCardClick = (item: any) => {
    localStorage.setItem("lastVisitedCardLayerid", item.layer.id);
    router.push(`/event/${item.id}`);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value.toLowerCase());
  };

  const filteredHomeFeed = feed.items;

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--mk-paper)]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin border-2 border-[var(--mk-rule)] border-t-[var(--mk-indigo)] motion-reduce:animate-none"></div>
          <p className="tracking-tight text-[var(--mk-ink-2)]">Loading...</p>
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

  return (
    <div className="min-h-screen bg-[var(--mk-paper)] text-[var(--mk-ink)]">
      <AppNav
        active="home"
        search={{ value: searchTerm, onChange: handleSearchChange, placeholder: "Search posts…" }}
        unreadCount={unreadCount}
        onNotifications={() => setIsNotificationsPopupOpen(true)}
        onInbox={() => setIsInboxPopupOpen(true)}
        onSettings={() => setIsSettingsPopupOpen(true)}
      />

      {/* Main Content */}
      <main className="pt-32 md:pt-20 px-4 pb-8">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, index) => (
                <div key={index} className="animate-pulse motion-reduce:animate-none">
                  <div className="overflow-hidden rounded-[6px] border border-[var(--mk-rule)] bg-white">
                    <div className="p-4">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-[3px] bg-[var(--mk-rule)]"></div>
                        <div className="h-4 w-24 rounded-[2px] bg-[var(--mk-rule)]"></div>
                      </div>
                      <div className="mb-4 h-32 rounded-[4px] bg-[var(--mk-paper)]"></div>
                      <div className="mb-2 h-4 w-3/4 rounded-[2px] bg-[var(--mk-rule)]"></div>
                      <div className="h-3 w-1/2 rounded-[2px] bg-[var(--mk-rule)]"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="mx-auto max-w-md py-16 text-center">
              <div className="mb-2 text-lg font-bold tracking-[-0.03em] text-[var(--mk-ink)]">
                <span aria-hidden className="mr-2 inline-block h-2.5 w-2.5 bg-[var(--mk-amber)] align-middle" />
                Error loading posts
              </div>
              <div className="mb-4 text-sm tracking-tight text-[var(--mk-ink-2)]">{error}</div>
              <button
                onClick={() => window.location.reload()}
                className={`${btn.primary} px-4 py-2 text-[14px]`}
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <MasonryGrid>
                {filteredHomeFeed.map((item: any, index) => (
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
              {/* Loads the next page as this nears the viewport */}
              <div ref={sentinelRef} aria-hidden className="h-px" />
              {feed.loadingMore && (
                <div className="flex justify-center py-6">
                  <div className="h-6 w-6 animate-spin border-2 border-[var(--mk-rule)] border-t-[var(--mk-indigo)] motion-reduce:animate-none" />
                </div>
              )}
              {feed.error && feed.items.length > 0 && !feed.loadingMore && (
                <div className="flex justify-center py-6 text-sm tracking-tight text-[var(--mk-ink)]">
                  {feed.error}.
                  <button type="button" onClick={feed.loadMore} className="ml-2 font-semibold text-[var(--mk-indigo-deep)] underline underline-offset-2">
                    Retry
                  </button>
                </div>
              )}

              {filteredHomeFeed.length === 0 && (
                <div className="py-16 text-center">
                  <div className="mb-2 text-lg font-bold tracking-[-0.03em] text-[var(--mk-ink)]">
                    No posts found
                  </div>
                  <div className="text-sm tracking-tight text-[var(--mk-ink-2)]">
                    {searchTerm
                      ? "Try adjusting your search terms"
                      : "No posts available"}
                  </div>
                </div>
              )}
            </>
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
    </div>
  );
}
