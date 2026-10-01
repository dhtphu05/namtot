import { Link, useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Card, Button, Chip, Progress } from "@/components/ui-kit";
import { CRITERIA, LEVELS, CURRENT_STUDENT } from "@/lib/mock-data";
import {
  Save,
  Send,
  Sparkles,
  History,
  Target,
  FolderUp,
  FileText,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import { CriterionIcon } from "@/components/AppIcon";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import {
  useCurrentApplication,
  useStartApplication,
  useUpdateTargetLevel,
  useSaveApplicationDraft,
  useSubmitApplication,
} from "@/features/application/hooks/useApplication";
import type { ApplicationState, Level } from "@/lib/api/types";

const REC: Record<string, { label: string; tone: "success" | "warning" | "brand" | "muted" }> = {
  school: { label: "Phù hợp với hồ sơ hiện tại", tone: "success" },
  university: { label: "Phù hợp với hồ sơ hiện tại", tone: "success" },
  city: { label: "Cần bổ sung thêm", tone: "warning" },
  central: { label: "Chưa đủ dữ liệu để đánh giá", tone: "muted" },
};

const REQUIREMENT: Record<string, string> = {
  ethics: "Điểm rèn luyện ≥ 80, không vi phạm kỷ luật, có phiếu xác nhận của Khoa.",
  academic:
    "Điểm trung bình tích lũy từ 3,2 (cấp Trường) hoặc 3,6 (cấp Thành phố). Khuyến khích có nghiên cứu khoa học hoặc giải thưởng học thuật.",
  physical: "Đạt chuẩn rèn luyện thể lực, có giấy CN Sinh viên khoẻ hoặc thành tích thể thao.",
  volunteer:
    "≥ 3 ngày (Cấp Trường) / ≥ 5 ngày (Cấp Thành phố) tình nguyện, có giấy CN của tổ chức Đoàn–Hội.",
  integration: "Có chứng chỉ ngoại ngữ hợp lệ hoặc tham gia hoạt động giao lưu quốc tế / hội thảo.",
};

function getDraftData(application: ApplicationState): Record<string, unknown> {
  return (
    (application as ApplicationState & { draftData?: Record<string, unknown> }).draftData ?? {}
  );
}

const SUGGEST: Record<string, string[]> = {
  ethics: ["Phiếu điểm rèn luyện HK1", "Phiếu điểm rèn luyện HK2", "Phiếu xác nhận Khoa"],
  academic: ["Bảng điểm HK1", "Giấy khen NCKH", "Học bổng khuyến khích học tập"],
  physical: ["Giấy CN Sinh viên khoẻ", "Giải thể thao SV cấp Trường/Thành phố"],
  volunteer: ["Mùa hè xanh", "Tiếp sức mùa thi", "Hiến máu nhân đạo", "Xuân tình nguyện"],
  integration: ["IELTS / TOEIC / HSK / JLPT", "Hội thảo quốc tế", "Giao lưu sinh viên quốc tế"],
};

export function DraftWorkspace() {
  const nav = useNavigate();
  const [activeCriteria, setActiveCriteria] = useState<string>("academic");

  const { data: appRes, isLoading } = useCurrentApplication();
  const startMutation = useStartApplication();
  const updateLevelMutation = useUpdateTargetLevel();
  const saveDraftMutation = useSaveApplicationDraft();
  const submitMutation = useSubmitApplication();

  const [notes, setNotes] = useState("");

  // Prepopulate notes if draft data has it
  useEffect(() => {
    if (appRes?.application) {
      const draft = getDraftData(appRes.application);
      setNotes(String(draft.personalStatement ?? draft.note ?? ""));
    }
  }, [appRes]);

  // Debounced Autosave
  useEffect(() => {
    if (appRes?.application && notes) {
      const timeoutId = setTimeout(() => {
        saveDraftMutation.mutate({
          id: appRes.application!.id,
          draftData: { ...getDraftData(appRes.application!), personalStatement: notes },
          step: "student_profile",
        });
        toast.info("Đã tự động lưu bản nháp.");
      }, 1500);
      return () => clearTimeout(timeoutId);
    }
  }, [notes]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0057C2]" />
      </div>
    );
  }

  if (!appRes || appRes.state === "not_started" || !appRes.application) {
    return (
      <div className="flex flex-col items-center justify-center p-10 h-full min-h-[70vh] text-center">
        <div className="w-20 h-20 rounded-3xl gradient-brand flex items-center justify-center text-white mb-6">
          <FileText className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-brand-deep">Bạn chưa có hồ sơ năm học này</h2>
        <p className="text-muted-foreground mt-2 mb-6 max-w-md">
          Bắt đầu tạo hồ sơ Sinh viên 5 tốt ngay bây giờ để được hướng dẫn chi tiết từng bước.
        </p>
        <Button onClick={() => startMutation.mutate({})} disabled={startMutation.isPending}>
          {startMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          Bắt đầu tạo hồ sơ
        </Button>
      </div>
    );
  }

  const profile = appRes.application;

  const onSave = () => {
    saveDraftMutation.mutate(
      {
        id: profile.id,
        draftData: { ...getDraftData(profile), personalStatement: notes },
        step: "student_profile",
      },
      {
        onSuccess: () => toast.success("Đã lưu bản nháp thủ công"),
      },
    );
  };

  const onSubmit = () => {
    submitMutation.mutate(
      { id: profile.id, allowSubmitWithWarnings: true },
      {
        onSuccess: () => nav({ to: "/app/evidence" }),
      },
    );
  };

  const onChangeLevel = (lvl: Level) => {
    updateLevelMutation.mutate(
      { id: profile.id, targetLevel: lvl },
      {
        onSuccess: () => toast.success("Đã cập nhật cấp aim cho hồ sơ hiện tại."),
      },
    );
  };

  return (
    <>
      <TopBar
        title="Bản nháp hồ sơ SV5T"
        subtitle={`Năm học ${profile.schoolYear} • Cá nhân`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onSave} disabled={saveDraftMutation.isPending}>
              <Save className="w-4 h-4" />{" "}
              {saveDraftMutation.isPending ? "Đang lưu..." : "Lưu bản nháp"}
            </Button>
            <Button onClick={onSubmit} disabled={submitMutation.isPending}>
              <Send className="w-4 h-4" /> Nộp chính thức
            </Button>
          </div>
        }
      />

      {/* Profile summary */}
      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-4">
          <img src={CURRENT_STUDENT.avatar} className="w-14 h-14 rounded-2xl object-cover" alt="" />
          <div className="min-w-0">
            <div className="font-bold text-brand-deep">
              {profile.basicInfo?.fullName || CURRENT_STUDENT.name} •{" "}
              {profile.basicInfo?.studentCode || CURRENT_STUDENT.mssv}
            </div>
            <div className="text-xs text-muted-foreground">
              {profile.basicInfo?.faculty || CURRENT_STUDENT.khoa} •{" "}
              {profile.basicInfo?.className || CURRENT_STUDENT.lop}
            </div>
          </div>
          <span className="text-xs px-3 py-1 rounded-full font-semibold ml-auto bg-amber-100 text-amber-800">
            {profile.status === "draft" ? "Bản nháp" : profile.status}
          </span>
          <Chip tone="brand">
            <Target className="w-3 h-3" /> Aim:{" "}
            {LEVELS.find((l) => l.key === profile.targetLevel)?.label || profile.targetLevel}
          </Chip>
          <div className="w-48">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Tiến độ (Sơ bộ)</span>
              <span className="font-bold text-brand-deep">{profile.progress || 0}%</span>
            </div>
            <Progress value={profile.progress || 0} />
          </div>
        </div>
        <div className="mt-4 p-3 rounded-xl bg-[#EEF9FF] text-sm text-brand-deep flex items-start gap-2">
          <FileText className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            <b>Bạn chỉ nộp một hồ sơ duy nhất cho mùa xét này.</b> 5TOT sẽ kiểm tra hồ sơ từ cấp aim
            bạn chọn xuống các cấp phù hợp hơn.
          </span>
        </div>
      </Card>

      {/* Target level cards */}
      <h3 className="font-bold text-brand-deep mb-3 flex items-center gap-2">
        <Target className="w-4 h-4" /> Cấp aim của hồ sơ
      </h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {LEVELS.map((l) => {
          const keyMap: Record<string, Level> = {
            truong: "school",
            dhdn: "university",
            "thanh-pho": "city",
            "trung-uong": "central",
          };
          const backendLvl = keyMap[l.key] || l.key;
          const active = backendLvl === profile.targetLevel;
          const rec = REC[backendLvl] || { label: "N/A", tone: "muted" };
          return (
            <button
              key={l.key}
              onClick={() => onChangeLevel(backendLvl as Level)}
              className={`text-left p-4 rounded-2xl transition-all hover:-translate-y-0.5 ${active ? "bg-[#0057C2] text-white" : "card-soft"}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[11px] uppercase font-bold tracking-wider ${active ? "text-white/85" : "text-muted-foreground"}`}
                >
                  Cấp {l.difficulty}/4
                </span>
                {active && <Chip tone="brand">Đang aim</Chip>}
              </div>
              <div className={`font-bold mt-1 ${active ? "text-white" : "text-brand-deep"}`}>
                {l.label}
              </div>
              <div
                className={`text-[11px] mt-1 ${active ? "text-white/85" : "text-muted-foreground"}`}
              >
                {l.desc}
              </div>
              <div className="mt-3">
                <Chip tone={rec.tone}>{rec.label}</Chip>
              </div>
            </button>
          );
        })}
      </div>

      {/* Five criteria tabs */}
      <h3 className="font-bold text-brand-deep mb-3 flex items-center gap-2">
        <FileText className="w-4 h-4" /> 5 tiêu chí Sinh viên 5 tốt
      </h3>
      <div className="flex flex-wrap gap-2 mb-4">
        {CRITERIA.map((c) => {
          const keyMap: Record<string, string> = {
            "dao-duc": "ethics",
            "hoc-tap": "academic",
            "the-luc": "physical",
            "tinh-nguyen": "volunteer",
            "hoi-nhap": "integration",
          };
          const backendKey = keyMap[c.key] || c.key;
          const active = backendKey === activeCriteria;
          return (
            <button
              key={c.key}
              onClick={() => setActiveCriteria(backendKey)}
              className={`px-4 py-2 rounded-2xl text-sm font-semibold transition-all flex items-center gap-2 ${active ? "bg-[#0057C2] text-white" : "card-soft hover:-translate-y-0.5"}`}
            >
              <span
                className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: c.color }}
              >
                <CriterionIcon criterion={c.key} size={12} color="#fff" />
              </span>
              <span>{c.label}</span>
            </button>
          );
        })}
      </div>

      <Card className="mb-5">
        <CriteriaSection criteriaKey={activeCriteria} />
      </Card>

      {/* Bottom actions */}
      <div className="card-soft p-5 flex flex-wrap items-center gap-3">
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <History className="w-4 h-4" /> Đã cập nhật lúc{" "}
          <b className="text-brand-deep ml-1">{profile.lastUpdatedAt}</b>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => nav({ to: "/app/audit" })}>
            <History className="w-4 h-4" /> Xem lịch sử cập nhật
          </Button>
          <Button variant="secondary" onClick={() => nav({ to: "/app/evidence" })}>
            <FolderUp className="w-4 h-4" /> Mở minh chứng theo tiêu chí
          </Button>
          <Button onClick={onSubmit} disabled={submitMutation.isPending}>
            <Send className="w-4 h-4" /> Nộp chính thức
          </Button>
        </div>
      </div>
    </>
  );
}

function CriteriaSection({ criteriaKey }: { criteriaKey: string }) {
  const c =
    Object.values(CRITERIA).find((x) => {
      const keyMap: Record<string, string> = {
        "dao-duc": "ethics",
        "hoc-tap": "academic",
        "the-luc": "physical",
        "tinh-nguyen": "volunteer",
        "hoi-nhap": "integration",
      };
      return keyMap[x.key] === criteriaKey || x.key === criteriaKey;
    }) || CRITERIA[0];
  const suggested = SUGGEST[criteriaKey] ?? [];

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div>
          <h4 className="font-bold text-brand-deep text-lg flex items-center gap-2">
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
              style={{ background: c.color }}
            >
              {c.short.slice(0, 2)}
            </span>
            {c.label}
          </h4>
          <p className="text-sm text-muted-foreground mt-1">{REQUIREMENT[criteriaKey]}</p>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-[#F4FBFF] text-center">
        <div className="font-semibold text-brand-deep">Xem và quản lý minh chứng</div>
        <div className="text-xs text-muted-foreground mt-1 mb-4">
          Minh chứng của bạn được quản lý tập trung ở Workspace Minh chứng.
        </div>
        <Link to="/app/evidence">
          <Button>
            <FolderUp className="w-4 h-4 mr-2" /> Mở workspace minh chứng
          </Button>
        </Link>
      </div>

      {suggested.length > 0 && (
        <div className="mt-4 p-4 rounded-2xl bg-[#EEF9FF]">
          <div className="text-xs font-bold text-brand-deep mb-2 uppercase">Minh chứng gợi ý</div>
          <div className="flex flex-wrap gap-2">
            {suggested.map((s) => (
              <Chip key={s} tone="brand">
                {s}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
