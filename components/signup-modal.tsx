// components/signup-modal.tsx  (extend your existing component)
"use client";

import { useState } from "react";
import { X } from "lucide-react";
import axios from "axios";
import { OrgApi, OrgSummary } from "@/utils/api";
import { Window, btn, field } from "@/components/app/ui";

interface SignUpModalProps {
  closeModal: () => void;
  onWorkspaceCreated?: (org: OrgSummary) => void; // optional callback
}

export default function SignUpModal({
  closeModal,
  onWorkspaceCreated,
}: SignUpModalProps) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [makeWorkspace, setMakeWorkspace] = useState(false);
  const [wsName, setWsName] = useState("");
  const [wsSlug, setWsSlug] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSignUp = async () => {
    if (!name || !username || !email || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const res = await axios.post("/nest-api/auth/signup", {
        name,
        username,
        email,
        password,
      });
      if (res.status !== 201) {
        setError("Signup failed. Please try again.");
        setIsLoading(false);
        return;
      }
      setSuccess(true);

      // Optional: directly create a workspace
      if (makeWorkspace && wsName && wsSlug) {
        try {
          const { data } = await OrgApi.createOrg({
            name: wsName,
            slug: wsSlug,
          });
          onWorkspaceCreated?.(data);
        } catch (e: any) {
          console.error(e);
        }
      }

      setTimeout(() => closeModal(), 1500);
    } catch (e: any) {
      console.error("Signup error:", e?.response?.data || e?.message);
      setError(
        e?.response?.data?.message || "Signup failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: any) => e.key === "Enter" && handleSignUp();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--mk-ink)]/40 p-4">
      <Window title="account://new" className="flex max-h-[90vh] w-full max-w-md flex-col">
        <div className="flex items-center justify-between border-b border-[var(--mk-rule)] px-6 py-4">
          <h2 className="text-[22px] font-bold tracking-[-0.03em] text-[var(--mk-ink)]">Sign Up</h2>
          <button
            onClick={closeModal}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-[4px] border border-[var(--mk-ink)] bg-white text-[var(--mk-ink)] hover:bg-[var(--mk-indigo-soft)]"
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto">
        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-[4px] border border-[var(--mk-amber)] bg-[var(--mk-amber-soft)] p-3 text-[14px] tracking-tight text-[var(--mk-ink)]">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-[4px] border border-[var(--mk-green)] bg-[var(--mk-green-soft)] p-3 text-[14px] tracking-tight text-[var(--mk-ink)]">
              Account created! You can now log in.
            </div>
          )}

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={handleKeyPress}
              className={field}
              disabled={isLoading || success}
            />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={handleKeyPress}
              className={field}
              disabled={isLoading || success}
            />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              className={field}
              disabled={isLoading || success}
            />
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              className={field}
              disabled={isLoading || success}
            />
          </div>

          {/* Optional: create a workspace now */}
          <div className="mt-6 border-t border-[var(--mk-rule)] pt-4">
            <label className="flex items-center gap-2 text-[14px] font-medium tracking-tight text-[var(--mk-ink)]">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--mk-indigo)]"
                checked={makeWorkspace}
                onChange={(e) => setMakeWorkspace(e.target.checked)}
              />
              <span>Create a workspace now</span>
            </label>
            {makeWorkspace && (
              <div className="mt-3 space-y-3">
                <input
                  className={field}
                  placeholder="Workspace name (e.g. Acme Inc.)"
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                />
                <input
                  className={field}
                  placeholder="Workspace slug (e.g. acme)"
                  value={wsSlug}
                  onChange={(e) => setWsSlug(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
        </div>

        <div className="border-t border-[var(--mk-ink)] p-6">
          <button
            onClick={handleSignUp}
            disabled={isLoading || success}
            className={`${btn.primary} w-full py-3 text-[15px]`}
          >
            {isLoading
              ? "Creating Account..."
              : success
              ? "Account Created!"
              : "Sign Up"}
          </button>
        </div>
      </Window>
    </div>
  );
}
