"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X, Search, MessageCircle, ArrowLeft, MoreHorizontal, Send } from "lucide-react"
import Image from "next/image"
import axios from "axios"
import NewMessagePopup from "./new-message-popup"

interface InboxPopupProps {
    isOpen: boolean
    onClose: () => void
}

interface Message {
    content: string
    createdAt: string
    sender: {
        username: string
    }
}

interface User {
    username: string
    name: string
    image?: string
}

interface Conversation {
    user1: User
    user2: User
    messages: Message[]
    lastMessageAt: string
}

export default function InboxPopup({ isOpen, onClose }: InboxPopupProps) {
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
    const [message, setMessage] = useState("")
    const [showNewMessagePopup, setShowNewMessagePopup] = useState(false)
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        // Get user from localStorage
        const userData = localStorage.getItem("user")
        if (userData) {
            setUser(JSON.parse(userData))
        }
    }, [])

    const fetchConversations = async () => {
        if (!user) return

        setIsLoading(true)
        try {
            const response = await axios.get(`https://d3kv9nj5wp3sq6.cloudfront.net/messages/recent/${user.username}`)
            setConversations(response.data)
        } catch (error) {
            console.error("Error fetching conversations:", error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (isOpen && user) {
            fetchConversations()
        }
    }, [isOpen, user])

    const calculateTimeAgo = (timestamp: string) => {
        const now = new Date()
        const messageTime = new Date(timestamp)
        const differenceInSeconds = Math.floor((now.getTime() - messageTime.getTime()) / 1000)

        if (differenceInSeconds < 60) {
            return `${differenceInSeconds}s ago`
        } else if (differenceInSeconds < 3600) {
            const minutes = Math.floor(differenceInSeconds / 60)
            return `${minutes}m ago`
        } else if (differenceInSeconds < 86400) {
            const hours = Math.floor(differenceInSeconds / 3600)
            return `${hours}h ago`
        } else {
            const days = Math.floor(differenceInSeconds / 86400)
            return `${days}d ago`
        }
    }

    const userInConversation = (conversation: Conversation) => {
        return conversation.user1.username !== user?.username ? conversation.user1 : conversation.user2
    }

    const sendMessage = async () => {
        if (!selectedConversation || !user || !message.trim()) return

        try {
            await axios.post(
                `https://d3kv9nj5wp3sq6.cloudfront.net/messages/${user.username}/${userInConversation(selectedConversation).username
                }`,
                { content: message },
            )

            const newMessage: Message = {
                content: message,
                createdAt: new Date().toISOString(),
                sender: { username: user.username },
            }

            setSelectedConversation((prev) =>
                prev
                    ? {
                        ...prev,
                        messages: [...prev.messages, newMessage],
                    }
                    : null,
            )

            setMessage("")
            fetchConversations()
        } catch (error) {
            console.error("Error sending message:", error)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    if (!isOpen) return null

    return (
        <>
            <div className="fixed inset-0 z-50 overflow-hidden">
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>

                <div className="absolute right-4 top-20 w-[calc(100%-2rem)] max-w-md h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
                        {selectedConversation ? (
                            <>
                                <div className="flex items-center space-x-3">
                                    <button
                                        onClick={() => setSelectedConversation(null)}
                                        className="p-1 text-gray-600 hover:text-gray-900 hover:bg-white/50 rounded-full transition-colors"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                    <div className="flex items-center space-x-3">
                                        {userInConversation(selectedConversation).image ? <Image
                                            src={userInConversation(selectedConversation).image || "/placeholder.svg?height=32&width=32"}
                                            alt={userInConversation(selectedConversation).name}
                                            width={32}
                                            height={32}
                                            className="rounded-full ring-2 ring-white"
                                        /> : <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center">
                                            <span className="text-white font-bold text-xs">
                                                {userInConversation(selectedConversation).name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        }
                                        <span className="font-semibold text-gray-900">{userInConversation(selectedConversation).name}</span>
                                    </div>
                                </div>
                                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-full transition-colors">
                                    <MoreHorizontal className="w-4 h-4" />
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center space-x-2">
                                    <MessageCircle className="w-5 h-5 text-blue-600" />
                                    <h3 className="font-semibold text-gray-900">Messages</h3>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-full transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </>
                        )}
                    </div>

                    {selectedConversation ? (
                        /* Conversation View */
                        <div className="flex flex-col flex-1">
                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {selectedConversation.messages.map((msg, index) => (
                                    <div
                                        key={index}
                                        className={`flex ${msg.sender.username === user?.username ? "justify-end" : "justify-start"}`}
                                    >
                                        <div
                                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${msg.sender.username === user?.username
                                                ? "bg-blue-500 text-white rounded-br-md"
                                                : "bg-gray-100 text-gray-900 rounded-bl-md"
                                                }`}
                                        >
                                            <p className="text-sm">{msg.content}</p>
                                            <span
                                                className={`text-xs mt-1 block ${msg.sender.username === user?.username ? "text-blue-100" : "text-gray-500"
                                                    }`}
                                            >
                                                {calculateTimeAgo(msg.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Message Input */}
                            <div className="p-4 border-t border-gray-100 bg-gray-50">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="text"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Type a message..."
                                        className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <button
                                        onClick={sendMessage}
                                        disabled={!message.trim()}
                                        className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Conversations List */
                        <div className="flex flex-col flex-1">
                            {/* New Message Button */}
                            <div className="p-4 border-b border-gray-100">
                                <button
                                    onClick={() => setShowNewMessagePopup(true)}
                                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                                >
                                    New Message
                                </button>
                            </div>

                            {/* Search */}
                            <div className="p-4 border-b border-gray-100">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Search conversations..."
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border-0 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Conversations */}
                            <div className="flex-1 overflow-y-auto">
                                {isLoading ? (
                                    <div className="p-4 space-y-4">
                                        {[...Array(3)].map((_, i) => (
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
                                    <div className="p-2">
                                        <h4 className="text-sm font-medium text-gray-500 px-2 mb-2">Recent</h4>
                                        {conversations.map((conversation, index) => {
                                            const otherUser = userInConversation(conversation)
                                            const lastMessage = conversation.messages[conversation.messages.length - 1]
                                            return (
                                                <div
                                                    key={index}
                                                    onClick={() => setSelectedConversation(conversation)}
                                                    className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
                                                >
                                                    <div className="relative">
                                                        {otherUser.image ? <Image
                                                            src={otherUser.image || "/placeholder.svg?height=48&width=48"}
                                                            alt={otherUser.name}
                                                            width={48}
                                                            height={48}
                                                            className="rounded-full"
                                                        /> : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center">
                                                            <span className="text-white font-bold text-xs">
                                                                {otherUser.name.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>}
                                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <p className="font-medium text-gray-900 text-sm truncate">{otherUser.name}</p>
                                                            <span className="text-xs text-gray-500">
                                                                {calculateTimeAgo(conversation.lastMessageAt)}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-600 truncate">{lastMessage?.content}</p>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* New Message Popup */}
            {showNewMessagePopup && (
                <NewMessagePopup
                    isOpen={showNewMessagePopup}
                    onClose={() => setShowNewMessagePopup(false)}
                    onBackToInbox={() => {
                        setShowNewMessagePopup(false)
                        fetchConversations()
                    }}
                />
            )}
        </>
    )
}
