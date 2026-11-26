// app/select-org/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, OrgApi, Membership, OrgSummary } from "@/utils/api";
import { PixelLabel, Window, tag } from "@/components/app/ui";

export default function SelectOrgPage() {
  const [list, setList] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      const raw = localStorage.getItem("profileUser");
      if (!raw) {
        router.push("/login");
        return;
      }
      const user = JSON.parse(raw);
      const { data } = await OrgApi.membershipsForUser(user.username);
      setList(data);
      setLoading(false);
    };
    run();
  }, [router]);

  const go = (org: OrgSummary) => {
    localStorage.setItem("activeOrg", JSON.stringify(org));
    router.push(`/explore`);
  };

  if (loading)
    return (
      <div className="mk-grid min-h-screen bg-[var(--mk-paper)] p-6 tracking-tight text-[var(--mk-ink-2)]">
        Loading workspaces…
      </div>
    );

  return (
    <div className="mk-grid flex min-h-screen items-center justify-center bg-[var(--mk-paper)] p-6 text-[var(--mk-ink)]">
      <Window title="workspaces://select" className="w-full max-w-md">
        <div className="p-6">
          <PixelLabel className="mb-2">WORKSPACES</PixelLabel>
          <h1 className="mk-display mb-4 text-[1.6rem] text-[var(--mk-ink)]">
            Choose a workspace
          </h1>
          <div className="space-y-2">
            {list.map((m) => (
              <button
                key={m.organization.id}
                onClick={() => go(m.organization)}
                className="mk-lift w-full rounded-[4px] border border-[var(--mk-ink)] bg-white px-4 py-3 text-left transition-colors hover:bg-[var(--mk-indigo-soft)]"
              >
                <div className="font-semibold tracking-tight text-[var(--mk-ink)]">{m.organization.name}</div>
                <div className={`mt-0.5 ${tag}`}>
                  {m.organization.slug} • {m.role}
                </div>
              </button>
            ))}
          </div>
          <div className="mt-4 border-t border-[var(--mk-rule)] pt-4 text-sm tracking-tight text-[var(--mk-ink-2)]">
            Don’t see your workspace? Ask an admin for an invite link.
          </div>
        </div>
      </Window>
    </div>
  );
}
