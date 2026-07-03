import { useParams, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Card, Chip, Button, Progress, StatCard } from "@/components/ui-kit";
import { useCollectiveDetail, useLatestCollectivePrecheck } from "@/features/collective/hooks/useCollective";
import { useCollectiveMembers } from "@/features/collective/hooks/useCollectiveMembers";
import { useCollectiveEvidences } from "@/features/collective/hooks/useCollectiveEvidence";
import { Users, FileText, CheckCircle2, Loader2, ArrowLeft, Upload, Download } from "lucide-react";

const statusLabel: Record<string, string> = {
  draft: "Bản nháp",
  prechecked: "Đã tiền kiểm",
  ready_to_submit: "Sẵn sàng nộp",
  submitted: "Đã nộp",
  under_review: "Đang xét duyệt",
  supplement_required: "Cần bổ sung",
  resolution_needed: "Cần hội ý",
  completed: "Hoàn tất",
  rejected: "Từ chối",
};

export function CollectiveDetails() {
  const { id } = useParams({ from: "/app/collective/$id" });
  const { data: profile, isLoading } = useCollectiveDetail(id);
  const { data: members = [] } = useCollectiveMembers(id);
  const { data: evidences = [] } = useCollectiveEvidences(id);
  const { data: latestPrecheck } = useLatestCollectivePrecheck(id);
  const safeMembers = Array.isArray(members) ? members : [];
  const safeEvidences = Array.isArray(evidences) ? evidences : [];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <FileText className="h-10 w-10 text-slate-300" />
        <div className="font-bold text-brand-deep">Không tìm thấy hồ sơ tập thể.</div>
        <Link to="/app/collective">
          <Button variant="secondary"><ArrowLeft className="h-4 w-4" /> Quay lại</Button>
        </Link>
      </div>
    );
  }

  const summary = profile.memberSummary;
  const totalMembers = Number(summary?.totalMembers ?? safeMembers.length);
  const participatedMembers = Number(
    summary?.participatedMembers ??
      safeMembers.filter((member) => member.participationStatus === "participated").length,
  );
  const schoolSv5tMembers = Number(
    summary?.schoolSv5tMembers ??
      safeMembers.filter((member) => !["none", "unknown"].includes(member.individualSv5tLevel ?? "unknown")).length,
  );
  const higherLevelMembers = Number(
    summary?.higherLevelAchieverCount ??
      safeMembers.filter((member) => ["university", "city", "central"].includes(member.individualSv5tLevel ?? "")).length,
  );
  const readinessScore = clampPercent(Number(profile.readinessScore ?? 0));
  const checks = [
    { t: "100% sinh viên tham gia phong trào", ok: totalMembers > 0 && participatedMembers === totalMembers },
    { t: "Ít nhất 25% đạt SV5T cấp Trường", ok: totalMembers > 0 && schoolSv5tMembers / totalMembers >= 0.25 },
    { t: "Có thành viên đạt cấp cao hơn", ok: higherLevelMembers > 0 },
    { t: "Có minh chứng hoạt động tập thể", ok: safeEvidences.length > 0 },
  ];

  return (
    <>
      <TopBar
        title={`Hồ sơ tập thể ${profile.className ?? "Chưa rõ lớp"}`}
        subtitle={`${profile.schoolYear ?? "--"} • ${statusLabel[profile.status] ?? profile.status ?? "Chưa rõ trạng thái"}`}
        action={<Link to="/app/collective"><Button variant="ghost"><ArrowLeft className="h-4 w-4" /> Danh sách</Button></Link>}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tổng sinh viên" value={totalMembers} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Tham gia phong trào" value={`${participatedMembers}/${totalMembers}`} tint="#22C55E" />
        <StatCard label="Đạt SV5T cấp Trường" value={schoolSv5tMembers} tint="#00AEEF" />
        <StatCard label="Đạt cấp cao hơn" value={higherLevelMembers} tint="#0057C2" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h3 className="mb-3 font-bold text-brand-deep">Checklist tập thể</h3>
          <div className="space-y-2">
            {checks.map((check) => (
              <div key={check.t} className={`flex items-center gap-3 rounded-lg p-3 ${check.ok ? "bg-emerald-50" : "bg-amber-50"}`}>
                <CheckCircle2 className={`h-5 w-5 ${check.ok ? "text-emerald-500" : "text-amber-500"}`} />
                <div className={`flex-1 text-sm font-semibold ${check.ok ? "text-emerald-800" : "text-amber-800"}`}>{check.t}</div>
                <Chip tone={check.ok ? "success" : "warning"}>{check.ok ? "Đạt" : "Chưa đạt"}</Chip>
              </div>
            ))}
          </div>

          <h3 className="mb-3 mt-6 font-bold text-brand-deep">Minh chứng tập thể</h3>
          {safeEvidences.length === 0 ? (
            <div className="rounded-lg bg-[#F6F9FC] p-6 text-center text-sm text-muted-foreground">Chưa có minh chứng tập thể.</div>
          ) : (
            <div className="space-y-2">
              {safeEvidences.map((evidence) => (
                <div key={evidence.id} className="flex items-center gap-3 rounded-lg border border-[#EEF2F7] p-3">
                  <FileText className="h-5 w-5 text-[#0057C2]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-brand-deep">{evidence.evidenceName}</div>
                    <div className="text-xs text-muted-foreground">{evidence.collectiveCriterion ?? "collective"} • {evidence.indexingStatus}</div>
                  </div>
                  <Chip tone={evidence.status === "accepted" ? "success" : "warning"}>{evidence.status ?? "pending"}</Chip>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card glow>
          <h3 className="mb-3 font-bold text-brand-deep">Tiến độ tổng</h3>
          <div className="text-4xl font-extrabold text-brand-deep">{readinessScore}%</div>
          <div className="mt-2"><Progress value={readinessScore} /></div>
          <div className="mt-5 rounded-lg bg-[#F6F9FC] p-3 text-sm text-brand-deep">
            <div className="mb-1 font-bold">Gợi ý tiếp theo</div>
            <div className="text-muted-foreground">
              {latestPrecheck?.nextBestAction ?? "Chạy tiền kiểm để hệ thống đánh giá mức sẵn sàng của hồ sơ."}
            </div>
          </div>
          <div className="mt-5 space-y-2">
            <Button asChild className="w-full">
              <Link to="/app/collective">
              <Upload className="h-4 w-4" /> Upload minh chứng
              </Link>
            </Button>
            <Button variant="secondary" className="w-full" disabled title="Xuất báo cáo tập thể sẽ dùng màn Export khi backend hỗ trợ preset tập thể.">
              <Download className="h-4 w-4" /> Export báo cáo
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}
