// app/login-page-client.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
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
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4">
      {/* Brand */}
      <div className="text-center mb-8 lg:mb-16">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-purple-600 mb-4">
          Opinio^nth
        </h1>
        <p className="text-lg md:text-xl lg:text-2xl text-gray-900 max-w-2xl mx-auto leading-relaxed">
          helps you brainstorm
          <br />
          collaborate and share perspectives
          <br />
          on events and objects asynchronously
        </p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="space-y-3 text-gray-900">
            <input
              type="text"
              placeholder="Username or Email address"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400"
              disabled={isLoading}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400"
              disabled={isLoading}
            />
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full py-3 bg-purple-600 text-white text-lg font-medium rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? "Logging in..." : "Log in"}
            </button>
          </div>

          <div className="text-center mt-3">
            <a
              href="#"
              className="text-sm text-blue-600 hover:underline"
              onClick={(e) => e.preventDefault()}
            >
              Forgotten password?
            </a>
          </div>

          <div className="flex items-center my-5">
            <div className="flex-1 border-t border-gray-300" />
            <span className="px-3 text-gray-500 text-sm">or</span>
            <div className="flex-1 border-t border-gray-300" />
          </div>

          <div className="google-login-button w-full flex justify-center mb-5">
            <GoogleLogin
              onSuccess={handleGoogleLoginSuccess}
              onError={() => setError("Google login failed. Please try again.")}
            />
          </div>

          <div className="border-t border-gray-300 mb-5" />

          <button
            onClick={() => setIsModalOpen(true)}
            disabled={isLoading}
            className="w-full py-3 bg-green-600 text-white text-base font-medium rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            Create new account
          </button>
        </div>
      </div>

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
