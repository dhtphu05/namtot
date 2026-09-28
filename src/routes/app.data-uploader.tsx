import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FileUp } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/data-uploader")({
  component: DataUploaderLanding,
});

function DataUploaderLanding() {
  return (
    <>
      <TopBar
        title="Quản lý dữ liệu đơn vị"
        subtitle="Thông tin quyền truy cập và phạm vi hỗ trợ dành cho cán bộ nhập liệu."
      />
      <Card>
        <div className="flex items-start gap-4 p-5">
          <div className="rounded-xl bg-sky-50 p-3 text-sky-700">
            <FileUp className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h2 className="font-semibold text-slate-900">Quyền truy cập hiện tại</h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              Quản lý quyết định và danh sách công nhận chính thức của đơn vị tại Award Registry. Dữ
              liệu này phục vụ eligibility; tài khoản nhập liệu không tham gia xét duyệt hồ sơ Thành
              phố.
            </p>
            <Button asChild className="mt-3">
              <Link to="/app/award-registry">
                Mở Award Registry <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}
