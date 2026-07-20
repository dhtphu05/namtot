import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { EmptyReviewState } from "./EmptyReviewState";

const TASK_STATUS: Record<
  string,
  { label: string; tone: "brand" | "success" | "warning" | "error" | "muted" }
> = {
  waiting: { label: "Chờ xét", tone: "muted" },
  reviewing: { label: "Đang xét", tone: "brand" },
  supplement_required: { label: "Cần bổ sung", tone: "warning" },
  resolution_needed: { label: "Cần hội đồng", tone: "warning" },
  accepted: { label: "Đạt tiêu chí", tone: "success" },
  rejected: { label: "Không đạt", tone: "error" },
};

const CRITERIA = [
  "ethics",
  "academic",
  "physical",
  "volunteer",
  "integration",
  "priority",
  "collective",
];

export function ReviewQueue() {
  return (
    <>
      <TopBar
        title="Hàng đợi xét duyệt"
        subtitle="Danh sách tác vụ xét duyệt được tải trực tiếp từ backend."
      />
      <Card>
        <EmptyReviewState
          title="Hàng đợi legacy không còn dùng dữ liệu mẫu"
          description="Vui lòng mở route hàng đợi chính để lọc và xử lý tác vụ xét duyệt thật."
        />
        <div className="mt-4 flex justify-center">
          <Button asChild>
            <Link to="/app/queue">
              Mở hàng đợi xét duyệt
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Card>
    </>
  );
}
