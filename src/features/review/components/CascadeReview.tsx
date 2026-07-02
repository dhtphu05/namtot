import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { EmptyReviewState } from "./EmptyReviewState";

export function CascadeReview() {
  return (
    <>
      <TopBar
        title="Quy trình xét duyệt nhiều cấp"
        subtitle="Chức năng theo dõi theo cấp sẽ được triển khai bằng dữ liệu backend trong phase sau."
      />
      <Card>
        <EmptyReviewState
          title="Chưa có dữ liệu xét duyệt nhiều cấp"
          description="Trong sprint hiện tại, cán bộ và quản lý sử dụng hàng đợi xét duyệt để xử lý hồ sơ theo tiêu chí."
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
