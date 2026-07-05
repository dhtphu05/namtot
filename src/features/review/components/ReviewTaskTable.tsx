import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Pagination } from "@/lib/api/types";
import type { ReviewTaskListItem } from "../types";
import {
  fallbackText,
  formatDateTime,
  getOfficerTaskActionLabel,
  getOfficerTaskWorkLabel,
  getReadabilityLabel,
} from "../utils/formatters";
import { CriterionBadge } from "./CriterionBadge";
import { EmptyReviewState } from "./EmptyReviewState";
import { LevelBadge } from "./LevelBadge";
import { ReviewLoadingState } from "./ReviewLoadingState";
import { ReviewStatusBadge } from "./ReviewStatusBadge";

type ReviewTaskTableProps = {
  items: ReviewTaskListItem[];
  isLoading: boolean;
  pagination?: Pagination;
  onClaimTask?: (taskId: string) => void;
  onOpenTask: (taskId: string) => void;
};

function getStudentMeta(item: ReviewTaskListItem) {
  return [item.faculty, item.className].filter(Boolean).join(" / ") || fallbackText;
}

export function ReviewTaskTable({
  items,
  isLoading,
  pagination,
  onOpenTask,
}: ReviewTaskTableProps) {
  if (isLoading) {
    return <ReviewLoadingState />;
  }

  if (!items.length) {
    return (
      <EmptyReviewState
        title="Bạn chưa có task cần xử lý"
        description="Hãy chuyển sang tab Có thể nhận hoặc kiểm tra lại bộ lọc."
      />
    );
  }

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sinh viên</TableHead>
            <TableHead>Việc cần làm</TableHead>
            <TableHead>Tiêu chí</TableHead>
            <TableHead>Cấp xét</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Deadline</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              className="cursor-pointer"
              tabIndex={0}
              onClick={() => onOpenTask(item.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpenTask(item.id);
                }
              }}
            >
              <TableCell className="min-w-[220px]">
                <div className="font-semibold text-brand-deep">{item.studentName || fallbackText}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {[item.studentCode, getStudentMeta(item)].filter(Boolean).join(" • ")}
                </div>
              </TableCell>
              <TableCell className="min-w-[280px]">
                <div className="text-sm font-medium text-foreground">{getOfficerTaskWorkLabel(item)}</div>
                <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                  <span>{item.evidenceCount ?? 0} minh chứng</span>
                  <span>•</span>
                  <span>{getReadabilityLabel(item.aiConfidence)}</span>
                  {item.supplementCount ? (
                    <>
                      <span>•</span>
                      <span>{item.supplementCount} yêu cầu bổ sung</span>
                    </>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                <CriterionBadge criterion={item.criterion} />
              </TableCell>
              <TableCell>
                <LevelBadge level={item.targetLevel} />
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1.5">
                  <ReviewStatusBadge status={item.status} />
                  <PriorityBadge item={item} />
                </div>
              </TableCell>
              <TableCell>
                <DeadlineBadge value={item.dueDate} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    type="button"
                    variant={item.permissions?.canAct ? "default" : "outline"}
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenTask(item.id);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                    {getOfficerTaskActionLabel(item)}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {pagination ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Trang {pagination.page} / {pagination.totalPages || 1}
          </span>
          <span>{pagination.total} hồ sơ</span>
        </div>
      ) : null}
    </div>
  );
}

function PriorityBadge({ item }: { item: ReviewTaskListItem }) {
  if (item.priorityReason === "overdue") return <Badge variant="destructive">Quá hạn</Badge>;
  if (item.priorityReason === "student_resubmitted") return <Badge variant="outline">Vừa bổ sung</Badge>;
  if (item.priorityReason === "low_ai_confidence") return <Badge variant="destructive">Cần kiểm tra thêm</Badge>;
  if (item.priorityReason === "due_soon") return <Badge variant="outline">Sắp đến hạn</Badge>;
  if (item.priorityReason === "assigned_to_you") return <Badge variant="secondary">Được giao</Badge>;
  if (item.priorityReason === "unassigned_claimable") return <Badge variant="secondary">Có thể nhận</Badge>;
  return <Badge variant="secondary">Theo dõi</Badge>;
}

function DeadlineBadge({ value }: { value?: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="whitespace-nowrap text-sm">{formatDateTime(value)}</span>
      {isOverdue(value) ? <Badge variant="destructive">Quá hạn</Badge> : null}
      {isDueSoon(value) ? <Badge variant="outline">Sắp quá hạn</Badge> : null}
    </div>
  );
}

function isOverdue(value?: string | null) {
  if (!value) return false;
  return new Date(value).getTime() < Date.now();
}

function isDueSoon(value?: string | null) {
  if (!value || isOverdue(value)) return false;
  return new Date(value).getTime() <= Date.now() + 3 * 24 * 60 * 60 * 1000;
}
