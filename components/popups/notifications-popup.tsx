"use client";

import { useState, useEffect } from "react";
import { X, Bell, Heart, MessageCircle, UserPlus, Repeat2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Window, btn, tag } from "@/components/app/ui";

interface NotificationsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onAllRead?: () => void;
}

interface Notification {
  id: number;
  type: string;
  title: string;
  user: {
    name: string;
    username: string;
    image?: string;
  };
  homefeedItem: {
    id: number;
    image?: string;
    text?: string;
  };
  createdAt: string;
}

export default function NotificationsPopup({
  isOpen,
  onClose,
  onAllRead,
}: NotificationsPopupProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("profileUser");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    if (isOpen && user) {
      fetchNotifications();
    }
  }, [isOpen, user]);

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

  const fetchNotifications = async () => {
    if (!user) return;
    const orgId = getActiveOrgId();

    setIsLoading(true);
    try {
      const response = await fetch(
        `/nest-api/orgs/${orgId}/notifications/user/${user.username}`
      );
      const data = await response.json();
      setNotifications(data);

      // mark all read
      await fetch(
        `/nest-api/orgs/${orgId}/notifications/user/${user.username}/mark-all-read`,
        {
          method: "POST",
        }
      );
      // notify parent to clear badge
      onAllRead?.();
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const differenceInSeconds = Math.floor(
      (now.getTime() - time.getTime()) / 1000
    );

    if (differenceInSeconds < 60) {
      return `${differenceInSeconds}s ago`;
    } else if (differenceInSeconds < 3600) {
      const minutes = Math.floor(differenceInSeconds / 60);
      return `${minutes}m ago`;
    } else if (differenceInSeconds < 86400) {
      const hours = Math.floor(differenceInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(differenceInSeconds / 86400);
      return `${days}d ago`;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="h-3 w-3 text-[var(--mk-amber)]" />;
      case "comment":
        return <MessageCircle className="h-3 w-3 text-[var(--mk-indigo)]" />;
      case "follow":
        return <UserPlus className="h-3 w-3 text-[var(--mk-green)]" />;
      case "repost":
        return <Repeat2 className="h-3 w-3 text-[var(--mk-cyan-deep)]" />;
      default:
        return <Bell className="h-3 w-3 text-[var(--mk-ink-2)]" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "like":
        return "bg-[var(--mk-amber-soft)]";
      case "comment":
        return "bg-[var(--mk-indigo-soft)]";
      case "follow":
        return "bg-[var(--mk-green-soft)]";
      case "repost":
        return "bg-[var(--mk-cyan-soft)]";
      default:
        return "bg-white";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-[var(--mk-ink)]/40"
        onClick={onClose}
      ></div>

      <Window
        title="notifications://all"
        className="absolute right-4 top-20 flex max-h-[600px] w-80 flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--mk-rule)] px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[var(--mk-ink)]" />
            <h3 className="font-bold tracking-[-0.03em] text-[var(--mk-ink)]">Updates</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close notifications"
            className="grid h-8 w-8 place-items-center rounded-[4px] border border-[var(--mk-ink)] bg-white text-[var(--mk-ink)] hover:bg-[var(--mk-indigo-soft)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div>
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 border-b border-[var(--mk-rule)] px-4 py-3"
                >
                  <div className="h-10 w-10 rounded-[4px] bg-[var(--mk-paper)]"></div>
                  <div className="flex-1">
                    <div className="mb-2 h-3.5 w-3/4 rounded-[2px] bg-[var(--mk-paper)]"></div>
                    <div className="h-3 w-1/2 rounded-[2px] bg-[var(--mk-paper)]"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <h4 className={`${tag} border-b border-[var(--mk-rule)] bg-[var(--mk-paper)] px-4 py-2`}>
                Recent
              </h4>
              <div>
                {notifications.map((notification) => (
                  <Link
                    key={notification.id}
                    href={`/event/${notification.homefeedItem.id}`}
                    className="block"
                  >
                    <div className="group flex cursor-pointer items-start gap-3 border-b border-[var(--mk-rule)] px-4 py-3 transition-colors hover:bg-[var(--mk-indigo-soft)]">
                      <div className="relative flex-shrink-0">
                        {notification.user.image ? (
                          <Image
                            src={
                              notification.homefeedItem.image ||
                              notification.user.image ||
                              "/placeholder.svg?height=48&width=48" ||
                              "/placeholder.svg"
                            }
                            alt={notification.title}
                            width={48}
                            height={48}
                            className="h-10 w-10 rounded-[4px] border border-[var(--mk-ink)] object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-[4px] border border-[var(--mk-ink)] bg-[var(--mk-indigo)]">
                            <span className="text-xs font-bold text-white">
                              {notification.user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div
                          className={`absolute -bottom-1 -right-1 rounded-[3px] border border-[var(--mk-ink)] p-0.5 ${getNotificationColor(
                            notification.type
                          )}`}
                        >
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-[14px] font-semibold tracking-tight text-[var(--mk-ink)]">
                              {notification.title}
                            </p>
                            <p className="mt-0.5 text-[13px] tracking-tight text-[var(--mk-ink-2)]">
                              <span className="font-semibold text-[var(--mk-ink)]">
                                {notification.user.name}
                              </span>{" "}
                              {notification.type} this item
                            </p>
                          </div>
                          <span className={`${tag} ml-2 flex-shrink-0`}>
                            {calculateTimeAgo(notification.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {notifications.length === 0 && !isLoading && (
                <div className="py-8 text-center">
                  <Bell className="mx-auto mb-3 h-10 w-10 text-[var(--mk-rule)]" />
                  <p className="text-[14px] font-semibold tracking-tight text-[var(--mk-ink)]">No notifications yet</p>
                  <p className="mt-1 text-[12.5px] tracking-tight text-[var(--mk-ink-2)]">
                    You'll see updates here when they arrive
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-[var(--mk-ink)] p-3">
            <button className={`${btn.plain} w-full px-4 py-2 text-[13.5px]`}>
              View All Notifications
            </button>
          </div>
        )}
      </Window>
    </div>
  );
}
