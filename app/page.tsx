// app/page.tsx: the collabrr.io marketing site.
// Invite links (/?t=…) and org links (/?org=…) still go straight to sign-in.
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Silkscreen } from "next/font/google";
import Landing from "@/components/marketing/Landing";

// Inter (from the root layout) is the typeface; this pixel face is only
// for small labels, the site's nod to 1960s-70s bitmap screens.
const pixel = Silkscreen({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-pixel",
});

export const metadata: Metadata = {
  // One address for the site: www.collabrr.io and collabrr.io both serve it,
  // so tell search engines which one is canonical.
  alternates: { canonical: "https://collabrr.io/" },
  applicationName: "Collabrr",
  title: "Collabrr · Where complex discussions live",
  description:
    "When a thread outgrows chat and the meeting would span three time zones, Collabrr gives the discussion a home: questions, claims, evidence, risks and decisions as linked cards your team develops asynchronously, with the reasoning kept.",
  openGraph: {
    title: "Collabrr · Where complex discussions live",
    description:
      "The reasoning layer between quick chat and finished docs, built first for distributed product teams.",
    url: "https://collabrr.io",
    siteName: "Collabrr",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Collabrr · Where complex discussions live",
    description:
      "The reasoning layer between quick chat and finished docs, built first for distributed product teams.",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://collabrr.io/#organization",
      name: "Collabrr",
      url: "https://collabrr.io/",
      logo: "https://collabrr.io/icon.png",
      sameAs: ["https://medium.com/@blue___gene"],
    },
    {
      "@type": "WebSite",
      "@id": "https://collabrr.io/#website",
      name: "Collabrr",
      url: "https://collabrr.io/",
      publisher: { "@id": "https://collabrr.io/#organization" },
    },
    {
      "@type": "SoftwareApplication",
      name: "Collabrr",
      url: "https://collabrr.io/",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "The reasoning layer between quick chat and finished docs. Distributed teams think through complex decisions together, asynchronously, as linked cards: questions, claims, evidence, risks and decisions.",
      publisher: { "@id": "https://collabrr.io/#organization" },
    },
  ],
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
    <div className={pixel.variable}>
      <script
        type="application/ld+json"
        // Structured data so search engines know this is the official site,
        // with its name, logo and profiles.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <Landing />
    </div>
  );
}
