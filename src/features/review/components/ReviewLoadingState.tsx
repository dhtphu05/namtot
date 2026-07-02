import { LoaderCircle } from "lucide-react";

type ReviewLoadingStateProps = {
  label?: string;
};

export function ReviewLoadingState({
  label = "Đang tải dữ liệu xét duyệt...",
}: ReviewLoadingStateProps) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-md border p-6 text-sm text-muted-foreground">
      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}
