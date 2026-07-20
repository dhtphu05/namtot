import type { Pagination, Role } from "@/lib/api/types";

export type AdminWorkspaceListFilters = {
  search?: string;
  isActive?: boolean;
  registrationEnabled?: boolean;
  page?: number;
  limit?: number;
};

export type AdminWorkspaceListItem = {
  id: string;
  code: string;
  name: string;
  shortName: string | null;
  isActive: boolean;
  registrationEnabled: boolean;
  userCount: number;
  applicationCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminWorkspaceListResponse = {
  items: AdminWorkspaceListItem[];
  pagination: Pagination;
};

export type CreateWorkspacePayload = {
  code: string;
  name: string;
  shortName?: string | null;
  isActive?: boolean;
  registrationEnabled?: boolean;
};

export type UpdateWorkspacePayload = {
  name?: string;
  shortName?: string | null;
};

export type UpdateWorkspaceStatusPayload = {
  isActive?: boolean;
  registrationEnabled?: boolean;
};

export type WorkspaceReadinessSummary = {
  readyForRegistration: boolean;
  checks: {
    workspaceActive: boolean;
    hasActiveCriteria: boolean;
    hasManager: boolean;
    hasOfficer: boolean;
    hasCommittee: boolean;
    registrationOpen: boolean;
  };
  warnings: string[];
  blockers: string[];
};

export type AdminWorkspaceUserListFilters = {
  search?: string;
  role?: Role | "all";
  isActive?: boolean | "all";
  page?: number;
  limit?: number;
};

export type AdminWorkspaceUserListItem = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  studentCode: string | null;
  faculty: string | null;
  className: string | null;
  isActive: boolean;
  createdAt: string;
};

export type AdminWorkspaceUserListResponse = {
  items: AdminWorkspaceUserListItem[];
  pagination: Pagination;
};

export type AdminWorkspaceDetail = AdminWorkspaceListItem & {
  totalUsers: number;
  usersByRole: Record<Role, number>;
  totalApplications: number;
  applicationsByStatus: Record<string, number>;
  activeCriteriaVersion: {
    id: string;
    schoolYear: string;
    unitScope: string;
    level: string;
    versionName: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  } | null;
  readiness: WorkspaceReadinessSummary;
};
