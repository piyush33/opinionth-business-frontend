// app/login/page.tsx  (Server Component)
import LoginPageClient from "@/components/popups/login-page-client";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Silkscreen } from "next/font/google";

// Pixel face for the bitmap-theme labels (see components/marketing).
const pixel = Silkscreen({ subsets: ["latin"], weight: ["400"], variable: "--font-pixel" });

export const metadata: Metadata = {
  title: "Log in · Collabrr",
  description: "Log in to your Collabrr workspace.",
  // Keep the sign-in page out of search results so "collabrr" finds the homepage.
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  // In newer Next versions searchParams arrives as a Promise
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const org = typeof sp.org === "string" ? sp.org : undefined;
  const t = typeof sp.t === "string" ? sp.t : undefined;

  return (
    <div className={pixel.variable}>
      <Suspense fallback={null}>
        <LoginPageClient orgSlugParam={org ?? null} inviteToken={t ?? null} />
      </Suspense>
    </div>
  );
}
