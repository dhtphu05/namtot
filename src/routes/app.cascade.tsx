import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Card, Chip, Button, Progress } from "@/components/ui-kit";
import { LEVELS } from "@/lib/mock-data";
import { motion } from "framer-motion";
import { Check, X, AlertTriangle, ArrowDown } from "lucide-react";

export const Route = createFileRoute("/app/cascade")({
  component: Cascade,
});

function Cascade() {
  const results = [
    { level: "trung-uong", status: "miss", score: 58, note: "Chưa đạt — thiếu nhiều tiêu chí quốc gia" },
    { level: "thanh-pho", status: "near", score: 78, note: "Có khả năng — thiếu 2 ngày tình nguyện" },
    { level: "dhdn", status: "pass", score: 88, note: "Đạt — đủ minh chứng tiêu biểu cấp đại học" },
    { level: "truong", status: "pass", score: 95, note: "Đạt — vượt mức tiêu chí cơ bản" },
  ];

  return (
    <>
      <TopBar title="Cascade Review" subtitle="AI xét hồ sơ từ cấp aim xuống các cấp thấp hơn" />

      <Card className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Chip tone="brand">Hồ sơ: Nguyễn Linh An — 21IT001</Chip>
            <h2 className="text-xl font-bold text-brand-deep mt-2">Aim ban đầu: Cấp Thành phố</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Hồ sơ <b>có khả năng đạt Cấp Thành phố</b> nếu bổ sung 2 ngày tình nguyện. Hiện tại <b>đã đạt</b> Cấp Đại học Đà Nẵng và Cấp Trường nếu các tiêu chí còn lại được cán bộ xác nhận.
            </p>
          </div>
          <Link to="/app/upload"><Button>Bổ sung minh chứng</Button></Link>
        </div>
      </Card>

      <div className="space-y-3">
        {results.map((r, i) => {
          const lv = LEVELS.find((l) => l.key === r.level)!;
          const icon = r.status === "pass" ? <Check className="w-5 h-5" /> : r.status === "near" ? <AlertTriangle className="w-5 h-5" /> : <X className="w-5 h-5" />;
          const tone = r.status === "pass" ? "bg-emerald-500" : r.status === "near" ? "bg-amber-500" : "bg-rose-500";
          return (
            <div key={r.level}>
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }} className="card-soft p-5 flex items-center gap-5">
                <div className={`w-12 h-12 rounded-2xl ${tone} text-white flex items-center justify-center shrink-0 shadow-lg`}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-bold text-brand-deep text-lg">{lv.label}</h3>
                    <Chip tone={r.status === "pass" ? "success" : r.status === "near" ? "warning" : "error"}>
                      {r.status === "pass" ? "Đạt" : r.status === "near" ? "Có khả năng" : "Chưa đạt"}
                    </Chip>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{r.note}</div>
                </div>
                <div className="w-40 hidden md:block">
                  <div className="text-right text-2xl font-bold text-brand-deep mb-1">{r.score}%</div>
                  <Progress value={r.score} tint={lv.color} />
                </div>
              </motion.div>
              {i < results.length - 1 && (
                <div className="flex justify-center py-1">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.15 + 0.1 }} className="w-8 h-8 rounded-full bg-[#EEF9FF] flex items-center justify-center text-[#00AEEF]">
                    <ArrowDown className="w-4 h-4" />
                  </motion.div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Card glow className="mt-6">
        <h3 className="font-bold text-brand-deep mb-2">Khuyến nghị của hệ thống</h3>
        <p className="text-sm">
          Nếu sinh viên không bổ sung đủ minh chứng cho cấp aim trong 30 ngày,
          5TOT sẽ <b>gợi ý cán bộ xem xét hồ sơ ở cấp phù hợp hơn</b>
          (ví dụ Cấp Đại học Đà Nẵng). Quyết định cuối cùng do
          <b> cán bộ / Hội đồng xét duyệt xác nhận</b> — AI chỉ đưa ra gợi ý.
        </p>
      </Card>
    </>
  );
}
