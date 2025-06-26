"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
    Heart,
    Repeat2,
    Bookmark,
    Share,
    ExternalLink,
    Plus,
    Bell,
    MessageCircle,
    User,
    ChevronDown,
    Search,
    ArrowLeft,
    Lock,
    Link2,
    Users,
    Layers,
    Sparkles,
    TrendingUp,
    Home,
    Compass,
    Menu,
    X,
} from "lucide-react"
import axios from "axios"
import Card from "@/components/card"
import InboxPopup from "@/components/popups/inbox-popup"
import SettingsPopup from "@/components/popups/settings-popup"
import NotificationsPopup from "@/components/popups/notifications-popup"
import MasonryGrid from "@/components/masonry-grid"

export interface CardItem {
    id: number
    title: string
    description: string
    text?: string
    image?: string
    username: string
    picture?: string
    parent: string
    weblink?: string
    lock?: boolean
    privacy?: boolean
}

export interface InteractionState {
    id: number
    hasLiked?: boolean
    hasReposted?: boolean
    hasSaved?: boolean
}

export default function EventPage() {
    const params = useParams()
    const router = useRouter()
    const cardId = params.id as string

    const [user, setUser] = useState<any>(null)
    const [homeFeed, setHomeFeed] = useState<CardItem[]>([])
    const [displayCards, setDisplayCards] = useState<CardItem[]>([])
    const [selectedCard, setSelectedCard] = useState<CardItem | null>(null)
    const [likedCards, setLikedCards] = useState<InteractionState[]>([])
    const [repostedCards, setRepostedCards] = useState<InteractionState[]>([])
    const [savedCards, setSavedCards] = useState<InteractionState[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Popup states
    const [isInboxPopupOpen, setIsInboxPopupOpen] = useState(false)
    const [isSettingsPopupOpen, setIsSettingsPopupOpen] = useState(false)
    const [isNotificationsPopupOpen, setIsNotificationsPopupOpen] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    useEffect(() => {
        // Get user from localStorage
        const userData = localStorage.getItem("user")
        if (userData) {
            setUser(JSON.parse(userData))
        }
        localStorage.removeItem("selectedCard")
    }, [])

    // Fetch home feed data
    useEffect(() => {
        const fetchHomeFeedData = async () => {
            if (!user) return

            setIsLoading(true)
            setError(null)

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
                setHomeFeed(data)
            } catch (error) {
                console.error("Error fetching home feed:", error)
                setError("Failed to load cards")
            } finally {
                setIsLoading(false)
            }
        }

        fetchHomeFeedData()
    }, [user])

    // Filter cards based on selected card's parent
    useEffect(() => {
        if (cardId && homeFeed.length > 0) {
            const selectedCard = homeFeed.find((card) => card.id === Number(cardId))
            setSelectedCard(selectedCard || null)

            if (selectedCard) {
                const filteredCards = homeFeed.filter((item) => item.parent === selectedCard.parent).sort((a, b) => b.id - a.id)
                setDisplayCards(filteredCards)
            }
        }
    }, [cardId, homeFeed])

    // Fetch interaction states
    useEffect(() => {
        const fetchInteractionStates = async () => {
            if (!user || displayCards.length === 0) return

            try {
                const token = localStorage.getItem("token")

                // Fetch liked status
                const likedPromises = displayCards.map(async (item) => {
                    try {
                        const response = await axios.get(
                            `https://d3kv9nj5wp3sq6.cloudfront.net/likes/homefeed/${user.username}/${item.id}`,
                            { headers: { Authorization: `Bearer ${token}` } },
                        )
                        return { id: item.id, hasLiked: response.data.hasLiked }
                    } catch (error) {
                        return { id: item.id, hasLiked: false }
                    }
                })

                // Fetch reposted status
                const repostedPromises = displayCards.map(async (item) => {
                    try {
                        const response = await axios.get(
                            `https://d3kv9nj5wp3sq6.cloudfront.net/reposts/homefeed/${user.username}/${item.id}`,
                            { headers: { Authorization: `Bearer ${token}` } },
                        )
                        return { id: item.id, hasReposted: response.data.hasReposted }
                    } catch (error) {
                        return { id: item.id, hasReposted: false }
                    }
                })

                // Fetch saved status
                const savedPromises = displayCards.map(async (item) => {
                    try {
                        const response = await axios.get(
                            `https://d3kv9nj5wp3sq6.cloudfront.net/saves/homefeed/${user.username}/${item.id}`,
                            { headers: { Authorization: `Bearer ${token}` } },
                        )
                        return { id: item.id, hasSaved: response.data.hasSaved }
                    } catch (error) {
                        return { id: item.id, hasSaved: false }
                    }
                })

                const [likedResults, repostedResults, savedResults] = await Promise.all([
                    Promise.all(likedPromises),
                    Promise.all(repostedPromises),
                    Promise.all(savedPromises),
                ])

                setLikedCards(likedResults)
                setRepostedCards(repostedResults)
                setSavedCards(savedResults)
            } catch (error) {
                console.error("Error fetching interaction states:", error)
            }
        }

        fetchInteractionStates()
    }, [user, displayCards])

    // Interaction handlers
    const handleLike = async (e: React.MouseEvent, item: CardItem) => {
        e.stopPropagation()
        if (!user) return

        const isCurrentlyLiked = isLiked(item.id)
        const token = localStorage.getItem("token")

        // Optimistic update
        setLikedCards((prev) => prev.map((card) => (card.id === item.id ? { ...card, hasLiked: !isCurrentlyLiked } : card)))

        try {
            if (!isCurrentlyLiked) {
                // Like the item
                await axios.post(
                    `https://d3kv9nj5wp3sq6.cloudfront.net/profilefeed/${user.username}/liked`,
                    { ...item },
                    { headers: { Authorization: `Bearer ${token}` } },
                )
                await axios.post(
                    `https://d3kv9nj5wp3sq6.cloudfront.net/likes/homefeed/${user.username}/${item.id}`,
                    {},
                    { headers: { Authorization: `Bearer ${token}` } },
                )
            } else {
                // Unlike the item - delete from both endpoints
                await axios.delete(`https://d3kv9nj5wp3sq6.cloudfront.net/likes/homefeed/${user.username}/${item.id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })

                // Delete from profilefeed liked as well
                try {
                    const profileLikedResponse = await axios.get(
                        `https://d3kv9nj5wp3sq6.cloudfront.net/profilefeed/${user.username}/liked`,
                        {
                            headers: { Authorization: `Bearer ${token}` },
                        },
                    )
                    const likedItem = profileLikedResponse.data.find(
                        (likedPost: any) =>
                            likedPost.title === item.title &&
                            likedPost.description === item.description &&
                            likedPost.parent === item.parent,
                    )
                    if (likedItem) {
                        await axios.delete(
                            `https://d3kv9nj5wp3sq6.cloudfront.net/profilefeed/${user.username}/liked/${likedItem.id}`,
                            {
                                headers: { Authorization: `Bearer ${token}` },
                            },
                        )
                    }
                } catch (error) {
                    console.error("Error deleting from profilefeed liked:", error)
                }
            }
        } catch (error) {
            console.error("Error handling like:", error)
            // Rollback on error
            setLikedCards((prev) =>
                prev.map((card) => (card.id === item.id ? { ...card, hasLiked: isCurrentlyLiked } : card)),
            )
        }
    }

    const handleRepost = async (e: React.MouseEvent, item: CardItem) => {
        e.stopPropagation()
        if (!user) return

        const isCurrentlyReposted = isReposted(item.id)
        const token = localStorage.getItem("token")

        // Optimistic update
        setRepostedCards((prev) =>
            prev.map((card) => (card.id === item.id ? { ...card, hasReposted: !isCurrentlyReposted } : card)),
        )

        try {
            if (!isCurrentlyReposted) {
                await axios.post(
                    `https://d3kv9nj5wp3sq6.cloudfront.net/profilefeed/${user.username}/reposted`,
                    { ...item },
                    { headers: { Authorization: `Bearer ${token}` } },
                )
                await axios.post(`https://d3kv9nj5wp3sq6.cloudfront.net/reposts/homefeed/${user.username}/${item.id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
            } else {
                await axios.delete(`https://d3kv9nj5wp3sq6.cloudfront.net/reposts/homefeed/${user.username}/${item.id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })

                // Delete from profilefeed reposted as well
                try {
                    const profileRepostedResponse = await axios.get(
                        `https://d3kv9nj5wp3sq6.cloudfront.net/profilefeed/${user.username}/reposted`,
                        {
                            headers: { Authorization: `Bearer ${token}` },
                        },
                    )
                    const repostedItem = profileRepostedResponse.data.find(
                        (repostedPost: any) =>
                            repostedPost.title === item.title &&
                            repostedPost.description === item.description &&
                            repostedPost.parent === item.parent,
                    )
                    if (repostedItem) {
                        await axios.delete(
                            `https://d3kv9nj5wp3sq6.cloudfront.net/profilefeed/${user.username}/reposted/${repostedItem.id}`,
                            {
                                headers: { Authorization: `Bearer ${token}` },
                            },
                        )
                    }
                } catch (error) {
                    console.error("Error deleting from profilefeed reposted:", error)
                }
            }
        } catch (error) {
            console.error("Error handling repost:", error)
            setRepostedCards((prev) =>
                prev.map((card) => (card.id === item.id ? { ...card, hasReposted: isCurrentlyReposted } : card)),
            )
        }
    }

    const handleSave = async (e: React.MouseEvent, item: CardItem) => {
        e.stopPropagation()
        if (!user) return

        const isCurrentlySaved = isSaved(item.id)
        const token = localStorage.getItem("token")

        // Optimistic update
        setSavedCards((prev) => prev.map((card) => (card.id === item.id ? { ...card, hasSaved: !isCurrentlySaved } : card)))

        try {
            if (!isCurrentlySaved) {
                await axios.post(
                    `https://d3kv9nj5wp3sq6.cloudfront.net/profilefeed/${user.username}/saved`,
                    { ...item },
                    { headers: { Authorization: `Bearer ${token}` } },
                )
                await axios.post(`https://d3kv9nj5wp3sq6.cloudfront.net/saves/homefeed/${user.username}/${item.id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
            } else {
                await axios.delete(`https://d3kv9nj5wp3sq6.cloudfront.net/saves/homefeed/${user.username}/${item.id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })

                // Delete from profilefeed saved as well
                try {
                    const profileSavedResponse = await axios.get(
                        `https://d3kv9nj5wp3sq6.cloudfront.net/profilefeed/${user.username}/saved`,
                        {
                            headers: { Authorization: `Bearer ${token}` },
                        },
                    )
                    const savedItem = profileSavedResponse.data.find(
                        (savedPost: any) =>
                            savedPost.title === item.title &&
                            savedPost.description === item.description &&
                            savedPost.parent === item.parent,
                    )
                    if (savedItem) {
                        await axios.delete(
                            `https://d3kv9nj5wp3sq6.cloudfront.net/profilefeed/${user.username}/saved/${savedItem.id}`,
                            {
                                headers: { Authorization: `Bearer ${token}` },
                            },
                        )
                    }
                } catch (error) {
                    console.error("Error deleting from profilefeed saved:", error)
                }
            }
        } catch (error) {
            console.error("Error handling save:", error)
            setSavedCards((prev) =>
                prev.map((card) => (card.id === item.id ? { ...card, hasSaved: isCurrentlySaved } : card)),
            )
        }
    }

    const handleCreate = () => {
        if (!selectedCard) return

        if (selectedCard.lock && selectedCard.username !== user?.username) {
            alert("The card is locked! Only certain users can add to the catalogue")
            return
        }

        // Store selected card data and navigate to create page
        localStorage.setItem("selectedCard", JSON.stringify(selectedCard))
        router.push("/create")
    }

    const handleUserClick = (e: React.MouseEvent, item: CardItem) => {
        e.stopPropagation()
        if (item.username === user?.username) {
            router.push("/profile")
        } else {
            localStorage.setItem("profileUsername", item.username)
            router.push("/profile/user")
        }
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
        if (cardElement) {
            cardElement.scrollIntoView({ behavior: "smooth", block: "center" })
            setSelectedCard(homeFeed.find((c) => c.id === cardId) || null)
            console.log("selectedCard:", selectedCard);
        }
    }


    const handleShare = (e: React.MouseEvent, item: CardItem) => {
        e.stopPropagation()
        const url = `${window.location.origin}/event/${item.id}`
        navigator.clipboard.writeText(url)
        // You could show a toast notification here
    }

    // Helper functions
    const isLiked = (id: number) => {
        const card = likedCards.find((card) => card.id === id)
        return card ? card.hasLiked : false
    }

    const isReposted = (id: number) => {
        const card = repostedCards.find((card) => card.id === id)
        return card ? card.hasReposted : false
    }

    const isSaved = (id: number) => {
        const card = savedCards.find((card) => card.id === id)
        return card ? card.hasSaved : false
    }

    // Get unique contributors
    const getUniqueContributors = () => {
        const contributors = [...new Set(displayCards.map((card) => card.username))]
        return contributors.slice(0, 10) // Show max 5 contributors
    }

    // Get collection stats
    const getCollectionStats = () => {
        const totalCards = displayCards.length
        const contributors = getUniqueContributors().length
        const hasWeblinks = displayCards.filter((card) => card.weblink).length
        const isLocked = selectedCard?.lock || false

        return { totalCards, contributors, hasWeblinks, isLocked }
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

    const stats = getCollectionStats()
    const contributors = getUniqueContributors()

    const handleCardClick = (item: CardItem) => {
        localStorage.setItem("expandedCard", JSON.stringify(item))
        router.push(`/card/${item.id}`);
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
            {/* Desktop Navbar - Hidden on Mobile */}
            <nav className="hidden md:block fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <div className="flex items-center space-x-4">
                            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <ArrowLeft className="w-5 h-5 text-gray-600" />
                            </button>
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
                    {/* Top Row - Back, Logo and Menu */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <ArrowLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            <Link href="/home" className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-blue-600 rounded-md flex items-center justify-center">
                                    <span className="text-white font-bold text-xs">O</span>
                                </div>
                                <span className="font-bold text-lg text-gray-900">Collection</span>
                            </Link>
                        </div>

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
            <main className="pt-34 md:pt-24 px-4 pb-8">
                <div className="max-w-7xl mx-auto">
                    {/* Sophisticated Collection Header */}
                    <div className="mb-8">
                        {/* Connection Visualization */}
                        <div className="relative mb-6 ">
                            <div className="flex items-center justify-center px-4">
                                <div className="flex items-center space-x-2 sm:space-x-4 max-w-full">
                                    {/* Connection nodes */}
                                    <div className="flex -space-x-1 sm:-space-x-2">
                                        {contributors.slice(0, 3).map((username, index) => (
                                            <div
                                                key={username}
                                                className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full border-2 sm:border-4 border-white shadow-lg bg-gradient-to-br ${index === 0
                                                    ? "from-purple-400 to-pink-400"
                                                    : index === 1
                                                        ? "from-blue-400 to-cyan-400"
                                                        : "from-green-400 to-emerald-400"
                                                    } flex items-center justify-center text-white font-bold text-xs sm:text-sm z-${10 + index}`}
                                            >
                                                {username.charAt(0).toUpperCase()}
                                            </div>
                                        ))}
                                        {displayCards.length > 3 && (
                                            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full border-2 sm:border-4 border-white text-white shadow-lg bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                                                +{displayCards.length - 3}
                                            </div>
                                        )}
                                    </div>

                                    {/* Connection lines */}
                                    <div className="flex items-center space-x-1 sm:space-x-2">
                                        <div className="w-4 sm:w-8 h-0.5 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full"></div>
                                        <Link2 className="w-4 h-4 sm:w-6 sm:h-6 text-purple-500 animate-pulse" />
                                        <div className="w-4 sm:w-8 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
                                    </div>

                                    {/* Central connection hub */}
                                    <div className="relative">
                                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 shadow-2xl flex items-center justify-center">
                                            <Layers className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                                        </div>
                                        <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-6 sm:h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                                            <Sparkles className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Floating connection indicators */}
                            <div className="absolute top-0 left-1/4 animate-bounce delay-100">
                                <div className="w-2 h-2 bg-purple-400 rounded-full opacity-60"></div>
                            </div>
                            <div className="absolute top-4 right-1/3 animate-bounce delay-300">
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full opacity-60"></div>
                            </div>
                            <div className="absolute bottom-2 left-1/3 animate-bounce delay-500">
                                <div className="w-1 h-1 bg-cyan-400 rounded-full opacity-60"></div>
                            </div>
                        </div>

                        {/* Collection Info Panel */}
                        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-4 sm:p-6 mb-6 mx-auto max-w-full overflow-hidden">
                            <div className="flex flex-col lg:flex-row items-center justify-between space-y-4 lg:space-y-0">
                                {/* Main Info */}
                                <div className="text-center lg:text-left w-full lg:w-auto">
                                    <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
                                            Connected Collection
                                        </h1>
                                        {stats.isLocked && (
                                            <div className="flex items-center space-x-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-medium">
                                                <Lock className="w-4 h-4" />
                                                <span>Curated</span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-gray-600 text-sm sm:text-base lg:text-lg">
                                        Discover interconnected perspectives and ideas in this collaborative space
                                    </p>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center border border-purple-200">
                                        <div className="flex items-center justify-center mb-1 sm:mb-2">
                                            <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                                        </div>
                                        <div className="text-lg sm:text-2xl font-bold text-purple-700">{stats.totalCards}</div>
                                        <div className="text-xs text-purple-600 font-medium">Cards</div>
                                    </div>

                                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center border border-blue-200">
                                        <div className="flex items-center justify-center mb-1 sm:mb-2">
                                            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                                        </div>
                                        <div className="text-lg sm:text-2xl font-bold text-blue-700">{stats.contributors}</div>
                                        <div className="text-xs text-blue-600 font-medium">Contributors</div>
                                    </div>

                                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center border border-green-200">
                                        <div className="flex items-center justify-center mb-1 sm:mb-2">
                                            <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                                        </div>
                                        <div className="text-lg sm:text-2xl font-bold text-green-700">{stats.hasWeblinks}</div>
                                        <div className="text-xs text-green-600 font-medium">Links</div>
                                    </div>

                                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center border border-orange-200">
                                        <div className="flex items-center justify-center mb-1 sm:mb-2">
                                            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                                        </div>
                                        <div className="text-lg sm:text-2xl font-bold text-orange-700">
                                            {Math.floor(Math.random() * 100) + 50}%
                                        </div>
                                        <div className="text-xs text-orange-600 font-medium">Engagement</div>
                                    </div>
                                </div>
                            </div>

                            {/* Contributors Preview */}
                            {contributors.length > 0 && (
                                <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
                                    <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
                                        <div className="flex items-center space-x-3">
                                            <span className="text-sm font-medium text-gray-600">Contributors:</span>
                                            <div className="flex -space-x-1 sm:-space-x-2">
                                                {contributors.map((username, index) => (
                                                    <div
                                                        key={username}
                                                        className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-white shadow-md bg-gradient-to-br ${index % 4 === 0
                                                            ? "from-purple-400 to-pink-400"
                                                            : index % 4 === 1
                                                                ? "from-blue-400 to-cyan-400"
                                                                : index % 4 === 2
                                                                    ? "from-green-400 to-emerald-400"
                                                                    : "from-orange-400 to-red-400"
                                                            } flex items-center justify-center text-white font-bold text-xs`}
                                                        title={username}
                                                    >
                                                        {username.charAt(0).toUpperCase()}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Cards Grid */}
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {[...Array(8)].map((_, index) => (
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
                    ) : error ? (
                        <div className="text-center py-16">
                            <div className="text-red-500 text-lg mb-2">Error loading cards</div>
                            <div className="text-gray-500 text-sm mb-4">{error}</div>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                Retry
                            </button>
                        </div>
                    ) : (
                        <MasonryGrid>
                            {displayCards.map((item, index) => (
                                <div key={item.id} className="group relative">
                                    {/* Card Wrapper with hover detection */}
                                    <div className="relative transition-all duration-300">
                                        <Card
                                            user={item.username}
                                            title={item.title}
                                            description={item.description}
                                            text={item.text}
                                            image={item.image}
                                            picture={item.picture}
                                            selected={(selectedCard?.id || Number(cardId)) === item.id}
                                            onClick={() => handleCardClick(item)}
                                            onUserTagClick={handleUserTagClick}
                                            onCardTagClick={handleCardTagClick}
                                            showActions={true}
                                            onLike={handleLike}
                                            onRepost={handleRepost}
                                            onSave={handleSave}
                                            onShare={handleShare}
                                            isLiked={isLiked(item.id)}
                                            isReposted={isReposted(item.id)}
                                            isSaved={isSaved(item.id)}
                                            cardData={item}
                                            weblink={item.weblink}
                                            onUserClick={handleUserClick}
                                        />
                                    </div>
                                </div>
                            ))}
                        </MasonryGrid>
                    )}

                    {displayCards.length === 0 && !isLoading && (
                        <div className="text-center py-16">
                            <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Layers className="w-12 h-12 text-gray-400" />
                            </div>
                            <div className="text-gray-400 text-lg mb-2">No connected cards found</div>
                            <div className="text-gray-500 text-sm">This collection is waiting for its first connection</div>
                        </div>
                    )}
                </div>
            </main>

            {/* Enhanced Floating Add Button */}
            <button
                onClick={handleCreate}
                className="fixed bottom-6 right-6 w-20 h-20 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300 flex items-center justify-center z-30 group"
            >
                <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full animate-pulse"></div>
            </button>

            {/* Popups */}
            <InboxPopup isOpen={isInboxPopupOpen} onClose={() => setIsInboxPopupOpen(false)} />
            <SettingsPopup isOpen={isSettingsPopupOpen} onClose={() => setIsSettingsPopupOpen(false)} />
            <NotificationsPopup isOpen={isNotificationsPopupOpen} onClose={() => setIsNotificationsPopupOpen(false)} />
        </div>
    )
}
