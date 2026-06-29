import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  AUDIT_SEED, CURRENT_APPLICATION, EVIDENCE_SEED, EVENT_PARTICIPANTS, EVENT_REGISTRY,
  METRIC_SEED, NOTIFICATIONS_SEED, REVIEW_TASKS, type CriterionKey, type Evidence,
  type EvidenceSourceType, type IndexingStatus, type MetricInput, type ProfileLifecycle, type ReviewTask, type Role,
} from "./mock-data";

export interface Notification {
  id: string; title: string; desc: string; time: string;
  type: "info" | "success" | "warning" | "error"; read?: boolean;
}

export interface AuditEvent {
  id: string; time: string; actor: string; role: string;
  action: string; before: string; after: string; reason: string;
}

export interface ApplicationState {
  id: string;
  schoolYear: string;
  applicationType: "individual" | "collective";
  status: ProfileLifecycle;
  targetLevel: string;
  readinessScore: number;
  lastUpdatedAt: string;
  submittedAt: string | null;
  currentDraftVersion: number;
}

interface AppState {
  role: Role;
  setRole: (r: Role) => void;

  notifications: Notification[];
  pushNotification: (n: Omit<Notification, "id" | "time">) => void;
  markAllRead: () => void;

  audit: AuditEvent[];
  pushAudit: (e: Omit<AuditEvent, "id" | "time">) => void;

  application: ApplicationState;
  setProfileStatus: (s: ProfileLifecycle) => void;
  setTargetLevel: (lvl: string) => void;
  updateApplication: (p: Partial<ApplicationState>) => void;

  // back-compat
  profile: ApplicationState & { progress: number; lastSavedAt: string };

  evidence: Evidence[];
  addEvidence: (ev: Evidence) => void;
  advanceIndexing: (id: string, to: IndexingStatus) => void;

  metrics: MetricInput[];
  upsertMetric: (m: MetricInput) => void;

  events: typeof EVENT_REGISTRY;
  participants: typeof EVENT_PARTICIPANTS;
  indexEventRoster: (eventId: string) => void;

  tasks: ReviewTask[];
  decideTask: (id: string, status: ReviewTask["status"]) => void;
  assignTask: (id: string, officerId: string) => void;

  submittedIds: string[];
  submitProfile: (id: string) => void;

  // legacy (kept for back-compat with /app/wizard)
  wizardType: "ca-nhan" | "tap-the" | null;
  wizardLevel: string | null;
  setWizard: (p: { type?: "ca-nhan" | "tap-the"; level?: string }) => void;
  currentDraftId: string | null;
  setCurrentDraftId: (id: string | null) => void;
}

const nowStr = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const baseApp: ApplicationState = {
  id: CURRENT_APPLICATION.id,
  schoolYear: CURRENT_APPLICATION.schoolYear,
  applicationType: CURRENT_APPLICATION.applicationType,
  status: CURRENT_APPLICATION.status,
  targetLevel: CURRENT_APPLICATION.targetLevel,
  readinessScore: CURRENT_APPLICATION.readinessScore,
  lastUpdatedAt: CURRENT_APPLICATION.lastUpdatedAt,
  submittedAt: CURRENT_APPLICATION.submittedAt,
  currentDraftVersion: CURRENT_APPLICATION.currentDraftVersion,
};

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      role: "student",
      setRole: (role) => set({ role }),

      notifications: NOTIFICATIONS_SEED,
      pushNotification: (n) =>
        set((s) => ({ notifications: [{ id: `n-${Date.now()}`, time: "vừa xong", ...n }, ...s.notifications] })),
      markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

      audit: AUDIT_SEED,
      pushAudit: (e) => set((s) => ({ audit: [{ id: `a-${Date.now()}`, time: nowStr(), ...e }, ...s.audit] })),

      application: baseApp,
      get profile() {
        const a = get().application;
        return { ...a, progress: a.readinessScore, lastSavedAt: a.lastUpdatedAt };
      },
      setProfileStatus: (status) =>
        set((s) => ({ application: { ...s.application, status, lastUpdatedAt: nowStr() } })),
      setTargetLevel: (targetLevel) =>
        set((s) => ({ application: { ...s.application, targetLevel, lastUpdatedAt: nowStr() } })),
      updateApplication: (p) =>
        set((s) => ({ application: { ...s.application, ...p, lastUpdatedAt: nowStr() } })),

      evidence: EVIDENCE_SEED,
      addEvidence: (ev) => set((s) => ({ evidence: [ev, ...s.evidence] })),
      advanceIndexing: (id, to) =>
        set((s) => ({ evidence: s.evidence.map((e) => (e.id === id ? { ...e, indexingStatus: to } : e)) })),

      metrics: METRIC_SEED,
      upsertMetric: (m) =>
        set((s) => {
          const idx = s.metrics.findIndex((x) => x.id === m.id);
          const next = idx >= 0 ? s.metrics.map((x, i) => (i === idx ? m : x)) : [m, ...s.metrics];
          return { metrics: next };
        }),

      events: EVENT_REGISTRY,
      participants: EVENT_PARTICIPANTS,
      indexEventRoster: (eventId) =>
        set((s) => ({
          events: s.events.map((e) =>
            e.id === eventId ? { ...e, rosterIndexed: true, indexingStatus: "indexed", status: "indexed" } : e,
          ),
        })),

      tasks: REVIEW_TASKS,
      decideTask: (id, status) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)) })),
      assignTask: (id, officerId) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, assignedOfficerId: officerId } : t)) })),

      submittedIds: [],
      submitProfile: (id) => set((s) => ({ submittedIds: Array.from(new Set([...s.submittedIds, id])) })),

      wizardType: null,
      wizardLevel: null,
      setWizard: (p) => set((s) => ({ wizardType: p.type ?? s.wizardType, wizardLevel: p.level ?? s.wizardLevel })),
      currentDraftId: null,
      setCurrentDraftId: (id) => set({ currentDraftId: id }),
    }),
    { name: "5tot-app-v3" },
  ),
);
