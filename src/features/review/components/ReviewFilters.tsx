import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Criterion, Level, ReviewTaskListParams, ReviewTaskStatus } from "../types";
import { getCriterionLabel, getLevelLabel, getTaskStatusLabel } from "../utils/formatters";
import { ACTIVE_LEVELS } from "@/lib/levels";

type ReviewFiltersValue = Pick<ReviewTaskListParams, "q" | "criterion" | "status"> & {
  targetLevel?: Level;
  riskLevel?: ReviewTaskListParams["riskLevel"];
  aiConfidenceMax?: number;
  dueSoon?: boolean;
  overdue?: boolean;
  supplementRequired?: boolean;
  resolutionNeeded?: boolean;
};

type ReviewFiltersProps = {
  value: ReviewFiltersValue;
  onChange: (nextValue: ReviewFiltersValue) => void;
  disabled?: boolean;
};

const allValue = "all";
const criteria: Criterion[] = [
  "ethics",
  "academic",
  "physical",
  "volunteer",
  "integration",
  "priority",
  "collective",
];
const statuses: ReviewTaskStatus[] = [
  "waiting",
  "reviewing",
  "supplement_required",
  "accepted",
  "rejected",
  "resolution_needed",
];
const levels: Level[] = [...ACTIVE_LEVELS];

export function ReviewFilters({ value, onChange, disabled }: ReviewFiltersProps) {
  const [search, setSearch] = useState(value.q ?? "");

  useEffect(() => {
    setSearch(value.q ?? "");
  }, [value.q]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if ((value.q ?? "") !== search) {
        onChange({ ...value, q: search || undefined });
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [onChange, search, value]);

  const updateFilter = <TKey extends keyof ReviewFiltersValue>(
    key: TKey,
    nextValue: ReviewFiltersValue[TKey],
  ) => {
    onChange({ ...value, [key]: nextValue });
  };

  const clearFilters = () => {
    setSearch("");
    onChange({});
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_minmax(150px,180px)_minmax(150px,180px)_minmax(150px,180px)_minmax(140px,160px)_auto]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Tìm hồ sơ"
          className="pl-9"
          disabled={disabled}
          placeholder="Tìm theo tên hoặc mã sinh viên"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <Select
        disabled={disabled}
        value={value.criterion ?? allValue}
        onValueChange={(nextValue) =>
          updateFilter("criterion", nextValue === allValue ? undefined : (nextValue as Criterion))
        }
      >
        <SelectTrigger aria-label="Lọc tiêu chí">
          <SelectValue placeholder="Tiêu chí" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={allValue}>Tất cả tiêu chí</SelectItem>
          {criteria.map((criterion) => (
            <SelectItem key={criterion} value={criterion}>
              {getCriterionLabel(criterion)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        disabled={disabled}
        value={value.status ?? allValue}
        onValueChange={(nextValue) =>
          updateFilter(
            "status",
            nextValue === allValue ? undefined : (nextValue as ReviewTaskStatus),
          )
        }
      >
        <SelectTrigger aria-label="Lọc trạng thái">
          <SelectValue placeholder="Trạng thái" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={allValue}>Tất cả trạng thái</SelectItem>
          {statuses.map((status) => (
            <SelectItem key={status} value={status}>
              {getTaskStatusLabel(status)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        disabled={disabled}
        value={value.targetLevel ?? allValue}
        onValueChange={(nextValue) =>
          updateFilter("targetLevel", nextValue === allValue ? undefined : (nextValue as Level))
        }
      >
        <SelectTrigger aria-label="Lọc cấp xét">
          <SelectValue placeholder="Cấp xét" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={allValue}>Tất cả cấp xét</SelectItem>
          {levels.map((level) => (
            <SelectItem key={level} value={level}>
              {getLevelLabel(level)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        disabled={disabled}
        value={value.riskLevel ?? allValue}
        onValueChange={(nextValue) =>
          updateFilter("riskLevel", nextValue === allValue ? undefined : (nextValue as ReviewTaskListParams["riskLevel"]))
        }
      >
        <SelectTrigger aria-label="Lọc mức ưu tiên">
          <SelectValue placeholder="Ưu tiên" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={allValue}>Tất cả ưu tiên</SelectItem>
          <SelectItem value="high">Rủi ro cao</SelectItem>
          <SelectItem value="medium">Cần chú ý</SelectItem>
          <SelectItem value="low">Thấp</SelectItem>
        </SelectContent>
      </Select>

      <Button disabled={disabled} type="button" variant="outline" onClick={clearFilters}>
        <X className="h-4 w-4" />
        Xóa lọc
      </Button>
      <div className="md:col-span-full flex flex-wrap gap-2">
        <QuickToggle active={value.aiConfidenceMax === 0.7} disabled={disabled} onClick={() => updateFilter("aiConfidenceMax", value.aiConfidenceMax === 0.7 ? undefined : 0.7)}>
          Cần kiểm tra thêm
        </QuickToggle>
        <QuickToggle active={Boolean(value.dueSoon)} disabled={disabled} onClick={() => updateFilter("dueSoon", value.dueSoon ? undefined : true)}>
          Sắp quá hạn
        </QuickToggle>
        <QuickToggle active={Boolean(value.overdue)} disabled={disabled} onClick={() => updateFilter("overdue", value.overdue ? undefined : true)}>
          Quá hạn
        </QuickToggle>
        <QuickToggle active={Boolean(value.supplementRequired)} disabled={disabled} onClick={() => updateFilter("supplementRequired", value.supplementRequired ? undefined : true)}>
          Cần bổ sung
        </QuickToggle>
        <QuickToggle active={Boolean(value.resolutionNeeded)} disabled={disabled} onClick={() => updateFilter("resolutionNeeded", value.resolutionNeeded ? undefined : true)}>
          Cần hội đồng xử lý
        </QuickToggle>
      </div>
    </div>
  );
}

function QuickToggle({
  active,
  children,
  disabled,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button disabled={disabled} size="sm" type="button" variant={active ? "default" : "outline"} onClick={onClick}>
      {children}
    </Button>
  );
}
