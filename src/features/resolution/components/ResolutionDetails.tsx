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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-white/70 py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[60%] text-right font-semibold text-brand-deep">{value}</span>
    </div>
  );
}
