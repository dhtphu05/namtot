import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ErrorStateProps = {
  title?: string;
  message?: string;
  requestId?: string;
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({
  title = "Không thể tải dữ liệu",
  message = "Vui lòng thử lại sau.",
  requestId,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn("rounded-md border border-rose-200 bg-rose-50 p-4 text-rose-900", className)}
    >
      <div className="flex gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{title}</div>
          <p className="mt-1 text-sm text-rose-800">{message}</p>
          {requestId ? <p className="mt-2 text-xs text-rose-700">Mã hỗ trợ: {requestId}</p> : null}
          {onRetry ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 bg-background"
              onClick={onRetry}
            >
              Thử lại
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
