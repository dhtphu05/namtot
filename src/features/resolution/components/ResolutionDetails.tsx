import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { EmptyReviewState } from "@/features/review/components/EmptyReviewState";

export function ResolutionDetails() {
  return (
    <>
      <TopBar
        title="Chi tiết hồ sơ hội ý"
        subtitle="Chi tiết hội ý được hiển thị từ route backend theo mã hồ sơ."
      />
      <Card>
        <EmptyReviewState
          title="Không có mã hồ sơ hội ý"
          description="Vui lòng mở một hồ sơ từ danh sách hội ý để xem dữ liệu thật và lịch sử xử lý."
        />
        <div className="mt-4 flex justify-center">
          <Button asChild>
            <Link to="/app/resolution">
              Mở danh sách hội ý
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Card>
    </>
  );
}
