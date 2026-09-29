import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { WorkspaceType } from "@/features/admin-workspace/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type WorkspaceStatusFilter = "all" | "active" | "inactive";
export type WorkspaceRegistrationFilter = "all" | "open" | "closed";

type WorkspaceToolbarProps = {
  search: string;
  status: WorkspaceStatusFilter;
  registration: WorkspaceRegistrationFilter;
  type: "all" | WorkspaceType;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: WorkspaceStatusFilter) => void;
  onRegistrationChange: (value: WorkspaceRegistrationFilter) => void;
  onTypeChange: (value: "all" | WorkspaceType) => void;
};

export function WorkspaceToolbar({
  search,
  status,
  registration,
  type,
  onSearchChange,
  onStatusChange,
  onRegistrationChange,
  onTypeChange,
}: WorkspaceToolbarProps) {
  return (
    <section
      className="rounded-md border border-[#E3ECF6] bg-white p-3 shadow-sm"
      aria-label="Bộ lọc trường triển khai"
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_190px_190px]">
        <label className="relative block">
          <span className="sr-only">Tìm theo tên hoặc mã trường</span>
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#64748B]" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="pl-9"
            placeholder="Tìm theo tên hoặc mã trường"
          />
        </label>

        <Select
          value={status}
          onValueChange={(value) => onStatusChange(value as WorkspaceStatusFilter)}
        >
          <SelectTrigger aria-label="Trạng thái hoạt động">
            <SelectValue placeholder="Trạng thái hoạt động" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="active">Đang hoạt động</SelectItem>
            <SelectItem value="inactive">Đã vô hiệu hóa</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={type}
          onValueChange={(value) => onTypeChange(value as "all" | WorkspaceType)}
        >
          <SelectTrigger aria-label="Loại đơn vị">
            <SelectValue placeholder="Loại đơn vị" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            <SelectItem value="CITY">Thành phố</SelectItem>
            <SelectItem value="UNIVERSITY_SYSTEM">Đại học</SelectItem>
            <SelectItem value="SCHOOL">Trường</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={registration}
          onValueChange={(value) => onRegistrationChange(value as WorkspaceRegistrationFilter)}
        >
          <SelectTrigger aria-label="Trạng thái đăng ký">
            <SelectValue placeholder="Trạng thái đăng ký" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="open">Đang mở</SelectItem>
            <SelectItem value="closed">Đã đóng</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </section>
  );
}
