"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Filter,
  TrendingUp,
  Clock,
  Heart,
  Eye,
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
  Building2,
  MapPin,
  FileText,
  Settings,
  Palette,
  Code,
  Megaphone,
  Target,
  Calendar,
  Database,
  ChevronRight,
  FolderOpen,
} from "lucide-react";
import Card from "@/components/card";
import InboxPopup from "@/components/popups/inbox-popup";
import SettingsPopup from "@/components/popups/settings-popup";
import NotificationsPopup from "@/components/popups/notifications-popup";
import MasonryGrid from "@/components/masonry-grid";

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
  createdAt?: string;
  category?: string;
}

interface Category {
  id: string;
  name: string;
  icon: any;
  color: string;
  bgColor: string;
  description: string;
  count?: number;
  isCustom?: boolean;
}

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

  const categories: Category[] = [
    {
      id: "all",
      name: "All Categories",
      icon: FolderOpen,
      color: "text-gray-700",
      bgColor: "bg-gray-100",
      description: "View all whiteboards across all categories",
      count: 0,
    },
    {
      id: "company-os",
      name: "Company OS",
      icon: Building2,
      color: "text-amber-700",
      bgColor: "bg-amber-100",
      description: "Company-wide processes and operations",
      count: 0,
    },
    {
      id: "product",
      name: "Product",
      icon: Target,
      color: "text-blue-700",
      bgColor: "bg-blue-100",
      description: "Product development and strategy",
      count: 0,
    },
    {
      id: "roadmap",
      name: "Roadmap",
      icon: MapPin,
      color: "text-indigo-700",
      bgColor: "bg-indigo-100",
      description: "Strategic planning and roadmaps",
      count: 0,
    },
    {
      id: "docs",
      name: "Documentation",
      icon: FileText,
      color: "text-slate-700",
      bgColor: "bg-slate-100",
      description: "Technical and process documentation",
      count: 0,
    },
    {
      id: "engineering",
      name: "Engineering",
      icon: Code,
      color: "text-red-700",
      bgColor: "bg-red-100",
      description: "Technical discussions and architecture",
      count: 0,
    },
    {
      id: "marketing",
      name: "Marketing",
      icon: Megaphone,
      color: "text-orange-700",
      bgColor: "bg-orange-100",
      description: "Marketing campaigns and strategies",
      count: 0,
    },
    {
      id: "design",
      name: "Design",
      icon: Palette,
      color: "text-purple-700",
      bgColor: "bg-purple-100",
      description: "Design systems and creative work",
      count: 0,
    },
    {
      id: "operations",
      name: "Operations",
      icon: Settings,
      color: "text-emerald-700",
      bgColor: "bg-emerald-100",
      description: "Business operations and workflows",
      count: 0,
    },
    {
      id: "meetings",
      name: "Meetings",
      icon: Calendar,
      color: "text-cyan-700",
      bgColor: "bg-cyan-100",
      description: "Meeting notes and collaborative sessions",
      count: 0,
    },
    {
      id: "data",
      name: "Data & Analytics",
      icon: Database,
      color: "text-pink-700",
      bgColor: "bg-pink-100",
      description: "Data analysis and reporting",
      count: 0,
    },
  ];

  const sortOptions = [
    { id: "recent", name: "Most Recent", icon: Clock },
    { id: "popular", name: "Most Popular", icon: TrendingUp },
    { id: "liked", name: "Most Liked", icon: Heart },
    { id: "viewed", name: "Most Viewed", icon: Eye },
    { id: "alphabetical", name: "A-Z", icon: SlidersHorizontal },
  ];

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    const fetchHomeFeedData = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `https://d3kv9nj5wp3sq6.cloudfront.net/homefeed`,
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

        const enrichedData = data.map((item: any) => ({
          ...item,
          category: getRandomCategory(),
          createdAt: new Date(
            Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        }));

        setHomeFeed(enrichedData);
      } catch (error) {
        console.error("Error fetching home feed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHomeFeedData();
  }, [user]);

  const getRandomCategory = () => {
    const cats = [
      "company-os",
      "product",
      "roadmap",
      "docs",
      "engineering",
      "marketing",
      "design",
      "operations",
      "meetings",
      "data",
    ];
    return cats[Math.floor(Math.random() * cats.length)];
  };

  useEffect(() => {
    categories.forEach((category) => {
      if (category.id === "all") {
        category.count = homeFeed.length;
      } else {
        category.count = homeFeed.filter(
          (item) => item.category === category.id
        ).length;
      }
    });
  }, [homeFeed]);

  useEffect(() => {
    const filtered = homeFeed.filter((item) => {
      // Privacy check
      const isAllowedToView =
        (item.privacy === true && item.username === user?.username) ||
        item.privacy === false;

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
    sortBy,
    dateFilter,
    contentTypeFilter,
    engagementFilter,
    user,
  ]);

  const checkDateFilter = (createdAt: string | undefined, filter: string) => {
    if (!createdAt) return true;
    const date = new Date(createdAt);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    switch (filter) {
      case "today":
        return diffDays === 0;
      case "week":
        return diffDays <= 7;
      case "month":
        return diffDays <= 30;
      default:
        return true;
    }
  };

  const checkContentType = (item: CardItem, filter: string) => {
    switch (filter) {
      case "images":
        return !!item.image;
      case "text":
        return !!item.text && !item.image;
      case "links":
        return !!item.weblink;
      default:
        return true;
    }
  };

  // const sortCards = (cards: CardItem[], sortType: string) => {
  //     const sorted = [...cards]

  //     switch (sortType) {
  //         case "recent":
  //             return sorted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
  //         case "popular":
  //             return sorted.sort((a, b) => (b.likes || 0) + (b.views || 0) - ((a.likes || 0) + (a.views || 0)))
  //         case "liked":
  //             return sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0))
  //         case "viewed":
  //             return sorted.sort((a, b) => (b.views || 0) - (a.views || 0))
  //         case "alphabetical":
  //             return sorted.sort((a, b) => (a.title || "").localeCompare(b.title || ""))
  //         default:
  //             return sorted
  //     }
  // }

  const handleCardClick = (item: CardItem) => {
    router.push(`/event/${item.id}`);
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSortBy("recent");
    setDateFilter("all");
    setContentTypeFilter("all");
    setEngagementFilter("all");
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
    categories.find((cat) => cat.id === selectedCategory) || categories[0];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Navbar - Hidden on Mobile */}
      <nav className="hidden md:block fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-full mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <Link href="/home" className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">O</span>
                </div>
                <span className="font-bold text-xl text-gray-900">
                  Opinio^nth
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
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
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
            <Link href="/home" className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-blue-600 rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-xs">O</span>
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

              {/* Add Custom Category Button */}
              <button className="w-full mt-4 p-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors text-base font-medium">
                <Plus className="w-5 h-5 inline mr-2" />
                Add Custom Category
              </button>
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

            {/* Add Custom Category Button */}
            {isCategorySidebarOpen && (
              <button className="w-full mt-4 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors text-sm font-medium">
                <Plus className="w-4 h-4 inline mr-2" />
                Add Custom Category
              </button>
            )}
          </div>
        </aside>

        <main
          className={`flex-1 transition-all duration-300 mt-25 md:mt-0 ${
            isCategorySidebarOpen ? "md:ml-80" : "md:ml-16"
          }`}
        >
          <div className="p-4 md:p-6">
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

              {/* Advanced Filters */}
              {showFilters && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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

                  <div className="flex justify-end mt-4">
                    <button
                      onClick={clearAllFilters}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
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
