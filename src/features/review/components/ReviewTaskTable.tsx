import { AlertTriangle, Eye } from "lucide-react";
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
import { fallbackText, formatDateTime } from "../utils/formatters";
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
  onClaimTask,
  onOpenTask,
}: ReviewTaskTableProps) {
  if (isLoading) {
    return <ReviewLoadingState />;
  }

  if (!items.length) {
    return (
      <EmptyReviewState
        title="Chưa có tác vụ xét duyệt"
        description="Thử thay đổi bộ lọc hoặc chờ hồ sơ mới được phân công cho cán bộ."
      />
    );
  }

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sinh viên</TableHead>
            <TableHead>Mã sinh viên</TableHead>
            <TableHead>Khoa / lớp</TableHead>
            <TableHead>Cấp xét</TableHead>
            <TableHead>Tiêu chí</TableHead>
            <TableHead>Ưu tiên</TableHead>
            <TableHead>Độ rõ</TableHead>
            <TableHead>Deadline</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Quyền</TableHead>
            <TableHead className="text-right">Minh chứng</TableHead>
            <TableHead className="text-right">Bổ sung</TableHead>
            <TableHead>Cập nhật</TableHead>
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
              <TableCell className="font-medium">{item.studentName || fallbackText}</TableCell>
              <TableCell>{item.studentCode || fallbackText}</TableCell>
              <TableCell>{getStudentMeta(item)}</TableCell>
              <TableCell>
                <LevelBadge level={item.targetLevel} />
              </TableCell>
              <TableCell>
                <CriterionBadge criterion={item.criterion} />
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <PriorityBadge item={item} />
                  <RiskBadge risk={item.riskLevel ?? "low"} />
                </div>
              </TableCell>
              <TableCell>{formatConfidence(item.aiConfidence)}</TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <span>{formatDateTime(item.dueDate)}</span>
                  {isOverdue(item.dueDate) ? <Badge variant="destructive">Quá hạn</Badge> : null}
                  {isDueSoon(item.dueDate) ? <Badge variant="outline">Sắp quá hạn</Badge> : null}
                </div>
              </TableCell>
              <TableCell>
                <ReviewStatusBadge status={item.status} />
              </TableCell>
              <TableCell>
                <PermissionBadge item={item} />
              </TableCell>
              <TableCell className="text-right tabular-nums">{item.evidenceCount ?? 0}</TableCell>
              <TableCell className="text-right tabular-nums">{item.supplementCount ?? 0}</TableCell>
              <TableCell>{formatDateTime(item.updatedAt)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {item.permissions?.canClaim && onClaimTask ? (
                    <Button
                      size="sm"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onClaimTask(item.id);
                      }}
                    >
                      Nhận xử lý
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenTask(item.id);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                    {getTaskActionLabel(item)}
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

function PermissionBadge({ item }: { item: ReviewTaskListItem }) {
  const permission = item.permissions;
  if (!permission) return <Badge variant="outline">Chưa rõ</Badge>;
  if (permission.badges?.length) {
    return <Badge variant={permission.canAct ? "default" : permission.canClaim ? "outline" : "secondary"}>{permission.badges[0]}</Badge>;
  }
  if (permission.canAct) return <Badge variant="default">Được xử lý</Badge>;
  if (permission.canClaim) return <Badge variant="outline">Có thể nhận</Badge>;
  if (permission.reason === "assigned_to_other") return <Badge variant="secondary">Đã giao cán bộ khác</Badge>;
  if (permission.reason === "finalized") return <Badge variant="secondary">Đã chốt</Badge>;
  return <Badge variant="secondary">Chỉ xem</Badge>;
}

function getTaskActionLabel(item: ReviewTaskListItem) {
  if (item.permissions?.canAct) return "Mở xét duyệt";
  if (item.status === "supplement_required") return "Xem yêu cầu";
  return "Xem chi tiết";
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

function RiskBadge({ risk }: { risk: "low" | "medium" | "high" }) {
  if (risk === "high") {
    return <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" />Cao</Badge>;
  }
  if (risk === "medium") {
    return <Badge variant="outline">Cần chú ý</Badge>;
  }
  return <Badge variant="secondary">Thấp</Badge>;
}

function formatConfidence(value?: number | null) {
  if (value === null || value === undefined) return "Chưa có dữ liệu";
  return `${Math.round(value * 100)}%`;
}

function isOverdue(value?: string | null) {
  if (!value) return false;
  return new Date(value).getTime() < Date.now();
}

function isDueSoon(value?: string | null) {
  if (!value || isOverdue(value)) return false;
  return new Date(value).getTime() <= Date.now() + 3 * 24 * 60 * 60 * 1000;
}
