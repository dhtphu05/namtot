import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Card, Chip, Button } from "@/components/ui-kit";
import { RESOLUTION_CASES } from "@/lib/mock-data";
import { AlertTriangle, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/app/resolution")({
  component: Resolution,
});

function Resolution() {
  return (
    <>
      <TopBar title="Resolution Hub" subtitle="Hồ sơ mập mờ — chờ hội đồng quyết định" />
      <Card>
        <div className="space-y-2">
          {RESOLUTION_CASES.map((r) => (
            <Link to="/app/resolution/$id" params={{ id: r.id }} key={r.id} className="block">
              <div className="p-4 rounded-2xl hover:bg-purple-50 transition-all flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-purple-500 text-white flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-brand-deep">{r.student}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{r.type} • Tiêu chí: {r.criteria}</div>
                </div>
                <Chip tone="warning">Confidence {Math.round(r.confidence * 100)}%</Chip>
                <Chip>{r.similar} case tương tự</Chip>
                <Chip tone="muted">{r.status}</Chip>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </>
  );
}
