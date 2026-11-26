"use client";

import type React from "react";

import { useState, useEffect } from "react";
import {
  X,
  Search,
  MessageCircle,
  ArrowLeft,
  MoreHorizontal,
  Send,
} from "lucide-react";
import Image from "next/image";
import axios from "axios";
import NewMessagePopup from "./new-message-popup";
import { Window, btn, field, tag } from "@/components/app/ui";

interface InboxPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  content: string;
  createdAt: string;
  sender: {
    username: string;
  };
}

interface User {
  username: string;
  name: string;
  image?: string;
}

interface Conversation {
  user1: User;
  user2: User;
  messages: Message[];
  lastMessageAt: string;
}

export default function InboxPopup({ isOpen, onClose }: InboxPopupProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [message, setMessage] = useState("");
  const [showNewMessagePopup, setShowNewMessagePopup] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

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

  const fetchConversations = async () => {
    if (!user) return;
    const orgId = getActiveOrgId();

    setIsLoading(true);
    try {
      const response = await axios.get(
        `/nest-api/orgs/${orgId}/messages/recent/${user.username}`
      );
      setConversations(response.data);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      fetchConversations();
    }
  }, [isOpen, user]);

  const calculateTimeAgo = (timestamp: string) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const differenceInSeconds = Math.floor(
      (now.getTime() - messageTime.getTime()) / 1000
    );

    if (differenceInSeconds < 60) {
      return `${differenceInSeconds}s ago`;
    } else if (differenceInSeconds < 3600) {
      const minutes = Math.floor(differenceInSeconds / 60);
      return `${minutes}m ago`;
    } else if (differenceInSeconds < 86400) {
      const hours = Math.floor(differenceInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(differenceInSeconds / 86400);
      return `${days}d ago`;
    }
  };

  const userInConversation = (conversation: Conversation) => {
    return conversation.user1.username !== user?.username
      ? conversation.user1
      : conversation.user2;
  };

  const sendMessage = async () => {
    if (!selectedConversation || !user || !message.trim()) return;
    const orgId = getActiveOrgId();

    try {
      await axios.post(
        `/nest-api/orgs/${orgId}/messages/${user.username}/${
          userInConversation(selectedConversation).username
        }`,
        { content: message }
      );

      const newMessage: Message = {
        content: message,
        createdAt: new Date().toISOString(),
        sender: { username: user.username },
      };

      setSelectedConversation((prev) =>
        prev
          ? {
              ...prev,
              messages: [...prev.messages, newMessage],
            }
          : null
      );

      setMessage("");
      fetchConversations();
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden">
        <div
          className="absolute inset-0 bg-[var(--mk-ink)]/40"
          onClick={onClose}
        ></div>

        <Window
          title="inbox://messages"
          className="absolute right-4 top-20 flex h-[600px] w-[calc(100%-2rem)] max-w-md flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--mk-rule)] px-4 py-3">
            {selectedConversation ? (
              <>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    aria-label="Back to conversations"
                    className="grid h-8 w-8 place-items-center rounded-[4px] border border-[var(--mk-ink)] bg-white text-[var(--mk-ink)] hover:bg-[var(--mk-indigo-soft)]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="flex items-center gap-2.5">
                    {userInConversation(selectedConversation).image ? (
                      <Image
                        src={
                          userInConversation(selectedConversation).image ||
                          "/placeholder.svg?height=32&width=32"
                        }
                        alt={userInConversation(selectedConversation).name}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-[3px] border border-[var(--mk-ink)] object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-[3px] border border-[var(--mk-ink)] bg-[var(--mk-indigo)]">
                        <span className="text-xs font-bold text-white">
                          {userInConversation(selectedConversation)
                            .name.charAt(0)
                            .toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="font-bold tracking-[-0.02em] text-[var(--mk-ink)]">
                      {userInConversation(selectedConversation).name}
                    </span>
                  </div>
                </div>
                <button aria-label="More options" className="grid h-8 w-8 place-items-center rounded-[4px] border border-[var(--mk-ink)] bg-white text-[var(--mk-ink)] hover:bg-[var(--mk-indigo-soft)]">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-[var(--mk-ink)]" />
                  <h3 className="font-bold tracking-[-0.03em] text-[var(--mk-ink)]">Messages</h3>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close inbox"
                  className="grid h-8 w-8 place-items-center rounded-[4px] border border-[var(--mk-ink)] bg-white text-[var(--mk-ink)] hover:bg-[var(--mk-indigo-soft)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {selectedConversation ? (
            /* Conversation View */
            <div className="flex min-h-0 flex-1 flex-col">
              {/* Messages */}
              <div className="flex-1 space-y-3 overflow-y-auto bg-[var(--mk-paper)] p-4">
                {selectedConversation.messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      msg.sender.username === user?.username
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs rounded-[5px] border border-[var(--mk-ink)] px-3.5 py-2 lg:max-w-md ${
                        msg.sender.username === user?.username
                          ? "bg-[var(--mk-indigo)] text-white"
                          : "bg-white text-[var(--mk-ink)]"
                      }`}
                    >
                      <p className="text-[14px] tracking-tight">{msg.content}</p>
                      <span
                        className={`mt-1 block text-[11px] tracking-tight ${
                          msg.sender.username === user?.username
                            ? "text-white/75"
                            : "text-[var(--mk-ink-2)]"
                        }`}
                      >
                        {calculateTimeAgo(msg.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="border-t border-[var(--mk-ink)] p-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className={`${field} flex-1 py-2 text-[14px]`}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!message.trim()}
                    aria-label="Send message"
                    className={`${btn.primary} h-10 w-10 disabled:cursor-not-allowed`}
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Conversations List */
            <div className="flex min-h-0 flex-1 flex-col">
              {/* New Message Button */}
              <div className="border-b border-[var(--mk-rule)] p-4">
                <button
                  onClick={() => setShowNewMessagePopup(true)}
                  className={`${btn.primary} w-full py-2.5 text-[14px]`}
                >
                  New Message
                </button>
              </div>

              {/* Search */}
              <div className="border-b border-[var(--mk-rule)] p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--mk-ink-2)]" />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    className={`${field} py-2 pl-9 text-[14px]`}
                  />
                </div>
              </div>

              {/* Conversations */}
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div>
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 border-b border-[var(--mk-rule)] px-4 py-3"
                      >
                        <div className="h-10 w-10 rounded-[4px] bg-[var(--mk-paper)]"></div>
                        <div className="flex-1">
                          <div className="mb-2 h-3.5 w-3/4 rounded-[2px] bg-[var(--mk-paper)]"></div>
                          <div className="h-3 w-1/2 rounded-[2px] bg-[var(--mk-paper)]"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <h4 className={`${tag} border-b border-[var(--mk-rule)] bg-[var(--mk-paper)] px-4 py-2`}>
                      Recent
                    </h4>
                    {conversations.map((conversation, index) => {
                      const otherUser = userInConversation(conversation);
                      const lastMessage =
                        conversation.messages[conversation.messages.length - 1];
                      return (
                        <div
                          key={index}
                          onClick={() => setSelectedConversation(conversation)}
                          className="flex cursor-pointer items-center gap-3 border-b border-[var(--mk-rule)] px-4 py-3 transition-colors hover:bg-[var(--mk-indigo-soft)]"
                        >
                          <div className="relative shrink-0">
                            {otherUser.image ? (
                              <Image
                                src={
                                  otherUser.image ||
                                  "/placeholder.svg?height=48&width=48"
                                }
                                alt={otherUser.name}
                                width={48}
                                height={48}
                                className="h-10 w-10 rounded-[4px] border border-[var(--mk-ink)] object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-[4px] border border-[var(--mk-ink)] bg-[var(--mk-indigo)]">
                                <span className="text-xs font-bold text-white">
                                  {otherUser.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 h-3 w-3 border border-[var(--mk-ink)] bg-[var(--mk-green)]"></div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <p className="truncate text-[14px] font-semibold tracking-tight text-[var(--mk-ink)]">
                                {otherUser.name}
                              </p>
                              <span className={`${tag} ml-2 shrink-0`}>
                                {calculateTimeAgo(conversation.lastMessageAt)}
                              </span>
                            </div>
                            <p className="truncate text-[13px] tracking-tight text-[var(--mk-ink-2)]">
                              {lastMessage?.content}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </Window>
      </div>

      {/* New Message Popup */}
      {showNewMessagePopup && (
        <NewMessagePopup
          isOpen={showNewMessagePopup}
          onClose={() => setShowNewMessagePopup(false)}
          onBackToInbox={() => {
            setShowNewMessagePopup(false);
            fetchConversations();
          }}
        />
      )}
    </>
  );
}
