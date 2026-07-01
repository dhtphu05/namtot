import { useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Card, Button, Chip } from "@/components/ui-kit";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, ArrowRight, Save, Send, AlertTriangle, History, FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import { useCurrentApplication, useStartApplication, useUpdateTargetLevel, useSaveApplicationDraft, useSubmitApplication, useCreateMetric, useUpdateMetric, useApplicationMetrics } from "@/features/application/hooks/useApplication";
import { levelLabel, applicationStatusLabel, type Level, type ApplicationStatus, type MetricInput } from "@/lib/api/types";
import { MEDIA } from "@/lib/mock-data";
import { Link } from "@tanstack/react-router";

export function Wizard() {
  const nav = useNavigate();
  const { data: appRes, isLoading, isError, refetch } = useCurrentApplication();
  const startMutation = useStartApplication();
  const updateTargetLvlMutation = useUpdateTargetLevel();
  const saveDraftMutation = useSaveApplicationDraft();
  const submitMutation = useSubmitApplication();
  const createMetricMutation = useCreateMetric();
  const updateMetricMutation = useUpdateMetric();

  const [draftForm, setDraftForm] = useState({
    faculty: "",
    className: "",
    phone: "",
    personalStatement: "",
    achievementsSummary: "",
    volunteerSummary: "",
    integrationSummary: "",
  });

  const [metricsForm, setMetricsForm] = useState({
    gpa: "",
    conductScore: "",
    physicalScore: "",
    volunteerDays: "",
    languageCertificate: "",
  });

  const [localLevel, setLocalLevel] = useState<Level | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [metricsSaveStatus, setMetricsSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showConfirm, setShowConfirm] = useState(false);

  const profile = appRes?.application;
  const { data: metricsList = [] } = useApplicationMetrics(profile?.id);

  // Prepopulate form when data loads
  useEffect(() => {
    if (appRes?.application) {
      const app = appRes.application;
      setLocalLevel(app.targetLevel);
      const draft = (app as any).draftData || {};
      setDraftForm({
        faculty: draft.faculty || app.basicInfo?.faculty || "",
        className: draft.className || app.basicInfo?.className || "",
        phone: draft.phone || app.basicInfo?.phone || "",
        personalStatement: draft.personalStatement || draft.note || "",
        achievementsSummary: draft.achievementsSummary || "",
        volunteerSummary: draft.volunteerSummary || "",
        integrationSummary: draft.integrationSummary || "",
      });
    }
  }, [appRes]);

  // Prepopulate metrics when data loads
  useEffect(() => {
    if (metricsList && metricsList.length > 0) {
      const gpaItem = metricsList.find((m: any) => m.metricType === "gpa");
      const conductItem = metricsList.find((m: any) => m.metricType === "conduct_score");
      const physicalItem = metricsList.find((m: any) => m.metricType === "physical_score");
      const volunteerItem = metricsList.find((m: any) => m.metricType === "volunteer_days");
      const integrationItem = metricsList.find((m: any) => m.metricType === "language_certificate");

      setMetricsForm({
        gpa: gpaItem ? String(gpaItem.valueNumber ?? "") : "",
        conductScore: conductItem ? String(conductItem.valueNumber ?? "") : "",
        physicalScore: physicalItem ? String(physicalItem.valueNumber ?? physicalItem.valueText ?? "") : "",
        volunteerDays: volunteerItem ? String(volunteerItem.valueNumber ?? "") : "",
        languageCertificate: integrationItem ? String(integrationItem.valueText ?? "") : "",
      });
    }
  }, [metricsList]);

  const isEditable = profile && ["draft", "prechecked", "ready_to_submit", "supplement_required"].includes(profile.status);

  // Debounced Autosave for personal info draft (1000ms)
  useEffect(() => {
    const appId = profile?.id;
    if (!appId || !isEditable) return;

    setSaveStatus("saving");
    const delayDebounce = setTimeout(() => {
      saveDraftMutation.mutate(
        {
          id: appId,
          draftData: draftForm,
          step: "student_profile",
        },
        {
          onSuccess: () => setSaveStatus("saved"),
          onError: () => setSaveStatus("error"),
        }
      );
    }, 1000);

    return () => clearTimeout(delayDebounce);
  }, [draftForm]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <TopBar title="Đang tải..." subtitle="Vui lòng chờ trong giây lát" />
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-slate-100 rounded-md w-1/3" />
          <div className="h-64 bg-slate-100 rounded-2xl w-full" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="text-red-500 font-semibold">Đã xảy ra lỗi khi tải hồ sơ từ máy chủ.</div>
        <Button onClick={() => refetch()}>Thử lại</Button>
      </div>
    );
  }

  const handleStart = () => {
    startMutation.mutate(
      {
        schoolYear: "2025-2026",
        applicationType: "individual",
        targetLevel: "school",
      },
      {
        onSuccess: () => {
          toast.success("Khởi tạo hồ sơ thành công!");
          refetch();
        },
      }
    );
  };

  // If no application exists, show the start CTA screen
  if (!appRes || appRes.state === "not_started" || !profile) {
    return (
      <>
        <TopBar title="Bản nháp hồ sơ" subtitle="Bắt đầu hồ sơ Sinh viên 5 tốt cá nhân" />
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0057C2] text-white rounded-2xl p-8 mb-7 relative overflow-hidden shadow-lg"
        >
          <div className="absolute inset-0 wave-bg opacity-30" />
          <div className="relative flex flex-col justify-between items-start gap-6">
            <div>
              <h2 className="text-3xl font-extrabold leading-tight">Bắt đầu hồ sơ Sinh viên 5 tốt</h2>
              <p className="text-white/85 mt-2 max-w-xl text-sm leading-relaxed">
                Bạn chỉ cần tạo một hồ sơ và chọn cấp aim mong muốn. Hệ thống/cán bộ sẽ xét theo tiêu chí tương ứng. Minh chứng được bổ sung ở mục Minh chứng.
              </p>
            </div>
            <Button
              className="bg-white text-[#0057C2] hover:bg-slate-100 font-semibold"
              onClick={handleStart}
              disabled={startMutation.isPending}
            >
              {startMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Đang khởi tạo...
                </>
              ) : (
                <>
                  Khởi tạo hồ sơ ngay <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </>
    );
  }

  const handleUpdateLevel = (lvl: Level) => {
    if (!isEditable) return;
    setLocalLevel(lvl);
    updateTargetLvlMutation.mutate(
      { id: profile.id, targetLevel: lvl },
      {
        onSuccess: () => {
          toast.success("Đã cập nhật cấp aim xét duyệt.");
          refetch();
        },
        onError: () => {
          toast.error("Không thể cập nhật cấp aim.");
          setLocalLevel(profile.targetLevel);
        },
      }
    );
  };

  const handleManualSave = () => {
    setSaveStatus("saving");
    saveDraftMutation.mutate(
      {
        id: profile.id,
        draftData: draftForm,
        step: "student_profile",
      },
      {
        onSuccess: () => {
          setSaveStatus("saved");
          toast.success("Đã lưu bản nháp thành công!");
          setTimeout(() => setSaveStatus("idle"), 2000);
        },
        onError: () => {
          setSaveStatus("error");
          toast.error("Không thể lưu bản nháp.");
          setTimeout(() => setSaveStatus("idle"), 3000);
        },
      }
    );
  };

  const handleSaveMetrics = async () => {
    if (!isEditable) return;

    // Client validation
    const gpaVal = parseFloat(metricsForm.gpa);
    if (!isNaN(gpaVal) && (gpaVal < 0 || gpaVal > 10)) {
      toast.error("GPA học tập phải nằm trong khoảng từ 0 đến 10!");
      return;
    }

    const drlVal = parseFloat(metricsForm.conductScore);
    if (!isNaN(drlVal) && (drlVal < 0 || drlVal > 100)) {
      toast.error("Điểm rèn luyện phải nằm trong khoảng từ 0 đến 100!");
      return;
    }

    const volVal = parseFloat(metricsForm.volunteerDays);
    if (!isNaN(volVal) && volVal < 0) {
      toast.error("Số ngày tình nguyện không được âm!");
      return;
    }

    setMetricsSaveStatus("saving");

    try {
      const itemsToSave = [
        {
          metricType: "gpa" as const,
          criterion: "academic" as const,
          valueNumber: isNaN(gpaVal) ? undefined : gpaVal,
          unit: "điểm",
        },
        {
          metricType: "conduct_score" as const,
          criterion: "ethics" as const,
          valueNumber: isNaN(drlVal) ? undefined : drlVal,
          unit: "điểm",
        },
        {
          metricType: "physical_score" as const,
          criterion: "physical" as const,
          valueText: metricsForm.physicalScore || undefined,
          unit: "chỉ số",
        },
        {
          metricType: "volunteer_days" as const,
          criterion: "volunteer" as const,
          valueNumber: isNaN(volVal) ? undefined : volVal,
          unit: "ngày",
        },
        {
          metricType: "language_certificate" as const,
          criterion: "integration" as const,
          valueText: metricsForm.languageCertificate || undefined,
          unit: "chứng chỉ",
        },
      ];

      for (const item of itemsToSave) {
        if (item.valueNumber === undefined && !item.valueText) continue;

        const existing = metricsList.find((m: any) => m.metricType === item.metricType);
        if (existing) {
          await updateMetricMutation.mutateAsync({
            metricId: existing.id,
            applicationId: profile.id,
            data: {
              valueNumber: item.valueNumber,
              valueText: item.valueText,
            },
          });
        } else {
          await createMetricMutation.mutateAsync({
            applicationId: profile.id,
            data: {
              ...item,
              source: "student_input",
            } as MetricInput,
          });
        }
      }

      setMetricsSaveStatus("saved");
      toast.success("Đã lưu các chỉ số thành công!");
      setTimeout(() => setMetricsSaveStatus("idle"), 2000);
      refetch();
    } catch (e) {
      setMetricsSaveStatus("error");
      toast.error("Lỗi khi lưu chỉ số.");
      setTimeout(() => setMetricsSaveStatus("idle"), 3000);
    }
  };

  const handleSubmit = () => {
    submitMutation.mutate(
      { id: profile.id, allowSubmitWithWarnings: true },
      {
        onSuccess: () => {
          toast.success("Nộp hồ sơ thành công!");
          setShowConfirm(false);
          refetch().then(() => {
            nav({ to: "/app/evidence" });
          });
        },
        onError: (err: any) => {
          toast.error(`Nộp hồ sơ thất bại: ${err.message || "Vui lòng thử lại"}`);
        },
      }
    );
  };

  return (
    <>
      <TopBar title="Thông tin hồ sơ cá nhân" subtitle={`Hồ sơ cá nhân năm học ${profile.schoolYear}`} />

      {/* Guide notice */}
      <div className="card-soft p-4 mb-6 text-sm text-[#0057C2] bg-[#EEF9FF] border border-[#BCE4FA] rounded-xl flex items-start gap-2.5">
        <AlertTriangle className="w-5 h-5 shrink-0 text-[#00AEEF]" />
        <div>
          <b>Hướng dẫn:</b> Bạn chỉ cần tạo một hồ sơ duy nhất cho năm học này và chọn cấp aim mong muốn. Hệ thống/cán bộ sẽ xét duyệt theo tiêu chí tương ứng. Minh chứng được bổ sung ở mục <Link to="/app/evidence" className="underline font-semibold">Minh chứng</Link>.
        </div>
      </div>

      {!isEditable && (
        <div className="card-soft p-4 mb-6 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
          <div>
            <b>Hồ sơ không thể chỉnh sửa:</b> Trạng thái hồ sơ hiện tại là <b>{applicationStatusLabel[profile.status]}</b>. Thông tin lúc này ở chế độ chỉ đọc.
            <div className="flex gap-4 mt-2">
              <Link to="/app/evidence" className="underline font-semibold flex items-center gap-1"><Upload className="w-3.5 h-3.5" /> Xem minh chứng</Link>
              <Link to="/app/audit" className="underline font-semibold flex items-center gap-1"><History className="w-3.5 h-3.5" /> Xem timeline</Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Aim target Level */}
          <Card>
            <h3 className="font-bold text-brand-deep text-lg mb-3">1. Cấp aim mong muốn xét duyệt</h3>
            <div className="grid grid-cols-2 gap-4">
              {(["school", "university", "city", "central"] as Level[]).map((lvl) => {
                const active = localLevel === lvl;
                const isPending = updateTargetLvlMutation.isPending && localLevel === lvl;
                return (
                  <button
                    key={lvl}
                    disabled={!isEditable || updateTargetLvlMutation.isPending}
                    onClick={() => handleUpdateLevel(lvl)}
                    className={`p-5 rounded-2xl text-left border transition-all flex flex-col justify-between h-32 hover:-translate-y-0.5 ${active ? "bg-[#0057C2] text-white border-[#0057C2]" : "bg-white border-[#EEF2F7] hover:bg-slate-50"} disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    <div>
                      <div className={`text-xs uppercase font-bold tracking-wider ${active ? "text-white/80" : "text-muted-foreground"}`}>{lvl === "school" ? "Cấp 1/4" : lvl === "university" ? "Cấp 2/4" : lvl === "city" ? "Cấp 3/4" : "Cấp 4/4"}</div>
                      <div className="font-bold text-base mt-1">{levelLabel[lvl]}</div>
                    </div>
                    {isPending && <Loader2 className="w-4 h-4 animate-spin text-white self-end" />}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Section 2: Personal Profile Forms */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-brand-deep text-lg">2. Thông tin chi tiết</h3>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                {saveStatus === "saving" && <span className="text-blue-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Đang tự động lưu...</span>}
                {saveStatus === "saved" && <span className="text-emerald-600 font-semibold">✓ Đã tự động lưu nháp</span>}
                {saveStatus === "error" && <span className="text-rose-500 font-semibold">⚠ Lỗi khi lưu nháp</span>}
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Khoa / Viện phụ trách</label>
                  <input
                    value={draftForm.faculty}
                    disabled={!isEditable}
                    onChange={(e) => setDraftForm({ ...draftForm, faculty: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F4FBFF] text-sm font-medium text-brand-deep focus:outline-none focus:ring-2 focus:ring-[#00AEEF] disabled:opacity-60"
                    placeholder="Công nghệ Thông tin"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Lớp học sinh hoạt</label>
                  <input
                    value={draftForm.className}
                    disabled={!isEditable}
                    onChange={(e) => setDraftForm({ ...draftForm, className: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F4FBFF] text-sm font-medium text-brand-deep focus:outline-none focus:ring-2 focus:ring-[#00AEEF] disabled:opacity-60"
                    placeholder="21IT1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Số điện thoại liên hệ</label>
                <input
                  value={draftForm.phone}
                  disabled={!isEditable}
                  onChange={(e) => setDraftForm({ ...draftForm, phone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F4FBFF] text-sm font-medium text-brand-deep focus:outline-none focus:ring-2 focus:ring-[#00AEEF] disabled:opacity-60"
                  placeholder="0905XXXXXX"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Ghi chú cá nhân / Giới thiệu</label>
                <textarea
                  value={draftForm.personalStatement}
                  disabled={!isEditable}
                  onChange={(e) => setDraftForm({ ...draftForm, personalStatement: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F4FBFF] text-sm font-medium text-brand-deep focus:outline-none focus:ring-2 focus:ring-[#00AEEF] min-h-[80px] disabled:opacity-60"
                  placeholder="Giới thiệu bản thân và mục tiêu phấn đấu..."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Tóm tắt thành tích Học tập tốt</label>
                <textarea
                  value={draftForm.achievementsSummary}
                  disabled={!isEditable}
                  onChange={(e) => setDraftForm({ ...draftForm, achievementsSummary: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F4FBFF] text-sm font-medium text-brand-deep focus:outline-none focus:ring-2 focus:ring-[#00AEEF] min-h-[80px] disabled:opacity-60"
                  placeholder="Nêu tóm tắt thành tích học tập và nghiên cứu khoa học..."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Tóm tắt hoạt động Tình nguyện tốt</label>
                <textarea
                  value={draftForm.volunteerSummary}
                  disabled={!isEditable}
                  onChange={(e) => setDraftForm({ ...draftForm, volunteerSummary: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F4FBFF] text-sm font-medium text-brand-deep focus:outline-none focus:ring-2 focus:ring-[#00AEEF] min-h-[80px] disabled:opacity-60"
                  placeholder="Nêu tóm tắt các hoạt động tình nguyện tiêu biểu đã tham gia..."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Tóm tắt thành tích Hội nhập tốt</label>
                <textarea
                  value={draftForm.integrationSummary}
                  disabled={!isEditable}
                  onChange={(e) => setDraftForm({ ...draftForm, integrationSummary: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F4FBFF] text-sm font-medium text-brand-deep focus:outline-none focus:ring-2 focus:ring-[#00AEEF] min-h-[80px] disabled:opacity-60"
                  placeholder="Nêu tóm tắt ngoại ngữ, tin học, kỹ năng mềm và giao lưu quốc tế..."
                />
              </div>
            </div>

            {isEditable && (
              <div className="flex gap-4 mt-6">
                <Button variant="secondary" onClick={handleManualSave} disabled={saveDraftMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" /> Lưu bản nháp thủ công
                </Button>
              </div>
            )}
          </Card>

          {/* Section 3: Quantitative Metrics */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-brand-deep text-lg">3. Chỉ số học tập & rèn luyện cơ bản</h3>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                {metricsSaveStatus === "saving" && <span className="text-blue-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Đang lưu...</span>}
                {metricsSaveStatus === "saved" && <span className="text-emerald-600 font-semibold">✓ Đã lưu thành công</span>}
                {metricsSaveStatus === "error" && <span className="text-rose-500 font-semibold">⚠ Lỗi khi lưu chỉ số</span>}
              </div>
            </div>

            <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200 mb-4">
              * Chỉ số này giúp cán bộ đối chiếu nhanh, không thay thế minh chứng chính thức nếu tiêu chí yêu cầu.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">GPA (Điểm học tập)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={metricsForm.gpa}
                    disabled={!isEditable}
                    onChange={(e) => setMetricsForm({ ...metricsForm, gpa: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F4FBFF] text-sm font-medium text-brand-deep focus:outline-none focus:ring-2 focus:ring-[#00AEEF] disabled:opacity-60"
                    placeholder="Ví dụ: 3.5 hoặc 8.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Điểm rèn luyện</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={metricsForm.conductScore}
                    disabled={!isEditable}
                    onChange={(e) => setMetricsForm({ ...metricsForm, conductScore: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F4FBFF] text-sm font-medium text-[#0057C2] focus:outline-none focus:ring-2 focus:ring-[#00AEEF] disabled:opacity-60"
                    placeholder="0 - 100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Thể lực (Đạt/Chưa đạt)</label>
                  <select
                    value={metricsForm.physicalScore}
                    disabled={!isEditable}
                    onChange={(e) => setMetricsForm({ ...metricsForm, physicalScore: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F4FBFF] text-sm font-medium text-[#0057C2] focus:outline-none focus:ring-2 focus:ring-[#00AEEF] disabled:opacity-60"
                  >
                    <option value="">-- Chọn trạng thái --</option>
                    <option value="Đạt">Đạt tiêu chuẩn thể lực</option>
                    <option value="Chưa đạt">Chưa đạt</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Số ngày tình nguyện</label>
                  <input
                    type="number"
                    min="0"
                    value={metricsForm.volunteerDays}
                    disabled={!isEditable}
                    onChange={(e) => setMetricsForm({ ...metricsForm, volunteerDays: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F4FBFF] text-sm font-medium text-brand-deep focus:outline-none focus:ring-2 focus:ring-[#00AEEF] disabled:opacity-60"
                    placeholder="Ví dụ: 5"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Ngoại ngữ / Chứng chỉ hội nhập</label>
                <input
                  type="text"
                  value={metricsForm.languageCertificate}
                  disabled={!isEditable}
                  onChange={(e) => setMetricsForm({ ...metricsForm, languageCertificate: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F4FBFF] text-sm font-medium text-brand-deep focus:outline-none focus:ring-2 focus:ring-[#00AEEF] disabled:opacity-60"
                  placeholder="Ví dụ: IELTS 6.5, TOEIC 750, hoặc hoạt động ngoại khóa..."
                />
              </div>
            </div>

            {isEditable && (
              <div className="flex gap-4 mt-6">
                <Button variant="secondary" onClick={handleSaveMetrics} disabled={createMetricMutation.isPending || updateMetricMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" /> Lưu chỉ số học tập & rèn luyện
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar Summary & Submit */}
        <div className="space-y-6">
          <Card>
            <h3 className="font-bold text-brand-deep text-lg mb-3">Tóm tắt hồ sơ</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Mã hồ sơ:</span>
                <span className="font-semibold text-brand-deep">{profile.id.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Năm học:</span>
                <span className="font-semibold text-brand-deep">{profile.schoolYear}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Cấp aim:</span>
                <span className="font-semibold text-brand-deep">{levelLabel[localLevel || profile.targetLevel]}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Trạng thái:</span>
                <span className="font-semibold text-brand-deep">{applicationStatusLabel[profile.status]}</span>
              </div>
            </div>

            {isEditable && (
              <div className="mt-6">
                <Button className="w-full" onClick={() => setShowConfirm(true)} disabled={submitMutation.isPending}>
                  <Send className="w-4 h-4 mr-2" /> Nộp hồ sơ xét duyệt
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-[#0057C2]/15 text-[#0057C2] flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-brand-deep text-xl">Xác nhận nộp hồ sơ</h3>
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                  Hồ sơ sẽ được chuyển sang trạng thái đang xét duyệt. Bạn vẫn có thể bổ sung minh chứng nếu cán bộ yêu cầu trong quá trình xét duyệt.
                </p>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="ghost" className="flex-1" onClick={() => setShowConfirm(false)}>
                  Hủy
                </Button>
                <Button className="flex-1" onClick={handleSubmit} disabled={submitMutation.isPending}>
                  {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Xác nhận nộp"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
