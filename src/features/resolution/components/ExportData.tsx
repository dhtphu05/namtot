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
        subtitle="CSV và JSON được xuất trực tiếp từ backend với token xác thực."
      />
      <Card>
        <EmptyReviewState
          title="Export legacy không còn dùng dữ liệu mẫu"
          description="Vui lòng mở trang xuất dữ liệu chính để tải CSV hoặc JSON theo bộ lọc."
        />
        <div className="mt-4 flex justify-center">
          <Button asChild>
            <Link to="/app/export">
              Mở trang export
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Card>
    </>
  );
}
