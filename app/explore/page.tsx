"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    Search,
    Filter,
    TrendingUp,
    Clock,
    Heart,
    Eye,
    Star,
    Grid3X3,
    List,
    SlidersHorizontal,
    Bell,
    MessageCircle,
    User,
    ChevronDown,
    Sparkles,
    FlameIcon as Fire,
    Users,
    Globe,
    X,
    Home,
    Compass,
    Plus,
    Menu,
} from "lucide-react"
import Card from "@/components/card"
import MasonryGrid from "@/components/masonry-grid"
import InboxPopup from "@/components/popups/inbox-popup"
import SettingsPopup from "@/components/popups/settings-popup"
import NotificationsPopup from "@/components/popups/notifications-popup"

interface CardItem {
    id: number
    title: string
    description: string
    text?: string
    image?: string
    username: string
    picture?: string
    parent: number
    weblink?: string
    privacy?: boolean
    createdAt?: string
    category?: string
}

export default function ExplorePage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [homeFeed, setHomeFeed] = useState<CardItem[]>([])
    const [filteredFeed, setFilteredFeed] = useState<CardItem[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("all")
    const [sortBy, setSortBy] = useState("recent")
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
    const [showFilters, setShowFilters] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    // Popup states
    const [isInboxPopupOpen, setIsInboxPopupOpen] = useState(false)
    const [isSettingsPopupOpen, setIsSettingsPopupOpen] = useState(false)
    const [isNotificationsPopupOpen, setIsNotificationsPopupOpen] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    // Filter states
    const [dateFilter, setDateFilter] = useState("all")
    const [contentTypeFilter, setContentTypeFilter] = useState("all")
    const [engagementFilter, setEngagementFilter] = useState("all")

    const categories = [
        { id: "all", name: "All", icon: Globe, color: "text-gray-600" },
        { id: "trending", name: "Trending", icon: TrendingUp, color: "text-red-500" },
        { id: "featured", name: "Featured", icon: Star, color: "text-yellow-500" },
        { id: "recent", name: "Recent", icon: Clock, color: "text-blue-500" },
        { id: "popular", name: "Popular", icon: Fire, color: "text-orange-500" },
        { id: "collections", name: "Collections", icon: Users, color: "text-purple-500" },
    ]

    const sortOptions = [
        { id: "recent", name: "Most Recent", icon: Clock },
        { id: "popular", name: "Most Popular", icon: TrendingUp },
        { id: "liked", name: "Most Liked", icon: Heart },
        { id: "viewed", name: "Most Viewed", icon: Eye },
        { id: "alphabetical", name: "A-Z", icon: SlidersHorizontal },
    ]

    useEffect(() => {
        // Get user from localStorage
        const userData = localStorage.getItem("user")
        if (userData) {
            setUser(JSON.parse(userData))
        }
    }, [])

    useEffect(() => {
        const fetchHomeFeedData = async () => {
            if (!user) return

            setIsLoading(true)
            try {
                const token = localStorage.getItem("token")
                const response = await fetch(`https://d3kv9nj5wp3sq6.cloudfront.net/homefeed`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                })

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }

                const data = await response.json()

                // Add category and date for filtering
                const enrichedData = data.map((item: any) => ({
                    ...item,
                    category: getRandomCategory(),
                    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
                }))

                setHomeFeed(enrichedData)
            } catch (error) {
                console.error("Error fetching home feed:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchHomeFeedData()
    }, [user])

    const getRandomCategory = () => {
        const cats = ["trending", "featured", "recent", "popular", "collections"]
        return cats[Math.floor(Math.random() * cats.length)]
    }

    useEffect(() => {
        const filtered = homeFeed.filter((item) => {
            // Privacy check
            const isAllowedToView = (item.privacy === true && item.username === user?.username) || item.privacy === false

            if (!isAllowedToView) return false

            // Search filter
            const matchesSearch =
                !searchTerm ||
                item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.username?.toLowerCase().includes(searchTerm.toLowerCase())

            // Category filter
            const matchesCategory = selectedCategory === "all" || item.category === selectedCategory

            // Date filter
            const matchesDate = dateFilter === "all" || checkDateFilter(item.createdAt, dateFilter)

            // Content type filter
            const matchesContentType = contentTypeFilter === "all" || checkContentType(item, contentTypeFilter)

            // Engagement filter
            const matchesEngagement = engagementFilter === "all"

            return matchesSearch && matchesCategory && matchesDate && matchesContentType && matchesEngagement
        })

        // Sort filtered results
        // filtered = sortCards(filtered, sortBy)

        filtered.sort((a, b) => b.id - a.id)  // Sort by id descending

        setFilteredFeed(filtered)
    }, [homeFeed, searchTerm, selectedCategory, sortBy, dateFilter, contentTypeFilter, engagementFilter, user])

    const checkDateFilter = (createdAt: string | undefined, filter: string) => {
        if (!createdAt) return true
        const date = new Date(createdAt)
        const now = new Date()
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

        switch (filter) {
            case "today":
                return diffDays === 0
            case "week":
                return diffDays <= 7
            case "month":
                return diffDays <= 30
            default:
                return true
        }
    }

    const checkContentType = (item: CardItem, filter: string) => {
        switch (filter) {
            case "images":
                return !!item.image
            case "text":
                return !!item.text && !item.image
            case "links":
                return !!item.weblink
            default:
                return true
        }
    }

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
        router.push(`/event/${item.id}`)
    }

    const clearAllFilters = () => {
        setSearchTerm("")
        setSelectedCategory("all")
        setSortBy("recent")
        setDateFilter("all")
        setContentTypeFilter("all")
        setEngagementFilter("all")
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        )
    }

    const handleUserTagClick = (username: string) => {
        if (username === user?.username) {
            router.push("/profile")
        } else {
            localStorage.setItem("profileUsername", username)
            router.push("/profile/user")
        }
    }

    const handleCardTagClick = (cardId: number) => {
        const cardElement = document.getElementById(`card-${cardId}`)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
            {/* Desktop Navbar - Hidden on Mobile */}
            <nav className="hidden md:block fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <div className="flex items-center space-x-4">
                            <Link href="/home" className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">O</span>
                                </div>
                                <span className="font-bold text-xl text-gray-900">Opinio^nth</span>
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
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${item.key === "explore"
                                        ? "bg-gray-900 text-white shadow-lg"
                                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                        }`}
                                >
                                    {item.name}
                                </Link>
                            ))}
                        </div>

                        {/* Enhanced Search Bar */}
                        <div className="flex-1 max-w-md mx-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search posts, users, topics..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2 bg-gray-100 border-0 rounded-full text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all duration-200"
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
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all duration-200 relative"
                            >
                                <Bell className="w-5 h-5" />
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
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
                        <Link href="/home" className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-blue-600 rounded-md flex items-center justify-center">
                                <span className="text-white font-bold text-xs">O</span>
                            </div>
                            <span className="font-bold text-lg text-gray-900">Explore</span>
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
                            placeholder="Search posts, users, topics..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 bg-gray-100 border-0 rounded-full text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all duration-200"
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
                                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
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
                                className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <Compass className="w-5 h-5 text-purple-600" />
                                <span className="text-purple-700 font-medium">Explore</span>
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
                                    setIsNotificationsPopupOpen(true)
                                    setIsMobileMenuOpen(false)
                                }}
                                className="flex items-center space-x-3 p-3 hover:bg-gray-100 rounded-lg w-full text-left"
                            >
                                <Bell className="w-5 h-5 text-gray-600" />
                                <span className="text-gray-900">Notifications</span>
                                <span className="ml-auto w-2 h-2 bg-red-500 rounded-full"></span>
                            </button>
                            <button
                                onClick={() => {
                                    setIsInboxPopupOpen(true)
                                    setIsMobileMenuOpen(false)
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
                                    setIsMobileMenuOpen(false)
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
            <main className="pt-34 md:pt-20 px-4 pb-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header Section */}
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center space-x-3 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
                                Explore & Discover
                            </h1>
                        </div>
                        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                            Discover amazing content, trending topics, and connect with creators from around the world
                        </p>
                    </div>

                    {/* Category Pills */}
                    <div className="flex flex-wrap justify-center gap-3 mb-8">
                        {categories.map((category) => {
                            const IconComponent = category.icon
                            return (
                                <button
                                    key={category.id}
                                    onClick={() => setSelectedCategory(category.id)}
                                    className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${selectedCategory === category.id
                                        ? "bg-white shadow-lg border-2 border-purple-200 text-purple-700"
                                        : "bg-white/70 hover:bg-white hover:shadow-md text-gray-600 hover:text-gray-900"
                                        }`}
                                >
                                    <IconComponent
                                        className={`w-4 h-4 ${selectedCategory === category.id ? "text-purple-600" : category.color}`}
                                    />
                                    <span>{category.name}</span>
                                </button>
                            )
                        })}
                    </div>

                    {/* Controls Bar */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-4 mb-8">
                        <div className="space-y-4">
                            {/* Mobile-first layout */}
                            <div className="flex flex-col space-y-3 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
                                {/* Left Controls - Stack on mobile */}
                                <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
                                    <div className="flex items-center space-x-2">
                                        <SlidersHorizontal className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                        <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort by:</span>
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value)}
                                            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-0 flex-1"
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
                                        className={`flex items-center justify-center space-x-2 px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${showFilters ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            }`}
                                    >
                                        <Filter className="w-4 h-4 flex-shrink-0" />
                                        <span>Filters</span>
                                    </button>
                                </div>

                                {/* Right Controls - Stack on mobile */}
                                <div className="flex items-center justify-between sm:justify-end space-x-4">
                                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                                        <span className="whitespace-nowrap">{filteredFeed.length} results</span>
                                    </div>

                                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                                        <button
                                            onClick={() => setViewMode("grid")}
                                            className={`p-1 rounded ${viewMode === "grid" ? "bg-white shadow-sm" : ""}`}
                                        >
                                            <Grid3X3 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setViewMode("list")}
                                            className={`p-1 rounded ${viewMode === "list" ? "bg-white shadow-sm" : ""}`}
                                        >
                                            <List className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Advanced Filters - unchanged */}
                        {showFilters && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
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
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Content Type</label>
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

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Engagement</label>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {[...Array(12)].map((_, index) => (
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
                        <div className="text-center py-16">
                            <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="w-12 h-12 text-gray-400" />
                            </div>
                            <div className="text-gray-400 text-lg mb-2">No results found</div>
                            <div className="text-gray-500 text-sm mb-4">
                                {searchTerm ? `No posts match "${searchTerm}"` : "Try adjusting your filters"}
                            </div>
                            <button
                                onClick={clearAllFilters}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                Clear Filters
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Popups */}
            <InboxPopup isOpen={isInboxPopupOpen} onClose={() => setIsInboxPopupOpen(false)} />
            <SettingsPopup isOpen={isSettingsPopupOpen} onClose={() => setIsSettingsPopupOpen(false)} />
            <NotificationsPopup isOpen={isNotificationsPopupOpen} onClose={() => setIsNotificationsPopupOpen(false)} />
        </div>
    )
}
