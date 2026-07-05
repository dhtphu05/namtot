import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Criterion } from "@/lib/api/types";
import { criterionOptions } from "./approved-evidence-utils";

type ApprovedEvidenceFiltersProps = {
  q: string;
  criterion: Criterion | "all";
  status: "all" | "importable" | "imported";
  onQueryChange: (value: string) => void;
  onCriterionChange: (value: Criterion | "all") => void;
  onStatusChange: (value: "all" | "importable" | "imported") => void;
};

export function ApprovedEvidenceFilters({
  q,
  criterion,
  status,
  onQueryChange,
  onCriterionChange,
  onStatusChange,
}: ApprovedEvidenceFiltersProps) {
  return (
    <div className="rounded-md border bg-white p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px]">
        <label className="relative block">
          <span className="sr-only">Tìm kiếm</span>
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(event) => onQueryChange(event.target.value)}
            className="pl-9"
            placeholder="Tên hoạt động, đơn vị tổ chức, số quyết định..."
          />
        </label>

        <Select
          value={criterion}
          onValueChange={(value) => onCriterionChange(value as Criterion | "all")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tiêu chí" />
          </SelectTrigger>
          <SelectContent>
            {criterionOptions.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status}
          onValueChange={(value) => onStatusChange(value as "all" | "importable" | "imported")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="importable">Có thể thêm</SelectItem>
            <SelectItem value="imported">Đã thêm</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
