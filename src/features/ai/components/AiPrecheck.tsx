import { useNavigate, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Card, Button, Chip, Progress } from "@/components/ui-kit";
import { CRITERIA, EVIDENCE_SAMPLES, LEVELS } from "@/lib/mock-data";
import { useApp } from "@/lib/store";
import { motion } from "framer-motion";
import { Sparkles, AlertTriangle, ArrowRight } from "lucide-react";
import { CriterionIcon } from "@/components/AppIcon";
import { toast } from "sonner";



export function AiPrecheck() {
  const nav = useNavigate();
  const pushAudit = useApp((s) => s.pushAudit);
  const pushNotification = useApp((s) => s.pushNotification);
  const submit = useApp((s) => s.submitProfile);

  const scores = [95, 88, 72, 60, 84];
  const overall = Math.round(scores.reduce((a, b) => a + b) / scores.length);

  const minScore = Math.min(...scores);
  const profileState: "missing" | "uncertain" | "ready" =
    minScore < 60 ? "missing" : minScore < 85 ? "uncertain" : "ready";

  const submitProfile = () => {
    submit("sv-001");
    pushAudit({ actor: "Nguyễn Linh An", role: "Sinh viên", action: "Nộp hồ sơ để cán bộ xét", before: "Nháp", after: "Đã nộp — chờ cán bộ", reason: "AI gợi ý; cán bộ xác nhận quyết định cuối cùng" });
    pushNotification({ title: "Đã nộp hồ sơ — chờ cán bộ tiếp nhận", desc: "Cán bộ chuyên trách từng tiêu chí sẽ xét & xác nhận", type: "success" });
    toast.success("Đã gửi hồ sơ để cán bộ xét", { description: "AI gợi ý — Cán bộ xác nhận quyết định cuối cùng." });
    setTimeout(() => nav({ to: "/app/cascade" }), 1200);
  };

  return (
    <>
      <TopBar title="Kết quả AI tiền kiểm" subtitle="AI gợi ý — Cán bộ / Hội đồng xác nhận quyết định cuối cùng" />

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card-glow p-8 mb-6 relative overflow-hidden">
        <div className="grid md:grid-cols-3 gap-6 items-center relative">
          <div className="md:col-span-2">
            <Chip tone="brand"><Sparkles className="w-3 h-3" /> AI gợi ý — Cán bộ xác nhận</Chip>
            <h2 className="text-3xl font-bold text-brand-deep mt-3">Hồ sơ đạt khoảng {overall}% tiêu chí Cấp Thành phố</h2>
            <p className="text-muted-foreground mt-2">
              {profileState === "missing"
                ? "Hồ sơ còn thiếu minh chứng bắt buộc cho cấp aim. Bạn vẫn có thể nộp để cán bộ xét, nhưng nên bổ sung để tăng khả năng đạt Cấp Thành phố."
                : profileState === "uncertain"
                ? "Một vài minh chứng có độ tin cậy thấp — cần cán bộ xác minh trước khi công bố kết quả."
                : "Hồ sơ đã đủ minh chứng cho cấp aim. Cán bộ sẽ xác nhận kết quả chính thức."}
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              {profileState === "missing" && (<>
                <Link to="/app/upload"><Button>Bổ sung minh chứng <ArrowRight className="w-4 h-4" /></Button></Link>
                <Button variant="secondary" onClick={submitProfile}>Nộp để cán bộ xét</Button>
              </>)}
              {profileState === "uncertain" && (<>
                <Button onClick={submitProfile}>Nộp để cán bộ xét <ArrowRight className="w-4 h-4" /></Button>
                <Link to="/app/evidence"><Button variant="secondary">Xem minh chứng cần xác minh</Button></Link>
              </>)}
              {profileState === "ready" && (<>
                <Button onClick={submitProfile}>Nộp chính thức <ArrowRight className="w-4 h-4" /></Button>
                <Button variant="ghost" onClick={() => toast.success("Đã lưu kết quả vào bản nháp")}>Lưu vào bản nháp</Button>
              </>)}
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
          const status = v >= 85 ? "Có thể đạt" : v >= 70 ? "Cần cán bộ xác minh" : "Bổ sung để tăng khả năng";
          const tone = v >= 85 ? "success" : v >= 70 ? "brand" : "warning";
          return (
            <motion.div key={c.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card-soft p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${c.color}1A`, color: c.color }}>
                  <CriterionIcon criterion={c.key} size={18} />
                </span>
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
          <h3 className="font-bold text-brand-deep mb-3">Hành động đề xuất tiếp theo</h3>
          <p className="text-[11px] text-muted-foreground mb-3">AI gợi ý — Cán bộ xác nhận quyết định cuối cùng.</p>
          <div className="space-y-2">
            {(profileState === "missing"
              ? [
                  { t: "Bổ sung minh chứng còn thiếu", desc: "Tăng khả năng đạt cấp aim — ưu tiên trước khi nộp", primary: true, action: () => nav({ to: "/app/upload" }) },
                  { t: "Nộp để cán bộ xét", desc: "Vẫn có thể nộp; cán bộ sẽ yêu cầu bổ sung nếu cần", action: submitProfile },
                ]
              : profileState === "uncertain"
              ? [
                  { t: "Nộp để cán bộ xét", desc: "Cán bộ chuyên trách từng tiêu chí sẽ xác minh", primary: true, action: submitProfile },
                  { t: "Xem minh chứng cần xác minh", desc: "Bổ sung trước để rút ngắn thời gian xét", action: () => nav({ to: "/app/evidence" }) },
                ]
              : [
                  { t: "Nộp chính thức", desc: "Hồ sơ đủ minh chứng cho cấp aim", primary: true, action: submitProfile },
                  { t: "Mở chatbot để hỏi thêm", desc: "Tư vấn thêm về quy trình xét", action: () => nav({ to: "/app/chatbot" }) },
                ]
            ).map((a) => (
              <button key={a.t} onClick={a.action} className={`text-left w-full p-4 rounded-xl transition-all hover:-translate-y-0.5 ${a.primary ? "bg-[#0057C2] text-white hover:bg-[#004ba8]" : "bg-[#F4FBFF] text-brand-deep hover:bg-[#EEF9FF]"}`}>
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
