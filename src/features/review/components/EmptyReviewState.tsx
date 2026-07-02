import { Inbox } from "lucide-react";

type EmptyReviewStateProps = {
  title?: string;
  description?: string;
};

export function EmptyReviewState({
  title = "Chưa có hồ sơ cần xử lý",
  description = "Khi backend trả về hồ sơ phù hợp với bộ lọc hiện tại, danh sách sẽ hiển thị tại đây.",
}: EmptyReviewStateProps) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-md border border-dashed p-6 text-center">
      <Inbox className="mb-3 h-8 w-8 text-muted-foreground" />
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="mt-1 max-w-md text-sm text-muted-foreground">{description}</div>
    </div>
  );
}
