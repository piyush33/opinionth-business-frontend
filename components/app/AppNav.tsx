"use client";

// The app's top bar in the bitmap theme: one component for every page.
// Desktop: a fixed 64px bar. Phones: a fixed header (logo row, then search
// when the page has one) and a slide-in menu. Heights match the old bars, so
// page offsets stay the same.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, Home, Compass, Menu, MessageCircle, Plus, Search, User, X, LogOut } from "lucide-react";
import { LogoBitmap } from "@/components/marketing/Bitmap";

type Props = {
  active?: "home" | "explore" | "create" | "profile" | null;
  search?: { value: string; onChange: (v: string) => void; placeholder?: string };
  unreadCount?: number;
  onNotifications?: () => void;
  onInbox?: () => void;
  onSettings?: () => void;
  /** Extra phone-only content under the header (e.g. a category picker). */
  mobileExtra?: React.ReactNode;
};

const LINKS = [
  { key: "home", label: "Home", href: "/home", icon: Home },
  { key: "explore", label: "Explore", href: "/explore", icon: Compass },
  { key: "create", label: "Create", href: "/create", icon: Plus },
] as const;

const iconBtn =
  "relative grid h-9 w-9 place-items-center rounded-[4px] text-[var(--mk-ink)] transition-colors hover:bg-[var(--mk-indigo-soft)]";

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoBitmap className={compact ? "h-5 w-[28px]" : "h-6 w-[34px]"} />
      <span className={`font-bold tracking-[-0.04em] text-[var(--mk-ink)] ${compact ? "text-[1.08rem]" : "text-[1.2rem]"}`}>Collabrr</span>
    </span>
  );
}

function SearchField({ search, className = "" }: { search: NonNullable<Props["search"]>; className?: string }) {
  return (
    <label className={`relative block ${className}`}>
      <span className="sr-only">Search</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--mk-ink-2)]" />
      <input
        type="text"
        value={search.value}
        onChange={(e) => search.onChange(e.target.value)}
        placeholder={search.placeholder ?? "Search whiteboards, people, topics…"}
        className="w-full rounded-[4px] border border-[var(--mk-ink)] bg-white py-2 pl-9 pr-3 text-[14px] tracking-tight text-[var(--mk-ink)] placeholder:text-[#8a8ea0] transition-shadow focus:outline-none focus:shadow-[3px_3px_0_var(--mk-indigo)]"
      />
    </label>
  );
}

export default function AppNav({ active = null, search, unreadCount = 0, onNotifications, onInbox, onSettings, mobileExtra }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setOpen(false);
    router.push("/login");
  };

  return (
    <>
      {/* Desktop */}
      <nav className="fixed left-0 right-0 top-0 z-40 hidden border-b border-[var(--mk-ink)] bg-[var(--mk-paper)]/95 backdrop-blur md:block" aria-label="Main">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4">
          <Link href="/explore" aria-label="Collabrr, Explore">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.key}
                href={l.href}
                aria-current={active === l.key ? "page" : undefined}
                className={`rounded-[4px] px-3 py-1.5 text-[14px] font-semibold tracking-tight transition-colors ${
                  active === l.key ? "bg-[var(--mk-ink)] text-white" : "text-[var(--mk-ink-2)] hover:bg-[var(--mk-indigo-soft)] hover:text-[var(--mk-ink)]"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className="mx-auto w-full max-w-md flex-1">{search && <SearchField search={search} />}</div>
          <div className="flex items-center gap-1">
            {onNotifications && (
              <button onClick={onNotifications} className={iconBtn} aria-label="Notifications">
                <Bell className="h-[18px] w-[18px]" />
                {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 bg-[var(--mk-amber)]" />}
              </button>
            )}
            {onInbox && (
              <button onClick={onInbox} className={iconBtn} aria-label="Messages">
                <MessageCircle className="h-[18px] w-[18px]" />
              </button>
            )}
            <Link href="/profile" className={`${iconBtn} ${active === "profile" ? "bg-[var(--mk-ink)] text-white hover:bg-[var(--mk-ink)]" : ""}`} aria-label="Your profile">
              <User className="h-[18px] w-[18px]" />
            </Link>
            {onSettings && (
              <button onClick={onSettings} className={iconBtn} aria-label="Settings">
                <ChevronDown className="h-[18px] w-[18px]" />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Phones */}
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-[var(--mk-ink)] bg-[var(--mk-paper)]/95 backdrop-blur md:hidden">
        <div className="space-y-3 px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/explore" aria-label="Collabrr, Explore">
              <Wordmark compact />
            </Link>
            <div className="flex items-center gap-1">
              {onNotifications && (
                <button onClick={onNotifications} className={iconBtn} aria-label="Notifications">
                  <Bell className="h-[18px] w-[18px]" />
                  {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 bg-[var(--mk-amber)]" />}
                </button>
              )}
              <button onClick={() => setOpen(true)} className={`${iconBtn} border border-[var(--mk-ink)]`} aria-label="Open menu">
                <Menu className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>
          {search && <SearchField search={search} />}
          {mobileExtra}
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-[var(--mk-ink)]/40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-72 flex-col border-l border-[var(--mk-ink)] bg-[var(--mk-paper)]">
            <div className="flex items-center justify-between border-b border-[var(--mk-ink)] px-4 py-3">
              <Wordmark compact />
              <button onClick={() => setOpen(false)} className={`${iconBtn} border border-[var(--mk-ink)]`} aria-label="Close menu">
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {LINKS.map((l) => (
                <Link
                  key={l.key}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 border-b border-[var(--mk-rule)] px-5 py-3.5 text-[15px] font-semibold tracking-tight ${
                    active === l.key ? "bg-[var(--mk-ink)] text-white" : "text-[var(--mk-ink)] hover:bg-[var(--mk-indigo-soft)]"
                  }`}
                >
                  <l.icon className="h-4 w-4" />
                  {l.label}
                </Link>
              ))}
              <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-3 border-b border-[var(--mk-rule)] px-5 py-3.5 text-[15px] font-semibold tracking-tight hover:bg-[var(--mk-indigo-soft)]">
                <User className="h-4 w-4" /> Profile
              </Link>
              {onInbox && (
                <button onClick={() => { setOpen(false); onInbox(); }} className="flex w-full items-center gap-3 border-b border-[var(--mk-rule)] px-5 py-3.5 text-left text-[15px] font-semibold tracking-tight hover:bg-[var(--mk-indigo-soft)]">
                  <MessageCircle className="h-4 w-4" /> Messages
                </button>
              )}
              {onSettings && (
                <button onClick={() => { setOpen(false); onSettings(); }} className="flex w-full items-center gap-3 border-b border-[var(--mk-rule)] px-5 py-3.5 text-left text-[15px] font-semibold tracking-tight hover:bg-[var(--mk-indigo-soft)]">
                  <ChevronDown className="h-4 w-4" /> Settings
                </button>
              )}
            </div>
            <button onClick={logout} className="flex items-center gap-3 border-t border-[var(--mk-ink)] px-5 py-4 text-left text-[15px] font-semibold tracking-tight text-[var(--mk-amber)] hover:bg-[var(--mk-amber-soft)]">
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
