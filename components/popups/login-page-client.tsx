// app/login-page-client.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import Link from "next/link";
import Image from "next/image";
import { DitherBand, LogoBitmap } from "@/components/marketing/Bitmap";
import axios from "axios";
import { api, OrgApi, InviteApi, Membership, OrgSummary } from "@/utils/api";
import SignUpModal from "@/components/signup-modal";
import DomainOrgModal from "@/components/modals/domainOrgModal";

// Keep your types
type CreateOrgPayload = {
  name: string;
  slug: string;
  joinPolicy: "invite" | "domain";
  allowedDomains?: string[];
};

export default function LoginPageClient({
  orgSlugParam,
  inviteToken,
}: {
  orgSlugParam: string | null;
  inviteToken: string | null;
}) {
  // ... keep your state as-is
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [domainModal, setDomainModal] = useState<{
    visible: boolean;
    orgs: OrgSummary[];
  }>({ visible: false, orgs: [] });

  const router = useRouter();

  const storeSession = (access_token: string, profileuser: any) => {
    localStorage.setItem("token", access_token);
    localStorage.setItem("profileUser", JSON.stringify(profileuser));
  };

  const routeToOrg = (org: OrgSummary) => {
    localStorage.setItem("activeOrg", JSON.stringify(org));
    router.push(`/explore`);
  };

  const handlePostAuthOrgRouting = async (user: {
    username: string;
    email?: string;
  }) => {
    // 1) Invite token flow
    if (inviteToken) {
      try {
        const { data: preview } = await InviteApi.preview(inviteToken);
        await InviteApi.accept(inviteToken);

        if (preview.scope === "org") {
          const org: OrgSummary = preview.organization;
          routeToOrg(org);
          return;
        } else if (preview.scope === "layer") {
          const org: OrgSummary = preview.organization;
          localStorage.setItem("activeOrg", JSON.stringify(org));
          localStorage.setItem("lastVisitedCardLayerid", preview.layer.id);
          router.push(`/explore`);
          return;
        }
      } catch (e) {
        console.error("Invite accept error", e);
        setError("Invite is invalid or expired.");
      }
    }

    // 2) Org slug in URL?
    if (orgSlugParam) {
      try {
        const { data: org } = await OrgApi.resolveOrgBySlug(orgSlugParam);
        const { data: memberships } = await OrgApi.membershipsForUser(
          user.username
        );
        const m = (memberships as Membership[]).find(
          (x) => x.organization.id === org.id
        );
        if (m) {
          routeToOrg(org);
          return;
        }
        setError(
          "You’re not a member of this workspace. Ask an admin for an invite."
        );
        return;
      } catch (e) {
        console.error(e);
        setError("Workspace not found.");
        return;
      }
    }

    // 3) No slug: memberships / discovery / create
    const { data: memberships } = await OrgApi.membershipsForUser(
      user.username
    );
    const list = memberships as Membership[];
    if (list.length === 1) return routeToOrg(list[0].organization);
    if (list.length > 1) return router.push(`/select-org`);

    if (user.email) {
      try {
        const { data: suggested } = await OrgApi.discoverByEmail(user.email);
        if (suggested.length) {
          setIsOrgModalOpen(false);
          setDomainModal({ visible: true, orgs: suggested });
          return;
        }
      } catch (e) {
        console.error("domain discovery failed", e);
      }
    }

    setIsOrgModalOpen(true);
  };

  const handleLogin = async () => {
    if (!usernameOrEmail || !password) {
      setError("Please fill in all fields");
      return;
    }
    setIsLoading(true);
    setError("");

    try {
      const res = await axios.post("/nest-api/auth/login", {
        usernameOrEmail,
        password,
      });
      const access_token = res.data.access_token;
      const user = res.data.user;
      const profileuser = res.data.profileUser;

      localStorage.setItem("authUser", JSON.stringify(user));
      storeSession(access_token, profileuser);
      await handlePostAuthOrgRouting(user);
    } catch (e: any) {
      console.error("Login error:", e?.response?.data || e?.message);
      setError("Invalid username/email or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLoginSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    setError("");
    try {
      const token = credentialResponse.credential;
      const res = await axios.post("/nest-api/auth/google", { token });
      const access_token = res.data.access_token;
      localStorage.setItem("token", access_token);
      const user = res.data.user;
      localStorage.setItem("authUser", JSON.stringify(user));
      const profileuser = res.data.profileUser;
      storeSession(access_token, profileuser);
      await handlePostAuthOrgRouting(user);
    } catch (e: any) {
      console.error("Google Login error:", e?.response?.data || e?.message);
      setError("Google login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: any) => e.key === "Enter" && handleLogin();

  const joinDomainOrg = async (org: OrgSummary) => {
    try {
      await OrgApi.join(org.id);
      routeToOrg(org);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to join workspace");
    }
  };

  return (
    <div className="mk grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel: the bitmap screen */}
      <aside className="mk-scan relative hidden flex-col justify-between overflow-hidden bg-[var(--mk-ink)] p-10 text-white lg:flex">
        <Link href="/" className="inline-flex items-center gap-2" aria-label="Collabrr home">
          <Image src="/brand/collabrr-logo.png" alt="" width={39} height={28} priority />
          <span className="text-[1.28rem] font-bold tracking-[-0.04em]">Collabrr</span>
        </Link>
        <div>
          <LogoBitmap className="mb-10 w-[240px]" />
          <p className="mk-bit text-[#8fe3f3]">&gt; session.start</p>
          <h1 className="mk-display mt-4 max-w-md text-[3rem]">
            Pick up where the argument stands
            <span className="mk-cursor" aria-hidden />
          </h1>
          <p className="mt-5 max-w-md text-[16px] leading-relaxed tracking-tight text-white/70">
            Your team&apos;s questions, claims, evidence and decisions, linked and waiting for you, whatever your time zone.
          </p>
        </div>
        <div className="-mx-10 -mb-10">
          <DitherBand color="var(--mk-cyan)" rows={6} className="opacity-60" flip />
        </div>
      </aside>

      {/* Sign-in */}
      <main className="mk-grid flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 lg:hidden" aria-label="Collabrr home">
          <Image src="/brand/collabrr-logo.png" alt="" width={39} height={28} priority />
          <span className="text-[1.28rem] font-bold tracking-[-0.04em] text-[var(--mk-ink)]">Collabrr</span>
        </Link>

        <div className="mk-hard w-full max-w-md overflow-hidden rounded-[6px] bg-white">
          <div className="flex items-center gap-2 border-b border-[var(--mk-ink)] px-3 py-1.5">
            <span className="flex gap-1" aria-hidden>
              <span className="h-2 w-2 bg-[var(--mk-ink)]" />
              <span className="h-2 w-2 bg-[var(--mk-ink)]/40" />
              <span className="h-2 w-2 bg-[var(--mk-ink)]/20" />
            </span>
            <span className="mk-pixel text-[10px] text-[var(--mk-ink)]">session://sign-in</span>
          </div>

          <div className="p-6 sm:p-7">
            <h2 className="mk-display text-[2rem]">Log in</h2>
            <p className="mt-1.5 text-[14.5px] tracking-tight text-[var(--mk-ink-2)]">Welcome back to your workspace.</p>

            {error && (
              <div role="alert" className="mt-5 border border-[var(--mk-amber)] bg-[var(--mk-amber-soft)] px-3 py-2.5 text-[14px] tracking-tight text-[var(--mk-amber)]">
                {error}
              </div>
            )}

            <div className="mt-6 grid gap-4">
              <div>
                <label htmlFor="login-user" className="mk-pixel mb-1.5 block text-[10px] text-[var(--mk-ink)]">
                  Username or email
                </label>
                <input
                  id="login-user"
                  type="text"
                  autoComplete="username"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full rounded-[4px] border border-[var(--mk-ink)] bg-white px-3 py-2.5 text-[15px] tracking-tight text-[var(--mk-ink)] placeholder:text-[#9a9db3] transition-shadow focus:outline-none focus:shadow-[3px_3px_0_var(--mk-indigo)]"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="login-password" className="mk-pixel mb-1.5 block text-[10px] text-[var(--mk-ink)]">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full rounded-[4px] border border-[var(--mk-ink)] bg-white px-3 py-2.5 text-[15px] tracking-tight text-[var(--mk-ink)] placeholder:text-[#9a9db3] transition-shadow focus:outline-none focus:shadow-[3px_3px_0_var(--mk-indigo)]"
                  disabled={isLoading}
                />
              </div>
              <button
                onClick={handleLogin}
                disabled={isLoading}
                className="mk-btn mt-1 w-full rounded-[4px] bg-[var(--mk-indigo)] py-3 text-[15px] font-semibold tracking-tight text-white disabled:opacity-60"
              >
                {isLoading ? "Logging in…" : "Log in"}
              </button>
            </div>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--mk-rule)]" />
              <span className="mk-pixel text-[10px] text-[var(--mk-ink-2)]">or</span>
              <div className="h-px flex-1 bg-[var(--mk-rule)]" />
            </div>

            <div className="google-login-button flex w-full justify-center">
              <GoogleLogin
                onSuccess={handleGoogleLoginSuccess}
                onError={() => setError("Google login failed. Please try again.")}
              />
            </div>

            <div className="mt-6 border-t border-dashed border-[var(--mk-ink)]/30 pt-6">
              <button
                onClick={() => setIsModalOpen(true)}
                disabled={isLoading}
                className="mk-btn w-full rounded-[4px] bg-white py-3 text-[15px] font-semibold tracking-tight text-[var(--mk-ink)] disabled:opacity-60"
              >
                Create a new account
              </button>
            </div>
          </div>
        </div>

        <p className="mt-6 text-[13.5px] tracking-tight text-[var(--mk-ink-2)]">
          New to Collabrr?{" "}
          <Link href="/#design-partners" className="font-semibold text-[var(--mk-ink)] underline underline-offset-4">
            Become a design partner
          </Link>
        </p>
      </main>

      {/* Sign up */}
      {isModalOpen && (
        <SignUpModal
          closeModal={() => setIsModalOpen(false)}
          onWorkspaceCreated={routeToOrg}
        />
      )}

      {/* “No workspaces yet” -> create workspace now */}
      {isOrgModalOpen && (
        <OrgCreateModal
          onClose={() => setIsOrgModalOpen(false)}
          onCreated={routeToOrg}
        />
      )}
      {domainModal.visible && (
        <DomainOrgModal
          orgs={domainModal.orgs}
          onJoin={joinDomainOrg}
          onCreateNew={() => {
            setDomainModal({ visible: false, orgs: [] });
            setIsOrgModalOpen(true);
          }}
          onClose={() => setDomainModal({ visible: false, orgs: [] })}
        />
      )}
    </div>
  );
}

/** Minimal "Create workspace" modal */
function OrgCreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (o: any) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [policy, setPolicy] = useState<"invite" | "domain">("invite");
  const [domainsText, setDomainsText] = useState(""); // used only for “advanced”
  const [autoDomain, setAutoDomain] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const extractDomain = (email?: string | null) => {
    if (!email) return null;
    const at = email.indexOf("@");
    if (at < 0) return null;
    return email
      .slice(at + 1)
      .trim()
      .toLowerCase();
  };

  useEffect(() => {
    // grab auth user from localStorage
    try {
      const raw = localStorage.getItem("authUser");
      const u = raw ? JSON.parse(raw) : null;
      const d = extractDomain(u?.email);
      if (d) setAutoDomain(d);
    } catch {}
  }, []);

  // If policy is 'domain' and we have an autoDomain, use it unless the user opens "advanced"
  useEffect(() => {
    if (policy === "domain" && autoDomain && !showAdvanced) {
      setDomainsText(autoDomain);
    }
  }, [policy, autoDomain, showAdvanced]);

  const create = async () => {
    if (!name || !slug) {
      setErr("Please provide name & slug");
      return;
    }

    const payload: {
      name: string;
      slug: string;
      joinPolicy?: "invite" | "domain";
      allowedDomains?: string[];
    } = {
      name,
      slug,
      joinPolicy: policy,
    };

    if (policy === "domain") {
      let allowed: string[] = [];
      if (showAdvanced) {
        allowed = domainsText
          .split(/[, \n\r\t]+/)
          .map((d) => d.trim().toLowerCase())
          .filter(Boolean);
      } else if (autoDomain) {
        allowed = [autoDomain]; // zero typing 🎉
      }
      if (!allowed.length) {
        setErr(
          "Could not determine an email domain. Add one or switch to Invite only."
        );
        return;
      }
      payload.allowedDomains = allowed;
    }

    setLoading(true);
    setErr("");
    try {
      const { data } = await OrgApi.createOrg(payload);
      onCreated(data);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to create workspace");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-black text-xl font-semibold mb-4">
          Create a workspace
        </h3>
        {err && (
          <div className="mb-3 p-2 bg-red-100 text-red-700 rounded">{err}</div>
        )}

        <input
          className="text-black w-full mb-3 px-3 py-2 border rounded"
          placeholder="Workspace name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="text-black w-full mb-3 px-3 py-2 border rounded"
          placeholder="Workspace slug (e.g. acme)"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />

        <div className="mb-3">
          <label className="text-black mr-3 font-medium">Join policy</label>
          <select
            className="text-black border rounded px-3 py-2"
            value={policy}
            onChange={(e) => setPolicy(e.target.value as any)}
          >
            <option value="invite">Invite only</option>
            <option value="domain">By company email domain</option>
          </select>
        </div>

        {policy === "domain" && (
          <>
            {autoDomain && !showAdvanced ? (
              <div className="mb-4 text-sm text-gray-700">
                We’ll allow anyone with <b>{autoDomain}</b> to join
                automatically.{" "}
                <button
                  className="underline"
                  onClick={() => setShowAdvanced(true)}
                >
                  Add more domains
                </button>
              </div>
            ) : (
              <textarea
                className="text-black w-full mb-4 px-3 py-2 border rounded"
                rows={3}
                placeholder={`Allowed domains (comma or newline separated)\ne.g. ${
                  autoDomain ?? "yourcompany.com"
                }, example.com`}
                value={domainsText}
                onChange={(e) => setDomainsText(e.target.value)}
              />
            )}
          </>
        )}

        <div className="flex gap-2">
          <button
            onClick={create}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded"
          >
            {loading ? "Creating..." : "Create"}
          </button>
          <button
            onClick={onClose}
            className="text-black px-4 py-2 border rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
