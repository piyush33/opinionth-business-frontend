"use client"

import type React from "react"
import Image from "next/image"

interface User {
    id: string
    username: string
    image?: string
    followers?: number
}

interface Reply {
    id: string
    username: string
    image?: string
    reply: string
    createdAt?: string
}

interface Comment {
    id: string
    username: string
    image?: string
    comment: string
    replies: Reply[]
    createdAt?: string
}

interface CommentSectionProps {
    comments: Comment[]
    newComment: string
    setNewComment: (value: string) => void
    replyingTo: string | null
    setReplyingTo: (id: string | null) => void
    replyText: string
    setReplyText: (value: string) => void
    onAddComment: () => void
    onAddReply: (commentId: string) => void
    currentUser: User
}

export function CommentSection({
    comments,
    newComment,
    setNewComment,
    replyingTo,
    setReplyingTo,
    replyText,
    setReplyText,
    onAddComment,
    onAddReply,
    currentUser,
}: CommentSectionProps) {
    const formatTimeAgo = (dateString?: string) => {
        if (!dateString) return "Just now"

        const date = new Date(dateString)
        const now = new Date()
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

        if (diffInHours < 1) return "Just now"
        if (diffInHours < 24) return `${diffInHours}h ago`
        return `${Math.floor(diffInHours / 24)}d ago`
    }

    const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            action()
        }
    }

    return (
        <div className="space-y-4 md:space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 md:text-gray-900 text-white">Comments ({comments.length})</h3>

            {/* Add Comment */}
            <div className="flex space-x-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {currentUser.image ? (
                        <Image
                            src={currentUser.image || "/placeholder.svg"}
                            alt={currentUser.username}
                            width={40}
                            height={40}
                            className="object-cover"
                        />
                    ) : (
                        <span className="text-white font-semibold text-xs md:text-sm">
                            {currentUser.username.charAt(0).toUpperCase()}
                        </span>
                    )}
                </div>
                <div className="flex-1 space-y-2">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Add a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyPress={(e) => handleKeyPress(e, onAddComment)}
                            className="w-full px-3 md:px-4 py-2 md:py-3 bg-gray-800 md:bg-gray-50 border border-gray-700 md:border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-200 text-white md:text-gray-900 placeholder-gray-400 md:placeholder-gray-500 text-sm md:text-base"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                            <button className="text-gray-400 hover:text-gray-300 md:hover:text-gray-600 transition-colors duration-200">
                                😊
                            </button>
                            <button
                                onClick={onAddComment}
                                disabled={!newComment.trim()}
                                className="text-purple-400 md:text-purple-600 hover:text-purple-300 md:hover:text-purple-700 disabled:text-gray-600 md:disabled:text-gray-400 transition-colors duration-200"
                            >
                                <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Comments List */}
            <div className="space-y-4 md:space-y-6">
                {comments.map((comment) => (
                    <div key={comment.id} className="space-y-3 md:space-y-4">
                        {/* Main Comment */}
                        <div className="flex space-x-3">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {comment.image ? (
                                    <Image
                                        src={comment.image || "/placeholder.svg"}
                                        alt={comment.username}
                                        width={40}
                                        height={40}
                                        className="object-cover"
                                    />
                                ) : (
                                    <span className="text-white font-semibold text-xs md:text-sm">
                                        {comment.username.charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <div className="flex-1 space-y-2">
                                <div className="bg-gray-800 md:bg-gray-50 rounded-xl px-3 md:px-4 py-2 md:py-3">
                                    <div className="flex items-center space-x-2 mb-1">
                                        <span className="font-semibold text-white md:text-gray-900 text-sm md:text-base">
                                            {comment.username}
                                        </span>
                                    </div>
                                    <p className="text-gray-200 md:text-gray-700 text-sm md:text-base">{comment.comment}</p>
                                </div>
                                <div className="flex items-center space-x-4 px-2">
                                    <button
                                        onClick={() => setReplyingTo(comment.id)}
                                        className="text-xs md:text-sm text-gray-400 md:text-gray-500 hover:text-purple-400 md:hover:text-purple-600 font-medium transition-colors duration-200"
                                    >
                                        Reply
                                    </button>
                                    <button className="text-xs md:text-sm text-gray-500 md:text-gray-400 hover:text-gray-400 md:hover:text-gray-600 transition-colors duration-200">
                                        •••
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Reply Input */}
                        {replyingTo === comment.id && (
                            <div className="ml-11 md:ml-13 flex space-x-3">
                                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {currentUser.image ? (
                                        <Image
                                            src={currentUser.image || "/placeholder.svg"}
                                            alt={currentUser.username}
                                            width={32}
                                            height={32}
                                            className="object-cover"
                                        />
                                    ) : (
                                        <span className="text-white text-xs font-semibold">
                                            {currentUser.username.charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 space-y-3">
                                    <input
                                        type="text"
                                        placeholder="Reply..."
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        onKeyPress={(e) => handleKeyPress(e, () => onAddReply(comment.id))}
                                        className="w-full px-3 md:px-4 py-2 bg-gray-800 md:bg-gray-50 border border-gray-700 md:border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-200 text-white md:text-gray-900 placeholder-gray-400 md:placeholder-gray-500 text-sm"
                                    />
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => setReplyingTo(null)}
                                            className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm text-gray-400 md:text-gray-600 bg-gray-800 md:bg-gray-100 rounded-lg hover:bg-gray-700 md:hover:bg-gray-200 transition-colors duration-200"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => onAddReply(comment.id)}
                                            disabled={!replyText.trim()}
                                            className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-gray-600 md:disabled:bg-gray-400 transition-colors duration-200"
                                        >
                                            Reply
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                            <div className="ml-11 md:ml-13 space-y-3 md:space-y-4">
                                {comment.replies.map((reply) => (
                                    <div key={reply.id} className="flex space-x-3">
                                        <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center overflow-hidden flex-shrink-0">
                                            {reply.image ? (
                                                <Image
                                                    src={reply.image || "/placeholder.svg"}
                                                    alt={reply.username}
                                                    width={32}
                                                    height={32}
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <span className="text-white text-xs font-semibold">
                                                    {reply.username.charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <div className="bg-gray-800 md:bg-gray-50 rounded-xl px-3 md:px-4 py-2 md:py-3">
                                                <div className="flex items-center space-x-2 mb-1">
                                                    <span className="font-semibold text-xs md:text-sm text-white md:text-gray-900">
                                                        {reply.username}
                                                    </span>
                                                </div>
                                                <p className="text-gray-200 md:text-gray-700 text-xs md:text-sm">{reply.reply}</p>
                                            </div>
                                            <div className="flex items-center space-x-4 px-2">
                                                <button className="text-xs text-gray-400 md:text-gray-500 hover:text-purple-400 md:hover:text-purple-600 font-medium transition-colors duration-200">
                                                    Reply
                                                </button>
                                                <button className="text-xs text-gray-500 md:text-gray-400 hover:text-gray-400 md:hover:text-gray-600 transition-colors duration-200">
                                                    •••
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
