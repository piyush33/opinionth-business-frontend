"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  Save,
  RotateCcw,
  User,
  MapPin,
  LinkIcon,
  Palette,
  Shield,
  Bell,
  Eye,
  Lock,
  Upload,
} from "lucide-react";
import Image from "next/image";
import axios from "axios";
import AppNav from "@/components/app/AppNav";
import { PixelLabel, Window, btn, field, tag } from "@/components/app/ui";

export default function EditProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeSection, setActiveSection] = useState("profile");

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    tagline: "",
    bio: "",
    location: "",
    website: "",
    image: "",
  });

  // Settings states
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: "public",
    showEmail: false,
    showLocation: false,
    allowMessages: true,
    allowFollows: true,
  });

  const sidebarItems = [
    { id: "profile", name: "Edit Profile", icon: User },
    { id: "account", name: "Account Management", icon: Shield },
    { id: "privacy", name: "Privacy & Visibility", icon: Eye },
    { id: "notifications", name: "Notifications", icon: Bell },
    { id: "appearance", name: "Appearance", icon: Palette },
    { id: "security", name: "Security", icon: Lock },
  ];

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setFormData({
        name: parsedUser.name || "",
        username: parsedUser.username || "",
        tagline: parsedUser.tagline || "",
        bio: parsedUser.bio || "",
        location: parsedUser.location || "",
        website: parsedUser.website || "",
        image: parsedUser.image || "",
      });
    }
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    const formDataUpload = new FormData();
    formDataUpload.append("file", file);

    try {
      const response = await axios.post(
        `nest-api/uploads/profile`,
        formDataUpload,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setFormData((prev) => ({
        ...prev,
        image: response.data.imageUrl,
      }));
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setIsUploading(false);
    }
  };

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

  const handleSave = async () => {
    if (!user) return;
    const orgId = getActiveOrgId();

    setIsLoading(true);
    try {
      const response = await axios.put(
        `/nest-api/orgs/${orgId}/profileusers/${user.username}`,
        formData
      );

      // Update localStorage
      localStorage.setItem("profileUser", JSON.stringify(response.data));
      setUser(response.data);

      router.push("/profile");
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    if (user) {
      setFormData({
        name: user.name || "",
        username: user.username || "",
        tagline: user.tagline || "",
        bio: user.bio || "",
        location: user.location || "",
        website: user.website || "",
        image: user.image || "",
      });
    }
  };


  const iconBtn =
    "grid h-9 w-9 place-items-center rounded-[4px] border border-[var(--mk-ink)] bg-white text-[var(--mk-ink)] hover:bg-[var(--mk-indigo-soft)]";
  const sectionTab = (selected: boolean) =>
    `flex items-center gap-2.5 rounded-[4px] px-3 py-2 text-left text-[14px] font-semibold tracking-tight transition-colors ${
      selected
        ? "bg-[var(--mk-ink)] text-white"
        : "text-[var(--mk-ink-2)] hover:bg-[var(--mk-indigo-soft)]"
    }`;
  const switchTrack = (on: boolean) =>
    `relative inline-flex h-6 w-11 shrink-0 items-center rounded-[4px] border border-[var(--mk-ink)] transition-colors ${
      on ? "bg-[var(--mk-indigo)]" : "bg-[var(--mk-paper)]"
    }`;
  const switchKnob = (on: boolean) =>
    `inline-block h-4 w-4 rounded-[2px] border border-[var(--mk-ink)] bg-white transition-transform ${
      on ? "translate-x-[22px]" : "translate-x-[3px]"
    }`;
  const iconInField =
    "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--mk-ink-2)]";

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--mk-paper)]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-[3px] border-2 border-[var(--mk-rule)] border-t-[var(--mk-indigo)]"></div>
          <p className="tracking-tight text-[var(--mk-ink-2)]">Loading...</p>
        </div>
      </div>
    );
  }

  const activeItem = sidebarItems.find((item) => item.id === activeSection);

  return (
    <div className="min-h-screen bg-[var(--mk-paper)] text-[var(--mk-ink)]">
      <AppNav active="profile" />

      <main className="px-4 pb-28 pt-20 md:pb-10 md:pt-24">
        <div className="mx-auto max-w-6xl">
          {/* Page header */}
          <div className="mb-5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className={iconBtn}
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="mk-display text-[24px] md:text-[28px]">Edit Profile</h1>
          </div>

          {/* Mobile section picker */}
          <div className="-mx-4 mb-4 overflow-x-auto px-4 lg:hidden">
            <div className="flex w-max gap-1 rounded-[5px] border border-[var(--mk-ink)] bg-white p-1">
              {sidebarItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={`${sectionTab(activeSection === item.id)} whitespace-nowrap`}
                    aria-pressed={activeSection === item.id}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:gap-8">
            {/* Desktop sidebar */}
            <aside className="hidden w-64 shrink-0 lg:block">
              <div className="mk-hard-sm sticky top-24 rounded-[5px] border border-[var(--mk-ink)] bg-white p-2">
                <p className={`${tag} px-3 pb-2 pt-1`}>Settings</p>
                <nav className="flex flex-col gap-1" aria-label="Settings sections">
                  {sidebarItems.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveSection(item.id)}
                        className={`${sectionTab(activeSection === item.id)} w-full`}
                        aria-current={activeSection === item.id ? "page" : undefined}
                      >
                        <IconComponent className="h-4 w-4" />
                        <span>{item.name}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </aside>

            {/* Main content */}
            <div className="min-w-0 flex-1">
              <Window
                title={activeSection === "profile" ? "profile://edit" : `profile://${activeSection}`}
              >
                {activeSection === "profile" && (
                  <>
                    <div className="p-4 sm:p-6 lg:p-8">
                      <PixelLabel className="mb-3">EDIT PROFILE</PixelLabel>
                      <p className="mb-6 max-w-2xl text-[14px] tracking-[-0.01em] text-[var(--mk-ink-2)] lg:mb-8">
                        Keep your personal details private. Information you add
                        here is visible to anyone who can view your profile.
                      </p>

                      {/* Profile picture */}
                      <div className="mb-6 border-b border-[var(--mk-rule)] pb-6 lg:mb-8 lg:pb-8">
                        <span className={tag}>Profile Picture</span>
                        <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
                          <label
                            htmlFor="profile-photo-upload"
                            className="group relative block h-20 w-20 cursor-pointer overflow-hidden rounded-[4px] border border-[var(--mk-ink)] bg-[var(--mk-paper)] sm:h-24 sm:w-24"
                          >
                            <span className="sr-only">Change photo</span>
                            <Image
                              src={
                                formData.image ||
                                "/placeholder.svg?height=96&width=96"
                              }
                              alt="Profile"
                              width={96}
                              height={96}
                              className="h-full w-full object-cover"
                            />
                            <span className="absolute inset-0 flex items-center justify-center bg-[var(--mk-ink)]/50 opacity-0 transition-opacity group-hover:opacity-100">
                              <Camera className="h-5 w-5 text-white sm:h-6 sm:w-6" />
                            </span>
                          </label>
                          <div className="space-y-2 text-center sm:text-left">
                            <label className="inline-block cursor-pointer">
                              <input
                                id="profile-photo-upload"
                                type="file"
                                accept="image/*"
                                onChange={(e) =>
                                  e.target.files?.[0] &&
                                  handleImageUpload(e.target.files[0])
                                }
                                className="peer sr-only"
                              />
                              <span
                                className={`${btn.plain} px-4 py-2 text-[14px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--mk-indigo)]`}
                              >
                                <Upload className="h-4 w-4" />
                                <span>
                                  {isUploading ? "Uploading..." : "Change Photo"}
                                </span>
                              </span>
                            </label>
                            <p className={tag}>JPG, PNG or GIF. Max size 5MB.</p>
                          </div>
                        </div>
                      </div>

                      {/* Form fields */}
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
                        <label className="block">
                          <span className={tag}>Full Name</span>
                          <span className="relative mt-1.5 block">
                            <User className={iconInField} />
                            <input
                              type="text"
                              value={formData.name}
                              onChange={(e) =>
                                handleInputChange("name", e.target.value)
                              }
                              className={`${field} pl-9`}
                              placeholder="Enter your full name"
                            />
                          </span>
                        </label>

                        <div>
                          <label className="block">
                            <span className={tag}>Username</span>
                            <span className="relative mt-1.5 block">
                              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-[var(--mk-ink-2)]">
                                @
                              </span>
                              <input
                                type="text"
                                value={formData.username}
                                onChange={(e) =>
                                  handleInputChange("username", e.target.value)
                                }
                                className={`${field} pl-8`}
                                placeholder="username"
                              />
                            </span>
                          </label>
                          <p className="mt-1.5 break-all text-[12px] tracking-tight text-[var(--mk-ink-2)]">
                            www.yoursite.com/@{formData.username}
                          </p>
                        </div>

                        <label className="block lg:col-span-2">
                          <span className={tag}>Tagline</span>
                          <input
                            type="text"
                            value={formData.tagline}
                            onChange={(e) =>
                              handleInputChange("tagline", e.target.value)
                            }
                            className={`${field} mt-1.5`}
                            placeholder="A short description about yourself"
                          />
                        </label>

                        <div className="lg:col-span-2">
                          <label className="block">
                            <span className={tag}>Bio</span>
                            <textarea
                              value={formData.bio}
                              onChange={(e) =>
                                handleInputChange("bio", e.target.value)
                              }
                              rows={4}
                              className={`${field} mt-1.5 resize-none`}
                              placeholder="Tell us more about yourself..."
                            />
                          </label>
                          <p
                            className={`mt-1.5 text-[12px] tracking-tight ${
                              formData.bio.length > 500
                                ? "font-semibold text-[var(--mk-amber)]"
                                : "text-[var(--mk-ink-2)]"
                            }`}
                          >
                            {formData.bio.length}/500 characters
                          </p>
                        </div>

                        <label className="block">
                          <span className={tag}>Location</span>
                          <span className="relative mt-1.5 block">
                            <MapPin className={iconInField} />
                            <input
                              type="text"
                              value={formData.location}
                              onChange={(e) =>
                                handleInputChange("location", e.target.value)
                              }
                              className={`${field} pl-9`}
                              placeholder="City, Country"
                            />
                          </span>
                        </label>

                        <label className="block">
                          <span className={tag}>Website</span>
                          <span className="relative mt-1.5 block">
                            <LinkIcon className={iconInField} />
                            <input
                              type="url"
                              value={formData.website}
                              onChange={(e) =>
                                handleInputChange("website", e.target.value)
                              }
                              className={`${field} pl-9`}
                              placeholder="https://yourwebsite.com"
                            />
                          </span>
                        </label>
                      </div>

                      {/* Privacy settings */}
                      <div className="mt-6 border-t border-[var(--mk-rule)] pt-6 lg:mt-8 lg:pt-8">
                        <h3 className="mb-2 text-[18px] font-bold tracking-[-0.03em]">
                          Privacy Settings
                        </h3>
                        <div>
                          <div className="flex flex-col gap-2 border-b border-[var(--mk-rule)] py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <label
                                htmlFor="profile-visibility"
                                className="text-[14px] font-semibold tracking-tight"
                              >
                                Profile Visibility
                              </label>
                              <p className="text-[13px] tracking-tight text-[var(--mk-ink-2)]">
                                Who can see your profile
                              </p>
                            </div>
                            <select
                              id="profile-visibility"
                              value={privacySettings.profileVisibility}
                              onChange={(e) =>
                                setPrivacySettings((prev) => ({
                                  ...prev,
                                  profileVisibility: e.target.value,
                                }))
                              }
                              className={`${field} py-2 sm:w-auto`}
                            >
                              <option value="public">Public</option>
                              <option value="followers">Followers Only</option>
                              <option value="private">Private</option>
                            </select>
                          </div>

                          <div className="flex items-center justify-between gap-4 border-b border-[var(--mk-rule)] py-4">
                            <div>
                              <p className="text-[14px] font-semibold tracking-tight">
                                Allow Messages
                              </p>
                              <p className="text-[13px] tracking-tight text-[var(--mk-ink-2)]">
                                Let others send you messages
                              </p>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={privacySettings.allowMessages}
                              aria-label="Allow messages"
                              onClick={() =>
                                setPrivacySettings((prev) => ({
                                  ...prev,
                                  allowMessages: !prev.allowMessages,
                                }))
                              }
                              className={switchTrack(privacySettings.allowMessages)}
                            >
                              <span className={switchKnob(privacySettings.allowMessages)} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between gap-4 py-4">
                            <div>
                              <p className="text-[14px] font-semibold tracking-tight">
                                Allow Follows
                              </p>
                              <p className="text-[13px] tracking-tight text-[var(--mk-ink-2)]">
                                Let others follow you
                              </p>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={privacySettings.allowFollows}
                              aria-label="Allow follows"
                              onClick={() =>
                                setPrivacySettings((prev) => ({
                                  ...prev,
                                  allowFollows: !prev.allowFollows,
                                }))
                              }
                              className={switchTrack(privacySettings.allowFollows)}
                            >
                              <span className={switchKnob(privacySettings.allowFollows)} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Desktop actions */}
                    <div className="hidden items-center gap-3 border-t border-[var(--mk-ink)] bg-[var(--mk-paper)] px-6 py-4 md:flex lg:px-8">
                      <button
                        type="button"
                        onClick={handleReset}
                        className={`${btn.plain} px-4 py-2 text-[14px]`}
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span>Reset</span>
                      </button>
                      <div className="ml-auto flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => router.back()}
                          className={`${btn.plain} px-4 py-2 text-[14px]`}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSave}
                          disabled={isLoading}
                          className={`${btn.primary} px-5 py-2 text-[14px] disabled:cursor-not-allowed`}
                        >
                          <Save className="h-4 w-4" />
                          <span>{isLoading ? "Saving..." : "Save Changes"}</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Placeholder content for other sections */}
                {activeSection !== "profile" && (
                  <div className="px-4 py-16 text-center">
                    <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[4px] border border-[var(--mk-ink)] bg-[var(--mk-indigo-soft)]">
                      {(() => {
                        const IconComponent = activeItem?.icon || User;
                        return (
                          <IconComponent className="h-6 w-6 text-[var(--mk-indigo-deep)]" />
                        );
                      })()}
                    </div>
                    <PixelLabel color="var(--mk-ink)" className="mb-2 justify-center">
                      {activeItem?.name?.toUpperCase()}
                    </PixelLabel>
                    <p className="text-[14px] tracking-tight text-[var(--mk-ink-2)]">
                      This section is coming soon!
                    </p>
                  </div>
                )}
              </Window>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile save bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--mk-ink)] bg-[var(--mk-paper)] p-3 md:hidden">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleReset}
            className={`${btn.plain} px-3 py-2.5 text-[14px]`}
            aria-label="Reset changes"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className={`${btn.plain} flex-1 px-4 py-2.5 text-[14px]`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className={`${btn.primary} flex-1 px-4 py-2.5 text-[14px] disabled:cursor-not-allowed`}
          >
            <Save className="h-4 w-4" />
            <span>{isLoading ? "Saving..." : "Save"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
