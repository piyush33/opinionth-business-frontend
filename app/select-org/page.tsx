// app/select-org/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, OrgApi, Membership, OrgSummary } from "@/utils/api";

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

  if (loading) return <div className="p-6">Loading workspaces…</div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="bg-white p-6 rounded-lg shadow w-full max-w-md">
        <h1 className="text-xl font-semibold mb-4 text-gray-900">
          Choose a workspace
        </h1>
        <div className="space-y-2 text-gray-700">
          {list.map((m) => (
            <button
              key={m.organization.id}
              onClick={() => go(m.organization)}
              className="w-full text-left px-4 py-3 border rounded hover:bg-gray-50"
            >
              <div className="font-medium">{m.organization.name}</div>
              <div className="text-sm text-gray-500">
                {m.organization.slug} • {m.role}
              </div>
            </button>
          ))}
        </div>
        <div className="mt-4 text-sm text-gray-500">
          Don’t see your workspace? Ask an admin for an invite link.
        </div>
      </div>
    </div>
  );
}
