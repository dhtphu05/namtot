import { FormEvent, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  MoreHorizontal,
  Pencil,
  Power,
  RefreshCw,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  mapWorkspaceError,
  useAdminWorkspaceDetail,
  useAdminWorkspaceUsers,
  useAdminWorkspaces,
  useUpdateWorkspace,
  useUpdateWorkspaceStatus,
} from "@/features/admin-workspace/hooks/useAdminWorkspaces";
import type {
  AdminWorkspaceDetail,
  AdminWorkspaceUserListFilters,
} from "@/features/admin-workspace/types";
import type { Role } from "@/lib/api/types";

type AdminWorkspaceDetailPageProps = {
  workspaceId: string;
};

type StatusAction = "open-registration" | "close-registration" | "disable" | "reactivate";

const roleLabels: Record<Role, string> = {
  student: "Sinh viên",
  class_representative: "Đại diện lớp",
  data_uploader: "Cán bộ nhập liệu",
  officer: "Cán bộ xét duyệt",
  manager: "Quản lý trường",
  committee: "Hội đồng trường",
  city_officer: "Cán bộ xét duyệt thành phố",
  city_manager: "Quản lý thành phố",
  city_committee: "Hội đồng thành phố",
  admin: "Quản trị viên",
};

const roleOptions: Array<{ value: Role | "all"; label: string }> = [
  { value: "all", label: "Tất cả vai trò" },
  { value: "student", label: roleLabels.student },
  { value: "class_representative", label: roleLabels.class_representative },
  { value: "data_uploader", label: roleLabels.data_uploader },
  { value: "officer", label: roleLabels.officer },
  { value: "manager", label: roleLabels.manager },
  { value: "committee", label: roleLabels.committee },
  { value: "city_officer", label: roleLabels.city_officer },
  { value: "city_manager", label: roleLabels.city_manager },
  { value: "city_committee", label: roleLabels.city_committee },
  { value: "admin", label: roleLabels.admin },
];

export function AdminWorkspaceDetailPage({ workspaceId }: AdminWorkspaceDetailPageProps) {
  const detail = useAdminWorkspaceDetail(workspaceId);
  const workspace = detail.data;
  const [editOpen, setEditOpen] = useState(false);
  const [statusAction, setStatusAction] = useState<StatusAction | null>(null);

  return (
    <>
      <TopBar
        title={workspace?.name ?? "Chi tiết trường triển khai"}
        subtitle="Quản trị thông tin, trạng thái đăng ký và người dùng thuộc trường."
        action={
          <Button asChild variant="outline">
            <Link to="/app/admin/workspaces">
              <ArrowLeft className="h-4 w-4" />
              Quay lại danh sách
            </Link>
          </Button>
        }
      />

      {detail.isLoading ? (
        <DetailSkeleton />
      ) : detail.isError ? (
        <LoadError error={detail.error} onRetry={() => void detail.refetch()} />
      ) : workspace ? (
        <div className="space-y-6">
          <Header
            workspace={workspace}
            onEdit={() => setEditOpen(true)}
            onStatusAction={setStatusAction}
          />

          <Tabs defaultValue="overview" className="space-y-5">
            <TabsList className="h-10 w-full justify-start rounded-md bg-[#F1F5F9] sm:w-auto">
              <TabsTrigger value="overview">Tổng quan</TabsTrigger>
              <TabsTrigger value="users">Người dùng</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-5">
              <OverviewTab workspace={workspace} />
            </TabsContent>
            <TabsContent value="users">
              <UsersTab workspaceId={workspaceId} />
            </TabsContent>
          </Tabs>

          <EditWorkspaceDialog workspace={workspace} open={editOpen} onOpenChange={setEditOpen} />
          <WorkspaceStatusDialog
            workspace={workspace}
            action={statusAction}
            onOpenChange={(open) => {
              if (!open) setStatusAction(null);
            }}
          />
        </div>
      ) : null}
    </>
  );
}

function Header({
  workspace,
  onEdit,
  onStatusAction,
}: {
  workspace: AdminWorkspaceDetail;
  onEdit: () => void;
  onStatusAction: (action: StatusAction) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="text-sm text-[#64748B]">
        Quản trị hệ thống / Trường triển khai /{" "}
        <span className="font-medium text-[#0F172A]">{workspace.name}</span>
      </div>
      <Card className="rounded-md border border-[#E3ECF6] p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold leading-tight text-[#0F172A]">{workspace.name}</h1>
              <Badge variant="outline">{workspace.code}</Badge>
            </div>
            {workspace.shortName ? (
              <p className="mt-1 text-sm text-[#64748B]">{workspace.shortName}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <WorkspaceStateBadges workspace={workspace} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
              Chỉnh sửa thông tin
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                onStatusAction(
                  workspace.registrationEnabled ? "close-registration" : "open-registration",
                )
              }
            >
              {workspace.registrationEnabled ? "Đóng đăng ký" : "Mở đăng ký"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="icon" aria-label="Thao tác khác">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {workspace.isActive ? (
                  <DropdownMenuItem onClick={() => onStatusAction("disable")}>
                    <Power className="mr-2 h-4 w-4" />
                    Vô hiệu hóa trường
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onStatusAction("reactivate")}>
                    <Power className="mr-2 h-4 w-4" />
                    Kích hoạt lại trường
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>
    </section>
  );
}

function OverviewTab({ workspace }: { workspace: AdminWorkspaceDetail }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="rounded-md border border-[#E3ECF6] p-5 shadow-sm">
          <h2 className="text-base font-bold text-[#0F172A]">Thông tin trường</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <InfoRow label="Tên trường" value={workspace.name} />
            <InfoRow label="Loại đơn vị" value={workspaceTypeLabel(workspace.type)} />
            <InfoRow
              label="Trực thuộc"
              value={
                workspace.parentWorkspace
                  ? `${workspace.parentWorkspace.name} (${workspace.parentWorkspace.code})`
                  : "Cấp Thành phố"
              }
            />
            <InfoRow label="Tên viết tắt" value={workspace.shortName ?? "Chưa đặt"} />
            <InfoRow label="Mã đơn vị" value={workspace.code} />
            <InfoRow label="Ngày tạo" value={formatDateTime(workspace.createdAt)} />
            <InfoRow label="Cập nhật gần nhất" value={formatDateTime(workspace.updatedAt)} />
            <InfoRow
              label="Trạng thái hoạt động"
              value={workspace.isActive ? "Đang hoạt động" : "Tạm dừng"}
            />
            <InfoRow
              label="Trạng thái đăng ký"
              value={workspace.registrationEnabled ? "Đang mở đăng ký" : "Đã đóng đăng ký"}
            />
          </div>
        </Card>

        <Card className="rounded-md border border-[#E3ECF6] p-5 shadow-sm">
          <h2 className="text-base font-bold text-[#0F172A]">Số liệu</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Metric label="Tổng người dùng" value={workspace.totalUsers} />
            <Metric label="Sinh viên" value={workspace.usersByRole.student ?? 0} />
            <Metric label="Cán bộ" value={workspace.usersByRole.officer ?? 0} />
            <Metric label="Quản lý" value={workspace.usersByRole.manager ?? 0} />
            <Metric label="Hội đồng" value={workspace.usersByRole.committee ?? 0} />
            <Metric label="Tổng hồ sơ" value={workspace.totalApplications} />
          </div>
        </Card>
      </div>

      <ReadinessBlock workspace={workspace} />
    </div>
  );
}

function ReadinessBlock({ workspace }: { workspace: AdminWorkspaceDetail }) {
  const readinessRows = [
    {
      label: "Đã cấu hình thông tin trường",
      complete: Boolean(workspace.name && workspace.code),
    },
    {
      label: "Đã có bộ tiêu chí đang hiệu lực",
      complete: workspace.readiness.checks.hasActiveCriteria,
    },
    { label: "Đã có cán bộ quản lý", complete: workspace.readiness.checks.hasManager },
    { label: "Đã có cán bộ xét duyệt", complete: workspace.readiness.checks.hasOfficer },
    { label: "Đã có thành viên hội đồng", complete: workspace.readiness.checks.hasCommittee },
  ];

  const missingWarnings = workspace.readiness.warnings
    .map((warning) => warningMessage(warning))
    .filter(Boolean);

  return (
    <Card className="rounded-md border border-[#E3ECF6] p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-[#0F172A]">Tình trạng triển khai</h2>
          <p className="mt-1 text-sm text-[#64748B]">
            Điều kiện nghiệp vụ cần có trước khi mở đăng ký cho sinh viên.
          </p>
        </div>
        {workspace.readiness.readyForRegistration ? (
          <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
            Sẵn sàng mở đăng ký
          </Badge>
        ) : (
          <Badge variant="outline">Cần bổ sung</Badge>
        )}
      </div>

      {!workspace.readiness.readyForRegistration ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {readinessBlockerMessage(workspace)}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {readinessRows.map((row) => (
          <div
            key={row.label}
            className="flex items-start gap-3 rounded-md border border-[#E3ECF6] bg-white px-4 py-3"
          >
            {row.complete && workspace.isActive ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
            ) : (
              <CircleDashed className="mt-0.5 h-4 w-4 text-[#64748B]" />
            )}
            <div>
              <div className="text-sm font-semibold text-[#0F172A]">{row.label}</div>
              <div className="mt-1 text-xs text-[#64748B]">
                {workspace.isActive ? (row.complete ? "hoàn tất" : "cần bổ sung") : "đang tạm dừng"}
              </div>
            </div>
          </div>
        ))}
      </div>

      {missingWarnings.length ? (
        <div className="mt-4 space-y-2">
          {missingWarnings.map((warning) => (
            <div key={warning} className="text-sm text-[#64748B]">
              {warning}
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function UsersTab({ workspaceId }: { workspaceId: string }) {
  const [filters, setFilters] = useState<AdminWorkspaceUserListFilters>({
    search: "",
    role: "all",
    isActive: "all",
    page: 1,
    limit: 20,
  });
  const users = useAdminWorkspaceUsers(workspaceId, filters);
  const data = users.data;

  const page = data?.pagination.page ?? filters.page ?? 1;
  const totalPages = data?.pagination.totalPages ?? 0;

  function updateFilters(next: Partial<AdminWorkspaceUserListFilters>) {
    setFilters((current) => ({ ...current, ...next, page: next.page ?? 1 }));
  }

  return (
    <Card className="rounded-md border border-[#E3ECF6] p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-base font-bold text-[#0F172A]">Người dùng</h2>
          <p className="mt-1 text-sm text-[#64748B]">
            Danh sách read-only người dùng thuộc trường triển khai này.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_170px_150px]">
          <Input
            value={filters.search ?? ""}
            onChange={(event) => updateFilters({ search: event.target.value })}
            placeholder="Tìm tên, email, MSSV, khoa, lớp"
          />
          <Select
            value={String(filters.role ?? "all")}
            onValueChange={(value) => updateFilters({ role: value as Role | "all" })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Vai trò" />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(filters.isActive ?? "all")}
            onValueChange={(value) =>
              updateFilters({ isActive: value === "all" ? "all" : value === "true" })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="true">Đang hoạt động</SelectItem>
              <SelectItem value="false">Đã khóa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-md border border-[#E3ECF6]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Họ và tên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Mã sinh viên</TableHead>
              <TableHead>Khoa</TableHead>
              <TableHead>Lớp</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày tạo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={8}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : users.isError ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-[#64748B]">
                  Không thể tải danh sách người dùng.
                  <Button
                    type="button"
                    variant="link"
                    className="ml-1 h-auto p-0"
                    onClick={() => void users.refetch()}
                  >
                    Thử lại
                  </Button>
                </TableCell>
              </TableRow>
            ) : data?.items.length ? (
              data.items.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="min-w-[180px] font-medium text-[#0F172A]">
                    {user.fullName}
                  </TableCell>
                  <TableCell className="min-w-[220px]">{user.email}</TableCell>
                  <TableCell>{roleLabels[user.role]}</TableCell>
                  <TableCell>{user.studentCode ?? "—"}</TableCell>
                  <TableCell>{user.faculty ?? "—"}</TableCell>
                  <TableCell>{user.className ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "secondary" : "outline"}>
                      {user.isActive ? "Đang hoạt động" : "Đã khóa"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-[#64748B]">
                  Chưa có người dùng phù hợp.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-[#64748B]">
          {data ? `${data.pagination.total} người dùng` : "Đang tải phân trang"}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={users.isLoading || page <= 1}
            onClick={() => updateFilters({ page: page - 1 })}
          >
            Trước
          </Button>
          <span className="text-sm text-[#64748B]">
            Trang {page}/{Math.max(totalPages, 1)}
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={users.isLoading || !totalPages || page >= totalPages}
            onClick={() => updateFilters({ page: page + 1 })}
          >
            Sau
          </Button>
        </div>
      </div>
    </Card>
  );
}

function EditWorkspaceDialog({
  workspace,
  open,
  onOpenChange,
}: {
  workspace: AdminWorkspaceDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateWorkspace = useUpdateWorkspace(workspace.id);
  const [name, setName] = useState(workspace.name);
  const [shortName, setShortName] = useState(workspace.shortName ?? "");
  const [parentWorkspaceId, setParentWorkspaceId] = useState(workspace.parentWorkspaceId ?? "none");
  const [error, setError] = useState<string | null>(null);
  const parentWorkspaces = useAdminWorkspaces({ type: "UNIVERSITY_SYSTEM", page: 1, limit: 100 });

  useEffect(() => {
    if (open) {
      setName(workspace.name);
      setShortName(workspace.shortName ?? "");
      setParentWorkspaceId(workspace.parentWorkspaceId ?? "none");
      setError(null);
    }
  }, [open, workspace.name, workspace.shortName, workspace.parentWorkspaceId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await updateWorkspace.mutateAsync({
        name,
        shortName: shortName.trim() ? shortName : null,
        parentWorkspaceId:
          workspace.type === "SCHOOL"
            ? parentWorkspaceId === "none"
              ? null
              : parentWorkspaceId
            : null,
      });
      onOpenChange(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? mapWorkspaceError(submitError)
          : "Không thể cập nhật thông tin trường.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa thông tin trường</DialogTitle>
            <DialogDescription>
              Chỉ cập nhật thông tin hiển thị. Mã đơn vị không thể thay đổi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="workspace-name">Tên trường</Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workspace-short-name">Tên viết tắt</Label>
            <Input
              id="workspace-short-name"
              value={shortName}
              onChange={(event) => setShortName(event.target.value)}
            />
          </div>
          {workspace.type === "SCHOOL" ? (
            <div className="space-y-2">
              <Label htmlFor="workspace-parent">Đại học trực thuộc</Label>
              <select
                id="workspace-parent"
                value={parentWorkspaceId}
                disabled={workspace.totalApplications > 0}
                onChange={(event) => setParentWorkspaceId(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="none">Không có — trực tiếp cấp Thành phố</option>
                {(parentWorkspaces.data?.items ?? []).map((parent) => (
                  <option key={parent.id} value={parent.id} disabled={!parent.isActive}>
                    {parent.name} ({parent.code}){parent.isActive ? "" : " — tạm dừng"}
                  </option>
                ))}
              </select>
              {workspace.totalApplications > 0 ? (
                <p className="text-xs text-amber-700">
                  Đơn vị đã phát sinh hồ sơ; không thể đổi quan hệ trực thuộc để giữ nguyên ngữ cảnh
                  lịch sử.
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="workspace-code">Mã đơn vị</Label>
            <Input id="workspace-code" value={workspace.code} readOnly className="bg-[#F8FBFE]" />
            <p className="text-xs text-[#64748B]">
              Mã đơn vị được dùng để định danh dữ liệu và không thể thay đổi sau khi tạo.
            </p>
          </div>

          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={updateWorkspace.isPending || !name.trim()}>
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function workspaceTypeLabel(type: AdminWorkspaceDetail["type"]) {
  if (type === "CITY") return "Thành phố";
  if (type === "UNIVERSITY_SYSTEM") return "Đại học / hệ thống";
  return "Trường";
}

function WorkspaceStatusDialog({
  workspace,
  action,
  onOpenChange,
}: {
  workspace: AdminWorkspaceDetail;
  action: StatusAction | null;
  onOpenChange: (open: boolean) => void;
}) {
  const updateStatus = useUpdateWorkspaceStatus(workspace.id);
  const [confirmCode, setConfirmCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const content = action ? statusDialogContent(action) : null;
  const requiresCode = action === "disable";
  const canConfirm = !requiresCode || confirmCode.trim() === workspace.code;

  async function handleConfirm() {
    if (!action) return;
    setError(null);
    try {
      await updateStatus.mutateAsync(statusPayload(action));
      setConfirmCode("");
      onOpenChange(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? mapWorkspaceError(submitError)
          : "Không thể cập nhật trạng thái trường.",
      );
    }
  }

  return (
    <AlertDialog
      open={Boolean(action)}
      onOpenChange={(open) => {
        if (!open) {
          setConfirmCode("");
          setError(null);
        }
        onOpenChange(open);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{content?.title}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">
            {content?.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {requiresCode ? (
          <div className="space-y-2">
            <Label htmlFor="confirm-code">Nhập mã đơn vị để xác nhận</Label>
            <Input
              id="confirm-code"
              value={confirmCode}
              onChange={(event) => setConfirmCode(event.target.value)}
              placeholder={workspace.code}
            />
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={updateStatus.isPending}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            disabled={!canConfirm || updateStatus.isPending}
            onClick={(event) => {
              event.preventDefault();
              void handleConfirm();
            }}
          >
            {content?.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function WorkspaceStateBadges({ workspace }: { workspace: AdminWorkspaceDetail }) {
  return (
    <>
      {workspace.isActive ? (
        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">Đang hoạt động</Badge>
      ) : (
        <Badge variant="secondary">Tạm dừng</Badge>
      )}
      {workspace.registrationEnabled ? (
        <Badge className="bg-[#EAF3FF] text-[#0057C2] hover:bg-[#EAF3FF]">Đang mở đăng ký</Badge>
      ) : (
        <Badge variant="outline">Đã đóng đăng ký</Badge>
      )}
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#F8FBFE] px-3 py-2">
      <div className="text-xs font-semibold text-[#64748B]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[#0F172A]">{value}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-[#F8FBFE] px-3 py-2">
      <div className="text-xs font-semibold text-[#64748B]">{label}</div>
      <div className="mt-1 text-xl font-bold text-[#0F172A]">{value}</div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-36" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

function LoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <Card className="rounded-md border border-[#E3ECF6] p-6 text-center shadow-sm">
      <div className="text-base font-semibold text-[#0F172A]">
        Không thể tải chi tiết trường triển khai
      </div>
      <p className="mx-auto mt-2 max-w-xl text-sm text-[#64748B]">
        {error instanceof Error ? error.message : "Vui lòng thử lại."}
      </p>
      <Button type="button" onClick={onRetry} className="mt-4">
        <RefreshCw className="h-4 w-4" />
        Thử lại
      </Button>
    </Card>
  );
}

function statusDialogContent(action: StatusAction) {
  if (action === "open-registration") {
    return {
      title: "Mở đăng ký cho trường này?",
      description: "Sinh viên sẽ có thể chọn trường trong trang đăng ký và tạo tài khoản.",
      confirmLabel: "Mở đăng ký",
    };
  }
  if (action === "close-registration") {
    return {
      title: "Đóng đăng ký hồ sơ mới?",
      description:
        "Sinh viên mới sẽ không thể tạo tài khoản.\nCác tài khoản và hồ sơ hiện có vẫn tiếp tục hoạt động.",
      confirmLabel: "Đóng đăng ký",
    };
  }
  if (action === "disable") {
    return {
      title: "Vô hiệu hóa trường triển khai?",
      description:
        "Sinh viên, cán bộ, quản lý và hội đồng thuộc đơn vị này sẽ tạm thời không thể truy cập hệ thống.\n\nDữ liệu vẫn được giữ nguyên và có thể khôi phục.",
      confirmLabel: "Vô hiệu hóa",
    };
  }
  return {
    title: "Khôi phục hoạt động của trường?",
    description: "Trường sẽ hoạt động trở lại. Đăng ký vẫn đóng cho đến khi admin mở riêng.",
    confirmLabel: "Kích hoạt lại",
  };
}

function statusPayload(action: StatusAction) {
  if (action === "open-registration") return { registrationEnabled: true };
  if (action === "close-registration") return { registrationEnabled: false };
  if (action === "disable") return { isActive: false };
  return { isActive: true };
}

function readinessBlockerMessage(workspace: AdminWorkspaceDetail) {
  if (!workspace.isActive) return "Chưa thể mở đăng ký vì trường đang tạm dừng hoạt động.";
  if (!workspace.readiness.checks.hasActiveCriteria) {
    return "Chưa thể mở đăng ký vì trường chưa có bộ tiêu chí đang hiệu lực.";
  }
  return "Chưa thể mở đăng ký vì trường chưa hoàn tất điều kiện triển khai.";
}

function warningMessage(warning: string) {
  const labels: Record<string, string> = {
    WORKSPACE_MANAGER_MISSING: "Chưa có manager.",
    WORKSPACE_OFFICER_MISSING: "Chưa có officer.",
    WORKSPACE_COMMITTEE_MISSING: "Chưa có committee.",
  };
  return labels[warning] ?? "";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
