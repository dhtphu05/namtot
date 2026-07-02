import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type ReviewErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

export function ReviewErrorState({
  title = "Không thể tải dữ liệu",
  description = "Vui lòng thử lại hoặc kiểm tra kết nối tới hệ thống.",
  onRetry,
}: ReviewErrorStateProps) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-md border p-6 text-center">
      <AlertTriangle className="mb-3 h-8 w-8 text-destructive" />
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="mt-1 max-w-md text-sm text-muted-foreground">{description}</div>
      {onRetry ? (
        <Button className="mt-4" size="sm" variant="outline" onClick={onRetry}>
          Thử lại
        </Button>
      ) : null}
    </div>
  );
}
