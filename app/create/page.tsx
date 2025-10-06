"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LinkIcon,
  Type,
  ImageIcon,
  Lock,
  Plus,
  Bell,
  MessageCircle,
  User,
  ChevronDown,
  ArrowLeft,
  Search,
  X,
  Menu,
  Home,
  Compass,
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

type Category = {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string; // text color class
  bgColor: string; // bg color class
  description: string;
  isCustom?: boolean;
};

type Phase = {
  id: string;
  name: string;
  description: string;
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
  },
  {
    id: "seed-initial-discuss",
    name: "Seed / Initial Discuss",
    description: "Initial exploration and discussion",
  },
  {
    id: "discovery-brainstorm",
    name: "Discovery / Brainstorm",
    description: "Exploring possibilities and ideas",
  },
  {
    id: "hypothesis-options",
    name: "Hypothesis / Options",
    description: "Forming hypotheses and considering options",
  },
  {
    id: "specs-solutioning",
    name: "Specs / Solutioning",
    description: "Defining specifications and solutions",
  },
  {
    id: "decision",
    name: "Decision",
    description: "Making key decisions",
  },
  {
    id: "task-execution",
    name: "Task / Execution",
    description: "Executing tasks and implementation",
  },
  {
    id: "documentation-narrative",
    name: "Documentation / Narrative",
    description: "Documenting outcomes and narratives",
  },
  {
    id: "retro-learning",
    name: "Retro / Learning",
    description: "Reflecting and learning from outcomes",
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    window.scrollTo(0, 0);

    // Get user from localStorage
    const userData = localStorage.getItem("profileUser");
    if (userData) {
      setUser(JSON.parse(userData));
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
        const phaseMatch = PHASES.find((p) => p.id === card.phase);
        if (phaseMatch) {
          setSelectedPhase(phaseMatch);
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

  const createHomefeedData = async (parentId: number) => {
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
        lock: !!isLockSelected, // ask backend to lock the layer
        allowedMemberIds,
        privacy: selectedCard?.privacy || isPrivacySelected,
        category: selectedCategory?.id || selectedCategory?.name || null,
        phase: selectedPhase?.id || null,
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
    homefeedId?: number
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
        homefeedItemId: homefeedId ?? undefined, // <-- NEW
        phase: selectedPhase?.id || null,
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

    setIsCreating(true);
    try {
      const parentId =
        selectedCard?.layer.key || (await generateUniqueParent());

      // 1) create homefeed first — capture its id
      const homeRes = await createHomefeedData(parentId);
      const homefeedId = homeRes.data?.id; // ensure backend returns the id

      // 2) create linked profilefeed with homefeedItemId
      await createProfilefeedData(parentId, homefeedId);

      localStorage.removeItem("selectedCard");
      router.back();
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Navbar - Hidden on Mobile */}
      <nav className="hidden md:block fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <Link href="/explore" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">C</span>
                </div>
                <span className="font-bold text-xl text-gray-900">
                  Collabrr
                </span>
              </Link>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center space-x-1">
              {[
                { name: "Home", href: "/home", key: "home" },
                { name: "Explore", href: "/explore", key: "explore" },
                { name: "Create", href: "/create", key: "create" },
              ].map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-md mx-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search posts..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-full text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all duration-200"
                />
              </div>
            </div>

            {/* Action Icons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsNotificationsPopupOpen(true)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all duration-200 relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
                )}
              </button>

              <button
                onClick={() => setIsInboxPopupOpen(true)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all duration-200 relative"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></span>
              </button>

              <Link
                href="/profile"
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all duration-200"
              >
                <User className="w-5 h-5" />
              </Link>

              <button
                onClick={() => setIsSettingsPopupOpen(true)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all duration-200"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Header - Hidden on Desktop */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>

          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-blue-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">C</span>
            </div>
            <span className="font-bold text-lg text-gray-900">Create</span>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
          <div className="absolute top-0 right-0 w-64 h-full bg-white shadow-xl">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">Menu</span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <Link
                href="/home"
                className="flex items-center space-x-3 p-3 hover:bg-gray-100 rounded-lg"
              >
                <Home className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900">Home</span>
              </Link>
              <Link
                href="/explore"
                className="flex items-center space-x-3 p-3 hover:bg-gray-100 rounded-lg"
              >
                <Compass className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900">Explore</span>
              </Link>
              <Link
                href="/profile"
                className="flex items-center space-x-3 p-3 hover:bg-gray-100 rounded-lg"
              >
                <User className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900">Profile</span>
              </Link>
              <button
                onClick={() => {
                  setIsNotificationsPopupOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center space-x-3 p-3 hover:bg-gray-100 rounded-lg w-full text-left"
              >
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900">Notifications</span>
                {unreadCount > 0 && (
                  <span className="ml-auto w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
              <button
                onClick={() => {
                  setIsInboxPopupOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center space-x-3 p-3 hover:bg-gray-100 rounded-lg w-full text-left"
              >
                <MessageCircle className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900">Messages</span>
              </button>
              <Link
                href="/"
                className="flex items-center space-x-3 p-3 hover:bg-gray-100 rounded-lg"
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("user");
                  setIsMobileMenuOpen(false);
                }}
              >
                <User className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900">Logout</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Main Content - Hidden on Mobile */}
      <div className="hidden md:block bg-gray-800 text-white min-h-screen font-sans mt-16">
        {/* Title Section */}
        <div className="flex flex-col items-center mb-5 pt-5">
          <input
            type="text"
            placeholder="Add your event a title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-3/5 p-2.5 my-2.5 border-none rounded-md bg-transparent text-white text-4xl text-center font-bold pt-7 placeholder-white focus:outline-none focus:border-b-2 focus:border-white focus:bg-gray-600"
          />
          <input
            type="text"
            placeholder="And add an awesome description!"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-3/5 p-2.5 my-2.5 border-none rounded-md bg-transparent text-white text-base text-center placeholder-white focus:outline-none focus:border-b-2 focus:border-white focus:bg-gray-600"
          />
        </div>

        <div className="flex justify-center mb-5">
          <div className="w-3/5 space-y-3">
            {/* Category Selection */}
            <button
              onClick={() => !selectedCard && setIsCategoryModalOpen(true)}
              disabled={!!selectedCard}
              className={`w-full p-4 rounded-lg border-2 border-dashed transition-all duration-200 ${
                selectedCard
                  ? "border-gray-600 bg-gray-700 cursor-not-allowed opacity-60"
                  : selectedCategory
                  ? "border-purple-500 bg-gray-700"
                  : "border-gray-500 bg-gray-700 hover:border-purple-400 hover:bg-gray-600"
              }`}
            >
              <div className="flex items-center justify-center space-x-3">
                {selectedCategory ? (
                  <>
                    {(() => {
                      const Icon = selectedCategory.icon;
                      return <Icon className="w-5 h-5 text-white" />;
                    })()}
                    <span className="text-white font-medium">
                      {selectedCategory.name}
                    </span>
                    {selectedCard && (
                      <span className="text-xs text-gray-400">
                        (Auto-selected)
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <Tag className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-400">Select a category</span>
                  </>
                )}
              </div>
            </button>

            {/* Phase + Role/Type in one row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Phase (Required-on-submit) */}
              <button
                onClick={() => setIsPhaseModalOpen(true)}
                className={`w-full p-4 rounded-lg border-2 border-dashed transition-all duration-200 ${
                  selectedPhase
                    ? "border-blue-500 bg-gray-700"
                    : showPhaseError
                    ? "border-red-500 bg-gray-700"
                    : "border-gray-500 bg-gray-700 hover:border-blue-400 hover:bg-gray-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-white" />
                    <span className="text-white font-medium">
                      {selectedPhase ? selectedPhase.name : "Select Phase"}
                    </span>
                  </div>
                  {!selectedPhase && showPhaseError && (
                    <span className="text-xs text-red-400 font-semibold">
                      REQUIRED
                    </span>
                  )}
                </div>
              </button>

              {/* Role Type (Multi-select) */}
              <button
                onClick={() => setIsRoleTypeModalOpen(true)}
                className={`w-full p-4 rounded-lg border-2 border-dashed transition-all duration-200 ${
                  selectedRoleTypes.length > 0
                    ? "border-green-500 bg-gray-700"
                    : "border-gray-500 bg-gray-700 hover:border-green-400 hover:bg-gray-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Tag className="w-5 h-5 text-white" />
                    <span className="text-white font-medium">
                      {selectedRoleTypes.length > 0
                        ? `${selectedRoleTypes.length} Role Type${
                            selectedRoleTypes.length > 1 ? "s" : ""
                          } Selected`
                        : "Select Role Types"}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">OPTIONAL</span>
                </div>
                {selectedRoleTypes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedRoleTypes.map((rt) => (
                      <span
                        key={rt.id}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded-full"
                      >
                        {rt.name}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Input Section */}
        <div className="flex justify-center mb-5">
          <div className="flex items-center bg-gray-500 rounded-2xl p-5 w-3/5">
            <LinkIcon className="mx-2.5 cursor-pointer h-6 w-6" />
            <input
              type="text"
              placeholder="Paste any web address"
              value={webLink}
              onChange={(e) => setWebLink(e.target.value)}
              className="flex-1 p-2.5 border-none rounded-md bg-gray-500 text-white text-base placeholder-black focus:outline-none"
            />
            <button
              onClick={() => setIsTextModalOpen(true)}
              className="mx-2.5 cursor-pointer h-6 w-6"
            >
              <Type />
            </button>
            <label className="mx-2.5 cursor-pointer h-6 w-6">
              <ImageIcon />
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  e.target.files?.[0] && handleImageUpload(e.target.files[0])
                }
                className="hidden"
              />
            </label>
            <button
              onClick={() => {
                // if the card is in an existing locked layer, you could prefill initialSelected here
                setLockModalOpen(true);
              }}
              className={`mx-2.5 cursor-pointer h-6 w-6 ${
                isLockSelected ? "opacity-100" : "opacity-50"
              }`}
            >
              <Lock />
            </button>
          </div>
        </div>

        {/* Content Section */}
        {hasContent && (
          <div className="flex flex-col items-center w-full">
            <div className="bg-gray-800 rounded-md pt-5 pb-24 w-full flex justify-center items-center">
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
            </div>
          </div>
        )}
      </div>

      {/* Mobile Main Content - Hidden on Desktop */}
      <div className="md:hidden bg-gray-800 text-white min-h-screen font-sans pt-14">
        <div className="px-4 py-6 space-y-6">
          {/* Mobile Title Section */}
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Add your event a title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-4 border-none rounded-lg bg-gray-700 text-white text-xl font-bold placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <textarea
              placeholder="And add an awesome description!"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full p-4 border-none rounded-lg bg-gray-700 text-white text-base placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          <div className="space-y-3">
            {/* Category */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-3">
                Category
              </h3>
              <button
                onClick={() => !selectedCard && setIsCategoryModalOpen(true)}
                disabled={!!selectedCard}
                className={`w-full p-3 rounded-lg border-2 border-dashed transition-all duration-200 ${
                  selectedCard
                    ? "border-gray-600 bg-gray-800 cursor-not-allowed opacity-60"
                    : selectedCategory
                    ? "border-purple-500 bg-gray-600"
                    : "border-gray-500 bg-gray-600 hover:border-purple-400 hover:bg-gray-500"
                }`}
              >
                <div className="flex items-center justify-center space-x-3">
                  {selectedCategory ? (
                    <>
                      {(() => {
                        const Icon = selectedCategory.icon;
                        return <Icon className="w-5 h-5 text-white" />;
                      })()}

                      <span className="text-white font-medium">
                        {selectedCategory.name}
                      </span>
                      {selectedCard && (
                        <span className="text-xs text-gray-400">(Auto)</span>
                      )}
                    </>
                  ) : (
                    <>
                      <Tag className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-400 text-sm">
                        Select category
                      </span>
                    </>
                  )}
                </div>
              </button>
            </div>

            {/* Phase (Required) */}
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-300">Phase</h3>
                <span className="text-xs text-red-400 font-semibold">
                  REQUIRED
                </span>
              </div>
              <button
                onClick={() => setIsPhaseModalOpen(true)}
                className={`w-full p-3 rounded-lg border-2 border-dashed transition-all duration-200 ${
                  selectedPhase
                    ? "border-blue-500 bg-gray-600"
                    : "border-red-500 bg-gray-600 hover:border-red-400 hover:bg-gray-500"
                }`}
              >
                <div className="flex items-center justify-center space-x-3">
                  <Calendar className="w-4 h-4 text-white" />
                  <span className="text-white text-sm">
                    {selectedPhase ? selectedPhase.name : "Select Phase"}
                  </span>
                </div>
              </button>
            </div>

            {/* Role Types (Multi-select) */}
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-300">
                  Role Types
                </h3>
                <span className="text-xs text-gray-400">OPTIONAL</span>
              </div>
              <button
                onClick={() => setIsRoleTypeModalOpen(true)}
                className={`w-full p-3 rounded-lg border-2 border-dashed transition-all duration-200 ${
                  selectedRoleTypes.length > 0
                    ? "border-green-500 bg-gray-600"
                    : "border-gray-500 bg-gray-600 hover:border-green-400 hover:bg-gray-500"
                }`}
              >
                <div className="flex items-center justify-center space-x-3">
                  <Tag className="w-4 h-4 text-white" />
                  <span className="text-white text-sm">
                    {selectedRoleTypes.length > 0
                      ? `${selectedRoleTypes.length} Selected`
                      : "Select Role Types"}
                  </span>
                </div>
              </button>
              {selectedRoleTypes.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedRoleTypes.map((rt) => (
                    <span
                      key={rt.id}
                      className="px-2 py-1 bg-green-600 text-white text-xs rounded-full"
                    >
                      {rt.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mobile Link Input */}
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-4">
              <LinkIcon className="h-5 w-5 text-gray-300" />
              <input
                type="text"
                placeholder="Paste any web address"
                value={webLink}
                onChange={(e) => setWebLink(e.target.value)}
                className="flex-1 p-3 border-none rounded-lg bg-gray-600 text-white text-sm placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Mobile Action Buttons */}
            <div className="grid grid-cols-4 gap-3">
              <button
                onClick={() => setIsTextModalOpen(true)}
                className="flex flex-col items-center justify-center p-3 bg-gray-600 rounded-lg hover:bg-gray-500 transition-colors"
              >
                <Type className="h-5 w-5 text-white mb-1" />
                <span className="text-xs text-gray-300">Text</span>
              </button>

              <label className="flex flex-col items-center justify-center p-3 bg-gray-600 rounded-lg hover:bg-gray-500 transition-colors cursor-pointer">
                <ImageIcon className="h-5 w-5 text-white mb-1" />
                <span className="text-xs text-gray-300">Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    e.target.files?.[0] && handleImageUpload(e.target.files[0])
                  }
                  className="hidden"
                />
              </label>

              <button
                onClick={() => setLockModalOpen(true)}
                className={`flex flex-col items-center justify-center p-3 rounded-lg transition-all ${
                  isLockSelected
                    ? "bg-purple-600 text-white"
                    : "bg-gray-600 text-gray-300 hover:bg-gray-500"
                }`}
              >
                <Lock className="h-5 w-5 mb-1" />
                <span className="text-xs">Lock</span>
              </button>
            </div>
          </div>

          {/* Mobile Content Preview */}
          {hasContent && (
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-3">
                Preview
              </h3>
              <div className="max-w-full">
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
            </div>
          )}

          {/* Mobile Upload Status */}
          {isUploadingImage && (
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500"></div>
                <span className="text-sm text-gray-300">
                  Uploading image...
                </span>
              </div>
            </div>
          )}

          {/* Bottom spacing for floating button */}
          <div className="h-20"></div>
        </div>
      </div>

      {/* Text Modal - Responsive */}
      {isTextModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsTextModalOpen(false)}
          ></div>
          <div className="absolute inset-4 md:inset-8 lg:inset-16 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <Type className="w-5 h-5 text-purple-600" />
                <span>Add Text Content</span>
              </h3>
              <button
                onClick={() => setIsTextModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-4 md:p-6 text-black">
              <textarea
                value={modalText}
                onChange={(e) => setModalText(e.target.value)}
                placeholder="Share your thoughts, ideas, or story..."
                className="w-full h-full resize-none border-0 focus:outline-none text-base md:text-lg leading-relaxed  text-black placeholder-gray-400"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 md:p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {modalText.length} characters
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setIsTextModalOpen(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setIsTextModalOpen(false)}
                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsCategoryModalOpen(false)}
          ></div>
          <div className="absolute inset-4 md:inset-8 lg:inset-16 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[80vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <Tag className="w-5 h-5 text-purple-600" />
                <span>Select Category</span>
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto">
              <div className="space-y-4">
                {customCategories.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      Your Custom Categories
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {customCategories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => handleCategorySelect(category)}
                          className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all duration-200 ${
                            selectedCategory?.id === category.id
                              ? "border-purple-500 bg-purple-50"
                              : "border-gray-200 hover:border-purple-300 hover:bg-gray-50"
                          }`}
                        >
                          {(() => {
                            const Icon = category.icon;
                            return <Icon className="w-4 h-4 text-gray-700" />;
                          })()}
                          <span className="flex-1 text-left font-medium text-gray-900">
                            {category.name}
                          </span>
                          {selectedCategory?.id === category.id && (
                            <Check className="w-4 h-4 text-purple-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Default Categories */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Default Categories
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {DEFAULT_CATEGORIES.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => handleCategorySelect(category)}
                        className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all duration-200 ${
                          selectedCategory?.id === category.id
                            ? "border-purple-500 bg-purple-50"
                            : "border-gray-200 hover:border-purple-300 hover:bg-gray-50"
                        }`}
                      >
                        {(() => {
                          const Icon = category.icon;
                          return <Icon className="w-4 h-4 text-gray-700" />;
                        })()}

                        <span className="flex-1 text-left font-medium text-gray-900">
                          {category.name}
                        </span>
                        {selectedCategory?.id === category.id && (
                          <Check className="w-4 h-4 text-purple-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Category Creation */}
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Create Custom Category
                  </h4>
                  {!isCreatingCustomCategory ? (
                    <button
                      onClick={() => setIsCreatingCustomCategory(true)}
                      className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-400 hover:text-purple-600 transition-colors"
                    >
                      <Plus className="w-4 h-4 inline mr-2" />
                      Create new category
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Enter category name..."
                        value={customCategoryName}
                        onChange={(e) => setCustomCategoryName(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        autoFocus
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={handleCreateCustomCategory}
                          disabled={!customCategoryName.trim()}
                          className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Create
                        </button>
                        <button
                          onClick={() => {
                            setIsCreatingCustomCategory(false);
                            setCustomCategoryName("");
                          }}
                          className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPhaseModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsPhaseModalOpen(false)}
          ></div>
          <div className="absolute inset-4 md:inset-8 lg:inset-16 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[80vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-cyan-50">
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span>Select Phase</span>
              </h3>
              <button
                onClick={() => setIsPhaseModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto">
              <p className="text-sm text-gray-600 mb-4">
                Use this to cut the Explore feed into "where things are" in the
                work cycle. Single selection required.
              </p>
              <div className="space-y-2">
                {PHASES.map((phase, index) => (
                  <button
                    key={phase.id}
                    onClick={() => {
                      setShowPhaseError(false);
                      setSelectedPhase(phase);
                      setIsPhaseModalOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-200 ${
                      selectedPhase?.id === phase.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-semibold text-gray-500">
                        {index}.
                      </span>
                      <div className="text-left">
                        <div className="font-medium text-gray-900">
                          {phase.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {phase.description}
                        </div>
                      </div>
                    </div>
                    {selectedPhase?.id === phase.id && (
                      <Check className="w-5 h-5 text-blue-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {isRoleTypeModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsRoleTypeModalOpen(false)}
          ></div>
          <div className="absolute inset-4 md:inset-8 lg:inset-16 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[80vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <Tag className="w-5 h-5 text-green-600" />
                <span>Select Role Types</span>
              </h3>
              <button
                onClick={() => setIsRoleTypeModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto">
              <p className="text-sm text-gray-600 mb-4">
                Use this to express what a card contributes. Multiple selections
                allowed (optional).
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ROLE_TYPES.map((roleType) => (
                  <button
                    key={roleType.id}
                    onClick={() => handleRoleTypeToggle(roleType)}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all duration-200 ${
                      selectedRoleTypes.find((rt) => rt.id === roleType.id)
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-green-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="text-left flex-1">
                      <div className="font-medium text-gray-900 text-sm">
                        {roleType.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {roleType.description}
                      </div>
                    </div>
                    {selectedRoleTypes.find((rt) => rt.id === roleType.id) && (
                      <Check className="w-4 h-4 text-green-600 ml-2" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 md:p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {selectedRoleTypes.length} selected
                </div>
                <button
                  onClick={() => setIsRoleTypeModalOpen(false)}
                  className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Create Button - Responsive - Hide when text modal is open */}
      {!isTextModalOpen && (
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="fixed bottom-6 right-6 md:bottom-8 md:left-1/2 md:transform md:-translate-x-1/2 md:right-auto w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex justify-center items-center cursor-pointer z-50 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
        >
          {isCreating ? (
            <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-white"></div>
          ) : (
            <Plus className="w-6 h-6 md:w-8 md:h-8 text-white" />
          )}
        </button>
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
