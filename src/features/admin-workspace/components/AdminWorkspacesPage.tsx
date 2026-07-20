import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { WorkspaceCreateDialog } from "@/features/admin-workspace/components/WorkspaceCreateDialog";
import {
  WorkspaceRegistrationFilter,
  WorkspaceStatusFilter,
  WorkspaceToolbar,
} from "@/features/admin-workspace/components/WorkspaceToolbar";
import { WorkspaceSummaryCards } from "@/features/admin-workspace/components/WorkspaceSummaryCards";
import { WorkspaceTable } from "@/features/admin-workspace/components/WorkspaceTable";
import {
  useAdminWorkspaces,
  useAdminWorkspacesSummary,
} from "@/features/admin-workspace/hooks/useAdminWorkspaces";
import type { AdminWorkspaceListFilters } from "@/features/admin-workspace/types";

const pageSize = 10;

export function AdminWorkspacesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<WorkspaceStatusFilter>("all");
  const [registration, setRegistration] = useState<WorkspaceRegistrationFilter>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const filters = useMemo<AdminWorkspaceListFilters>(
    () => ({
      search: search || undefined,
      isActive: status === "all" ? undefined : status === "active",
      registrationEnabled: registration === "all" ? undefined : registration === "open",
      page,
      limit: pageSize,
    }),
    [page, registration, search, status],
  );

  const workspaces = useAdminWorkspaces(filters);
  const summary = useAdminWorkspacesSummary();
  const data = workspaces.data;

  return (
    <>
      <TopBar
        title="Quản lý trường triển khai"
        subtitle="Theo dõi và cấu hình các đơn vị đang sử dụng hệ thống Sinh viên 5 tốt."
        action={
          <Button type="button" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Thêm trường triển khai
          </Button>
        }
      />

      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#64748B]">
        Quản trị hệ thống / Trường triển khai
      </div>

      <div className="space-y-5">
        <WorkspaceSummaryCards summary={summary.data} isLoading={summary.isLoading} />

        <WorkspaceToolbar
          search={searchInput}
          status={status}
          registration={registration}
          onSearchChange={setSearchInput}
          onStatusChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          onRegistrationChange={(value) => {
            setRegistration(value);
            setPage(1);
          }}
        />

        <WorkspaceTable
          items={data?.items ?? []}
          pagination={data?.pagination}
          isLoading={workspaces.isLoading}
          isError={workspaces.isError}
          errorMessage={workspaces.error instanceof Error ? workspaces.error.message : undefined}
          onRetry={() => void workspaces.refetch()}
          onCreate={() => setDialogOpen(true)}
          onPageChange={setPage}
        />
      </div>

      <WorkspaceCreateDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
