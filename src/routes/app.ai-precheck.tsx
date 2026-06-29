import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Card, Button, Chip, Progress } from "@/components/ui-kit";
import { CRITERIA, EVIDENCE_SAMPLES, LEVELS } from "@/lib/mock-data";
import { useApp } from "@/lib/store";
import { motion } from "framer-motion";
import { Sparkles, Check, AlertTriangle, ArrowRight, FileText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/ai-precheck")({
  component: Precheck,
});

function Precheck() {
  const nav = useNavigate();
  const pushAudit = useApp((s) => s.pushAudit);
  const pushNotification = useApp((s) => s.pushNotification);
  const submit = useApp((s) => s.submitProfile);

  const scores = [95, 88, 72, 60, 84];
  const overall = Math.round(scores.reduce((a, b) => a + b) / scores.length);

  const submitProfile = () => {
    submit("sv-001");
    pushAudit({ actor: "Nguyễn Linh An", role: "Sinh viên", action: "Nộp hồ sơ chính thức", before: "Nháp", after: "Đã nộp", reason: "AI tiền kiểm đạt 80%+" });
    pushNotification({ title: "Hồ sơ đã được nộp thành công", desc: "Cán bộ sẽ tiếp nhận trong vòng 24 giờ", type: "success" });
    toast.success("🎉 Đã nộp hồ sơ thành công!", { description: "Trạng thái: Đã nộp → Đang xét" });
    setTimeout(() => nav({ to: "/app/cascade" }), 1200);
  };

  return (
    <>
      <TopBar title="Kết quả AI tiền kiểm" subtitle="Phân tích từ VNPT SmartReader — không thay thế quyết định của hội đồng" />

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card-glow p-8 mb-6 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-gradient-to-br from-[#00AEEF]/20 to-transparent" />
        <div className="grid md:grid-cols-3 gap-6 items-center relative">
          <div className="md:col-span-2">
            <Chip tone="brand"><Sparkles className="w-3 h-3" /> VNPT SmartReader • Confidence cao</Chip>
            <h2 className="text-3xl font-bold text-brand-deep mt-3">Hồ sơ đạt {overall}% tiêu chí Cấp Thành phố</h2>
            <p className="text-muted-foreground mt-2">8 Evidence Cards đã được tạo. AI đề xuất bổ sung 1 minh chứng để hoàn tất.</p>
            <div className="flex flex-wrap gap-3 mt-5">
              <Button onClick={submitProfile}>Nộp hồ sơ chính thức <ArrowRight className="w-4 h-4" /></Button>
              <Link to="/app/upload"><Button variant="secondary">Bổ sung minh chứng</Button></Link>
              <Button variant="ghost" onClick={() => toast.success("Đã lưu kết quả vào bản nháp")}>Lưu vào bản nháp</Button>
            </div>
          </div>
          <div className="relative h-48 flex items-center justify-center">
            <svg viewBox="0 0 120 120" className="w-44 h-44 -rotate-90">
              <circle cx="60" cy="60" r="48" fill="none" stroke="#EEF9FF" strokeWidth="12" />
              <motion.circle initial={{ pathLength: 0 }} animate={{ pathLength: overall / 100 }} transition={{ duration: 1.2 }} cx="60" cy="60" r="48" fill="none" stroke="url(#g)" strokeWidth="12" strokeLinecap="round" pathLength={1} />
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#00AEEF" />
                  <stop offset="100%" stopColor="#0057C2" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute text-center">
              <div className="text-4xl font-extrabold text-brand-deep">{overall}%</div>
              <div className="text-xs text-muted-foreground">Sẵn sàng</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 5 criteria detail */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-7">
        {CRITERIA.map((c, i) => {
          const v = scores[i];
          const status = v >= 85 ? "Đạt" : v >= 70 ? "Có khả năng" : "Cần bổ sung";
          const tone = v >= 85 ? "success" : v >= 70 ? "brand" : "warning";
          return (
            <motion.div key={c.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card-soft p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{c.icon}</span>
                <Chip tone={tone as any}>{status}</Chip>
              </div>
              <div className="font-semibold text-sm">{c.label}</div>
              <div className="text-3xl font-bold text-brand-deep mt-2">{v}%</div>
              <div className="mt-2"><Progress value={v} tint={c.color} /></div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <Card>
          <h3 className="font-bold text-brand-deep mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Gap analysis</h3>
          <div className="space-y-3">
            {[
              { t: "Thiếu 2 ngày tình nguyện để đạt Cấp Thành phố", action: "Đăng ký Mùa hè xanh 2026" },
              { t: "Chưa có minh chứng thể lực mới", action: "Upload phiếu kiểm tra thể lực HK2" },
              { t: "Chứng chỉ IELTS cần xác minh thời hạn", action: "Bổ sung scan trang ngày cấp" },
            ].map((g) => (
              <div key={g.t} className="p-3 rounded-xl bg-amber-50 border-l-4 border-amber-400">
                <div className="text-sm font-semibold text-amber-900">{g.t}</div>
                <div className="text-xs text-amber-700 mt-1">→ Next action: {g.action}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card glow>
          <h3 className="font-bold text-brand-deep mb-3">Next best actions</h3>
          <div className="space-y-2">
            {[
              { t: "Nộp hồ sơ chính thức ngay", desc: "Đã đạt 80%+ tiêu chí Cấp Thành phố", primary: true, action: submitProfile },
              { t: "Bổ sung 1-2 minh chứng tình nguyện", desc: "Để tăng confidence Cấp Thành phố lên 95%", action: () => nav({ to: "/app/upload" }) },
              { t: "Mở chatbot để hỏi thêm", desc: "Tư vấn thêm về tiêu chí Hội nhập", action: () => nav({ to: "/app/chatbot" }) },
            ].map((a) => (
              <button key={a.t} onClick={a.action} className={`text-left w-full p-4 rounded-xl transition-all hover:-translate-y-0.5 ${a.primary ? "gradient-brand text-white" : "bg-[#F4FBFF] text-brand-deep hover:bg-[#EEF9FF]"}`}>
                <div className="font-semibold text-sm">{a.t}</div>
                <div className={`text-xs mt-1 ${a.primary ? "text-white/85" : "text-muted-foreground"}`}>{a.desc}</div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="font-bold text-brand-deep mb-3">Evidence Cards ({EVIDENCE_SAMPLES.length})</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {EVIDENCE_SAMPLES.map((e) => {
            const cr = CRITERIA.find((c) => c.key === e.criteria);
            const lv = LEVELS.find((l) => l.key === e.level);
            return (
              <motion.div key={e.id} whileHover={{ y: -3 }} className="card-soft p-4 fade-up">
                <div className="flex gap-3">
                  <img src={e.img} alt="" className="w-16 h-20 object-cover rounded-lg" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-brand-deep">{e.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{e.org}</div>
                    <div className="text-xs text-muted-foreground">Cấp: {e.date}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <Chip tone="brand">
                    {cr && <CriterionIcon criterion={cr.key} size={12} className="mr-1" />}
                    {cr?.label}
                  </Chip>
                  {lv && <Chip>{lv.label}</Chip>}
                  {e.days && <Chip tone="success">{e.days} ngày</Chip>}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#EEF9FF]">
                  <span className="text-xs text-muted-foreground">Confidence</span>
                  <span className={`text-sm font-bold ${e.confidence > 0.85 ? "text-emerald-600" : "text-amber-600"}`}>{Math.round(e.confidence * 100)}%</span>
                </div>
                {e.warning && (
                  <div className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2 mt-2 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {e.warning}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </Card>
    </>
  );
}
