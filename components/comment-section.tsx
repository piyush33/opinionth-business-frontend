"use client"

import type React from "react"
import Image from "next/image"
import { Send } from "lucide-react"
import { PixelLabel, btn, field, tag } from "@/components/app/ui"

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
        <div className="text-[var(--mk-ink)]">
            <div className="flex items-baseline justify-between gap-3 pb-3">
                <PixelLabel>COMMENTS</PixelLabel>
                <span className={tag}>{comments.length} total</span>
            </div>

            {/* Add Comment */}
            <div className="flex items-start gap-3 border-y border-[var(--mk-ink)] py-3">
                <Avatar image={currentUser.image} username={currentUser.username} size={36} />
                <div className="flex min-w-0 flex-1 items-center gap-2">
                    <input
                        type="text"
                        placeholder="Add a comment..."
                        aria-label="Add a comment"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyPress={(e) => handleKeyPress(e, onAddComment)}
                        className={`${field} min-w-0 py-2 text-[14px]`}
                    />
                    <button
                        onClick={onAddComment}
                        disabled={!newComment.trim()}
                        className={`${btn.primary} shrink-0 px-3 py-2 text-[14px]`}
                        aria-label="Post comment"
                    >
                        <Send className="h-4 w-4" />
                        <span className="hidden sm:inline">Post</span>
                    </button>
                </div>
            </div>

            {/* Comments List */}
            <ul>
                {comments.map((comment) => (
                    <li key={comment.id} className="border-b border-[var(--mk-rule)] py-3">
                        {/* Main Comment */}
                        <div className="flex gap-3">
                            <Avatar image={comment.image} username={comment.username} size={36} />
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-baseline gap-x-2">
                                    <span className="text-[14px] font-bold tracking-[-0.01em]">{comment.username}</span>
                                    <span className={tag}>{formatTimeAgo(comment.createdAt)}</span>
                                </div>
                                <p className="mt-0.5 break-words text-[14px] leading-relaxed tracking-[-0.01em] text-[var(--mk-ink)]">
                                    {comment.comment}
                                </p>
                                <div className="mt-1.5 flex items-center gap-1">
                                    <button
                                        onClick={() => setReplyingTo(comment.id)}
                                        className={`${tag} rounded-[4px] px-1.5 py-1 hover:bg-[var(--mk-indigo-soft)] hover:text-[var(--mk-indigo-deep)]`}
                                    >
                                        Reply
                                    </button>
                                    <button
                                        className={`${tag} rounded-[4px] px-1.5 py-1 hover:bg-[var(--mk-indigo-soft)]`}
                                        aria-label="More options"
                                    >
                                        •••
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Reply Input */}
                        {replyingTo === comment.id && (
                            <div className="ml-12 mt-3 flex gap-3">
                                <Avatar image={currentUser.image} username={currentUser.username} size={28} />
                                <div className="min-w-0 flex-1 space-y-2">
                                    <input
                                        type="text"
                                        placeholder="Reply..."
                                        aria-label={`Reply to ${comment.username}`}
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        onKeyPress={(e) => handleKeyPress(e, () => onAddReply(comment.id))}
                                        className={`${field} py-2 text-[14px]`}
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setReplyingTo(null)}
                                            className={`${btn.plain} px-3 py-1.5 text-[13px]`}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => onAddReply(comment.id)}
                                            disabled={!replyText.trim()}
                                            className={`${btn.primary} px-3 py-1.5 text-[13px]`}
                                        >
                                            Reply
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                            <ul className="ml-12 mt-3 border-l border-[var(--mk-rule)]">
                                {comment.replies.map((reply) => (
                                    <li key={reply.id} className="flex gap-3 border-b border-[var(--mk-rule)] py-2.5 pl-3 last:border-b-0">
                                        <Avatar image={reply.image} username={reply.username} size={28} />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-baseline gap-x-2">
                                                <span className="text-[13px] font-bold tracking-[-0.01em]">{reply.username}</span>
                                                <span className={tag}>{formatTimeAgo(reply.createdAt)}</span>
                                            </div>
                                            <p className="mt-0.5 break-words text-[13px] leading-relaxed tracking-[-0.01em]">{reply.reply}</p>
                                            <div className="mt-1 flex items-center gap-1">
                                                <button className={`${tag} rounded-[4px] px-1.5 py-1 hover:bg-[var(--mk-indigo-soft)] hover:text-[var(--mk-indigo-deep)]`}>
                                                    Reply
                                                </button>
                                                <button
                                                    className={`${tag} rounded-[4px] px-1.5 py-1 hover:bg-[var(--mk-indigo-soft)]`}
                                                    aria-label="More options"
                                                >
                                                    •••
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    )
}

/** Square avatar: picture if present, otherwise the initial on indigo tint. */
function Avatar({ image, username, size }: { image?: string; username: string; size: number }) {
    return (
        <div
            className="grid shrink-0 place-items-center overflow-hidden rounded-[3px] border border-[var(--mk-ink)] bg-[var(--mk-indigo-soft)]"
            style={{ width: size, height: size }}
        >
            {image ? (
                <Image
                    src={image || "/placeholder.svg"}
                    alt={username}
                    width={size}
                    height={size}
                    className="h-full w-full object-cover"
                />
            ) : (
                <span className="text-[12px] font-bold text-[var(--mk-indigo-deep)]">
                    {username.charAt(0).toUpperCase()}
                </span>
            )}
        </div>
    )
}
