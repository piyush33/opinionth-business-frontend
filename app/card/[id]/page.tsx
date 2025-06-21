"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
    Search,
    Bell,
    MessageCircle,
    UserIcon,
    ChevronDown,
    ArrowLeft,
    X,
    Home,
    Compass,
    Plus,
    Heart,
    Share,
    Bookmark,
    MoreHorizontal,
    ExternalLink,
} from "lucide-react"
import MasonryGrid from "@/components/masonry-grid"
import { CommentSection } from "@/components/comment-section"
import { PopupMenu } from "@/components/popup-menu"
import Card from "@/components/card"
import InboxPopup from "@/components/popups/inbox-popup"
import SettingsPopup from "@/components/popups/settings-popup"
import NotificationsPopup from "@/components/popups/notifications-popup"

// API types based on your backend structure
interface CardData {
    id: string
    title: string
    description: string
    text?: string
    image?: string
    username: string
    picture?: string
    parent?: string
    createdAt?: string
    weblink?: string
    reposted: boolean
}

interface Comment {
    id: string
    username: string
    image?: string
    comment: string
    replies: Reply[]
    createdAt?: string
}

interface Reply {
    id: string
    username: string
    image?: string
    reply: string
    createdAt?: string
}

interface UserProfile {
    id: string
    username: string
    image?: string
    followers?: number
}

// API service functions
const API_BASE_URL = "https://d3kv9nj5wp3sq6.cloudfront.net"

const getAuthHeaders = () => {
    const token = localStorage.getItem("token")
    return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    }
}

const apiService = {
    fetchHomeFeed: async (): Promise<CardData[]> => {
        const response = await fetch(`${API_BASE_URL}/homefeed`, {
            headers: getAuthHeaders(),
        })
        if (!response.ok) throw new Error("Failed to fetch home feed")
        return response.json()
    },

    fetchComments: async (cardId: string): Promise<Comment[]> => {
        const response = await fetch(`${API_BASE_URL}/comments/${cardId}`, {
            headers: getAuthHeaders(),
        })
        if (!response.ok) throw new Error("Failed to fetch comments")
        return response.json()
    },

    postComment: async (cardId: string, username: string, image: string, comment: string) => {
        const response = await fetch(`${API_BASE_URL}/comments/${cardId}`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ username, image, comment }),
        })
        if (!response.ok) throw new Error("Failed to post comment")
        return response.json()
    },

    postReply: async (commentId: string, username: string, image: string, reply: string) => {
        const response = await fetch(`${API_BASE_URL}/comments/${commentId}/replies`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ username, image, reply }),
        })
        if (!response.ok) throw new Error("Failed to post reply")
        return response.json()
    },

    deleteCard: async (cardId: string, username: string) => {
        // Delete from various feeds
        await Promise.all([
            fetch(`${API_BASE_URL}/profilefeed/${username}/created/${cardId}`, {
                method: "DELETE",
                headers: getAuthHeaders(),
            }),
            fetch(`${API_BASE_URL}/profilefeed/${username}/reposted/${cardId}`, {
                method: "DELETE",
                headers: getAuthHeaders(),
            }),
            fetch(`${API_BASE_URL}/profilefeed/${username}/liked/${cardId}`, {
                method: "DELETE",
                headers: getAuthHeaders(),
            }),
            fetch(`${API_BASE_URL}/profilefeed/${username}/saved/${cardId}`, {
                method: "DELETE",
                headers: getAuthHeaders(),
            }),
            fetch(`${API_BASE_URL}/homefeed/${cardId}`, {
                method: "DELETE",
                headers: getAuthHeaders(),
            }),
        ])
    },
}

export default function CardExpansionPage() {
    const [card, setCard] = useState<CardData | null>(null)
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
    const [comments, setComments] = useState<Comment[]>([])
    const [feedCards, setFeedCards] = useState<CardData[]>([])
    const [newComment, setNewComment] = useState("")
    const [replyingTo, setReplyingTo] = useState<string | null>(null)
    const [replyText, setReplyText] = useState("")
    const [showPopupMenu, setShowPopupMenu] = useState(false)
    const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [showComments, setShowComments] = useState(false)

    // Interaction states
    const [isLiked, setIsLiked] = useState(false)
    const [isSaved, setIsSaved] = useState(false)
    const [likesCount, setLikesCount] = useState(Math.floor(Math.random() * 100) + 10)

    // Navbar states
    const [isNotificationsPopupOpen, setIsNotificationsPopupOpen] = useState(false)
    const [isInboxPopupOpen, setIsInboxPopupOpen] = useState(false)
    const [isSettingsPopupOpen, setIsSettingsPopupOpen] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    const router = useRouter()

    // Load initial data
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true)

                // Get user from localStorage or context
                const userData = localStorage.getItem("user")
                if (userData) {
                    setUserProfile(JSON.parse(userData))
                }

                // Get selected card from localStorage or context
                const cardData = localStorage.getItem("expandedCard")
                if (cardData) {
                    const selectedCard = JSON.parse(cardData)
                    setCard(selectedCard)

                    // Fetch comments for this card
                    const commentsData = await apiService.fetchComments(selectedCard.id)
                    setComments(commentsData)
                }

                // Fetch home feed
                const feedData = await apiService.fetchHomeFeed()
                setFeedCards(feedData)
            } catch (err) {
                setError(err instanceof Error ? err.message : "An error occurred")
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [])

    const handleAddComment = async () => {
        if (!newComment.trim() || !card || !userProfile) return

        try {
            await apiService.postComment(card.id, userProfile.username, userProfile.image || "", newComment)
            setNewComment("")

            // Refresh comments
            const updatedComments = await apiService.fetchComments(card.id)
            setComments(updatedComments)
        } catch (err) {
            console.error("Error posting comment:", err)
        }
    }

    const handleAddReply = async (commentId: string) => {
        if (!replyText.trim() || !userProfile) return

        try {
            await apiService.postReply(commentId, userProfile.username, userProfile.image || "", replyText)
            setReplyText("")
            setReplyingTo(null)

            // Refresh comments
            if (card) {
                const updatedComments = await apiService.fetchComments(card.id)
                setComments(updatedComments)
            }
        } catch (err) {
            console.error("Error posting reply:", err)
        }
    }

    const handleMoreClick = (event: React.MouseEvent) => {
        event.stopPropagation()
        setPopupPosition({ x: event.clientX, y: event.clientY })
        setShowPopupMenu(!showPopupMenu)
    }

    const handleDeleteCard = async () => {
        if (!card || !userProfile) return

        try {
            await apiService.deleteCard(card.id, userProfile.username)
            setShowPopupMenu(false)
            router.push("/home")
        } catch (err) {
            console.error("Error deleting card:", err)
        }
    }

    const handleCardClick = (cardData: CardData) => {
        router.push(`/event/${cardData.id}`)
    }

    const handleUserClick = () => {
        if (!card || !userProfile) return

        localStorage.setItem("profileUsername", card.username)
        if (card.username === userProfile.username) {
            router.push("/profile")
        } else {
            router.push(`/profile/user`)
        }
    }

    const handleLike = () => {
        setIsLiked(!isLiked)
        setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1))
    }

    const handleSave = () => {
        setIsSaved(!isSaved)
    }

    const handleShare = () => {
        if (navigator.share && card) {
            navigator.share({
                title: card.title,
                text: card.description,
                url: window.location.href,
            })
        } else {
            // Fallback to clipboard
            navigator.clipboard.writeText(window.location.href)
        }
    }

    const handleNotificationsClick = () => {
        setIsNotificationsPopupOpen(true)
    }

    const handleInboxClick = () => {
        setIsInboxPopupOpen(true)
    }

    const handleSettingsClick = () => {
        setIsSettingsPopupOpen(true)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-black">
                {/* Mobile Header */}
                <header className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-md">
                    <div className="flex items-center justify-between px-4 py-3">
                        <button onClick={() => router.back()} className="p-2 text-white hover:bg-white/10 rounded-full">
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <button className="p-2 text-white hover:bg-white/10 rounded-full">
                            <MoreHorizontal className="w-6 h-6" />
                        </button>
                    </div>
                </header>

                <div className="pt-16 flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                </div>
            </div>
        )
    }

    if (error || !card || !userProfile) {
        return (
            <div className="min-h-screen bg-black text-white">
                <header className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-md">
                    <div className="flex items-center justify-between px-4 py-3">
                        <button onClick={() => router.back()} className="p-2 text-white hover:bg-white/10 rounded-full">
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                    </div>
                </header>

                <div className="pt-16 flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <h2 className="text-xl font-bold mb-4">{error ? "Error" : "No Card Selected"}</h2>
                        <p className="text-gray-400 mb-4">{error || "Please select a card to view"}</p>
                        <button
                            onClick={() => (error ? window.location.reload() : router.push("/home"))}
                            className="px-6 py-2 bg-white text-black rounded-full font-medium"
                        >
                            {error ? "Retry" : "Go Home"}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen text-white">
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
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-full text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all duration-200"
                                />
                            </div>
                        </div>

                        {/* Action Icons */}
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={handleNotificationsClick}
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all duration-200 relative"
                            >
                                <Bell className="w-5 h-5" />
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                            </button>

                            <button
                                onClick={handleInboxClick}
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all duration-200 relative"
                            >
                                <MessageCircle className="w-5 h-5" />
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></span>
                            </button>

                            <Link
                                href="/profile"
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all duration-200"
                            >
                                <UserIcon className="w-5 h-5" />
                            </Link>

                            <button
                                onClick={handleSettingsClick}
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all duration-200"
                            >
                                <ChevronDown className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile Header - Overlay Style */}
            <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-gray/80 via-/40 to-transparent backdrop-blur-sm">
                <div className="flex items-center justify-between px-4 py-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <button onClick={handleMoreClick} className="p-2 text-white hover:bg-white/10 rounded-full transition-colors">
                        <MoreHorizontal className="w-6 h-6" />
                    </button>
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
                                <UserIcon className="w-5 h-5 text-gray-600" />
                                <span className="text-gray-900">Profile</span>
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="md:pt-20">
                {/* Desktop Layout */}
                <div className="hidden md:block container mx-auto px-4 py-8 max-w-7xl">
                    {/* Main Card Details - Side by Side Layout */}
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 mb-12">
                        <div className="flex h-[600px]">
                            {/* Left Side - Image (Fixed 50% width) */}
                            {card.image && (
                                <div className="w-1/2 relative bg-gray-100">
                                    <Image
                                        src={card.image || "/placeholder.svg"}
                                        alt={card.title}
                                        fill
                                        className="object-cover"
                                        onError={(e) => {
                                            e.currentTarget.src = "/placeholder.svg?height=600&width=600"
                                        }}
                                    />
                                </div>
                            )}

                            {/* Right Side - Content and Comments (Fixed 50% width) */}
                            <div className="w-1/2 flex flex-col">
                                {/* Header Section */}
                                <div className="p-6 border-b border-gray-100 flex-shrink-0">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <h1 className="text-xl font-bold text-gray-900 mb-2">{card.title}</h1>
                                            <p className="text-gray-600 text-sm mb-3">{card.description}</p>
                                            {card.text && <p className="text-gray-700 text-sm">{card.text}</p>}
                                        </div>

                                        <button
                                            onClick={handleMoreClick}
                                            className="ml-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-all duration-200 flex-shrink-0"
                                        >
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* User Info */}
                                    <div
                                        className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity duration-200"
                                        onClick={handleUserClick}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center overflow-hidden">
                                            {card.picture ? (
                                                <Image
                                                    src={card.picture || "/placeholder.svg"}
                                                    alt={card.username}
                                                    width={40}
                                                    height={40}
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <span className="text-white font-semibold text-sm">
                                                    {card.username.charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 text-sm">{card.username}</p>
                                            <p className="text-xs text-gray-500">View profile</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Comments Section - Scrollable */}
                                <div className="flex-1 overflow-y-auto p-6">
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
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Related Cards Section */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Related Posts</h2>
                        <MasonryGrid>
                            {feedCards.map((item: any, index) => (
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
                                />
                            ))}
                        </MasonryGrid>
                    </div>
                </div>

                {/* Mobile Layout */}
                <div className="md:hidden">
                    {/* Main Image */}
                    {card.image && (
                        <div className="relative w-full h-screen">
                            <Image
                                src={card.image || "/placeholder.svg"}
                                alt={card.title}
                                fill
                                className="object-cover"
                                priority
                                onError={(e) => {
                                    e.currentTarget.src = "/placeholder.svg?height=800&width=600"
                                }}
                            />

                            {/* Gradient Overlay at Bottom */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent h-1/3 pointer-events-none" />

                            {/* Content Overlay */}
                            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-4">
                                {/* User Info */}
                                <div className="flex items-center space-x-3 cursor-pointer" onClick={handleUserClick}>
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center overflow-hidden">
                                        {card.picture ? (
                                            <Image
                                                src={card.picture || "/placeholder.svg"}
                                                alt={card.username}
                                                width={40}
                                                height={40}
                                                className="object-cover"
                                            />
                                        ) : (
                                            <span className="text-white font-semibold text-sm">{card.username.charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-white text-sm">{card.username}</p>
                                    </div>
                                </div>

                                {/* Title and Description */}
                                <div className="space-y-2">
                                    <h1 className="text-white font-bold text-lg leading-tight">{card.title}</h1>
                                    <p className="text-white/90 text-sm leading-relaxed">{card.description}</p>
                                    {card.text && <p className="text-white/80 text-sm leading-relaxed">{card.text}</p>}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center justify-between pt-2">
                                    <div className="flex items-center space-x-6">
                                        <button
                                            onClick={handleLike}
                                            className="flex items-center space-x-2 text-white hover:scale-110 transition-transform"
                                        >
                                            <Heart className={`w-7 h-7 ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
                                            <span className="text-sm font-medium">{likesCount}</span>
                                        </button>

                                        <button
                                            onClick={() => setShowComments(true)}
                                            className="flex items-center space-x-2 text-white hover:scale-110 transition-transform"
                                        >
                                            <MessageCircle className="w-7 h-7" />
                                            <span className="text-sm font-medium">{comments.length}</span>
                                        </button>

                                        <button onClick={handleShare} className="text-white hover:scale-110 transition-transform">
                                            <Share className="w-7 h-7" />
                                        </button>
                                    </div>

                                    <div className="flex items-center space-x-4">
                                        {card.weblink && (
                                            <a
                                                href={card.weblink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-white hover:scale-110 transition-transform"
                                            >
                                                <ExternalLink className="w-6 h-6" />
                                            </a>
                                        )}

                                        <button onClick={handleSave} className="text-white hover:scale-110 transition-transform">
                                            <Bookmark className={`w-6 h-6 ${isSaved ? "fill-white" : ""}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* More to Explore Section */}
                    <div className="p-4">
                        <h3 className="text-black font-semibold text-lg mb-4 text-center">More to explore</h3>
                        <MasonryGrid>
                            {feedCards.map((item: any, index) => (
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
                                />
                            ))}
                        </MasonryGrid>
                    </div>
                </div>
            </main>

            {/* Mobile Comments Modal */}
            {showComments && (
                <div className="md:hidden fixed inset-0 z-50 bg-black">
                    <div className="flex flex-col h-full">
                        {/* Comments Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-800">
                            <button onClick={() => setShowComments(false)} className="text-white hover:bg-white/10 p-2 rounded-full">
                                <X className="w-6 h-6" />
                            </button>
                            <h2 className="text-white font-semibold">Comments</h2>
                            <div className="w-10" /> {/* Spacer */}
                        </div>

                        {/* Comments Content */}
                        <div className="flex-1 overflow-y-auto p-4">
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
                        </div>
                    </div>
                </div>
            )}

            {/* Popups */}
            <InboxPopup isOpen={isInboxPopupOpen} onClose={() => setIsInboxPopupOpen(false)} />
            <SettingsPopup isOpen={isSettingsPopupOpen} onClose={() => setIsSettingsPopupOpen(false)} />
            <NotificationsPopup isOpen={isNotificationsPopupOpen} onClose={() => setIsNotificationsPopupOpen(false)} />

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
    )
}
