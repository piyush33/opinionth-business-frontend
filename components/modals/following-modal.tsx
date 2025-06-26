"use client"

import { useState, useEffect } from "react"
import { X, Users, Search, UserMinus } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import axios from "axios"

interface FollowingModalProps {
    isOpen: boolean
    onClose: () => void
    username: string
    isOwnProfile?: boolean
}

interface Following {
    id: number
    username: string
    name: string
    image?: string
}

export default function FollowingModal({ isOpen, onClose, username, isOwnProfile = false }: FollowingModalProps) {
    const router = useRouter()
    const [following, setFollowing] = useState<Following[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        const userData = localStorage.getItem("user")
        if (userData) {
            setUser(JSON.parse(userData))
        }
    }, [])

    useEffect(() => {
        if (isOpen && username) {
            fetchFollowing()
        }
    }, [isOpen, username])

    const fetchFollowing = async () => {
        setIsLoading(true)
        try {
            const token = localStorage.getItem("token")
            const response = await axios.get(`https://d3kv9nj5wp3sq6.cloudfront.net/profileusers/${username}/following`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            setFollowing(response.data)
        } catch (error) {
            console.error("Error fetching following:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleUnfollow = async (person: Following) => {
        if (!user || !isOwnProfile) return

        const token = localStorage.getItem("token")

        // Optimistic update
        setFollowing((prev) => prev.filter((f) => f.id !== person.id))

        try {
            await axios.delete(`https://d3kv9nj5wp3sq6.cloudfront.net/profileusers/${user.username}/following/${person.id}`)

            const followersResponse = await axios.get(
                `https://d3kv9nj5wp3sq6.cloudfront.net/profileusers/${person.username}/followers`,
            )
            const followerItem = followersResponse.data.find((item: any) => item.username === user.username)

            if (followerItem) {
                await axios.delete(
                    `https://d3kv9nj5wp3sq6.cloudfront.net/profileusers/${person.username}/followers/${followerItem.id}`,
                )
            }
        } catch (error) {
            console.error("Error unfollowing user:", error)
            // Rollback
            setFollowing((prev) => [...prev, person])
        }
    }

    const handleUserClick = (person: Following) => {
        if (person.username === user?.username) {
            router.push("/profile")
        } else {
            localStorage.setItem("profileUsername", person.username)
            router.push("/profile/user")
        }
        onClose()
    }

    const filteredFollowing = following.filter(
        (person) =>
            person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            person.username.toLowerCase().includes(searchTerm.toLowerCase()),
    )

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>

            <div className="absolute right-4 top-20 w-[calc(100%-2rem)] max-w-md max-h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
                    <div className="flex items-center space-x-3">
                        <Users className="w-6 h-6 text-purple-600" />
                        <h3 className="font-semibold text-gray-900 text-lg">{following.length} Following</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search following..."
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border-0 rounded-xl text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all duration-200"
                        />
                    </div>
                </div>

                {/* Following List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-center space-x-3 animate-pulse">
                                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                                    <div className="flex-1">
                                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredFollowing.map((person) => (
                                <div
                                    key={person.id}
                                    className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-xl transition-colors group"
                                >
                                    <button onClick={() => handleUserClick(person)} className="flex items-center space-x-3 flex-1">
                                        <div className="relative">
                                            {person.image ? <Image
                                                src={person.image || "/placeholder.svg?height=48&width=48"}
                                                alt={person.name}
                                                width={48}
                                                height={48}
                                                className="rounded-full ring-2 ring-gray-100 group-hover:ring-purple-200 transition-all duration-200"
                                            /> :
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center">
                                                    <span className="text-white font-bold text-xs">
                                                        {person.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>}
                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="font-medium text-gray-900 text-sm">{person.name}</p>
                                            <p className="text-xs text-gray-500">@{person.username}</p>
                                        </div>
                                    </button>

                                    {isOwnProfile && (
                                        <button
                                            onClick={() => handleUnfollow(person)}
                                            className="flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-700 rounded-full text-xs font-medium transition-all duration-200"
                                        >
                                            <UserMinus className="w-3 h-3" />
                                            <span>Unfollow</span>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {filteredFollowing.length === 0 && !isLoading && (
                        <div className="text-center py-8">
                            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 text-sm">{searchTerm ? "No following found" : "Not following anyone yet"}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
