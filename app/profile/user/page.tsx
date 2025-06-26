"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    Search,
    Bell,
    MessageCircle,
    User,
    ChevronDown,
    Share,
    MoreHorizontal,
    MessageSquare,
    Heart,
    Bookmark,
    Users,
    UserPlus,
    UserMinus,
    ArrowLeft,
    Menu,
    X,
    Home,
    Compass,
    Plus,
    SparklesIcon as Bubbles,
} from "lucide-react"
import Image from "next/image"
import Card from "@/components/card"
import MasonryGrid from "@/components/masonry-grid"
import InboxPopup from "@/components/popups/inbox-popup"
import SettingsPopup from "@/components/popups/settings-popup"
import NotificationsPopup from "@/components/popups/notifications-popup"
import FollowersModal from "@/components/modals/followers-modal"
import FollowingModal from "@/components/modals/following-modal"
import ChatInterface from "@/components/popups/chat-interface"
import axios from "axios"

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
    reposted?: boolean
}

interface ProfileStats {
    totalPosts: number
    totalLikes: number
    totalViews: number
    totalReposts: number
    totalSaves: number
    engagementRate: number
}

export default function ProfileUserPage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null) // Current logged-in user
    const [profileUser, setProfileUser] = useState<any>(null) // User being viewed
    const [activeTab, setActiveTab] = useState("opinion")
    const [searchTerm, setSearchTerm] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [isFollowing, setIsFollowing] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [showChatInterface, setShowChatInterface] = useState(false)

    // Profile data states
    const [createdPosts, setCreatedPosts] = useState<CardItem[]>([])
    const [likedPosts, setLikedPosts] = useState<CardItem[]>([])
    const [savedPosts, setSavedPosts] = useState<CardItem[]>([])
    const [repostedPosts, setRepostedPosts] = useState<CardItem[]>([])
    const [followers, setFollowers] = useState<any[]>([])
    const [following, setFollowing] = useState<any[]>([])
    const [profileStats, setProfileStats] = useState<ProfileStats>({
        totalPosts: 0,
        totalLikes: 0,
        totalViews: 0,
        totalReposts: 0,
        totalSaves: 0,
        engagementRate: 0,
    })

    // Modal states
    const [showFollowersModal, setShowFollowersModal] = useState(false)
    const [showFollowingModal, setShowFollowingModal] = useState(false)
    const [isInboxPopupOpen, setIsInboxPopupOpen] = useState(false)
    const [isSettingsPopupOpen, setIsSettingsPopupOpen] = useState(false)
    const [isNotificationsPopupOpen, setIsNotificationsPopupOpen] = useState(false)

    // Combined opinion posts (created + reposted)
    const opinionPosts = [...createdPosts, ...repostedPosts].sort((a, b) => {
        // Sort by creation date if available, otherwise by id
        return b.id - a.id
    })

    const tabs = [
        { id: "opinion", name: "Opinion", icon: Bubbles, count: opinionPosts.length },
        { id: "liked", name: "Liked", icon: Heart, count: likedPosts.length },
        { id: "saved", name: "Saved", icon: Bookmark, count: savedPosts.length },
    ]

    useEffect(() => {
        // Get current user from localStorage
        const userData = localStorage.getItem("user")
        if (userData) {
            setUser(JSON.parse(userData))
        }

        // Get profile username from localStorage
        const profileUsername = localStorage.getItem("profileUsername")
        if (profileUsername) {
            fetchProfileUser(profileUsername)
        } else {
            router.push("/profile")
        }
    }, [router])

    const fetchProfileUser = async (username: string) => {
        try {
            const response = await axios.get(`https://d3kv9nj5wp3sq6.cloudfront.net/profileusers/${username}`)
            setProfileUser(response.data)
        } catch (error) {
            console.error("Error fetching profile user:", error)
            router.push("/profile")
        }
    }

    useEffect(() => {
        const fetchProfileData = async () => {
            if (!profileUser || !user) return

            setIsLoading(true)
            try {
                const token = localStorage.getItem("token")

                // Check if current user is following this profile user
                const followingResponse = await fetch(
                    `https://d3kv9nj5wp3sq6.cloudfront.net/profileusers/${user.username}/following`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    },
                )
                const followingDataInitial = await followingResponse.json()
                const isCurrentlyFollowing = followingDataInitial.some((item: any) => item.username === profileUser.username)
                setIsFollowing(isCurrentlyFollowing)

                // Fetch profile data (only public posts for other users)
                const [createdRes, repostedRes, followersRes, followingRes] = await Promise.all([
                    fetch(`https://d3kv9nj5wp3sq6.cloudfront.net/profilefeed/${profileUser.username}/created`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    fetch(`https://d3kv9nj5wp3sq6.cloudfront.net/profilefeed/${profileUser.username}/reposted`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    fetch(`https://d3kv9nj5wp3sq6.cloudfront.net/profileusers/${profileUser.username}/followers`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    fetch(`https://d3kv9nj5wp3sq6.cloudfront.net/profileusers/${profileUser.username}/following`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                ])

                const [created, reposted, followersData, followingData] = await Promise.all([
                    createdRes.json(),
                    repostedRes.json(),
                    followersRes.json(),
                    followingRes.json(),
                ])

                // Filter only public posts for other users
                const publicCreated = created.filter((item: any) => !item.privacy)
                const publicReposted = reposted
                    .filter((item: any) => !item.privacy)
                    .map((item: any) => ({ ...item, reposted: true }))

                setCreatedPosts(publicCreated)
                setRepostedPosts(publicReposted)

                // For other users, we don't show liked/saved (privacy)
                setLikedPosts([])
                setSavedPosts([])

                setFollowers(followersData)
                setFollowing(followingData)

                // Calculate stats
                const totalPosts = publicCreated.length + publicReposted.length
                const totalLikes = Math.floor(Math.random() * 1000) + 100
                const totalViews = Math.floor(Math.random() * 5000) + 500
                const totalReposts = publicReposted.length
                const totalSaves = Math.floor(Math.random() * 200) + 20
                const engagementRate = totalPosts > 0 ? ((totalLikes + totalReposts + totalSaves) / totalPosts) * 10 : 0

                setProfileStats({
                    totalPosts,
                    totalLikes,
                    totalViews,
                    totalReposts,
                    totalSaves,
                    engagementRate: Math.min(engagementRate, 100),
                })
            } catch (error) {
                console.error("Error fetching profile data:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchProfileData()
    }, [profileUser, user])

    const getCurrentTabData = () => {
        const allData = {
            opinion: opinionPosts,
            liked: likedPosts,
            saved: savedPosts,
        }

        const data = allData[activeTab as keyof typeof allData] || []

        return data.filter((item) => {
            return (
                !searchTerm ||
                item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.text?.toLowerCase().includes(searchTerm.toLowerCase())
            )
        })
    }

    const handleCardClick = async (item: CardItem) => {
        try {
            const token = localStorage.getItem("token")
            // Fetch homefeed to find the corresponding item
            const response = await fetch(`https://d3kv9nj5wp3sq6.cloudfront.net/homefeed/${user.username}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            const homefeedData = await response.json()

            // Find matching homefeed item by title, description, and parent
            const matchingHomefeedItem = homefeedData.find(
                (homefeedItem: any) =>
                    homefeedItem.title === item.title &&
                    homefeedItem.description === item.description &&
                    homefeedItem.parent === item.parent &&
                    homefeedItem.username === item.username,
            )

            if (matchingHomefeedItem) {
                router.push(`/event/${matchingHomefeedItem.id}`)
            } else {
                console.error("Could not find matching homefeed item")
            }
        } catch (error) {
            console.error("Error finding homefeed item:", error)
        }
    }

    const handleFollowToggle = async () => {
        if (!user || !profileUser) return

        const token = localStorage.getItem("token")

        // Optimistic update
        setIsFollowing(!isFollowing)

        try {
            if (!isFollowing) {
                // Follow
                await axios.post(`https://d3kv9nj5wp3sq6.cloudfront.net/profileusers/${profileUser.username}/followers`, {
                    username: user.username,
                    name: user.name,
                    image: user.image,
                    isFollowing: false,
                })
                await axios.post(`https://d3kv9nj5wp3sq6.cloudfront.net/profileusers/${user.username}/following`, {
                    username: profileUser.username,
                    name: profileUser.name,
                    image: profileUser.image,
                })
                setFollowers((prev) => [...prev, { username: user.username, name: user.name, image: user.image }])
            } else {
                // Unfollow
                const followingResponse = await axios.get(
                    `https://d3kv9nj5wp3sq6.cloudfront.net/profileusers/${user.username}/following`,
                )
                const followingItem = followingResponse.data.find((item: any) => item.username === profileUser.username)

                if (followingItem) {
                    await axios.delete(
                        `https://d3kv9nj5wp3sq6.cloudfront.net/profileusers/${user.username}/following/${followingItem.id}`,
                    )

                    const followersResponse = await axios.get(
                        `https://d3kv9nj5wp3sq6.cloudfront.net/profileusers/${profileUser.username}/followers`,
                    )
                    const followerItem = followersResponse.data.find((item: any) => item.username === user.username)

                    if (followerItem) {
                        await axios.delete(
                            `https://d3kv9nj5wp3sq6.cloudfront.net/profileusers/${profileUser.username}/followers/${followerItem.id}`,
                        )
                    }
                }
                setFollowers((prev) => prev.filter((f) => f.username !== user.username))
            }
        } catch (error) {
            console.error("Error toggling follow:", error)
            // Rollback
            setIsFollowing(isFollowing)
        }
    }

    const handleMessageClick = () => {
        setShowChatInterface(true)
    }

    if (!user || !profileUser) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        )
    }

    const currentTabData = getCurrentTabData()

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
                                <span className="font-bold text-lg text-gray-900">{profileUser?.name || "Profile"}</span>
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
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
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
                                <span className="text-gray-900">My Profile</span>
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

            {/* Chat Interface Modal */}
            {showChatInterface && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowChatInterface(false)}
                    ></div>

                    <div className="absolute right-4 top-20 w-[calc(100%-2rem)] max-w-md h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                        {/* Chat Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={() => setShowChatInterface(false)}
                                    className="p-1 text-gray-600 hover:text-gray-900 hover:bg-white/50 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                                <div className="flex items-center space-x-3">
                                    {profileUser.image ? (
                                        <Image
                                            src={profileUser.image || "/placeholder.svg"}
                                            alt={profileUser.name}
                                            width={32}
                                            height={32}
                                            className="rounded-full ring-2 ring-white"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center">
                                            <span className="text-white font-bold text-sm">{profileUser.name.charAt(0).toUpperCase()}</span>
                                        </div>
                                    )}
                                    <span className="font-semibold text-gray-900">{profileUser.name}</span>
                                </div>
                            </div>
                        </div>

                        {/* Chat Interface */}
                        <div className="h-[calc(100%-73px)]">
                            <ChatInterface selectedUser={profileUser} />
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="pt-34 md:pt-20 px-4 pb-8">
                <div className="max-w-6xl mx-auto">
                    {/* Profile Header */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-white/20 p-4 sm:p-8 mb-8">
                        <div className="flex flex-col lg:flex-row items-center lg:items-start space-y-6 lg:space-y-0 lg:space-x-8">
                            {/* Profile Picture */}
                            <div className="relative">
                                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden ring-4 ring-white shadow-2xl">
                                    {profileUser.image ? (
                                        <Image
                                            src={profileUser.image || "/placeholder.svg?height=128&width=128"}
                                            alt={profileUser.name}
                                            width={128}
                                            height={128}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center">
                                            <span className="text-white font-bold text-2xl">{profileUser.name.charAt(0).toUpperCase()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Profile Info */}
                            <div className="flex-1 text-center lg:text-left w-full">
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
                                    <div>
                                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{profileUser.name}</h1>
                                        <p className="text-gray-600 text-base sm:text-lg mb-2">@{profileUser.username}</p>
                                        {profileUser.tagline && <p className="text-gray-700 mb-4">{profileUser.tagline}</p>}
                                    </div>

                                    <div className="flex items-center justify-center lg:justify-end space-x-2 sm:space-x-3 mt-4 lg:mt-0">
                                        <button
                                            onClick={handleFollowToggle}
                                            className={`flex items-center space-x-1 sm:space-x-2 px-4 sm:px-6 py-2 rounded-full transition-colors font-medium text-sm ${isFollowing
                                                ? "bg-gray-100 hover:bg-red-100 text-gray-700 hover:text-red-700"
                                                : "bg-purple-600 hover:bg-purple-700 text-white"
                                                }`}
                                        >
                                            {isFollowing ? (
                                                <>
                                                    <UserMinus className="w-3 h-3 sm:w-4 sm:h-4" />
                                                    <span>Unfollow</span>
                                                </>
                                            ) : (
                                                <>
                                                    <UserPlus className="w-3 h-3 sm:w-4 sm:h-4" />
                                                    <span>Follow</span>
                                                </>
                                            )}
                                        </button>

                                        <button
                                            onClick={handleMessageClick}
                                            className="flex items-center space-x-1 sm:space-x-2 px-4 sm:px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors font-medium text-sm"
                                        >
                                            <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                            <span>Message</span>
                                        </button>

                                        <button className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors">
                                            <Share className="w-4 h-4" />
                                        </button>
                                        <button className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Stats Grid - Responsive */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4 mb-6">
                                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center border border-purple-200">
                                        <div className="text-xl sm:text-2xl font-bold text-purple-700">{profileStats.totalPosts}</div>
                                        <div className="text-xs text-purple-600 font-medium">Posts</div>
                                    </div>
                                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center border border-blue-200">
                                        <div className="text-xl sm:text-2xl font-bold text-blue-700">{profileStats.totalViews}</div>
                                        <div className="text-xs text-blue-600 font-medium">Views</div>
                                    </div>
                                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center border border-orange-200">
                                        <div className="text-xl sm:text-2xl font-bold text-orange-700">
                                            {profileStats.engagementRate.toFixed(1)}%
                                        </div>
                                        <div className="text-xs text-orange-600 font-medium">Engagement</div>
                                    </div>
                                </div>

                                {/* Followers/Following */}
                                <div className="flex items-center justify-center lg:justify-start space-x-6 text-gray-600">
                                    <button
                                        onClick={() => setShowFollowersModal(true)}
                                        className="flex items-center space-x-2 hover:text-gray-900 transition-colors"
                                    >
                                        <Users className="w-4 h-4" />
                                        <span className="font-semibold">{followers.length}</span>
                                        <span>followers</span>
                                    </button>
                                    <button
                                        onClick={() => setShowFollowingModal(true)}
                                        className="flex items-center space-x-2 hover:text-gray-900 transition-colors"
                                    >
                                        <Users className="w-4 h-4" />
                                        <span className="font-semibold">{following.length}</span>
                                        <span>following</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs - Responsive */}
                    <div className="flex justify-center">
                        <div className="flex justify-center bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-1 sm:p-2 mb-8 overflow-hidden max-w-[630px]">
                            <div className="flex gap-6 md:gap-20 flex-nowrap overflow-x-auto scrollbar-hide">
                                {tabs.map((tab) => {
                                    const IconComponent = tab.icon
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`flex items-center space-x-1 sm:space-x-2 px-3 sm:px-6 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 flex-shrink-0 ${activeTab === tab.id
                                                ? "bg-white shadow-lg text-purple-700 border border-purple-200"
                                                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                                                }`}
                                        >
                                            <IconComponent className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                            <span className="whitespace-nowrap">{tab.name}</span>
                                            <span
                                                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs ${activeTab === tab.id ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"
                                                    }`}
                                            >
                                                {tab.count}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Content */}
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
                        <div className="text-center py-16">
                            <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                                <MessageSquare className="w-12 h-12 text-gray-400" />
                            </div>
                            <div className="text-gray-400 text-lg mb-2">No {activeTab} yet</div>
                            <div className="text-gray-500 text-sm">
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
            <InboxPopup isOpen={isInboxPopupOpen} onClose={() => setIsInboxPopupOpen(false)} />
            <SettingsPopup isOpen={isSettingsPopupOpen} onClose={() => setIsSettingsPopupOpen(false)} />
            <NotificationsPopup isOpen={isNotificationsPopupOpen} onClose={() => setIsNotificationsPopupOpen(false)} />
        </div>
    )
}
