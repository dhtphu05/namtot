import { useEffect, useMemo, useState } from "react";
import { KeyRound, Pencil, Plus, Power, Settings2 } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
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
import { Input } from "@/components/ui/input";
import { useAdminWorkspaces } from "@/features/admin-workspace/hooks/useAdminWorkspaces";
import {
  useAdminUsers,
  useResetAdminUserPassword,
  useCreateAdminUser,
  useSetAdminUserActive,
  useSetOfficerSpecializations,
  useUpdateAdminUser,
} from "../hooks/useAdminUsers";
import type { AdminUser } from "../api/admin-users";
import type { Role } from "@/lib/api/types";

const roles: Role[] = [
  "student",
  "data_uploader",
  "city_officer",
  "city_manager",
  "city_committee",
  "admin",
  "class_representative",
  "officer",
  "manager",
  "committee",
];
const roleLabels: Record<Role, string> = {
  student: "Sinh viên",
  data_uploader: "Cán bộ nhập Award",
  city_officer: "City Officer",
  city_manager: "City Manager",
  city_committee: "City Committee",
  admin: "Admin",
  class_representative: "Đại diện lớp",
  officer: "Cán bộ trường",
  manager: "Quản lý trường",
  committee: "Hội đồng trường",
};
const criteria = [
  ["ethics", "Đạo đức"],
  ["academic", "Học tập"],
  ["physical", "Thể lực"],
  ["volunteer", "Tình nguyện"],
  ["integration", "Hội nhập"],
] as const;
const pageSize = 20;

export function AdminUsersPage({ officersOnly = false }: { officersOnly?: boolean }) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role | "all">(officersOnly ? "city_officer" : "all");
  const [workspaceId, setWorkspaceId] = useState("all");
  const [active, setActive] = useState<boolean | "all">("all");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [specializationUser, setSpecializationUser] = useState<AdminUser | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<AdminUser | null>(null);
  const filters = useMemo(
    () => ({
      q: search.trim() || undefined,
      role,
      workspaceId,
      isActive: active,
      page,
      limit: pageSize,
    }),
    [active, page, role, search, workspaceId],
  );
  const users = useAdminUsers(filters);
  const workspaceQuery = useAdminWorkspaces({ page: 1, limit: 100 });
  const setUserActive = useSetAdminUserActive();

  return (
    <>
      <TopBar
        title={officersOnly ? "Chuyên môn City Officer" : "Quản lý người dùng"}
        subtitle={
          officersOnly
            ? "Cấu hình năm tiêu chí review cho City Officer đang hoạt động."
            : "Tạo tài khoản, phân vai trò và đơn vị. Tài khoản có lịch sử được chuyển sang vô hiệu hóa thay vì xóa."
        }
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Tạo tài khoản
          </Button>
        }
      />
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#64748B]">
        Quản trị hệ thống / {officersOnly ? "Chuyên môn City Officer" : "Người dùng"}
      </div>
      <Card className="mb-4 p-3">
        <div className="grid gap-3 md:grid-cols-4">
          <Input
            aria-label="Tìm người dùng"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Tìm tên, email hoặc MSSV"
          />
          <select
            aria-label="Lọc vai trò"
            value={role}
            onChange={(event) => {
              setRole(event.target.value as Role | "all");
              setPage(1);
            }}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="all">Tất cả vai trò</option>
            {roles.map((value) => (
              <option key={value} value={value}>
                {roleLabels[value]}
              </option>
            ))}
          </select>
          <select
            aria-label="Lọc đơn vị"
            value={workspaceId}
            onChange={(event) => {
              setWorkspaceId(event.target.value);
              setPage(1);
            }}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="all">Tất cả đơn vị</option>
            {(workspaceQuery.data?.items ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Lọc trạng thái tài khoản"
            value={String(active)}
            onChange={(event) => {
              setActive(event.target.value === "all" ? "all" : event.target.value === "true");
              setPage(1);
            }}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="all">Mọi trạng thái</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Đã vô hiệu hóa</option>
          </select>
        </div>
      </Card>
      <Card className="overflow-hidden p-0">
        {users.isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Đang tải tài khoản…</p>
        ) : users.isError ? (
          <div role="alert" className="p-6 text-sm text-rose-700">
            {users.error.message}
          </div>
        ) : (users.data?.items.length ?? 0) === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Không có tài khoản phù hợp.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Tài khoản</th>
                  <th className="px-4 py-3">Vai trò</th>
                  <th className="px-4 py-3">Đơn vị</th>
                  <th className="px-4 py-3">Chuyên môn</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.data!.items.map((user) => (
                  <tr key={user.id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{user.fullName}</div>
                      <div className="text-xs text-muted-foreground">
                        {user.email}
                        {user.studentCode ? ` · ${user.studentCode}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">{roleLabels[user.role]}</td>
                    <td className="px-4 py-3">{user.workspace?.name ?? "Toàn hệ thống"}</td>
                    <td className="px-4 py-3 text-xs">
                      {user.role === "city_officer" ? specializationSummary(user) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.isActive ? "default" : "outline"}>
                        {user.isActive ? "Hoạt động" : "Đã khóa"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {user.role === "city_officer" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            aria-label={`Chuyên môn ${user.fullName}`}
                            onClick={() => setSpecializationUser(user)}
                          >
                            <Settings2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`Sửa ${user.fullName}`}
                          onClick={() => setEditUser(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!officersOnly ? (
                          <Button
                            size="sm"
                            variant="outline"
                            aria-label={`Đặt lại mật khẩu ${user.fullName}`}
                            onClick={() => setResetPasswordUser(user)}
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`${user.isActive ? "Vô hiệu hóa" : "Kích hoạt"} ${user.fullName}`}
                          disabled={setUserActive.isPending}
                          onClick={() =>
                            setUserActive.mutate({ userId: user.id, isActive: !user.isActive })
                          }
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
          <span>
            {users.data?.pagination.total ?? 0} tài khoản · trang {page} /{" "}
            {Math.max(1, users.data?.pagination.totalPages ?? 1)}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
            >
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= (users.data?.pagination.totalPages ?? 1)}
              onClick={() => setPage((value) => value + 1)}
            >
              Sau
            </Button>
          </div>
        </div>
      </Card>
      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditUserDialog
        user={editUser}
        onOpenChange={(open) => {
          if (!open) setEditUser(null);
        }}
      />
      <SpecializationDialog
        user={specializationUser}
        onOpenChange={(open) => {
          if (!open) setSpecializationUser(null);
        }}
      />
      {resetPasswordUser ? (
        <ResetUserPasswordDialog
          user={resetPasswordUser}
          onOpenChange={(open) => {
            if (!open) setResetPasswordUser(null);
          }}
        />
      ) : null}
    </>
  );
}

function ResetUserPasswordDialog({
  user,
  onOpenChange,
}: {
  user: AdminUser;
  onOpenChange: (open: boolean) => void;
}) {
  const resetPassword = useResetAdminUserPassword();
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (newPassword.length < 8 || newPassword.length > 128) {
      setFormError("Mật khẩu phải có từ 8 đến 128 ký tự.");
      return;
    }
    if (newPassword !== confirmation) {
      setFormError("Mật khẩu xác nhận không khớp.");
      return;
    }
    try {
      await resetPassword.mutateAsync({ userId: user.id, newPassword });
      setNewPassword("");
      setConfirmation("");
      onOpenChange(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể đặt lại mật khẩu.");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !resetPassword.isPending && onOpenChange(open)}>
      <DialogContent>
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Đặt lại mật khẩu</DialogTitle>
            <DialogDescription>
              Đặt mật khẩu mới cho {user.fullName}. Mật khẩu dài từ 8 đến 128 ký tự.
            </DialogDescription>
          </DialogHeader>
          <label className="block space-y-1 text-sm font-medium">
            Mật khẩu mới
            <Input
              aria-label="Mật khẩu mới"
              type="password"
              autoComplete="new-password"
              maxLength={128}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          </label>
          <label className="block space-y-1 text-sm font-medium">
            Xác nhận mật khẩu
            <Input
              aria-label="Xác nhận mật khẩu"
              type="password"
              autoComplete="new-password"
              maxLength={128}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              required
            />
          </label>
          <p className="text-sm text-amber-800">
            Các phiên có thể làm mới của tài khoản này sẽ bị thu hồi.
          </p>
          {formError ? (
            <p role="alert" className="text-sm text-rose-700">
              {formError}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={resetPassword.isPending}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={resetPassword.isPending}>
              {resetPassword.isPending ? "Đang đặt lại…" : "Xác nhận đặt lại"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateAdminUser();
  const workspaces = useAdminWorkspaces({ page: 1, limit: 100 });
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [workspaceId, setWorkspaceId] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const options = compatibleWorkspaces(role, workspaces.data?.items ?? []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await create.mutateAsync({
        fullName,
        email,
        password,
        role,
        workspaceId: workspaceId || null,
        ...(role === "student" ? { studentCode } : {}),
      });
      setFullName("");
      setEmail("");
      setPassword("");
      setStudentCode("");
      onOpenChange(false);
    } catch {
      /* mutation displays the server message */
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Tạo tài khoản</DialogTitle>
            <DialogDescription>
              Nhập mật khẩu khởi tạo. Hệ thống chỉ lưu mật khẩu đã băm; không có luồng đặt lại mật
              khẩu qua email hiện tại.
            </DialogDescription>
          </DialogHeader>
          <Input
            aria-label="Họ và tên"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Họ và tên"
            required
          />
          <Input
            aria-label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            required
          />
          <Input
            aria-label="Mật khẩu khởi tạo"
            type="password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mật khẩu khởi tạo"
            required
          />
          <select
            aria-label="Vai trò tài khoản"
            value={role}
            onChange={(event) => {
              const nextRole = event.target.value as Role;
              setRole(nextRole);
              setWorkspaceId("");
            }}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            {roles.map((value) => (
              <option key={value} value={value}>
                {roleLabels[value]}
              </option>
            ))}
          </select>
          {role !== "admin" ? (
            <select
              aria-label="Đơn vị tài khoản"
              value={workspaceId}
              onChange={(event) => setWorkspaceId(event.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              required
            >
              <option value="">Chọn đơn vị</option>
              {options.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.code})
                </option>
              ))}
            </select>
          ) : null}
          {role === "student" ? (
            <Input
              aria-label="Mã sinh viên"
              value={studentCode}
              onChange={(event) => setStudentCode(event.target.value)}
              placeholder="Mã sinh viên"
              required
            />
          ) : null}
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Đang tạo…" : "Tạo tài khoản"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({
  user,
  onOpenChange,
}: {
  user: AdminUser | null;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useUpdateAdminUser();
  const workspaces = useAdminWorkspaces({ page: 1, limit: 100 });
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState<Role>(user?.role ?? "student");
  const [workspaceId, setWorkspaceId] = useState(user?.workspaceId ?? "");
  const [studentCode, setStudentCode] = useState(user?.studentCode ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  useEffect(() => {
    setFullName(user?.fullName ?? "");
    setEmail(user?.email ?? "");
    setRole(user?.role ?? "student");
    setWorkspaceId(user?.workspaceId ?? "");
    setStudentCode(user?.studentCode ?? "");
    setPhone(user?.phone ?? "");
  }, [user]);
  const options = compatibleWorkspaces(role, workspaces.data?.items ?? []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    try {
      await update.mutateAsync({
        userId: user.id,
        input: {
          fullName,
          email,
          role,
          workspaceId: workspaceId || null,
          studentCode: studentCode || null,
          phone: phone || null,
        },
      });
      onOpenChange(false);
    } catch {
      /* mutation displays the server message */
    }
  }
  return (
    <Dialog open={Boolean(user)} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa tài khoản</DialogTitle>
            <DialogDescription>
              Nếu tài khoản đã tham gia quy trình, backend sẽ chặn đổi vai trò hoặc đơn vị để giữ
              lịch sử.
            </DialogDescription>
          </DialogHeader>
          <Input
            aria-label="Họ và tên"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />
          <Input
            aria-label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Input
            aria-label="Điện thoại"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Điện thoại"
          />
          <select
            aria-label="Vai trò tài khoản"
            value={role}
            onChange={(event) => {
              const nextRole = event.target.value as Role;
              setRole(nextRole);
              setWorkspaceId("");
            }}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            {roles.map((value) => (
              <option key={value} value={value}>
                {roleLabels[value]}
              </option>
            ))}
          </select>
          {role !== "admin" ? (
            <select
              aria-label="Đơn vị tài khoản"
              value={workspaceId}
              onChange={(event) => setWorkspaceId(event.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              required
            >
              <option value="">Chọn đơn vị</option>
              {options.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.code})
                </option>
              ))}
            </select>
          ) : null}
          {role === "student" ? (
            <Input
              aria-label="Mã sinh viên"
              value={studentCode}
              onChange={(event) => setStudentCode(event.target.value)}
              required
            />
          ) : null}
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={update.isPending}>
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SpecializationDialog({
  user,
  onOpenChange,
}: {
  user: AdminUser | null;
  onOpenChange: (open: boolean) => void;
}) {
  const save = useSetOfficerSpecializations();
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    setSelected(
      user?.officerSpecializations
        .filter((item) => item.isActive !== false)
        .map((item) => item.criterion) ?? [],
    );
  }, [user]);
  async function submit() {
    if (!user) return;
    try {
      await save.mutateAsync({ userId: user.id, criteria: selected });
      onOpenChange(false);
    } catch {
      /* mutation displays the server message */
    }
  }
  return (
    <Dialog open={Boolean(user)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chuyên môn · {user?.fullName}</DialogTitle>
          <DialogDescription>
            Chỉ có năm tiêu chí review City. Hệ thống không cho gỡ tiêu chí đang có hồ sơ được phân
            công còn mở.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {criteria.map(([criterion, label]) => (
            <label key={criterion} className="flex items-center gap-3 rounded-md border p-3">
              <input
                type="checkbox"
                checked={selected.includes(criterion)}
                onChange={(event) =>
                  setSelected((current) =>
                    event.target.checked
                      ? [...current, criterion]
                      : current.filter((item) => item !== criterion),
                  )
                }
              />
              {label}
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={() => void submit()} disabled={save.isPending}>
            {save.isPending ? "Đang lưu…" : "Lưu chuyên môn"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function compatibleWorkspaces(
  role: Role,
  workspaces: Array<{ id: string; code: string; name: string; type: string }>,
) {
  if (role === "data_uploader") {
    return workspaces.filter(
      (workspace) => workspace.type === "SCHOOL" || workspace.type === "UNIVERSITY_SYSTEM",
    );
  }
  const schoolRoles: Role[] = [
    "student",
    "class_representative",
    "officer",
    "manager",
    "committee",
  ];
  const cityRoles: Role[] = ["city_officer", "city_manager", "city_committee"];
  const type = schoolRoles.includes(role) ? "SCHOOL" : cityRoles.includes(role) ? "CITY" : null;
  return workspaces.filter((workspace) => type === null || workspace.type === type);
}

function specializationSummary(user: AdminUser) {
  const selected = user.officerSpecializations
    .filter((item) => item.isActive !== false)
    .map((item) => criteria.find(([key]) => key === item.criterion)?.[1])
    .filter(Boolean);
  return selected.length ? selected.join(", ") : "Chưa cấu hình";
}
