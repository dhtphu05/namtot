import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui-kit";

export const Route = createFileRoute("/app/smartux")({
  component: SmartUxRoute,
});

function SmartUxRoute() {
  return (
    <>
      <TopBar
        title="SmartUX Analytics"
        subtitle="Theo dõi hành vi người dùng sau khi tích hợp dữ liệu SmartUX."
      />
      <Card>
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div className="text-base font-bold text-brand-deep">SmartUX Analytics chưa có dữ liệu</div>
          <div className="mt-2 max-w-xl text-sm text-muted-foreground">
            SmartUX Analytics sẽ hiển thị dữ liệu hành vi người dùng sau khi tích hợp.
          </div>
        </div>
      </Card>
    </>
  );
}
