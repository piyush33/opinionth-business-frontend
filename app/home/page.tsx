"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  MessageCircle,
  User,
  ChevronDown,
  Search,
  X,
  Menu,
  Home,
  Compass,
  Plus,
} from "lucide-react";
import Card from "@/components/card";
import MasonryGrid from "@/components/masonry-grid";
import InboxPopup from "@/components/popups/inbox-popup";
import SettingsPopup from "@/components/popups/settings-popup";
import NotificationsPopup from "@/components/popups/notifications-popup";

export default function HomePage() {
  const router = useRouter();
  const [homeFeed, setHomeFeed] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState<any>(null);
  const [isInboxPopupOpen, setIsInboxPopupOpen] = useState(false);
  const [isSettingsPopupOpen, setIsSettingsPopupOpen] = useState(false);
  const [isNotificationsPopupOpen, setIsNotificationsPopupOpen] =
    useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
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

  // Fetch data from your API
  useEffect(() => {
    const fetchHomeFeedData = async () => {
      if (!user) return;

      setIsLoading(true);
      setError(null);

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
        setHomeFeed(data);
      } catch (error: any) {
        console.error("Error fetching home feed:", error);
        setError(error.message);
        setHomeFeed([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHomeFeedData();
  }, [user]);

  const handleCardClick = (item: any) => {
    localStorage.setItem("lastVisitedCardLayerid", item.layer.id);
    router.push(`/event/${item.id}`);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value.toLowerCase());
  };

  const filteredHomeFeed = homeFeed
    .filter((item: any) => {
      const isAllowedToView =
        item.privacy === true ? item.username === user?.username : true;

      if (isAllowedToView) {
        return (
          item.title?.toLowerCase().includes(searchTerm) ||
          item.description?.toLowerCase().includes(searchTerm) ||
          item.text?.toLowerCase().includes(searchTerm)
        );
      }
      return false;
    })
    .sort((a: any, b: any) => b.id - a.id); // Sort by id descending

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Navbar - Hidden on Mobile */}
      <nav className="hidden md:block fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-4">
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
                  onChange={(e) => handleSearchChange(e.target.value)}
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
          {/* Top Row - Logo and Menu */}
          <div className="flex items-center justify-between">
            <Link href="/explore" className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-blue-600 rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-xs">C</span>
              </div>
              <span className="font-bold text-lg text-gray-900">Collabrr</span>
            </Link>

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
              onChange={(e) => handleSearchChange(e.target.value)}
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
      <main className="pt-32 md:pt-20 px-4 pb-8">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </div>
                      <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
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
                Error loading posts
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

              {filteredHomeFeed.length === 0 && (
                <div className="text-center py-16">
                  <div className="text-gray-400 text-lg mb-2">
                    No posts found
                  </div>
                  <div className="text-gray-500 text-sm">
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
