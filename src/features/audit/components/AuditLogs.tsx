import { TopBar } from "@/components/layout/TopBar";
import { Card, Button, Chip } from "@/components/ui-kit";
import {
  useCurrentApplication,
  useApplicationTimeline,
} from "@/features/application/hooks/useApplication";
import { levelLabel, applicationStatusLabel } from "@/lib/api/types";
import {
  Loader2,
  History,
  AlertTriangle,
  Play,
  RefreshCw,
  Layers,
  Save,
  Activity,
  Upload,
  Send,
  ShieldAlert,
  Award,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

type TimelineLog = {
  id?: string;
  action?: string;
  actorName?: string | null;
  actor?: string | null;
  actorRole?: string | null;
  role?: string | null;
  createdAt?: string | null;
  time?: string | null;
  note?: string | null;
  message?: string | null;
};

// Map actions to Vietnamese labels
const actionLabelMap: Record<string, string> = {
  APPLICATION_STARTED: "Khởi tạo hồ sơ",
  TARGET_LEVEL_UPDATED: "Cập nhật cấp aim",
  DRAFT_SAVED: "Lưu bản nháp",
  METRIC_CREATED: "Thêm chỉ số học tập/rèn luyện",
  METRIC_UPDATED: "Cập nhật chỉ số học tập/rèn luyện",
  EVIDENCE_CREATED: "Thêm minh chứng mới",
  EVIDENCE_UPLOADED: "Tải lên tệp minh chứng",
  APPLICATION_SUBMITTED: "Nộp hồ sơ xét duyệt",
  REVIEW_DECISION: "Cập nhật kết quả xét duyệt",
  SUPPLEMENT_REQUESTED: "Yêu cầu bổ sung minh chứng",
};

// Format Action Raw string to friendly text if not in mapping
function formatActionLabel(action: string) {
  if (actionLabelMap[action]) return actionLabelMap[action];
  return action
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Icon for timeline item
function iconForAction(action: string) {
  switch (action) {
    case "APPLICATION_STARTED":
      return <Play className="w-4 h-4 text-emerald-500" />;
    case "TARGET_LEVEL_UPDATED":
      return <Layers className="w-4 h-4 text-[#00AEEF]" />;
    case "DRAFT_SAVED":
      return <Save className="w-4 h-4 text-slate-500" />;
    case "METRIC_CREATED":
    case "METRIC_UPDATED":
      return <Activity className="w-4 h-4 text-indigo-500" />;
    case "EVIDENCE_CREATED":
    case "EVIDENCE_UPLOADED":
      return <Upload className="w-4 h-4 text-blue-500" />;
    case "APPLICATION_SUBMITTED":
      return <Send className="w-4 h-4 text-[#0057C2]" />;
    case "REVIEW_DECISION":
      return <Award className="w-4 h-4 text-emerald-500" />;
    case "SUPPLEMENT_REQUESTED":
      return <ShieldAlert className="w-4 h-4 text-amber-500" />;
    default:
      return <History className="w-4 h-4 text-slate-400" />;
  }
}

function borderForAction(action: string) {
  switch (action) {
    case "APPLICATION_SUBMITTED":
    case "REVIEW_DECISION":
      return "bg-[var(--brand-primary-soft)]";
    case "SUPPLEMENT_REQUESTED":
      return "bg-[var(--surface-warning)]";
    case "APPLICATION_STARTED":
      return "bg-[var(--surface-success)]";
    default:
      return "bg-[var(--surface-muted)]";
  }
}

export function AuditLogs() {
  const {
    data: appRes,
    isLoading: appLoading,
    isError: appError,
    refetch: refetchApp,
  } = useCurrentApplication();
  const applicationId = appRes?.application?.id;
  const {
    data: timelineData = [],
    isLoading: timelineLoading,
    isError: timelineError,
    refetch: refetchTimeline,
  } = useApplicationTimeline(applicationId);

  const timelinePayload = timelineData as TimelineLog[] | { data?: TimelineLog[] };
  const logs = Array.isArray(timelinePayload) ? timelinePayload : (timelinePayload.data ?? []);

  const handleRetry = () => {
    refetchApp();
    if (applicationId) {
      refetchTimeline();
    }
  };

  if (appLoading) {
    return (
      <div className="space-y-6">
        <TopBar title="Đang tải..." subtitle="Đang tải dữ liệu lịch sử" />
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-slate-100 rounded-2xl w-full" />
          <div className="h-64 bg-slate-100 rounded-2xl w-full" />
        </div>
      </div>
    );
  }

  if (appError || timelineError) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertTriangle className="w-10 h-10 text-rose-500" />
        <div className="text-red-500 font-semibold">Đã xảy ra lỗi khi tải dữ liệu từ máy chủ.</div>
        <Button onClick={handleRetry}>
          <RefreshCw className="w-4 h-4 mr-2" /> Thử lại
        </Button>
      </div>
    );
  }

  if (!appRes || appRes.state === "not_started" || !appRes.application) {
    return (
      <>
        <TopBar
          title="Lịch sử hoạt động hồ sơ"
          subtitle="Theo dõi mọi cập nhật và quyết định xét duyệt"
        />
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
          <History className="w-12 h-12 text-slate-300" />
          <div className="text-muted-foreground font-semibold">
            Vui lòng tạo hồ sơ xét duyệt trước khi xem lịch sử.
          </div>
          <Link to="/app/wizard">
            <Button>
              Tạo hồ sơ ngay <Send className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </>
    );
  }

  const profile = appRes.application;

  return (
    <>
      <TopBar
        title="Lịch sử hoạt động hồ sơ"
        subtitle="Bản ghi minh bạch lịch sử và quyết định xét duyệt"
      />

      {/* Summary Card */}
      <Card className="mb-6 !p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
              Mã hồ sơ: {profile.id.slice(0, 8)}
            </span>
            <h3 className="font-extrabold text-brand-deep text-lg mt-0.5">
              Sinh viên 5 Tốt năm học {profile.schoolYear}
            </h3>
          </div>
          <div className="flex gap-4">
            <div>
              <div className="text-[10px] text-muted-foreground font-semibold text-right">
                CẤP AIM
              </div>
              <div className="font-bold text-[#0057C2] text-sm mt-0.5">
                {levelLabel[profile.targetLevel]}
              </div>
            </div>
            <div className="border-l border-slate-100 pl-4">
              <div className="text-[10px] text-muted-foreground font-semibold text-right">
                TRẠNG THÁI
              </div>
              <div className="mt-0.5">
                <Chip
                  tone={
                    profile.status === "accepted" || profile.status === "completed"
                      ? "success"
                      : profile.status === "rejected"
                        ? "error"
                        : profile.status === "needs_supplement" ||
                            profile.status === "supplement_required"
                          ? "warning"
                          : "brand"
                  }
                >
                  {applicationStatusLabel[profile.status]}
                </Chip>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="!p-5">
        <h3 className="font-bold text-brand-deep text-base mb-6 flex items-center gap-2">
          <History className="w-4 h-4 text-[#0057C2]" /> Lịch trình hồ sơ
        </h3>

        {timelineLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#0057C2]" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            Chưa có sự kiện nào được ghi lại trong hồ sơ này.
          </div>
        ) : (
          <div className="relative ml-3 space-y-5 border-l border-[#E2E8F0] pl-8">
            {logs.map((log, idx) => {
              const actor = log.actorName || log.actor || "Hệ thống";
              const role = log.actorRole || log.role;
              const formattedTime = log.createdAt
                ? new Date(log.createdAt).toLocaleString("vi-VN")
                : log.time || "";

              return (
                <div key={log.id || idx} className="relative">
                  {/* Outer circle dot */}
                  <span className="absolute -left-12 top-0.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-primary-soft)] text-[#0057C2]">
                    {iconForAction(log.action)}
                  </span>

                  <div className={`rounded-xl p-3.5 ${borderForAction(log.action)}`}>
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                      <span className="font-bold text-[13.5px] text-brand-deep">
                        {formatActionLabel(log.action)}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        {formattedTime}
                      </span>
                    </div>

                    {log.message && (
                      <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                        {log.message}
                      </p>
                    )}

                    {log.metadata && (
                      <div className="bg-slate-50 p-2.5 rounded-lg text-[11px] text-muted-foreground space-y-1 mt-2">
                        {log.metadata.before && (
                          <div>
                            • Trước:{" "}
                            <span className="line-through">{String(log.metadata.before)}</span>
                          </div>
                        )}
                        {log.metadata.after && (
                          <div>
                            • Sau:{" "}
                            <span className="font-semibold text-brand-deep">
                              {String(log.metadata.after)}
                            </span>
                          </div>
                        )}
                        {log.metadata.notes && (
                          <div>
                            • Lý do: <i>{String(log.metadata.notes)}</i>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 mt-2.5">
                      <span className="text-[10.5px] text-muted-foreground">Người thực hiện:</span>
                      <span className="text-[10.5px] font-semibold text-brand-deep">{actor}</span>
                      {role && (
                        <span className="text-[9.5px] px-1.5 py-0.5 bg-slate-100 rounded text-muted-foreground font-bold">
                          {role === "student" ? "Sinh viên" : role}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </>
  );
}
