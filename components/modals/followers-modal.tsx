"use client";

import { useState, useEffect } from "react";
import { X, Users, Search, UserPlus, UserMinus } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Window, btn, field } from "@/components/app/ui";

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
        className="absolute inset-0 bg-[var(--mk-ink)]/40"
        onClick={onClose}
      ></div>

      <Window
        title={`followers://${username}`}
        className="absolute right-4 top-20 flex max-h-[600px] w-[calc(100%-2rem)] max-w-md flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--mk-ink)] px-4 py-3">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-[var(--mk-indigo)]" />
            <h3 className="text-[18px] font-bold tracking-[-0.03em] text-[var(--mk-ink)]">
              <span className="tabular-nums">{followers.length}</span> Followers
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-[4px] border border-[var(--mk-ink)] bg-white text-[var(--mk-ink)] hover:bg-[var(--mk-indigo-soft)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-[var(--mk-rule)] p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--mk-ink-2)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search followers..."
              aria-label="Search followers"
              className={`${field} pl-9`}
            />
          </div>
        </div>

        {/* Followers List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div>
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 border-b border-[var(--mk-rule)] px-4 py-3"
                >
                  <div className="h-10 w-10 rounded-[3px] bg-[var(--mk-rule)]"></div>
                  <div className="flex-1">
                    <div className="mb-2 h-4 w-3/4 rounded-[3px] bg-[var(--mk-rule)]"></div>
                    <div className="h-3 w-1/2 rounded-[3px] bg-[var(--mk-rule)]"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              {filteredFollowers.map((follower) => (
                <div
                  key={follower.id}
                  className="flex items-center gap-3 border-b border-[var(--mk-rule)] px-4 py-3 transition-colors hover:bg-[var(--mk-indigo-soft)]"
                >
                  <button
                    onClick={() => handleUserClick(follower)}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    {follower.image ? (
                      <Image
                        src={
                          follower.image ||
                          "/placeholder.svg?height=48&width=48"
                        }
                        alt={follower.name}
                        width={40}
                        height={40}
                        className="h-10 w-10 shrink-0 rounded-[3px] border border-[var(--mk-ink)] object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[3px] border border-[var(--mk-ink)] bg-[var(--mk-indigo)]">
                        <span className="text-[13px] font-bold text-white">
                          {follower.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-[14px] font-semibold tracking-tight text-[var(--mk-ink)]">
                        {follower.name}
                      </p>
                      <p className="truncate text-[12.5px] tracking-tight text-[var(--mk-ink-2)]">
                        @{follower.username}
                      </p>
                    </div>
                  </button>

                  {!isOwnProfile && follower.username !== user?.username && (
                    <button
                      onClick={() => handleFollowToggle(follower)}
                      className={`${follower.isFollowing ? btn.plain : btn.primary} px-2.5 py-1 text-[12.5px]`}
                    >
                      {follower.isFollowing ? (
                        <>
                          <UserMinus className="h-3.5 w-3.5" />
                          <span>Unfollow</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-3.5 w-3.5" />
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
            <div className="py-10 text-center">
              <Users className="mx-auto mb-3 h-10 w-10 text-[var(--mk-rule)]" />
              <p className="text-[14px] tracking-tight text-[var(--mk-ink-2)]">
                {searchTerm ? "No followers found" : "No followers yet"}
              </p>
            </div>
          )}
        </div>
      </Window>
    </div>
  );
}
