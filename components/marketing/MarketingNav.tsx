"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ArrowRight } from "lucide-react";

const LINKS = [
  { href: "#problem", label: "Why Collabrr" },
  { href: "#how", label: "How it works" },
  { href: "#ai", label: "AI" },
  { href: "#use-cases", label: "Use cases" },
  { href: "#compare", label: "Compare" },
  { href: "#essays", label: "Essays" },
];

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Image
        src="/brand/collabrr-logo.png"
        alt=""
        width={Math.round(size * 1.39)}
        height={size}
        priority
      />
      <span className="mk-display text-[1.32rem] font-bold tracking-tight">Collabrr</span>
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

  const app = signedIn
    ? { href: "/explore", label: "Open Collabrr" }
    : { href: "/login", label: "Log in" };

  return (
    <header
      className={`sticky top-0 z-40 transition-colors ${
        scrolled ? "border-b border-[var(--mk-rule)] bg-[var(--mk-paper)]/90 backdrop-blur" : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6" aria-label="Main">
        <Link href="/" aria-label="Collabrr home" className="shrink-0">
          <Logo />
        </Link>
        <div className="hidden flex-1 items-center gap-6 text-sm font-medium text-[var(--mk-ink-2)] lg:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-[var(--mk-ink)]">
              {l.label}
            </a>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Link
            href={app.href}
            className="hidden rounded-full px-4 py-2 text-sm font-semibold text-[var(--mk-ink)] hover:bg-[var(--mk-indigo-soft)] sm:inline-flex"
          >
            {app.label}
          </Link>
          <a
            href="#design-partners"
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--mk-ink)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--mk-indigo-deep)]"
          >
            <span className="hidden sm:inline">Become a design partner</span>
            <span className="sm:hidden">Apply</span>
            <ArrowRight className="hidden h-4 w-4 sm:block" />
          </a>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full hover:bg-[var(--mk-indigo-soft)] lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>
      {open && (
        <div className="border-t border-[var(--mk-rule)] bg-[var(--mk-paper)] px-4 pb-4 lg:hidden">
          <div className="mx-auto flex max-w-6xl flex-col py-2">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2.5 text-[15px] font-medium text-[var(--mk-ink)] hover:bg-[var(--mk-indigo-soft)]"
              >
                {l.label}
              </a>
            ))}
            <Link
              href={app.href}
              className="mt-1 rounded-lg px-2 py-2.5 text-[15px] font-semibold text-[var(--mk-indigo-deep)] hover:bg-[var(--mk-indigo-soft)]"
            >
              {app.label}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
