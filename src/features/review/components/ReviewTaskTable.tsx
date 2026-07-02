import { Eye } from "lucide-react";
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
        title="Chưa có tác vụ xét duyệt"
        description="Thử thay đổi bộ lọc hoặc chờ backend phân công hồ sơ mới cho cán bộ."
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
            <TableHead>Trạng thái</TableHead>
            <TableHead className="text-right">Minh chứng</TableHead>
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
                <ReviewStatusBadge status={item.status} />
              </TableCell>
              <TableCell className="text-right tabular-nums">{item.evidenceCount ?? 0}</TableCell>
              <TableCell>{formatDateTime(item.updatedAt)}</TableCell>
              <TableCell className="text-right">
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
                  Xem chi tiết
                </Button>
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
