import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { EmptyReviewState } from "./EmptyReviewState";

export function TaskAssignment() {
  return (
    <>
      <TopBar
        title="Phân công cán bộ"
        subtitle="Theo dõi workload và phân bổ tác vụ xét duyệt theo dữ liệu backend."
      />
      <Card>
        <EmptyReviewState
          title="Trang phân công đã được chuyển sang phiên bản mới"
          description="Vui lòng mở trang phân công chính để xem workload cán bộ và phân bổ theo tiêu chí."
        />
        <div className="mt-4 flex justify-center">
          <Button asChild>
            <Link to="/app/assignment">
              Mở trang phân công
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Card>
    </>
  );
}
