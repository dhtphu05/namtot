import { Link } from "@tanstack/react-router";
import { ArrowRight, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Pagination } from "@/lib/api/types";
import type { AdminWorkspaceListItem } from "@/features/admin-workspace/types";

type WorkspaceTableProps = {
  items: AdminWorkspaceListItem[];
  pagination?: Pagination;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry: () => void;
  onCreate: () => void;
  onPageChange: (page: number) => void;
};

export function WorkspaceTable({
  items,
  pagination,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  onCreate,
  onPageChange,
}: WorkspaceTableProps) {
  if (isLoading) {
    return (
      <Card className="rounded-md border border-[#E3ECF6] p-0 shadow-sm">
        <div className="space-y-2 p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="rounded-md border border-[#E3ECF6] p-6 text-center shadow-sm">
        <div className="text-base font-semibold text-[#0F172A]">
          Không thể tải danh sách trường triển khai
        </div>
        <p className="mx-auto mt-2 max-w-xl text-sm text-[#64748B]">
          {errorMessage || "Vui lòng thử tải lại danh sách."}
        </p>
        <Button type="button" onClick={onRetry} className="mt-4">
          <RefreshCw className="h-4 w-4" />
          Thử lại
        </Button>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="rounded-md border border-[#E3ECF6] p-8 text-center shadow-sm">
        <div className="text-base font-semibold text-[#0F172A]">
          Chưa có trường triển khai phù hợp.
        </div>
        <p className="mx-auto mt-2 max-w-xl text-sm text-[#64748B]">
          Thay đổi bộ lọc hoặc tạo trường triển khai mới để bắt đầu cấu hình.
        </p>
        <Button type="button" onClick={onCreate} className="mt-4">
          Thêm trường triển khai
        </Button>
      </Card>
    );
  }

  return (
    <Card className="rounded-md border border-[#E3ECF6] p-0 shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[260px] px-4">Đơn vị triển khai</TableHead>
            <TableHead className="min-w-[130px]">Mã đơn vị</TableHead>
            <TableHead className="min-w-[140px]">Tình trạng</TableHead>
            <TableHead className="min-w-[150px]">Đăng ký</TableHead>
            <TableHead className="text-right">Người dùng</TableHead>
            <TableHead className="text-right">Hồ sơ</TableHead>
            <TableHead className="min-w-[150px]">Cập nhật</TableHead>
            <TableHead className="min-w-[120px] text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className="h-[58px]">
              <TableCell className="px-4">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[#0F172A]">{item.name}</div>
                  <div className="mt-0.5 truncate text-xs text-[#64748B]">
                    {workspaceTypeLabel(item.type)}
                    {item.parentWorkspace
                      ? ` · trực thuộc ${item.parentWorkspace.shortName ?? item.parentWorkspace.name}`
                      : " · cấp Thành phố"}
                  </div>
                  {item.shortName ? (
                    <div className="mt-0.5 truncate text-xs text-[#64748B]">{item.shortName}</div>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                <span className="rounded-md bg-[#F1F5F9] px-2 py-1 text-xs font-semibold text-[#334155]">
                  {item.code}
                </span>
              </TableCell>
              <TableCell>
                <WorkspaceStatusBadge active={item.isActive} />
              </TableCell>
              <TableCell>
                <RegistrationStatusBadge open={item.registrationEnabled} />
              </TableCell>
              <TableCell className="text-right font-semibold text-[#0F172A]">
                {item.userCount}
              </TableCell>
              <TableCell className="text-right font-semibold text-[#0F172A]">
                {item.applicationCount}
              </TableCell>
              <TableCell className="text-sm text-[#64748B]">{formatDate(item.updatedAt)}</TableCell>
              <TableCell className="text-right">
                <Button asChild size="sm" variant="outline">
                  <Link
                    to="/app/admin/workspaces/$workspaceId"
                    params={{ workspaceId: item.id }}
                    aria-label={`Xem chi tiết ${item.name}`}
                  >
                    Xem chi tiết
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {pagination ? (
        <div className="flex flex-col gap-3 border-t border-[#E3ECF6] px-4 py-3 text-sm text-[#64748B] sm:flex-row sm:items-center sm:justify-between">
          <div>
            Trang {pagination.page}/{Math.max(1, pagination.totalPages)} · {pagination.total} trường
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              Trước
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              Sau
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function workspaceTypeLabel(type: AdminWorkspaceListItem["type"]) {
  if (type === "CITY") return "Thành phố";
  if (type === "UNIVERSITY_SYSTEM") return "Đại học / hệ thống";
  return "Trường";
}

function WorkspaceStatusBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">Đang hoạt động</Badge>
  ) : (
    <Badge variant="secondary">Tạm dừng</Badge>
  );
}

function RegistrationStatusBadge({ open }: { open: boolean }) {
  return open ? (
    <Badge className="bg-[#EAF3FF] text-[#0057C2] hover:bg-[#EAF3FF]">Đang mở đăng ký</Badge>
  ) : (
    <Badge variant="outline">Đã đóng đăng ký</Badge>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa rõ";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
