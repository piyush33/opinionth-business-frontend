"use client";

import { useState, useEffect } from "react";
import { X, Users, Search, UserPlus, UserMinus } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import axios from "axios";

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  isOwnProfile?: boolean;
}

interface Follower {
  id: number;
  username: string;
  name: string;
  image?: string;
  isFollowing?: boolean;
}

export default function FollowersModal({
  isOpen,
  onClose,
  username,
  isOwnProfile = false,
}: FollowersModalProps) {
  const router = useRouter();
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    if (isOpen && username) {
      fetchFollowers();
    }
  }, [isOpen, username]);

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

  const fetchFollowers = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const orgId = getActiveOrgId();

      const response = await axios.get(
        `/nest-api/orgs/${orgId}/profileusers/${username}/followers`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setFollowers(response.data);
    } catch (error) {
      console.error("Error fetching followers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowToggle = async (follower: Follower) => {
    if (!user) return;

    const isCurrentlyFollowing = follower.isFollowing;
    const token = localStorage.getItem("token");
    const orgId = getActiveOrgId();

    // Optimistic update
    setFollowers((prev) =>
      prev.map((f) =>
        f.id === follower.id ? { ...f, isFollowing: !isCurrentlyFollowing } : f
      )
    );

    try {
      if (!isCurrentlyFollowing) {
        // Follow
        await axios.post(
          `/nest-api/orgs/${orgId}/profileusers/${follower.username}/followers`,
          {
            username: user.username,
            name: user.name,
            image: user.image,
            isFollowing: false,
          }
        );
        await axios.post(
          `/nest-api/orgs/${orgId}/profileusers/${user.username}/following`,
          {
            username: follower.username,
            name: follower.name,
            image: follower.image,
          }
        );
      } else {
        // Unfollow
        const followingResponse = await axios.get(
          `/nest-api/orgs/${orgId}/profileusers/${user.username}/following`
        );
        const followingItem = followingResponse.data.find(
          (item: any) => item.username === follower.username
        );

        if (followingItem) {
          await axios.delete(
            `/nest-api/orgs/${orgId}/profileusers/${user.username}/following/${followingItem.id}`
          );

          const followersResponse = await axios.get(
            `/nest-api/orgs/${orgId}/profileusers/${follower.username}/followers`
          );
          const followerItem = followersResponse.data.find(
            (item: any) => item.username === user.username
          );

          if (followerItem) {
            await axios.delete(
              `/nest-api/orgs/${orgId}/profileusers/${follower.username}/followers/${followerItem.id}`
            );
          }
        }
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      // Rollback
      setFollowers((prev) =>
        prev.map((f) =>
          f.id === follower.id ? { ...f, isFollowing: isCurrentlyFollowing } : f
        )
      );
    }
  };

  const handleUserClick = (follower: Follower) => {
    if (follower.username === user?.username) {
      router.push("/profile");
    } else {
      localStorage.setItem("profileUsername", follower.username);
      router.push("/profile/user");
    }
    onClose();
  };

  const filteredFollowers = followers.filter(
    (follower) =>
      follower.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      follower.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      <div className="absolute right-4 top-20 w-[calc(100%-2rem)] max-w-md max-h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center space-x-3">
            <Users className="w-6 h-6 text-blue-600" />
            <h3 className="font-semibold text-gray-900 text-lg">
              {followers.length} Followers
            </h3>
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
              placeholder="Search followers..."
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border-0 rounded-xl text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
            />
          </div>
        </div>

        {/* Followers List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center space-x-3 animate-pulse"
                >
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
              {filteredFollowers.map((follower) => (
                <div
                  key={follower.id}
                  className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-xl transition-colors group"
                >
                  <button
                    onClick={() => handleUserClick(follower)}
                    className="flex items-center space-x-3 flex-1"
                  >
                    <div className="relative">
                      {follower.image ? (
                        <Image
                          src={
                            follower.image ||
                            "/placeholder.svg?height=48&width=48"
                          }
                          alt={follower.name}
                          width={48}
                          height={48}
                          className="rounded-full ring-2 ring-gray-100 group-hover:ring-blue-200 transition-all duration-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center">
                          <span className="text-white font-bold text-xs">
                            {follower.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900 text-sm">
                        {follower.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        @{follower.username}
                      </p>
                    </div>
                  </button>

                  {!isOwnProfile && follower.username !== user?.username && (
                    <button
                      onClick={() => handleFollowToggle(follower)}
                      className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                        follower.isFollowing
                          ? "bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-700"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      {follower.isFollowing ? (
                        <>
                          <UserMinus className="w-3 h-3" />
                          <span>Unfollow</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3" />
                          <span>Follow</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {filteredFollowers.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                {searchTerm ? "No followers found" : "No followers yet"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
