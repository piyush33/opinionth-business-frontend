"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { ArrowLeft, Search } from "lucide-react";
import Image from "next/image";
import ChatInterface from "./chat-interface";

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
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      <div className="absolute right-4 top-20 w-[calc(100%-2rem)] max-w-md  h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={selectedUser ? goBackToInbox : onClose}
              className="p-1 text-gray-600 hover:text-gray-900 hover:bg-white/50 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h3 className="font-semibold text-gray-900">
              {selectedUser ? selectedUser.name : "New Message"}
            </h3>
          </div>
        </div>

        {selectedUser ? (
          <ChatInterface selectedUser={selectedUser} />
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Search */}
            <div className="p-4 border-b border-gray-100 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Search by name or username..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-0 rounded-xl text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all duration-200"
                />
              </div>
            </div>

            {/* User List - Fixed scrolling container */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="p-2">
                <h4 className="text-sm font-medium text-gray-500 px-2 mb-3">
                  Suggested
                </h4>
                <div className="space-y-1">
                  {filteredUsers.map((user, index) => (
                    <div
                      key={index}
                      onClick={() => handleUserSelect(user)}
                      className="flex items-center space-x-3 p-3 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 rounded-xl cursor-pointer transition-all duration-200 group"
                    >
                      <div className="relative">
                        {user.image ? (
                          <Image
                            src={
                              user.image ||
                              "/placeholder.svg?height=44&width=44"
                            }
                            alt={user.name}
                            width={44}
                            height={44}
                            className="rounded-full ring-2 ring-gray-100 group-hover:ring-purple-200 transition-all duration-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center">
                            <span className="text-white font-bold text-xs">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          @{user.username}
                        </p>
                      </div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                    </div>
                  ))}
                </div>

                {filteredUsers.length === 0 && searchTerm && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">No users found</p>
                    <p className="text-gray-400 text-xs mt-1">
                      Try searching with a different term
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
