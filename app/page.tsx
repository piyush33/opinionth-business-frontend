// app/page.tsx: the collabrr.io marketing site.
// Invite links (/?t=…) and org links (/?org=…) still go straight to sign-in.
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bricolage_Grotesque } from "next/font/google";
import Landing from "@/components/marketing/Landing";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Collabrr · Where complex discussions live",
  description:
    "When a thread outgrows Slack and the meeting would span three time zones, Collabrr gives the discussion a home: questions, claims, evidence, risks and decisions as linked cards your team develops asynchronously, with the reasoning kept.",
  openGraph: {
    title: "Collabrr · Where complex discussions live",
    description:
      "The reasoning layer between chat and meetings, built first for distributed product teams.",
    url: "https://collabrr.io",
    siteName: "Collabrr",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Collabrr · Where complex discussions live",
    description:
      "The reasoning layer between chat and meetings, built first for distributed product teams.",
  },
};

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const t = typeof sp.t === "string" ? sp.t : undefined;
  const org = typeof sp.org === "string" ? sp.org : undefined;
  if (t || org) {
    const q = new URLSearchParams();
    if (t) q.set("t", t);
    if (org) q.set("org", org);
    redirect(`/login?${q.toString()}`);
  }

  return (
    <div className={display.variable}>
      <Landing />
    </div>
  );
}
