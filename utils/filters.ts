import {
  Building2,
  MapPin,
  FileText,
  Code,
  Megaphone,
  Target,
  Calendar,
  Database,
  FolderOpen,
  Settings,
  Palette,
  Clock,
  TrendingUp,
  Heart,
  Eye,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";

export interface Category {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  description: string;
  count?: number;
  isCustom?: boolean;
}

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "all",
    name: "All Categories",
    icon: FolderOpen,
    color: "text-gray-700",
    bgColor: "bg-gray-100",
    description: "View all whiteboards across all categories",
  },
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

export const sortOptions = [
  { id: "recent", name: "Most Recent", icon: Clock },
  { id: "popular", name: "Most Popular", icon: TrendingUp },
  { id: "liked", name: "Most Liked", icon: Heart },
  { id: "viewed", name: "Most Viewed", icon: Eye },
  { id: "alphabetical", name: "A-Z", icon: SlidersHorizontal },
];

export const checkDateFilter = (
  createdAt: string | undefined,
  filter: string
): boolean => {
  if (!createdAt) return true;
  const date = new Date(createdAt);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  switch (filter) {
    case "today":
      return diffDays === 0;
    case "week":
      return diffDays <= 7;
    case "month":
      return diffDays <= 30;
    default:
      return true;
  }
};

export const checkContentType = (item: any, filter: string): boolean => {
  switch (filter) {
    case "images":
      return !!item.image;
    case "text":
      return !!item.text && !item.image;
    case "links":
      return !!item.weblink;
    default:
      return true;
  }
};
