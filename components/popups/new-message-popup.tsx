"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { ArrowLeft, Search } from "lucide-react";
import Image from "next/image";
import ChatInterface from "./chat-interface";
import { Window, field, tag } from "@/components/app/ui";

interface NewMessagePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToInbox: () => void;
}

interface User {
  username: string;
  name: string;
  image?: string;
}

export default function NewMessagePopup({
  isOpen,
  onClose,
  onBackToInbox,
}: NewMessagePopupProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [userList, setUserList] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem("user");
    if (userData) {
      const currentUser = JSON.parse(userData);
      setUser(currentUser);

      // Fetch both followers and following
      fetchUniqueUsers(currentUser.username);
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

  const fetchUniqueUsers = async (username: string) => {
    try {
      const token = localStorage.getItem("token");
      const orgId = getActiveOrgId();
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch both followers and following concurrently
      const [followersResponse, followingResponse] = await Promise.all([
        fetch(`/nest-api/orgs/${orgId}/profileusers/${username}/followers`, {
          headers,
        }),
        fetch(`/nest-api/orgs/${orgId}/profileusers/${username}/following`, {
          headers,
        }),
      ]);

      const followers = followersResponse.ok
        ? await followersResponse.json()
        : [];
      const following = followingResponse.ok
        ? await followingResponse.json()
        : [];

      // Combine and deduplicate users
      const allUsers = [...followers, ...following];
      const uniqueUsers = allUsers.reduce((acc: User[], current) => {
        const exists = acc.find((user) => user.username === current.username);
        if (!exists) {
          acc.push({
            username: current.username,
            name: current.name,
            image: current.image,
          });
        }
        return acc;
      }, []);

      setUserList(uniqueUsers);
      setFilteredUsers(uniqueUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      // Fallback to empty list if API fails
      setUserList([]);
      setFilteredUsers([]);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setSearchTerm(value);

    const filtered = userList.filter(
      (user) =>
        user.name.toLowerCase().includes(value) ||
        user.username.toLowerCase().includes(value)
    );
    setFilteredUsers(filtered);
  };

  const handleUserSelect = (selectedUser: User) => {
    setSelectedUser(selectedUser);
  };

  const goBackToInbox = () => {
    setSelectedUser(null);
    onBackToInbox();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden">
      <div
        className="absolute inset-0 bg-[var(--mk-ink)]/40"
        onClick={onClose}
      ></div>

      <Window
        title="inbox://new"
        className="absolute right-4 top-20 flex h-[600px] w-[calc(100%-2rem)] max-w-md flex-col"
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--mk-rule)] px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={selectedUser ? goBackToInbox : onClose}
              aria-label={selectedUser ? "Back to inbox" : "Close"}
              className="grid h-8 w-8 place-items-center rounded-[4px] border border-[var(--mk-ink)] bg-white text-[var(--mk-ink)] hover:bg-[var(--mk-indigo-soft)]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h3 className="font-bold tracking-[-0.03em] text-[var(--mk-ink)]">
              {selectedUser ? selectedUser.name : "New Message"}
            </h3>
          </div>
        </div>

        {selectedUser ? (
          <ChatInterface selectedUser={selectedUser} />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            {/* Search */}
            <div className="flex-shrink-0 border-b border-[var(--mk-rule)] p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--mk-ink-2)]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Search by name or username..."
                  className={`${field} pl-9 text-[14px]`}
                />
              </div>
            </div>

            {/* User List - Fixed scrolling container */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div>
                <h4 className={`${tag} border-b border-[var(--mk-rule)] bg-[var(--mk-paper)] px-4 py-2`}>
                  Suggested
                </h4>
                <div>
                  {filteredUsers.map((user, index) => (
                    <div
                      key={index}
                      onClick={() => handleUserSelect(user)}
                      className="group flex cursor-pointer items-center gap-3 border-b border-[var(--mk-rule)] px-4 py-3 transition-colors hover:bg-[var(--mk-indigo-soft)]"
                    >
                      <div className="relative shrink-0">
                        {user.image ? (
                          <Image
                            src={
                              user.image ||
                              "/placeholder.svg?height=44&width=44"
                            }
                            alt={user.name}
                            width={44}
                            height={44}
                            className="h-10 w-10 rounded-[4px] border border-[var(--mk-ink)] object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-[4px] border border-[var(--mk-ink)] bg-[var(--mk-indigo)]">
                            <span className="text-xs font-bold text-white">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 h-3 w-3 border border-[var(--mk-ink)] bg-[var(--mk-green)]"></div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold tracking-tight text-[var(--mk-ink)]">
                          {user.name}
                        </p>
                        <p className="text-[12.5px] tracking-tight text-[var(--mk-ink-2)]">
                          @{user.username}
                        </p>
                      </div>
                      <div className="h-2 w-2 bg-[var(--mk-indigo)] opacity-0 transition-opacity group-hover:opacity-100"></div>
                    </div>
                  ))}
                </div>

                {filteredUsers.length === 0 && searchTerm && (
                  <div className="py-8 text-center">
                    <p className="text-[14px] font-semibold tracking-tight text-[var(--mk-ink)]">No users found</p>
                    <p className="mt-1 text-[12.5px] tracking-tight text-[var(--mk-ink-2)]">
                      Try searching with a different term
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Window>
    </div>
  );
}
