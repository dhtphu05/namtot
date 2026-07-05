import { Link, useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Card, Button, Chip, Progress } from "@/components/ui-kit";
import { CRITERIA } from "@/lib/mock-data";
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
import { SubmitConfirmationModal } from "@/features/application/components/SubmitConfirmationModal";
import { SmartbotPanel } from "@/features/chatbot/components/SmartbotPanel";
import { useEvidences } from "@/features/evidence/hooks/useEvidence";
import { useSmartUXTracking } from "@/hooks/useSmartUXTracking";
import type { Criterion } from "@/lib/api/types";
import { useMemo, useState } from "react";

const criterionMap: Record<string, Criterion> = {
  "dao-duc": "ethics",
  "hoc-tap": "academic",
  "the-luc": "physical",
  "tinh-nguyen": "volunteer",
  "hoi-nhap": "integration",
};

export function AiPrecheck() {
  const nav = useNavigate();
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const { data: appRes, isLoading: appLoading } = useCurrentApplication();
  const application = appRes?.application;
  const latestPrecheck = useLatestPrecheck(application?.id);
  const evidencesQuery = useEvidences(application?.id, { limit: 100 });
  const runPrecheck = usePrecheck();
  const submitMutation = useSubmitApplication();
  const { trackAction, trackClick } = useSmartUXTracking();
  const result = latestPrecheck.data;

  const scores = CRITERIA.map((criterion) => {
    const backendCriterion = criterionMap[criterion.key];
    const criterionResult = result?.criteriaResults?.find(
      (item) => item.criterion === backendCriterion,
    );
    return typeof criterionResult?.score === "number" ? criterionResult.score : undefined;
  });
  const overall = result?.readinessScore ?? application?.readinessScore ?? 0;
  const profileState: "missing" | "uncertain" | "ready" = result
    ? result.readyToSubmit
      ? "ready"
      : result.missingItems.length > 0
        ? "missing"
        : "uncertain"
    : "missing";

  const evidenceCounts = useMemo(() => {
    const rows = Array.isArray(evidencesQuery.data) ? evidencesQuery.data : [];
    return rows.reduce<Partial<Record<Criterion, number>>>((acc, item) => {
      acc[item.criterion] = (acc[item.criterion] ?? 0) + 1;
      return acc;
    }, {});
  }, [evidencesQuery.data]);

  const submitProfile = () => {
    trackClick("student_submit_application", {
      role: "student",
      page: "ai_precheck",
      status: application?.status,
      result_type: profileState,
    });
    if (!application) {
      toast.error("Hãy tạo hồ sơ trước khi nộp.");
      nav({ to: "/app/drafts" });
      return;
    }

    setConfirmSubmitOpen(true);
  };

  const confirmSubmit = () => {
    if (!application) return;
    const status = String(application.status);
    const isSupplement = status === "supplement_required" || status === "draft_supplement";
    submitMutation.mutate(
      {
        id: application.id,
        allowSubmitWithWarnings: profileState !== "ready",
        studentNote: result?.nextBestAction,
        successMessage: isSupplement
          ? "Đã gửi lại hồ sơ bổ sung. Cán bộ sẽ tiếp tục xét duyệt."
          : "Đã nộp hồ sơ thành công. Hồ sơ đang chờ cán bộ xét duyệt.",
      },
      {
        onSuccess: () => {
          trackAction(
            isSupplement ? "student_submit_supplement" : "student_submit_application_success",
            {
              role: "student",
              page: "ai_precheck",
              status: application.status,
              target_level: application.targetLevel,
              result_type: profileState,
            },
          );
          setConfirmSubmitOpen(false);
          nav({ to: "/app/cascade" });
        },
        onError: () => {
          trackAction("student_submit_application_failed", {
            role: "student",
            page: "ai_precheck",
            status: application.status,
            target_level: application.targetLevel,
            error_code: "SUBMIT_FAILED",
          });
        },
      },
    );
  };
  const precheckNow = () => {
    trackClick("student_run_precheck", {
      role: "student",
      page: "ai_precheck",
      target_level: application?.targetLevel,
    });
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
          <Button
            variant="secondary"
            onClick={precheckNow}
            disabled={runPrecheck.isPending}
            data-smartux-tag="student_run_precheck"
          >
            {runPrecheck.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Chạy tiền kiểm
          </Button>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-glow p-8 mb-6 relative overflow-hidden"
      >
        <div className="grid md:grid-cols-3 gap-6 items-center relative">
          <div className="md:col-span-2">
            <Chip tone="brand">
              <Sparkles className="w-3 h-3" /> AI gợi ý - cán bộ xác nhận
            </Chip>
            <h2 className="text-3xl font-bold text-brand-deep mt-3">
              {result
                ? `Mức sẵn sàng tiền kiểm: ${overall}% cho cấp ${result.level ?? application?.targetLevel ?? "đang chọn"}`
                : "Bạn chưa chạy tiền kiểm"}
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
                  <Link to="/app/upload">
                    <Button data-smartux-tag="student_add_evidence">
                      Bổ sung minh chứng <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="secondary"
                    onClick={submitProfile}
                    disabled={submitMutation.isPending}
                    data-smartux-tag="student_submit_application"
                  >
                    Nộp để cán bộ xét
                  </Button>
                </>
              )}
              {profileState === "uncertain" && (
                <>
                  <Button
                    onClick={submitProfile}
                    disabled={submitMutation.isPending}
                    data-smartux-tag="student_submit_application"
                  >
                    {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Nộp để cán bộ xét <ArrowRight className="w-4 h-4" />
                  </Button>
                  <Link to="/app/evidence">
                    <Button variant="secondary" data-smartux-tag="student_view_gap_analysis">
                      Xem minh chứng cần xác minh
                    </Button>
                  </Link>
                </>
              )}
              {profileState === "ready" && (
                <>
                  <Button
                    onClick={submitProfile}
                    disabled={submitMutation.isPending}
                    data-smartux-tag="student_submit_application"
                  >
                    {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Nộp chính thức <ArrowRight className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" onClick={() => toast.success("Đã lưu kết quả tiền kiểm")}>
                    Lưu vào bản nháp
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="relative h-48 flex items-center justify-center">
            <svg viewBox="0 0 120 120" className="w-44 h-44 -rotate-90">
              <circle cx="60" cy="60" r="48" fill="none" stroke="#EEF9FF" strokeWidth="12" />
              <motion.circle
                initial={{ pathLength: 0 }}
                animate={{ pathLength: overall / 100 }}
                transition={{ duration: 1.2 }}
                cx="60"
                cy="60"
                r="48"
                fill="none"
                stroke="url(#g)"
                strokeWidth="12"
                strokeLinecap="round"
                pathLength={1}
              />
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#00AEEF" />
                  <stop offset="100%" stopColor="#0057C2" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute text-center">
              <div className="text-4xl font-extrabold text-brand-deep">
                {result ? `${overall}%` : "--"}
              </div>
              <div className="text-xs text-muted-foreground">Sẵn sàng</div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="mb-6">
        <SmartbotPanel
          applicationId={application?.id}
          contextScope="student_helpdesk"
          pageContext={{ page: "precheck" }}
          compact
          initialPrompt="Mình có thể giải thích gap tiền kiểm cấp Trường và gợi ý bước xử lý tiếp theo."
          quickPrompts={[
            "Hồ sơ cấp Trường của em còn thiếu gì?",
            "Tìm minh chứng tình nguyện",
            "Hỏi cán bộ phụ trách",
          ]}
        />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-7">
        {CRITERIA.map((c, i) => {
          const v = scores[i];
          const hasScore = typeof v === "number";
          const status = !hasScore
            ? "Chưa tiền kiểm"
            : v >= 85
              ? "Có dữ liệu"
              : v >= 70
                ? "Cần cán bộ xác minh"
                : "Còn thiếu";
          const tone = !hasScore ? "muted" : v >= 85 ? "success" : v >= 70 ? "brand" : "warning";
          return (
            <motion.div
              key={c.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card-soft p-5"
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: `${c.color}1A`, color: c.color }}
                >
                  <CriterionIcon criterion={c.key} size={18} />
                </span>
                <Chip tone={tone as "success" | "brand" | "warning" | "muted"}>{status}</Chip>
              </div>
              <div className="font-semibold text-sm">{c.label}</div>
              <div className="text-3xl font-bold text-brand-deep mt-2">
                {hasScore ? `${v}%` : "--"}
              </div>
              <div className="mt-2">
                <Progress value={hasScore ? v : 0} tint={c.color} />
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <Card>
          <h3 className="font-bold text-brand-deep mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Gap analysis
          </h3>
          <div className="space-y-3">
            {(result?.missingItems.length
              ? result.missingItems
              : [{ message: "Chưa có kết quả backend mới nhất. Bấm Chạy tiền kiểm để cập nhật." }]
            ).map((item, index) => (
              <div
                key={String(item.code ?? index)}
                className="p-3 rounded-xl bg-amber-50 border-l-4 border-amber-400"
              >
                <div className="text-sm font-semibold text-amber-900">
                  {item.message ?? "Cần bổ sung minh chứng"}
                </div>
                <div className="text-xs text-amber-700 mt-1">
                  {String(item.criterion ?? "Hồ sơ")}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card glow>
          <h3 className="font-bold text-brand-deep mb-3">Hành động đề xuất tiếp theo</h3>
          <p className="text-[11px] text-muted-foreground mb-3">
            AI gợi ý, cán bộ xác nhận quyết định cuối cùng.
          </p>
          <div className="space-y-2">
            {[
              {
                t: "Bổ sung minh chứng",
                desc: "Cập nhật các minh chứng còn thiếu trước khi nộp",
                tag: "student_add_evidence",
                action: () => nav({ to: "/app/upload" }),
              },
              {
                t: profileState === "ready" ? "Nộp chính thức" : "Nộp để cán bộ xét",
                desc: "Gửi hồ sơ sang workflow xét duyệt",
                tag: "student_submit_application",
                primary: true,
                action: submitProfile,
              },
              {
                t: "Mở chatbot",
                desc: "Hỏi thêm về quy trình xét",
                tag: "student_open_chatbot",
                action: () => {
                  trackClick("student_open_chatbot", {
                    role: "student",
                    page: "ai_precheck",
                  });
                  nav({ to: "/app/chatbot" });
                },
              },
            ].map((a) => (
              <button
                key={a.t}
                onClick={a.action}
                data-smartux-tag={a.tag}
                className={`text-left w-full p-4 rounded-xl transition-all hover:-translate-y-0.5 ${a.primary ? "bg-[#0057C2] text-white hover:bg-[#004ba8]" : "bg-[#F4FBFF] text-brand-deep hover:bg-[#EEF9FF]"}`}
              >
                <div className="font-semibold text-sm">{a.t}</div>
                <div
                  className={`text-xs mt-1 ${a.primary ? "text-white/85" : "text-muted-foreground"}`}
                >
                  {a.desc}
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {confirmSubmitOpen && application && (
        <SubmitConfirmationModal
          application={application}
          precheck={result}
          evidenceCounts={evidenceCounts}
          onCancel={() => setConfirmSubmitOpen(false)}
          onConfirm={confirmSubmit}
          pending={submitMutation.isPending}
        />
      )}
    </>
  );
}
