import { Link, useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Card, Button, Chip, Progress } from "@/components/ui-kit";
import { CRITERIA, EVIDENCE_SAMPLES, LEVELS } from "@/lib/mock-data";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { CriterionIcon } from "@/components/AppIcon";
import { toast } from "sonner";
import {
  useCurrentApplication,
  useLatestPrecheck,
  usePrecheck,
  useSubmitApplication,
} from "@/features/application/hooks/useApplication";
import type { Criterion } from "@/lib/api/types";

const criterionMap: Record<string, Criterion> = {
  "dao-duc": "ethics",
  "hoc-tap": "academic",
  "the-luc": "physical",
  "tinh-nguyen": "volunteer",
  "hoi-nhap": "integration",
};

const fallbackScores = [95, 88, 72, 60, 84];

export function AiPrecheck() {
  const nav = useNavigate();
  const { data: appRes, isLoading: appLoading } = useCurrentApplication();
  const application = appRes?.application;
  const latestPrecheck = useLatestPrecheck(application?.id);
  const runPrecheck = usePrecheck();
  const submitMutation = useSubmitApplication();
  const result = latestPrecheck.data;

  const scores = CRITERIA.map((criterion, index) => {
    const backendCriterion = criterionMap[criterion.key];
    const criterionResult = result?.criteriaResults?.find((item) => item.criterion === backendCriterion);
    return typeof criterionResult?.score === "number" ? criterionResult.score : fallbackScores[index];
  });
  const overall = result?.readinessScore ?? Math.round(scores.reduce((a, b) => a + b) / scores.length);
  const minScore = Math.min(...scores);
  const profileState: "missing" | "uncertain" | "ready" = result
    ? result.readyToSubmit
      ? "ready"
      : result.missingItems.length > 0
        ? "missing"
        : "uncertain"
    : minScore < 60
      ? "missing"
      : minScore < 85
        ? "uncertain"
        : "ready";

  const submitProfile = () => {
    if (!application) {
      toast.error("Hãy tạo hồ sơ trước khi nộp.");
      nav({ to: "/app/drafts" });
      return;
    }

    submitMutation.mutate(
      {
        id: application.id,
        allowSubmitWithWarnings: profileState !== "ready",
        studentNote: result?.nextBestAction,
      },
      { onSuccess: () => nav({ to: "/app/cascade" }) }
    );
  };

  const precheckNow = () => {
    if (!application) {
      toast.error("Hãy tạo hồ sơ trước khi tiền kiểm.");
      nav({ to: "/app/drafts" });
      return;
    }
    runPrecheck.mutate({ id: application.id, level: application.targetLevel });
  };

  if (appLoading || latestPrecheck.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="w-6 h-6 mr-2 animate-spin" />
        Đang tải kết quả tiền kiểm...
      </div>
    );
  }

  return (
    <>
      <TopBar
        title="Kết quả AI tiền kiểm"
        subtitle="AI gợi ý, cán bộ / hội đồng xác nhận quyết định cuối cùng"
        action={
          <Button variant="secondary" onClick={precheckNow} disabled={runPrecheck.isPending}>
            {runPrecheck.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Chạy tiền kiểm
          </Button>
        }
      />

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card-glow p-8 mb-6 relative overflow-hidden">
        <div className="grid md:grid-cols-3 gap-6 items-center relative">
          <div className="md:col-span-2">
            <Chip tone="brand"><Sparkles className="w-3 h-3" /> AI gợi ý - cán bộ xác nhận</Chip>
            <h2 className="text-3xl font-bold text-brand-deep mt-3">
              Hồ sơ đạt khoảng {overall}% cho cấp {result?.level ?? application?.targetLevel ?? "đang chọn"}
            </h2>
            <p className="text-muted-foreground mt-2">
              {result?.nextBestAction ??
                (profileState === "missing"
                  ? "Hồ sơ còn thiếu minh chứng bắt buộc. Nên bổ sung trước khi nộp."
                  : profileState === "uncertain"
                    ? "Một vài minh chứng cần cán bộ xác minh trước khi công bố kết quả."
                    : "Hồ sơ đủ minh chứng theo tiền kiểm. Cán bộ sẽ xác nhận kết quả chính thức.")}
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              {profileState === "missing" && (
                <>
                  <Link to="/app/upload"><Button>Bổ sung minh chứng <ArrowRight className="w-4 h-4" /></Button></Link>
                  <Button variant="secondary" onClick={submitProfile} disabled={submitMutation.isPending}>Nộp để cán bộ xét</Button>
                </>
              )}
              {profileState === "uncertain" && (
                <>
                  <Button onClick={submitProfile} disabled={submitMutation.isPending}>
                    {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Nộp để cán bộ xét <ArrowRight className="w-4 h-4" />
                  </Button>
                  <Link to="/app/evidence"><Button variant="secondary">Xem minh chứng cần xác minh</Button></Link>
                </>
              )}
              {profileState === "ready" && (
                <>
                  <Button onClick={submitProfile} disabled={submitMutation.isPending}>
                    {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Nộp chính thức <ArrowRight className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" onClick={() => toast.success("Đã lưu kết quả tiền kiểm")}>Lưu vào bản nháp</Button>
                </>
              )}
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

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-7">
        {CRITERIA.map((c, i) => {
          const v = scores[i];
          const status = v >= 85 ? "Có thể đạt" : v >= 70 ? "Cần xác minh" : "Cần bổ sung";
          const tone = v >= 85 ? "success" : v >= 70 ? "brand" : "warning";
          return (
            <motion.div key={c.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card-soft p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${c.color}1A`, color: c.color }}>
                  <CriterionIcon criterion={c.key} size={18} />
                </span>
                <Chip tone={tone as "success" | "brand" | "warning"}>{status}</Chip>
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
            {(result?.missingItems.length ? result.missingItems : [
              { message: "Chưa có kết quả backend mới nhất. Bấm Chạy tiền kiểm để cập nhật." },
            ]).map((item, index) => (
              <div key={String(item.code ?? index)} className="p-3 rounded-xl bg-amber-50 border-l-4 border-amber-400">
                <div className="text-sm font-semibold text-amber-900">{item.message ?? "Cần bổ sung minh chứng"}</div>
                <div className="text-xs text-amber-700 mt-1">{String(item.criterion ?? "Hồ sơ")}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card glow>
          <h3 className="font-bold text-brand-deep mb-3">Hành động đề xuất tiếp theo</h3>
          <p className="text-[11px] text-muted-foreground mb-3">AI gợi ý, cán bộ xác nhận quyết định cuối cùng.</p>
          <div className="space-y-2">
            {[
              { t: "Bổ sung minh chứng", desc: "Cập nhật các minh chứng còn thiếu trước khi nộp", action: () => nav({ to: "/app/upload" }) },
              { t: profileState === "ready" ? "Nộp chính thức" : "Nộp để cán bộ xét", desc: "Gửi hồ sơ sang workflow xét duyệt", primary: true, action: submitProfile },
              { t: "Mở chatbot", desc: "Hỏi thêm về quy trình xét", action: () => nav({ to: "/app/chatbot" }) },
            ].map((a) => (
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
                    <div className="text-xs text-muted-foreground">Cap: {e.date}</div>
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
              </motion.div>
            );
          })}
        </div>
      </Card>
    </>
  );
}
