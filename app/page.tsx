// app/page.tsx  (Server Component)
import LoginPageClient from "@/components/popups/login-page-client";
import { Suspense } from "react";

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
    <Suspense fallback={null}>
      <LoginPageClient orgSlugParam={org ?? null} inviteToken={t ?? null} />
    </Suspense>
  );
}
