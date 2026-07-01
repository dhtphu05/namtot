import { Link } from "@tanstack/react-router";
import { ArrowRight, Bell, CheckCircle2, CircleAlert, FileText, Target } from "lucide-react";
import { motion } from "framer-motion";
import { TopBar } from "@/components/layout/TopBar";
import { Button, Card, Chip, Progress } from "@/components/ui-kit";
import { CRITERIA, CURRENT_PROFILE, CURRENT_STUDENT, LEVELS, PROFILE_STATUS, type ProfileLifecycle } from "@/lib/mock-data";
import { useApp } from "@/lib/store";

const statusCta: Record<ProfileLifecycle, string> = {
  "not-started": "Bắt đầu hồ sơ",
  drafting: "Tiếp tục hoàn thiện",
  prechecked: "Xem kết quả tiền kiểm",
  ready: "Nộp hồ sơ",
  submitted: "Theo dõi xét duyệt",
  reviewing: "Theo dõi xét duyệt",
  supplement: "Bổ sung minh chứng",
  resolution: "Theo dõi xét duyệt",
  done: "Xem kết quả",
};

export function StudentOverview() {
  const application = useApp((s) => s.application);
  const notifications = useApp((s) => s.notifications);
  const targetLevel = LEVELS.find((level) => level.key === application.targetLevel) ?? LEVELS[2];
  const status = PROFILE_STATUS[application.status];

  const nextActions = [
    "Bổ sung thêm 2 ngày tình nguyện để giữ aim Cấp Thành phố.",
    "Upload minh chứng thể lực rõ hơn.",
    "Xác minh chứng chỉ ngoại ngữ.",
  ];

  return (
    <>
      <TopBar
        title={`Xin chào, ${CURRENT_STUDENT.name.split(" ").slice(-1)[0]}`}
        subtitle="Hồ sơ của em đang ở đâu, còn thiếu gì, và cần làm gì tiếp theo để nộp hồ sơ."
      />

      <Card className="mb-5 overflow-hidden !p-0">
        <div className="bg-[#0057C2] p-6 text-white md:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="brand"><FileText className="h-3 w-3" /> Hồ sơ duy nhất</Chip>
            <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold">{status.label}</span>
          </div>
          <div className="mt-4 grid gap-5 lg:grid-cols-3 lg:items-end">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold leading-tight md:text-3xl">Hồ sơ Sinh viên 5 tốt năm học 2025-2026</h2>
              <div className="mt-3 grid gap-2 text-sm text-white/85 sm:grid-cols-2">
                <div>Trạng thái hiện tại: <b className="text-white">{status.label}</b></div>
                <div>Cấp aim: <b className="text-white">{targetLevel.label}</b></div>
                <div>Cập nhật lần cuối: <b className="text-white">{application.lastUpdatedAt}</b></div>
                <div>Tiến độ: <b className="text-white">{application.readinessScore}%</b></div>
              </div>
            </div>
            <div className="rounded-lg bg-white/15 p-4">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span>Hoàn thiện hồ sơ</span>
                <b>{application.readinessScore}%</b>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/20">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${application.readinessScore}%` }}
                  transition={{ duration: 0.7 }}
                  className="h-full rounded-full bg-white"
                />
              </div>
              <Link to="/app/drafts" className="mt-4 block">
                <Button className="w-full bg-white !text-[#0057C2] hover:bg-[#F1F7FD]">
                  {statusCta[application.status]} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>

      <div className="mb-5 flex flex-wrap gap-2">
        <Link to="/app/drafts"><Button><Target className="h-4 w-4" /> {statusCta[application.status]}</Button></Link>
        <Link to="/app/drafts"><Button variant="secondary">Xem điều kiện xét</Button></Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <h3 className="flex items-center gap-2 font-bold text-brand-deep">
            <CircleAlert className="h-4 w-4" /> Việc cần làm tiếp theo
          </h3>
          <div className="mt-3 space-y-2">
            {nextActions.map((item) => (
              <Link key={item} to="/app/drafts" className="flex gap-3 rounded-lg bg-[#F6F9FC] px-3 py-3 text-sm hover:bg-[#EEF9FF]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0057C2]" />
                <span className="text-muted-foreground">{item}</span>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="font-bold text-brand-deep">Tiến độ 5 tiêu chí</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {CRITERIA.map((criterion) => {
              const progress = CURRENT_PROFILE.criteriaProgress[criterion.key];
              const evidenceCount = criterion.key === "tinh-nguyen" ? 1 : 1;
              const needsWork = progress.progress < 85;
              return (
                <Link key={criterion.key} to="/app/drafts" className="rounded-lg border border-[#E3ECF6] p-3 hover:bg-[#F6F9FC]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="h-8 w-8 rounded-lg" style={{ background: criterion.color }} />
                    <Chip tone={needsWork ? "warning" : "success"}>{needsWork ? "Cần bổ sung" : "Tạm ổn"}</Chip>
                  </div>
                  <div className="mt-3 text-sm font-bold text-brand-deep">{criterion.label}</div>
                  <div className="mt-1 min-h-8 text-xs text-muted-foreground">{progress.label}</div>
                  <div className="mt-3"><Progress value={progress.progress} tint={criterion.color} /></div>
                  <div className="mt-2 text-xs text-muted-foreground">{evidenceCount} minh chứng</div>
                </Link>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <h3 className="flex items-center gap-2 font-bold text-brand-deep">
          <Bell className="h-4 w-4" /> Thông báo mới nhất
        </h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {notifications.slice(0, 3).map((item) => (
            <div key={item.id} className="rounded-lg bg-[#F6F9FC] px-3 py-3">
              <div className="text-sm font-semibold text-brand-deep">{item.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{item.desc}</div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
