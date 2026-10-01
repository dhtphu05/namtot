import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { EmptyReviewState } from "@/features/review/components/EmptyReviewState";

export function ExportData() {
  return (
    <>
      <TopBar
        title="Xuất dữ liệu hồ sơ"
        subtitle="Tải báo cáo Excel theo phạm vi và bộ lọc được phép."
      />
      <Card>
        <EmptyReviewState
          title="Trang xuất báo cáo tập trung"
          description="Mở trang xuất dữ liệu chính để tải các báo cáo Excel theo bộ lọc."
        />
        <div className="mt-4 flex justify-center">
          <Button asChild>
            <Link to="/app/export">
              Mở trang xuất báo cáo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Card>
    </>
  );
}
