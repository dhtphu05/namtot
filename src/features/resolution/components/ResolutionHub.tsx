import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { EmptyReviewState } from "@/features/review/components/EmptyReviewState";

export function ResolutionHub() {
  return (
    <>
      <TopBar
        title="Hồ sơ hội ý"
        subtitle="Danh sách hồ sơ cần hội ý được tải trực tiếp từ backend."
      />
      <Card>
        <EmptyReviewState
          title="Resolution Hub legacy không còn dùng dữ liệu mẫu"
          description="Vui lòng mở trang hồ sơ hội ý chính để xem các trường hợp cần xử lý."
        />
        <div className="mt-4 flex justify-center">
          <Button asChild>
            <Link to="/app/resolution">
              Mở hồ sơ hội ý
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Card>
    </>
  );
}
