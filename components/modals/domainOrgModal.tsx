import { OrgSummary } from "@/utils/api";

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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-semibold mb-4 text-black">Join a workspace</h3>
        <p className="text-sm text-gray-600 mb-3">
          We found workspaces for your email domain. You can join one, or create a new workspace.
        </p>
        <div className="space-y-2 mb-4">
          {orgs.map((o) => (
            <div key={o.id} className="border rounded p-3 flex items-center justify-between">
              <div>
                <div className="text-gray-500 font-medium">{o.name}</div>
                <div className="text-xs text-gray-500">{o.slug}</div>
              </div>
              <button
                className="px-3 py-1 bg-purple-600 text-white rounded"
                onClick={() => onJoin(o)}
              >
                Join
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={onCreateNew} className="px-4 py-2 bg-green-600 text-white rounded">
            Create new workspace
          </button>
          <button onClick={onClose} className="px-4 py-2 border rounded text-black">Close</button>
        </div>
      </div>
    </div>
  );
}
