import {
  FileText, PencilLine, FolderUp, ClipboardPenLine, ListChecks, CalendarCheck,
  ScanText, LoaderCircle, Sparkles, Bot, Target, GitBranch, UserCheck, UserCog,
  ShieldQuestion, History, Bell, Download, UsersRound, ChartNoAxesCombined,
  SlidersHorizontal, BookOpenCheck, SearchCheck, CheckCircle2, TriangleAlert,
  CircleAlert, UploadCloud, FileSearch, TableProperties, LayoutDashboard,
  Inbox, ScanFace, type LucideIcon,
} from "lucide-react";

export const IconMap = {
  dashboard: LayoutDashboard,
  profile: FileText, draft: PencilLine, evidence: FolderUp,
  metric: ClipboardPenLine, importEvent: ListChecks, eventRegistry: CalendarCheck,
  ocr: ScanText, pending: LoaderCircle, ai: Sparkles, chatbot: Bot,
  aim: Target, cascade: GitBranch, officer: UserCheck, assign: UserCog,
  resolution: ShieldQuestion, audit: History, notify: Bell, download: Download,
  collective: UsersRound, analytics: ChartNoAxesCombined, settings: SlidersHorizontal,
  kb: BookOpenCheck, similar: SearchCheck, ok: CheckCircle2, warn: TriangleAlert,
  alert: CircleAlert, upload: UploadCloud, fileSearch: FileSearch, roster: TableProperties,
  queue: Inbox, ekyc: ScanFace,
} satisfies Record<string, LucideIcon>;

export type IconKey = keyof typeof IconMap;

export function AppIcon({
  name, className = "", size = 16, tone = "default",
}: { name: IconKey; className?: string; size?: number; tone?: "default" | "active" | "muted" | "success" | "warn" | "error" }) {
  const Icon = IconMap[name];
  const tones = {
    default: "text-[#0057C2]",
    active: "text-white",
    muted: "text-slate-500",
    success: "text-emerald-600",
    warn: "text-amber-600",
    error: "text-rose-600",
  };
  return <Icon size={size} strokeWidth={1.8} className={`${tones[tone]} ${className}`} />;
}

export function IconTile({
  name, tone = "brand", size = 36,
}: { name: IconKey; tone?: "brand" | "muted" | "success" | "warn" | "error"; size?: number }) {
  const Icon = IconMap[name];
  const bg = {
    brand: "bg-[#EEF9FF] text-[#0057C2]",
    muted: "bg-slate-100 text-slate-600",
    success: "bg-emerald-50 text-emerald-600",
    warn: "bg-amber-50 text-amber-700",
    error: "bg-rose-50 text-rose-600",
  };
  return (
    <div className={`rounded-xl flex items-center justify-center ${bg[tone]}`} style={{ width: size, height: size }}>
      <Icon size={Math.round(size * 0.5)} strokeWidth={1.8} />
    </div>
  );
}
