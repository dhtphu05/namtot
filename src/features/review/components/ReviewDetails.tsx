import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { EmptyReviewState } from "./EmptyReviewState";

export function ReviewDetails() {
  return (
    <>
      <TopBar
        title="Chi tiết xét duyệt"
        subtitle="Chi tiết tác vụ xét duyệt được hiển thị từ route backend theo mã tác vụ."
      />
      <Card>
        <EmptyReviewState
          title="Không có mã tác vụ xét duyệt"
          description="Vui lòng mở một tác vụ từ hàng đợi xét duyệt để xem dữ liệu thật và gửi quyết định."
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
