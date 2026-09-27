import { createFileRoute } from "@tanstack/react-router";
import { FileUp } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui-kit";

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
              Tài khoản nhập liệu hiện chưa được cấp chức năng tải tệp hoặc truy cập quy trình xét
              duyệt. Liên hệ quản trị viên của đơn vị nếu cần cập nhật quyền.
            </p>
          </div>
        </div>
      </Card>
    </>
  );
}
