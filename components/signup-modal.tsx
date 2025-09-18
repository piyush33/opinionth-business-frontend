// components/signup-modal.tsx  (extend your existing component)
"use client";

import { useState } from "react";
import { X } from "lucide-react";
import axios from "axios";
import { OrgApi, OrgSummary } from "@/utils/api";

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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Sign Up</h2>
          <button
            onClick={closeModal}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              Account created! You can now log in.
            </div>
          )}

          <div className="space-y-4 text-gray-900">
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 border rounded-md text-gray-900"
              disabled={isLoading || success}
            />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 border rounded-md"
              disabled={isLoading || success}
            />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 border rounded-md"
              disabled={isLoading || success}
            />
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 border rounded-md"
              disabled={isLoading || success}
            />
          </div>

          {/* Optional: create a workspace now */}
          <div className="mt-6 border-t pt-4">
            <label className="flex items-center gap-2 text-gray-900">
              <input
                type="checkbox"
                checked={makeWorkspace}
                onChange={(e) => setMakeWorkspace(e.target.checked)}
              />
              <span>Create a workspace now</span>
            </label>
            {makeWorkspace && (
              <div className="mt-3 space-y-3">
                <input
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Workspace name (e.g. Acme Inc.)"
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                />
                <input
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Workspace slug (e.g. acme)"
                  value={wsSlug}
                  onChange={(e) => setWsSlug(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t">
          <button
            onClick={handleSignUp}
            disabled={isLoading || success}
            className="w-full py-3 bg-blue-600 text-white rounded-md"
          >
            {isLoading
              ? "Creating Account..."
              : success
              ? "Account Created!"
              : "Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
