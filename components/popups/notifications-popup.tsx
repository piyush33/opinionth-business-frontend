"use client";

import { useState, useEffect } from "react";
import { X, Bell, Heart, MessageCircle, UserPlus, Repeat2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

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
        return <Heart className="w-3 h-3 text-red-500" />;
      case "comment":
        return <MessageCircle className="w-3 h-3 text-blue-500" />;
      case "follow":
        return <UserPlus className="w-3 h-3 text-green-500" />;
      case "repost":
        return <Repeat2 className="w-3 h-3 text-purple-500" />;
      default:
        return <Bell className="w-3 h-3 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "like":
        return "from-red-50 to-pink-50 border-red-100";
      case "comment":
        return "from-blue-50 to-cyan-50 border-blue-100";
      case "follow":
        return "from-green-50 to-emerald-50 border-green-100";
      case "repost":
        return "from-purple-50 to-violet-50 border-purple-100";
      default:
        return "from-gray-50 to-slate-50 border-gray-100";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      <div className="absolute right-4 top-20 w-80 max-h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-red-50">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-orange-600" />
            <h3 className="font-semibold text-gray-900">Updates</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center space-x-3 animate-pulse"
                >
                  <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-2">
              <h4 className="text-sm font-medium text-gray-500 px-2 mb-3">
                Recent
              </h4>
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <Link
                    key={notification.id}
                    href={`/event/${notification.homefeedItem.id}`}
                    className="block"
                  >
                    <div
                      className={`flex items-start space-x-3 p-3 rounded-xl border bg-gradient-to-r ${getNotificationColor(
                        notification.type
                      )} hover:shadow-md transition-all duration-200 cursor-pointer group`}
                    >
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
                            className="rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center">
                            <span className="text-white font-bold text-xs">
                              {notification.user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm group-hover:text-gray-700 transition-colors">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">
                                {notification.user.name}
                              </span>{" "}
                              {notification.type} this item
                            </p>
                          </div>
                          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {calculateTimeAgo(notification.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {notifications.length === 0 && !isLoading && (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No notifications yet</p>
                  <p className="text-gray-400 text-xs mt-1">
                    You'll see updates here when they arrive
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <button className="w-full text-center text-blue-600 text-sm font-medium hover:text-blue-700 transition-colors">
              View All Notifications
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
