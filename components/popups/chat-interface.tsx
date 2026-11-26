"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import axios from "axios";
import { btn, field } from "@/components/app/ui";

interface ChatInterfaceProps {
  selectedUser: {
    username: string;
    name: string;
    image?: string;
  };
}

interface Message {
  content: string;
  createdAt: string;
  sender: {
    username: string;
  };
}

export default function ChatInterface({ selectedUser }: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const fetchMessages = async () => {
    if (!user || !selectedUser) return;
    const orgId = getActiveOrgId();

    setIsLoading(true);
    try {
      const response = await axios.get(
        `/nest-api/orgs/${orgId}/messages/conversation/${user.username}/${selectedUser.username}`
      );
      setMessages(response.data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !user || !selectedUser) return;
    const orgId = getActiveOrgId();

    try {
      await axios.post(
        `/nest-api/orgs/${orgId}/messages/${user.username}/${selectedUser.username}`,
        {
          content: message,
        }
      );

      const newMessage: Message = {
        content: message,
        createdAt: new Date().toISOString(),
        sender: { username: user.username },
      };

      setMessages((prev) => [...prev, newMessage]);
      setMessage("");
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

  useEffect(() => {
    if (selectedUser && user) {
      fetchMessages();
    }
  }, [selectedUser, user]);

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

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto bg-[var(--mk-paper)] p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={`flex ${
                  i % 2 === 0 ? "justify-end" : "justify-start"
                }`}
              >
                <div className="h-10 w-32 rounded-[5px] border border-[var(--mk-rule)] bg-white"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
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
                  <p className="text-[14px] leading-relaxed tracking-tight">{msg.content}</p>
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
            <div ref={messagesEndRef} />
          </>
        )}

        {messages.length === 0 && !isLoading && (
          <div className="py-8 text-center">
            <p className="text-[14px] font-semibold tracking-tight text-[var(--mk-ink)]">No messages yet</p>
            <p className="mt-1 text-[12.5px] tracking-tight text-[var(--mk-ink-2)]">
              Start the conversation!
            </p>
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t border-[var(--mk-ink)] bg-white p-3">
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
  );
}
