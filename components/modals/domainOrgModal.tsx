import { OrgSummary } from "@/utils/api";
import { Window, btn, tag } from "@/components/app/ui";

export default function DomainOrgModal({
  orgs,
  onJoin,
  onCreateNew,
  onClose,
}: {
  orgs: OrgSummary[];
  onJoin: (org: OrgSummary) => Promise<void>;
  onCreateNew: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--mk-ink)]/40 p-4">
      <Window title="space://join" className="w-full max-w-md">
        <div className="p-6">
          <h3 className="mb-2 text-[20px] font-bold tracking-[-0.03em] text-[var(--mk-ink)]">Join a workspace</h3>
          <p className="mb-4 text-[14px] tracking-tight text-[var(--mk-ink-2)]">
            We found workspaces for your email domain. You can join one, or create a new workspace.
          </p>
          <div className="mb-5 overflow-hidden rounded-[4px] border border-[var(--mk-ink)]">
            {orgs.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between border-b border-[var(--mk-rule)] p-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold tracking-tight text-[var(--mk-ink)]">{o.name}</div>
                  <div className={tag}>{o.slug}</div>
                </div>
                <button
                  className={`${btn.primary} px-3 py-1.5 text-[13px]`}
                  onClick={() => onJoin(o)}
                >
                  Join
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={onCreateNew} className={`${btn.primary} px-4 py-2 text-[14px]`}>
              Create new workspace
            </button>
            <button onClick={onClose} className={`${btn.plain} px-4 py-2 text-[14px]`}>
              Close
            </button>
          </div>
        </div>
      </Window>
    </div>
  );
}
