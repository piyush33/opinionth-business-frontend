// src/lib/api.ts
import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:3001",
});

const BASE = "http://localhost:3001";

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const t = localStorage.getItem("token");
    const org = localStorage.getItem("activeOrg");
    if (t) config.headers.Authorization = `Bearer ${t}`;
    if (org) {
      const { id } = JSON.parse(org);
      if (id) config.headers["X-Org-Id"] = id; // optional; handy for server
    }
  }
  return config;
});

export type OrgSummary = { id: number; slug: string; name: string };
export type Membership = { organization: OrgSummary; role: string };
export type JoinPolicy = "invite" | "domain";

export type CreateOrgPayload = {
  name: string;
  slug: string;
  joinPolicy?: JoinPolicy; // default 'invite'
  allowedDomains?: string[]; // only needed when joinPolicy = 'domain'
};

// These endpoints assume the org/invite APIs we designed earlier.
// Adjust paths if you named them differently.
export const OrgApi = {
  membershipsForUser: (username: string) =>
    api.get<Membership[]>(`/organizations/memberships/${username}`),
  resolveOrgBySlug: (slug: string) => api.get<OrgSummary>(`/orgs/slug/${slug}`),
  createOrg: (payload: CreateOrgPayload) =>
    api.post<OrgSummary>(`/orgs`, payload),
  discoverByEmail: (email: string) =>
    api.get<OrgSummary[]>(`/orgs/discover`, { params: { email } }),
  join: (orgId: number) => api.post(`/orgs/${orgId}/join`, {}),

  searchMembers: (orgId: number, q: string) =>
    api.get(`/orgs/${orgId}/members`, { params: { q } }),
};

export const InviteApi = {
  preview(token: string) {
    return axios.get(`${BASE}/invites/preview`, { params: { token } });
  },
  accept(token: string) {
    const acceptorId = getProfileUserId();
    return axios.post(
      `${BASE}/invites/accept`,
      { token },
      { params: { acceptorId } } // controller expects ?acceptorId
    );
  },

  // ORG
  createOrg(orgId: number, inviterId: number, email: string, hours = 168) {
    return axios.post(
      `${BASE}/orgs/${orgId}/invites`,
      { email, expiresInHours: hours },
      { params: { inviterId } }
    );
  },
  listOrg(orgId: number) {
    return axios.get(`${BASE}/orgs/${orgId}/invites`);
  },

  // LAYER
  createLayer(layerId: number, inviterId: number, email: string, hours = 168) {
    return axios.post(
      `${BASE}/layers/${layerId}/invites`,
      { email, expiresInHours: hours },
      { params: { inviterId } }
    );
  },
  listLayer(layerId: number) {
    return axios.get(`${BASE}/layers/${layerId}/invites`);
  },

  // Generic
  revoke(inviteId: number, requesterId: number) {
    return axios.post(`${BASE}/invites/${inviteId}/revoke`, null, {
      params: { requesterId },
    });
  },
  resend(inviteId: number, requesterId: number, hours = 168) {
    return axios.post(`${BASE}/invites/${inviteId}/resend`, null, {
      params: { requesterId, hours },
    });
  },
};

const getProfileUserId = () => {
  try {
    const raw = localStorage.getItem("profileUser");
    return raw ? JSON.parse(raw).id : null;
  } catch {
    return null;
  }
};
