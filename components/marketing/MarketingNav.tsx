"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "#problem", label: "Why" },
  { href: "#how", label: "How it works" },
  { href: "#ai", label: "AI" },
  { href: "#use-cases", label: "Use cases" },
  { href: "#compare", label: "Compare" },
  { href: "#essays", label: "Essays" },
];

export function Logo({ size = 28, inverted = false }: { size?: number; inverted?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Image src="/brand/collabrr-logo.png" alt="" width={Math.round(size * 1.39)} height={size} priority />
      <span className={`text-[1.28rem] font-bold tracking-[-0.04em] ${inverted ? "text-white" : "text-[var(--mk-ink)]"}`}>Collabrr</span>
    </span>
  );
}

/** Top bar. Signed-in visitors see "Open Collabrr" instead of "Log in". */
export default function MarketingNav() {
  const [signedIn, setSignedIn] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setSignedIn(!!localStorage.getItem("token"));
    } catch {
      /* storage blocked */
    }
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const app = signedIn ? { href: "/explore", label: "Open Collabrr" } : { href: "/login", label: "Log in" };

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors ${
        scrolled ? "border-[var(--mk-ink)] bg-[var(--mk-paper)]/95 backdrop-blur" : "border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6" aria-label="Main">
        <Link href="/" aria-label="Collabrr home" className="shrink-0">
          <Logo />
        </Link>
        <div className="hidden flex-1 items-center gap-6 text-[14px] font-medium tracking-tight text-[var(--mk-ink-2)] lg:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-[var(--mk-ink)]">
              {l.label}
            </a>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Link
            href={app.href}
            className="hidden px-3 py-2 text-[14px] font-semibold tracking-tight text-[var(--mk-ink)] underline-offset-4 hover:underline sm:inline-flex"
          >
            {app.label}
          </Link>
          <a
            href="#design-partners"
            className="mk-btn inline-flex items-center rounded-[4px] bg-[var(--mk-ink)] px-3.5 py-2 text-[14px] font-semibold tracking-tight text-white"
          >
            <span className="hidden sm:inline">Become a design partner</span>
            <span className="sm:hidden">Apply</span>
          </a>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center border border-[var(--mk-ink)] lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>
      {open && (
        <div className="border-t border-[var(--mk-ink)] bg-[var(--mk-paper)] px-4 pb-4 lg:hidden">
          <div className="mx-auto flex max-w-6xl flex-col py-2">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="border-b border-[var(--mk-rule)] px-1 py-3 text-[16px] font-semibold tracking-tight text-[var(--mk-ink)]"
              >
                {l.label}
              </a>
            ))}
            <Link href={app.href} className="px-1 py-3 text-[16px] font-semibold tracking-tight text-[var(--mk-indigo-deep)]">
              {app.label}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
