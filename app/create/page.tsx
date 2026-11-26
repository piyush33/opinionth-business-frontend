"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LinkIcon,
  Type,
  ImageIcon,
  Lock,
  Plus,
  ChevronRight,
  ArrowLeft,
  X,
  Tag,
  Check,
  Building2,
  Target,
  MapPin,
  FileText,
  Code,
  Megaphone,
  Palette,
  Settings,
  Calendar,
  Database,
  type LucideIcon,
} from "lucide-react";
import axios from "axios";
import Card from "@/components/card";
import AppNav from "@/components/app/AppNav";
import { PixelLabel, Window, btn, field, tag } from "@/components/app/ui";
import InboxPopup from "@/components/popups/inbox-popup";
import SettingsPopup from "@/components/popups/settings-popup";
import NotificationsPopup from "@/components/popups/notifications-popup";
import {
  getSavedCustomCats,
  upsertSavedCustomCat,
  hydrateForUI,
  slugify,
} from "@/utils/customCategories";
import LayerLockModal from "@/components/modals/LayerLockModal";
import {
  ROADMAP_BUCKET_OPTIONS,
  backendToBucket,
  mapBucketToBackendPrimary,
  type RoadmapBucketId,
} from "@/utils/roadmapPhaseMap";

type Category = {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string; // text color class
  bgColor: string; // bg color class
  description: string;
  isCustom?: boolean;
};

type RoadmapBucket = "Backlog" | "Planned" | "In Progress" | "Completed";

type Phase = {
  id: string; // backend id (unchanged)
  name: string; // backend display name
  description: string;
  roadmapBucket?: RoadmapBucket; // UI-only bucket for roadmap views
};

type RoleType = {
  id: string;
  name: string;
  description: string;
};

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "company-os",
    name: "Company OS",
    icon: Building2,
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    description: "Company-wide processes and operations",
  },
  {
    id: "product",
    name: "Product",
    icon: Target,
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    description: "Product development and strategy",
  },
  {
    id: "engineering",
    name: "Engineering",
    icon: Code,
    color: "text-red-700",
    bgColor: "bg-red-100",
    description: "Technical discussions and architecture",
  },
  {
    id: "marketing",
    name: "Marketing",
    icon: Megaphone,
    color: "text-orange-700",
    bgColor: "bg-orange-100",
    description: "Marketing campaigns and strategies",
  },
  {
    id: "design",
    name: "Design",
    icon: Palette,
    color: "text-purple-700",
    bgColor: "bg-purple-100",
    description: "Design systems and creative work",
  },
  {
    id: "roadmap",
    name: "Roadmap",
    icon: MapPin,
    color: "text-indigo-700",
    bgColor: "bg-indigo-100",
    description: "Strategic planning and roadmaps",
  },
  {
    id: "docs",
    name: "Documentation",
    icon: FileText,
    color: "text-slate-700",
    bgColor: "bg-slate-100",
    description: "Technical and process documentation",
  },
  {
    id: "operations",
    name: "Operations",
    icon: Settings,
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
    description: "Business operations and workflows",
  },
  {
    id: "meetings",
    name: "Meetings",
    icon: Calendar,
    color: "text-cyan-700",
    bgColor: "bg-cyan-100",
    description: "Meeting notes and collaborative sessions",
  },
  {
    id: "data",
    name: "Data & Analytics",
    icon: Database,
    color: "text-pink-700",
    bgColor: "bg-pink-100",
    description: "Data analysis and reporting",
  },
];

const PHASES: Phase[] = [
  {
    id: "backlog",
    name: "Backlog/ Pending",
    description: "Items pending from earlier workflow",
    roadmapBucket: "Backlog",
  },

  {
    id: "seed-initial-discuss",
    name: "Seed / Initial Discuss",
    description: "Initial exploration and discussion",
    roadmapBucket: "Planned",
  },
  {
    id: "discovery-brainstorm",
    name: "Discovery / Brainstorm",
    description: "Exploring possibilities and ideas",
    roadmapBucket: "Planned",
  },
  {
    id: "hypothesis-options",
    name: "Hypothesis / Options",
    description: "Forming hypotheses and considering options",
    roadmapBucket: "Planned",
  },

  {
    id: "specs-solutioning",
    name: "Specs / Solutioning",
    description: "Defining specifications and solutions",
    roadmapBucket: "In Progress",
  },
  {
    id: "decision",
    name: "Decision",
    description: "Making key decisions",
    roadmapBucket: "In Progress",
  },
  {
    id: "task-execution",
    name: "Task / Execution",
    description: "Executing tasks and implementation",
    roadmapBucket: "In Progress",
  },
  {
    id: "documentation-narrative",
    name: "Documentation / Narrative",
    description: "Documenting outcomes and narratives",
    roadmapBucket: "In Progress",
  },

  {
    id: "retro-learning",
    name: "Retro / Learning",
    description: "Reflecting and learning from outcomes",
    roadmapBucket: "Completed",
  },
];

const ROLE_TYPES: RoleType[] = [
  { id: "feature", name: "Feature", description: "Proposing feature request" },
  { id: "bug", name: "Bug", description: "Notifying/Solving a bug" },
  {
    id: "question",
    name: "Question",
    description: "Asking questions",
  },
  {
    id: "claim",
    name: "Claim",
    description: "Making claims",
  },
  {
    id: "counter-claim",
    name: "Counter-claim",
    description: "Presenting counter-arguments",
  },
  {
    id: "evidence",
    name: "Evidence",
    description: "Providing evidence",
  },
  {
    id: "risk",
    name: "Risk",
    description: "Identifying risks",
  },
  {
    id: "mitigation",
    name: "Mitigation",
    description: "Proposing mitigations",
  },
  {
    id: "assumption",
    name: "Assumption",
    description: "Stating assumptions",
  },
  {
    id: "decision-rationale",
    name: "Decision Rationale",
    description: "Explaining decision reasoning",
  },
  {
    id: "customer-voice",
    name: "Customer Voice",
    description: "Sharing customer feedback",
  },
  {
    id: "design-artifact",
    name: "Design Artifact",
    description: "Presenting design work",
  },
  {
    id: "experiment",
    name: "Experiment",
    description: "Proposing or sharing experiments",
  },
  {
    id: "blocker",
    name: "Blocker",
    description: "Identifying blockers",
  },
  {
    id: "dependency",
    name: "Dependency",
    description: "Noting dependencies",
  },
  {
    id: "status-update",
    name: "Status Update",
    description: "Providing status updates",
  },
];

export default function CreatePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  // Opening card of a space suggested on Explore; after Create we go to it.
  const [startsSuggestedSpace, setStartsSuggestedSpace] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [webLink, setWebLink] = useState("");
  const [modalText, setModalText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkData, setLinkData] = useState<any>({});
  const [isLockSelected, setIsLockSelected] = useState(false);
  const [isPrivacySelected, setIsPrivacySelected] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [isCreatingCustomCategory, setIsCreatingCustomCategory] =
    useState(false);

  const [selectedPhase, setSelectedPhase] = useState<Phase | null>(null);
  const [isPhaseModalOpen, setIsPhaseModalOpen] = useState(false);

  const [selectedRoleTypes, setSelectedRoleTypes] = useState<RoleType[]>([]);
  const [isRoleTypeModalOpen, setIsRoleTypeModalOpen] = useState(false);

  // Modal and popup states
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [isInboxPopupOpen, setIsInboxPopupOpen] = useState(false);
  const [isSettingsPopupOpen, setIsSettingsPopupOpen] = useState(false);
  const [isNotificationsPopupOpen, setIsNotificationsPopupOpen] =
    useState(false);

  // Loading states
  const [isCreating, setIsCreating] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [allowedMemberIds, setAllowedMemberIds] = useState<number[]>([]);
  const [orgId, setOrgId] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPhaseError, setShowPhaseError] = useState(false);

  useEffect(() => {
    setOrgId(getActiveOrgId());
  }, []);

  type ActiveOrg = { id: number; name: string; slug: string } | null;

  // is the currently chosen category "roadmap"?
  const isRoadmap = (selectedCategory?.id ?? "").toLowerCase() === "roadmap";

  // UI list in the Phase modal: buckets for roadmap, full phases otherwise
  const UI_PHASES_FOR_MODAL: Array<{
    id: string;
    name: string;
    description?: string;
  }> = isRoadmap ? ROADMAP_BUCKET_OPTIONS : PHASES;

  // add this helper inside your component file
  const getActiveOrgId = (): number | null => {
    if (typeof window === "undefined") return null; // guard SSR
    const raw = window.localStorage.getItem("activeOrg");
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { id: number } | number;
      return typeof parsed === "number" ? parsed || null : parsed?.id ?? null;
    } catch {
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    }
  };

  async function refreshUnread() {
    const orgId = getActiveOrgId();
    if (!orgId || !user) return;
    try {
      const res = await fetch(
        `/nest-api/orgs/${orgId}/notifications/user/${user.username}/unread-count`
      );
      const { count } = await res.json();
      setUnreadCount(count || 0);
    } catch (e) {
      console.error("unread-count failed", e);
    }
  }

  // poll occasionally (optional) and on mount/user change
  useEffect(() => {
    if (!user) return;
    refreshUnread();
    const id = setInterval(refreshUnread, 30000);
    return () => clearInterval(id);
  }, [user]);

  useEffect(() => {
    setCustomCategories(hydrateForUI(getSavedCustomCats(), Tag));
  }, []);

  useEffect(() => {
    const selectedData = localStorage.getItem("selectedCategory");
    const category =
      DEFAULT_CATEGORIES.filter((c) => c.id === selectedData)[0] || null;

    setSelectedCategory(category);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);

    // Get user from localStorage
    const userData = localStorage.getItem("profileUser");
    if (userData) {
      setUser(JSON.parse(userData));
    }

    // Prefill from an AI card suggestion (event page "Draft this card").
    try {
      const draftRaw = localStorage.getItem("aiDraftCard");
      localStorage.removeItem("aiDraftCard");
      const draft = draftRaw ? JSON.parse(draftRaw) : null;
      if (draft && Date.now() - Number(draft.at) < 10 * 60 * 1000) {
        if (draft.title) setTitle(String(draft.title));
        if (draft.description) setDescription(String(draft.description));
        if (draft.text) setModalText(String(draft.text));

        // Explore "Start this space": the opening card of a new space, with
        // its category, phase and role types chosen by the suggestion.
        if (draft.newSpace) {
          setStartsSuggestedSpace(true);
          const catId = draft.category ? String(draft.category) : "";
          const isRoadmapDraft = catId.toLowerCase() === "roadmap";
          if (catId) {
            setSelectedCategory(
              DEFAULT_CATEGORIES.find((c) => c.id === catId) ?? {
                id: catId,
                name: String(draft.categoryName || catId),
                icon: Tag,
                color: "text-indigo-700",
                bgColor: "bg-indigo-100",
                description: "Custom category",
                isCustom: true,
              }
            );
          }
          if (draft.phase) {
            if (isRoadmapDraft) {
              const bucketId = backendToBucket(String(draft.phase));
              if (bucketId) {
                setSelectedPhase({
                  id: bucketId,
                  name:
                    ROADMAP_BUCKET_OPTIONS.find((b) => b.id === bucketId)
                      ?.name || "Backlog",
                  description: "",
                });
              }
            } else {
              const match = PHASES.find((p) => p.id === draft.phase);
              if (match) setSelectedPhase(match);
            }
          }
          if (Array.isArray(draft.roleTypes)) {
            setSelectedRoleTypes(
              ROLE_TYPES.filter((rt) => draft.roleTypes.includes(rt.id))
            );
          }
        }
      }
    } catch {
      /* ignore malformed draft */
    }

    // Get selected card if coming from event page
    const selectedCardData = localStorage.getItem("selectedCard");
    if (selectedCardData) {
      const card = JSON.parse(selectedCardData);
      setSelectedCard(card);
      setIsLockSelected(card.layer.isLocked || false);
      setIsPrivacySelected(card.privacy || false);
      if (card.category) {
        const match = DEFAULT_CATEGORIES.find(
          (c) => c.id === String(card.category)
        );
        if (match) {
          setSelectedCategory(match);
        } else {
          // fallback: treat it as a custom category
          setSelectedCategory({
            id: String(card.category),
            name: String(card.category),
            icon: Tag,
            color: "text-indigo-700",
            bgColor: "bg-indigo-100",
            description: "Custom category",
            isCustom: true,
          });
        }
      }
      // Pre-fill phase and roleTypes if coming from an existing card
      if (card.phase) {
        if ((card.category ?? "").toLowerCase() === "roadmap") {
          const bucketId = backendToBucket(card.phase);
          if (bucketId) {
            setSelectedPhase({
              id: bucketId, // store the BUCKET id in UI
              name:
                ROADMAP_BUCKET_OPTIONS.find((b) => b.id === bucketId)?.name ||
                "Backlog",
              description: "",
            });
          }
        } else {
          const match = PHASES.find((p) => p.id === card.phase);
          if (match) setSelectedPhase(match);
        }
      }

      if (card.roleTypes && Array.isArray(card.roleTypes)) {
        setSelectedRoleTypes(
          ROLE_TYPES.filter((rt) => card.roleTypes.includes(rt.id))
        );
      }
    }
  }, []);

  const fetchMetadata = async () => {
    try {
      const response = await axios.get(
        `https://dxh5nvxzgreic.cloudfront.net/metadata`,
        {
          params: { url: webLink },
        }
      );
      const metadata = response.data;
      setLinkData(metadata);
    } catch (error) {
      console.error("Error fetching metadata:", error);
      alert("Error fetching metadata: " + error);
    }
  };

  useEffect(() => {
    if (webLink) {
      fetchMetadata();
    }
  }, [webLink]);

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        `https://d3kv9nj5wp3sq6.cloudfront.net/uploads/feed-item`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setImageUrl(response.data.imageUrl);
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const createHomefeedData = async (
    parentId: number,
    phaseIdForBackend: string | null
  ) => {
    const token = localStorage.getItem("token");
    const orgId = getActiveOrgId();

    return axios.post(
      `https://dn2h1x2q2afc3.cloudfront.net/orgs/${orgId}/homefeed/user/${user.username}`,
      {
        title: title || linkData.title,
        description: description || linkData.description,
        image: imageUrl || linkData.image,
        text: modalText,
        layerKey: parentId,
        username: user.username,
        picture: user.image,
        weblink: webLink,
        visibility: isLockSelected ? "layer" : "org",
        lock: !!isLockSelected,
        allowedMemberIds,
        privacy: selectedCard?.privacy || isPrivacySelected,
        category: selectedCategory?.id || selectedCategory?.name || null,
        phase: phaseIdForBackend || null, // <-- use mapped id
        roleTypes: selectedRoleTypes.map((rt) => rt.id),
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
  };

  const createProfilefeedData = async (
    parentId: number,
    homefeedId?: number,
    phaseIdForBackend?: string | null
  ) => {
    const token = localStorage.getItem("token");
    const orgId = getActiveOrgId();

    return axios.post(
      `/nest-api/orgs/${orgId}/profilefeed/${user.username}/created`,
      {
        title: title || linkData.title,
        description: description || linkData.description,
        image: imageUrl || linkData.image,
        text: modalText,
        layerKey: parentId,
        username: user.username,
        picture: user.image,
        weblink: webLink,
        lock: selectedCard?.lock || isLockSelected,
        visibility: isLockSelected ? "layer" : "org",
        allowedMemberIds,
        privacy: selectedCard?.privacy || isPrivacySelected,
        category: selectedCategory?.id || selectedCategory?.name || null,
        homefeedItemId: homefeedId ?? undefined,
        phase: phaseIdForBackend || null, // <-- use mapped id
        roleTypes: selectedRoleTypes.map((rt) => rt.id),
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  };

  const handleCreate = async () => {
    if (!selectedPhase) {
      setShowPhaseError(true);
      alert("Please select a phase before creating.");
      return;
    }

    // Map UI selection → backend id
    const phaseIdForBackend = isRoadmap
      ? mapBucketToBackendPrimary(selectedPhase.id as RoadmapBucketId)
      : selectedPhase.id;

    setIsCreating(true);
    try {
      const parentId =
        selectedCard?.layer.key || (await generateUniqueParent());

      // 1) create homefeed — note the mapped phase id
      const homeRes = await createHomefeedData(parentId, phaseIdForBackend);
      const homefeedId = homeRes.data?.id;

      // 2) create linked profilefeed
      await createProfilefeedData(parentId, homefeedId, phaseIdForBackend);

      localStorage.removeItem("selectedCard");
      // Added to an existing collection: open the collection on the new
      // card (selected and scrolled to), not on the card we came from.
      if ((selectedCard || startsSuggestedSpace) && homefeedId) {
        router.replace(`/event/${homefeedId}`);
      } else {
        router.back();
      }
    } catch (error) {
      console.error("Error creating card:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const generateUniqueParent = async (): Promise<number> => {
    const token = localStorage.getItem("token");

    try {
      // Fetch all cards to get existing parent IDs
      const response = await fetch(
        `https://d3kv9nj5wp3sq6.cloudfront.net/homefeed`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const allCards = await response.json();

      // Extract all existing parent IDs
      const existingParents = new Set(allCards.map((card: any) => card.parent));

      // Generate a unique parent ID
      let parentId: number;
      do {
        parentId = Math.floor(Math.random() * 1000000);
      } while (existingParents.has(parentId));

      return parentId;
    } catch (error) {
      console.error("Error fetching cards for parent uniqueness check:", error);
      // Fallback: generate random number if fetch fails
      return Math.floor(Math.random() * 1000000);
    }
  };

  const isEmptyObject = (obj: any) => {
    return Object.keys(obj).length === 0;
  };

  const handleUserTagClick = (username: string) => {
    if (username === user?.username) {
      router.push("/profile");
    } else {
      localStorage.setItem("profileUsername", username);
      router.push("/profile/user");
    }
  };

  const handleCardTagClick = (cardId: number) => {
    const cardElement = document.getElementById(`card-${cardId}`);
  };

  const handleCategorySelect = (category: any) => {
    setSelectedCategory(category);
    setIsCategoryModalOpen(false);
    setIsCreatingCustomCategory(false);
    setCustomCategoryName("");
  };

  const handleCreateCustomCategory = () => {
    const raw = customCategoryName.trim();
    if (!raw) return;

    const id = slugify(raw);
    upsertSavedCustomCat(id, raw); // persist to cookie (and localStorage fallback)

    const hydrated = hydrateForUI([{ id, name: raw }], Tag)[0];
    setCustomCategories((prev) =>
      prev.some((c) => c.id === id) ? prev : [...prev, hydrated]
    );

    setSelectedCategory(hydrated);
    setIsCategoryModalOpen(false);
    setIsCreatingCustomCategory(false);
    setCustomCategoryName("");
  };

  const handleRoleTypeToggle = (roleType: RoleType) => {
    setSelectedRoleTypes((prev) => {
      const exists = prev.find((rt) => rt.id === roleType.id);
      if (exists) {
        return prev.filter((rt) => rt.id !== roleType.id);
      } else {
        return [...prev, roleType];
      }
    });
  };

  const hasContent =
    title || description || modalText || imageUrl || !isEmptyObject(linkData);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--mk-paper)]">
        <PixelLabel>LOADING</PixelLabel>
      </div>
    );
  }

  const isRoleSelected = (id: string) =>
    !!selectedRoleTypes.find((rt) => rt.id === id);

  const spaceName: string =
    (selectedCard?.title as string | undefined)?.trim() || "";

  return (
    <>
      <AppNav
        active="create"
        unreadCount={unreadCount}
        onNotifications={() => setIsNotificationsPopupOpen(true)}
        onInbox={() => setIsInboxPopupOpen(true)}
        onSettings={() => setIsSettingsPopupOpen(true)}
      />

      <main className="min-h-screen bg-[var(--mk-paper)] pt-16 text-[var(--mk-ink)]">
        {/* Header */}
        <div className="mk-grid border-b border-[var(--mk-rule)]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-4 py-8">
            <div>
              <PixelLabel>NEW CARD</PixelLabel>
              <h1 className="mk-display mt-2 text-[34px] md:text-[44px]">
                Create a card
              </h1>
              <p className="mt-1 text-[15px] tracking-tight text-[var(--mk-ink-2)]">
                {spaceName
                  ? `Adding to ${spaceName}`
                  : "Start a new space with its opening card."}
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className={`${btn.plain} px-3 py-2 text-[14px]`}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* Editor */}
          <Window title={spaceName ? `card://new · ${spaceName}` : "card://new"}>
            <div className="space-y-6 p-4 md:p-6">
              {/* Title + description */}
              <div className="space-y-3">
                <label className="block">
                  <span className={tag}>Title</span>
                  <input
                    type="text"
                    placeholder="Add your event a title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={`${field} mt-1.5 text-[20px] font-bold tracking-[-0.03em] md:text-[22px]`}
                  />
                </label>
                <label className="block">
                  <span className={tag}>Description</span>
                  <textarea
                    placeholder="And add an awesome description!"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className={`${field} mt-1.5 resize-none`}
                  />
                </label>
              </div>

              {/* Category */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className={tag}>Category</span>
                  {selectedCard && <span className={tag}>Auto-selected</span>}
                </div>
                <button
                  onClick={() => !selectedCard && setIsCategoryModalOpen(true)}
                  disabled={!!selectedCard}
                  className="flex w-full items-center gap-3 rounded-[4px] border border-[var(--mk-ink)] bg-white px-3 py-2.5 text-left text-[15px] tracking-tight transition-colors hover:bg-[var(--mk-indigo-soft)] disabled:cursor-not-allowed disabled:bg-[var(--mk-paper)] disabled:hover:bg-[var(--mk-paper)]"
                >
                  {selectedCategory ? (
                    <>
                      {(() => {
                        const Icon = selectedCategory.icon;
                        return (
                          <Icon className="h-4 w-4 text-[var(--mk-indigo)]" />
                        );
                      })()}
                      <span className="flex-1 font-semibold">
                        {selectedCategory.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <Tag className="h-4 w-4 text-[var(--mk-ink-2)]" />
                      <span className="flex-1 text-[#8a8ea0]">
                        Select a category
                      </span>
                    </>
                  )}
                  {!selectedCard && (
                    <ChevronRight className="h-4 w-4 text-[var(--mk-ink-2)]" />
                  )}
                </button>
              </div>

              {/* Phase + Role types */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className={tag}>Phase</span>
                    <span
                      className={`${tag} ${
                        !selectedPhase && showPhaseError
                          ? "!text-[var(--mk-amber)]"
                          : ""
                      }`}
                    >
                      Required
                    </span>
                  </div>
                  <button
                    onClick={() => setIsPhaseModalOpen(true)}
                    className={`flex w-full items-center gap-3 rounded-[4px] border bg-white px-3 py-2.5 text-left text-[15px] tracking-tight transition-colors hover:bg-[var(--mk-indigo-soft)] ${
                      !selectedPhase && showPhaseError
                        ? "border-[var(--mk-amber)] shadow-[3px_3px_0_var(--mk-amber)]"
                        : "border-[var(--mk-ink)]"
                    }`}
                  >
                    <Calendar className="h-4 w-4 text-[var(--mk-indigo)]" />
                    <span
                      className={`flex-1 ${
                        selectedPhase ? "font-semibold" : "text-[#8a8ea0]"
                      }`}
                    >
                      {selectedPhase ? selectedPhase.name : "Select Phase"}
                    </span>
                    <ChevronRight className="h-4 w-4 text-[var(--mk-ink-2)]" />
                  </button>
                  {!selectedPhase && showPhaseError && (
                    <p className="mt-1.5 text-[13px] font-semibold tracking-tight text-[var(--mk-amber)]">
                      Pick a phase before creating.
                    </p>
                  )}
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className={tag}>Role types</span>
                    <span className={tag}>Optional</span>
                  </div>
                  <button
                    onClick={() => setIsRoleTypeModalOpen(true)}
                    className="flex w-full items-center gap-3 rounded-[4px] border border-[var(--mk-ink)] bg-white px-3 py-2.5 text-left text-[15px] tracking-tight transition-colors hover:bg-[var(--mk-indigo-soft)]"
                  >
                    <Tag className="h-4 w-4 text-[var(--mk-indigo)]" />
                    <span
                      className={`flex-1 ${
                        selectedRoleTypes.length > 0
                          ? "font-semibold"
                          : "text-[#8a8ea0]"
                      }`}
                    >
                      {selectedRoleTypes.length > 0
                        ? `${selectedRoleTypes.length} Role Type${
                            selectedRoleTypes.length > 1 ? "s" : ""
                          } Selected`
                        : "Select Role Types"}
                    </span>
                    <ChevronRight className="h-4 w-4 text-[var(--mk-ink-2)]" />
                  </button>
                </div>
              </div>

              {selectedRoleTypes.length > 0 && (
                <div className="-mt-3 flex flex-wrap gap-1.5">
                  {selectedRoleTypes.map((rt) => (
                    <span
                      key={rt.id}
                      className="rounded-[3px] border border-[var(--mk-ink)] bg-[var(--mk-green-soft)] px-2 py-0.5 text-[12px] font-semibold tracking-tight text-[var(--mk-green)]"
                    >
                      {rt.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Attachments */}
              <div className="border-t border-[var(--mk-rule)] pt-5">
                <span className={tag}>Attachments</span>
                <label className="relative mt-1.5 block">
                  <span className="sr-only">Web address</span>
                  <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--mk-ink-2)]" />
                  <input
                    type="text"
                    placeholder="Paste any web address"
                    value={webLink}
                    onChange={(e) => setWebLink(e.target.value)}
                    className={`${field} pl-9`}
                  />
                </label>

                {!isEmptyObject(linkData) &&
                  (linkData.title || linkData.description) && (
                    <div className="mt-2 flex items-start gap-3 rounded-[4px] border border-[var(--mk-rule)] bg-[var(--mk-paper)] px-3 py-2">
                      {linkData.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={linkData.image}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-[3px] border border-[var(--mk-ink)] object-cover"
                        />
                      )}
                      <div className="min-w-0">
                        {linkData.title && (
                          <p className="truncate text-[14px] font-semibold tracking-tight">
                            {linkData.title}
                          </p>
                        )}
                        {linkData.description && (
                          <p className="line-clamp-2 text-[13px] tracking-tight text-[var(--mk-ink-2)]">
                            {linkData.description}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => setIsTextModalOpen(true)}
                    className={`${
                      modalText ? btn.quiet : btn.plain
                    } px-3 py-2 text-[14px]`}
                  >
                    <Type className="h-4 w-4" />
                    {modalText ? "Edit text" : "Text"}
                  </button>
                  <label
                    className={`${
                      imageUrl ? btn.quiet : btn.plain
                    } cursor-pointer px-3 py-2 text-[14px]`}
                  >
                    <ImageIcon className="h-4 w-4" />
                    {isUploadingImage
                      ? "Uploading image..."
                      : imageUrl
                      ? "Replace image"
                      : "Image"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        e.target.files?.[0] &&
                        handleImageUpload(e.target.files[0])
                      }
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={() => {
                      // if the card is in an existing locked layer, you could prefill initialSelected here
                      setLockModalOpen(true);
                    }}
                    aria-pressed={isLockSelected}
                    className={`${btn.base} px-3 py-2 text-[14px] ${
                      isLockSelected
                        ? "bg-[var(--mk-ink)] text-white"
                        : "bg-white text-[var(--mk-ink)]"
                    }`}
                  >
                    <Lock className="h-4 w-4" />
                    {isLockSelected ? "Locked" : "Lock"}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--mk-ink)] bg-[var(--mk-paper)] px-4 py-3 md:px-6">
              <span className={tag}>
                {isPrivacySelected || selectedCard?.privacy
                  ? "Private"
                  : isLockSelected
                  ? "Visible to layer"
                  : "Visible to org"}
              </span>
              <button
                onClick={handleCreate}
                disabled={isCreating}
                className={`${btn.primary} px-5 py-2.5 text-[15px]`}
              >
                <Plus className="h-4 w-4" />
                {isCreating ? "Creating..." : "Create"}
              </button>
            </div>
          </Window>

          {/* Preview */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <PixelLabel color="var(--mk-cyan-deep)">PREVIEW</PixelLabel>
            <div className="mt-3">
              {hasContent ? (
                <div className="max-w-sm">
                  <Card
                    user={user.username}
                    title={title || linkData.title || ""}
                    description={description || linkData.description || ""}
                    text={modalText}
                    image={imageUrl || linkData.image}
                    picture={user.image}
                    onClick={() => {}}
                    onCardTagClick={handleCardTagClick}
                    onUserTagClick={handleUserTagClick}
                  />
                </div>
              ) : (
                <div className="grid min-h-[200px] max-w-sm place-items-center rounded-[6px] border border-dashed border-[var(--mk-ink-2)] bg-white/60 p-6 text-center text-[14px] tracking-tight text-[var(--mk-ink-2)]">
                  Your card appears here as you add a title, text, image or link.
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* Text Modal */}
      {isTextModalOpen && (
        <ModalShell
          title="card://new · text"
          onClose={() => setIsTextModalOpen(false)}
          className="h-[85vh] max-w-3xl"
          footer={
            <>
              <span className={tag}>{modalText.length} characters</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsTextModalOpen(false)}
                  className={`${btn.plain} px-4 py-2 text-[14px]`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => setIsTextModalOpen(false)}
                  className={`${btn.primary} px-5 py-2 text-[14px]`}
                >
                  Save
                </button>
              </div>
            </>
          }
        >
          <div className="flex h-full flex-col p-4 md:p-6">
            <PixelLabel>ADD TEXT</PixelLabel>
            <textarea
              value={modalText}
              onChange={(e) => setModalText(e.target.value)}
              placeholder="Share your thoughts, ideas, or story..."
              className="mt-3 w-full flex-1 resize-none border-0 bg-transparent text-[16px] leading-relaxed tracking-tight text-[var(--mk-ink)] placeholder:text-[#8a8ea0] focus:outline-none md:text-[17px]"
            />
          </div>
        </ModalShell>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <ModalShell
          title="select://category"
          onClose={() => setIsCategoryModalOpen(false)}
        >
          <div className="space-y-6 p-4 md:p-6">
            {customCategories.length > 0 && (
              <div>
                <p className={`${tag} mb-2`}>Your Custom Categories</p>
                <div className="overflow-hidden rounded-[4px] border border-[var(--mk-ink)]">
                  {customCategories.map((category) => {
                    const selected = selectedCategory?.id === category.id;
                    const Icon = category.icon;
                    return (
                      <button
                        key={category.id}
                        onClick={() => handleCategorySelect(category)}
                        aria-pressed={selected}
                        className={optionRow(selected)}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 font-semibold">
                          {category.name}
                        </span>
                        {selected && <Check className="h-4 w-4" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <p className={`${tag} mb-2`}>Default Categories</p>
              <div className="overflow-hidden rounded-[4px] border border-[var(--mk-ink)]">
                {DEFAULT_CATEGORIES.map((category) => {
                  const selected = selectedCategory?.id === category.id;
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => handleCategorySelect(category)}
                      aria-pressed={selected}
                      className={optionRow(selected)}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">
                          {category.name}
                        </span>
                        <span
                          className={`block text-[13px] ${
                            selected
                              ? "text-white/75"
                              : "text-[var(--mk-ink-2)]"
                          }`}
                        >
                          {category.description}
                        </span>
                      </span>
                      {selected && <Check className="h-4 w-4" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-[var(--mk-rule)] pt-5">
              <p className={`${tag} mb-2`}>Create Custom Category</p>
              {!isCreatingCustomCategory ? (
                <button
                  onClick={() => setIsCreatingCustomCategory(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-[4px] border border-dashed border-[var(--mk-ink)] bg-white px-3 py-3 text-[14px] font-semibold tracking-tight transition-colors hover:bg-[var(--mk-indigo-soft)]"
                >
                  <Plus className="h-4 w-4" />
                  Create new category
                </button>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Enter category name..."
                    value={customCategoryName}
                    onChange={(e) => setCustomCategoryName(e.target.value)}
                    className={field}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateCustomCategory}
                      disabled={!customCategoryName.trim()}
                      className={`${btn.primary} flex-1 px-4 py-2 text-[14px] disabled:cursor-not-allowed`}
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setIsCreatingCustomCategory(false);
                        setCustomCategoryName("");
                      }}
                      className={`${btn.plain} px-4 py-2 text-[14px]`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ModalShell>
      )}

      {/* Phase Modal */}
      {isPhaseModalOpen && (
        <ModalShell
          title={isRoadmap ? "select://roadmap-bucket" : "select://phase"}
          onClose={() => setIsPhaseModalOpen(false)}
        >
          <div className="p-4 md:p-6">
            <p className="mb-4 text-[14px] tracking-tight text-[var(--mk-ink-2)]">
              Use this to cut the Explore feed into "where things are" in the
              work cycle. Single selection required.
            </p>

            <div className="overflow-hidden rounded-[4px] border border-[var(--mk-ink)]">
              {UI_PHASES_FOR_MODAL.map((opt, index) => {
                const selected = selectedPhase?.id === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      if (isRoadmap) {
                        // opt is a bucket option
                        setSelectedPhase({
                          id: opt.id, // "backlog" | "planned" | "in-progress" | "completed"
                          name: opt.name, // "Backlog" | "Planned" | ...
                          description: "",
                        });
                      } else {
                        // opt is a full backend phase
                        setSelectedPhase(opt as Phase);
                      }
                      setShowPhaseError(false);
                      setIsPhaseModalOpen(false);
                    }}
                    aria-pressed={selected}
                    className={optionRow(selected)}
                  >
                    <span
                      className={`w-6 shrink-0 text-[13px] font-semibold tabular-nums ${
                        selected ? "text-white/75" : "text-[var(--mk-ink-2)]"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{opt.name}</span>
                        {!isRoadmap && (
                          <span
                            className={`rounded-[3px] border px-1.5 py-px text-[10.5px] font-semibold uppercase tracking-[0.09em] ${
                              selected
                                ? "border-white/50 text-white/80"
                                : "border-[var(--mk-rule)] text-[var(--mk-ink-2)]"
                            }`}
                          >
                            {PHASES.find((p) => p.id === opt.id)?.name || ""}
                          </span>
                        )}
                      </span>
                      {!isRoadmap && opt.description && (
                        <span
                          className={`block text-[13px] ${
                            selected
                              ? "text-white/75"
                              : "text-[var(--mk-ink-2)]"
                          }`}
                        >
                          {opt.description}
                        </span>
                      )}
                    </span>
                    {selected && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </ModalShell>
      )}

      {/* Role Type Modal */}
      {isRoleTypeModalOpen && (
        <ModalShell
          title="select://role-types"
          onClose={() => setIsRoleTypeModalOpen(false)}
          footer={
            <>
              <span className={tag}>{selectedRoleTypes.length} selected</span>
              <button
                onClick={() => setIsRoleTypeModalOpen(false)}
                className={`${btn.primary} px-5 py-2 text-[14px]`}
              >
                Done
              </button>
            </>
          }
        >
          <div className="p-4 md:p-6">
            <p className="mb-4 text-[14px] tracking-tight text-[var(--mk-ink-2)]">
              Use this to express what a card contributes. Multiple selections
              allowed (optional).
            </p>
            <div className="grid overflow-hidden rounded-[4px] border border-[var(--mk-ink)] md:grid-cols-2">
              {ROLE_TYPES.map((roleType) => {
                const selected = isRoleSelected(roleType.id);
                return (
                  <button
                    key={roleType.id}
                    onClick={() => handleRoleTypeToggle(roleType)}
                    aria-pressed={selected}
                    className={`${optionRow(selected)} md:odd:border-r md:odd:border-r-[var(--mk-rule)]`}
                  >
                    <span
                      aria-hidden
                      className={`grid h-4 w-4 shrink-0 place-items-center rounded-[2px] border ${
                        selected
                          ? "border-white bg-white text-[var(--mk-ink)]"
                          : "border-[var(--mk-ink)] bg-white"
                      }`}
                    >
                      {selected && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold">
                        {roleType.name}
                      </span>
                      <span
                        className={`block text-[12.5px] ${
                          selected ? "text-white/75" : "text-[var(--mk-ink-2)]"
                        }`}
                      >
                        {roleType.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </ModalShell>
      )}

      {/* Popups */}
      <InboxPopup
        isOpen={isInboxPopupOpen}
        onClose={() => setIsInboxPopupOpen(false)}
      />
      <SettingsPopup
        isOpen={isSettingsPopupOpen}
        onClose={() => setIsSettingsPopupOpen(false)}
      />
      <NotificationsPopup
        isOpen={isNotificationsPopupOpen}
        onClose={() => setIsNotificationsPopupOpen(false)}
        onAllRead={() => setUnreadCount(0)}
      />

      {lockModalOpen && orgId && (
        <LayerLockModal
          orgId={orgId}
          currentUserId={user.id}
          initialSelected={allowedMemberIds}
          onClose={() => setLockModalOpen(false)}
          onSave={(ids) => {
            setAllowedMemberIds(ids);
            setIsLockSelected(true); // mark locked
            setLockModalOpen(false);
          }}
        />
      )}
    </>
  );
}

/** Option row used by the category, phase and role pickers. */
function optionRow(selected: boolean) {
  return `flex w-full items-center gap-3 border-b border-[var(--mk-rule)] px-4 py-3 text-left text-[15px] tracking-tight transition-colors last:border-b-0 ${
    selected
      ? "bg-[var(--mk-ink)] text-white"
      : "bg-white text-[var(--mk-ink)] hover:bg-[var(--mk-indigo-soft)]"
  }`;
}

/** Modal frame: ink overlay, window panel with title bar and close button. */
function ModalShell({
  title,
  onClose,
  children,
  footer,
  className = "max-h-[85vh] max-w-2xl",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
      <div
        className="absolute inset-0 bg-[var(--mk-ink)]/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`mk-hard relative flex w-full flex-col overflow-hidden rounded-[6px] bg-white ${className}`}
      >
        <div className="flex items-center gap-2 border-b border-[var(--mk-ink)] py-1.5 pl-3 pr-1.5">
          <span className="flex gap-1" aria-hidden>
            <span className="h-2 w-2 bg-[var(--mk-ink)]" />
            <span className="h-2 w-2 bg-[#868896]" />
            <span className="h-2 w-2 bg-[#c2c4cc]" />
          </span>
          <span className="flex-1 truncate text-[10.5px] font-semibold uppercase tracking-[0.09em] text-[var(--mk-ink)]">
            {title}
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-[4px] border border-[var(--mk-ink)] bg-white text-[var(--mk-ink)] hover:bg-[var(--mk-indigo-soft)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex items-center justify-between gap-3 border-t border-[var(--mk-ink)] bg-[var(--mk-paper)] px-4 py-3 md:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
