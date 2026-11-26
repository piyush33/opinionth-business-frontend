"use client";

import { useState, useEffect } from "react";
import {
  X,
  Settings,
  User,
  Shield,
  Palette,
  LogOut,
  ChevronRight,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Window, btn, tag } from "@/components/app/ui";

interface SettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsPopup({ isOpen, onClose }: SettingsPopupProps) {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem("profileUser");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
    onClose();
  };

  const settingsOptions = [
    {
      category: "Account",
      items: [
        { icon: User, label: "Your accounts", href: "/accounts" },
        { icon: User, label: "Add account", href: "/add-account" },
        { icon: Settings, label: "Convert to business", href: "/business" },
      ],
    },
    {
      category: "Settings",
      items: [
        { icon: Settings, label: "Settings", href: "/settings" },
        { icon: Palette, label: "Home feed tuner", href: "/feed-tuner" },
        { icon: Shield, label: "Privacy rights", href: "/privacy" },
      ],
    },
    {
      category: "Support",
      items: [
        { icon: Settings, label: "Help Centre", href: "/help" },
        { icon: Shield, label: "Reports and Violations", href: "/reports" },
        { icon: Settings, label: "Terms of Service", href: "/terms" },
        { icon: Shield, label: "Privacy Policy", href: "/privacy-policy" },
      ],
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-[var(--mk-ink)]/40"
        onClick={onClose}
      ></div>

      <Window
        title="settings://account"
        className="absolute right-4 top-20 flex max-h-[600px] w-80 flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--mk-rule)] px-4 py-3">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-[var(--mk-ink)]" />
            <h3 className="font-bold tracking-[-0.03em] text-[var(--mk-ink)]">Currently in</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="grid h-8 w-8 place-items-center rounded-[4px] border border-[var(--mk-ink)] bg-white text-[var(--mk-ink)] hover:bg-[var(--mk-indigo-soft)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* User Info */}
        {user && (
          <div className="border-b border-[var(--mk-ink)] bg-[var(--mk-paper)] p-4">
            <div className="flex items-center gap-3">
              {user.image ? (
                <Image
                  src={user.image || "/placeholder.svg?height=56&width=56"}
                  alt={user.name}
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-[4px] border border-[var(--mk-ink)] object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-[4px] border border-[var(--mk-ink)] bg-[var(--mk-indigo)]">
                  <span className="text-[22px] font-bold text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold tracking-[-0.02em] text-[var(--mk-ink)]">{user.name}</p>
                <p className="truncate text-[13px] tracking-tight text-[var(--mk-ink-2)]">{user.email}</p>
                <p className={tag}>@{user.username}</p>
              </div>
            </div>
          </div>
        )}

        {/* Settings Options */}
        <div className="flex-1 overflow-y-auto">
          {settingsOptions.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <h4 className={`${tag} border-b border-[var(--mk-rule)] bg-[var(--mk-paper)] px-4 py-2`}>
                {section.category}
              </h4>
              <div>
                {section.items.map((option, index) => (
                  <button
                    key={index}
                    className="group flex w-full items-center justify-between border-b border-[var(--mk-rule)] px-4 py-2.5 text-left transition-colors hover:bg-[var(--mk-indigo-soft)]"
                    onClick={() => {
                      console.log(`Navigate to ${option.href}`);
                      onClose();
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <option.icon className="h-4 w-4 text-[var(--mk-ink-2)] group-hover:text-[var(--mk-ink)]" />
                      <span className="text-[14px] tracking-tight text-[var(--mk-ink)]">
                        {option.label}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[var(--mk-ink-2)]" />
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Additional Options */}
          <div>
            <h4 className={`${tag} border-b border-[var(--mk-rule)] bg-[var(--mk-paper)] px-4 py-2`}>
              More
            </h4>
            <div>
              <button className="group flex w-full items-center justify-between border-b border-[var(--mk-rule)] px-4 py-2.5 text-left transition-colors hover:bg-[var(--mk-indigo-soft)]">
                <div className="flex items-center gap-3">
                  <Settings className="h-4 w-4 text-[var(--mk-ink-2)] group-hover:text-[var(--mk-ink)]" />
                  <span className="text-[14px] tracking-tight text-[var(--mk-ink)]">
                    Install Chrome app
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--mk-ink-2)]" />
              </button>
              <button className="group flex w-full items-center justify-between border-b border-[var(--mk-rule)] px-4 py-2.5 text-left transition-colors hover:bg-[var(--mk-indigo-soft)]">
                <div className="flex items-center gap-3">
                  <Settings className="h-4 w-4 text-[var(--mk-ink-2)] group-hover:text-[var(--mk-ink)]" />
                  <span className="text-[14px] tracking-tight text-[var(--mk-ink)]">
                    Be a beta tester
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--mk-ink-2)]" />
              </button>
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="border-t border-[var(--mk-ink)] p-4">
          <button
            onClick={handleLogout}
            className={`${btn.plain} w-full px-4 py-2.5 text-[14px]`}
          >
            <LogOut className="h-4 w-4" />
            <span>Log Out</span>
          </button>
        </div>
      </Window>
    </div>
  );
}
