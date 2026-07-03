import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui-kit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useFinalizeManagerApplication } from "@/features/manager/hooks/useManager";
import type { ManagerResultItem } from "@/features/manager/types";
import type { Level } from "@/features/review/types";

const levels: Level[] = ["school", "university", "city", "central"];

const levelLabel: Record<Level, string> = {
  school: "Cấp Trường",
  university: "Cấp ĐHĐN",
  city: "Cấp Thành phố",
  central: "Cấp Trung ương",
};

const applicationStatusLabel: Record<string, string> = {
  draft: "Bản nháp",
  ready_to_submit: "Sẵn sàng nộp",
  submitted: "Đã nộp",
  under_review: "Đang xét duyệt",
  supplement_required: "Cần bổ sung",
  resolution_needed: "Cần hội ý",
  completed: "Hoàn tất",
  rejected: "Chưa đạt",
};

type DecisionMode = "target" | "lower" | "failed";

export function FinalizationDialog({
  item,
  onOpenChange,
  open,
}: {
  item: ManagerResultItem | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const finalizeMutation = useFinalizeManagerApplication();
  const [mode, setMode] = useState<DecisionMode>("target");
  const [finalLevel, setFinalLevel] = useState<Level>("school");
  const [note, setNote] = useState("");

  const lowerLevels = useMemo(() => {
    if (!item) return [];
    const index = levels.indexOf(item.targetLevel);
    return levels.slice(0, index);
  }, [item]);

  useEffect(() => {
    setMode("target");
    setFinalLevel(lowerLevels[0] ?? "school");
    setNote("");
  }, [item?.applicationId, lowerLevels]);

  if (!item) return null;

  const resolvedLevel = mode === "target" ? item.targetLevel : mode === "lower" ? finalLevel : null;
  const resolvedStatus = mode === "target" ? "passed" : mode === "lower" ? "partially_passed" : "failed";
  const noteRequired = !note.trim();
  const lowerLevelMissing = mode === "lower" && (!resolvedLevel || !lowerLevels.includes(resolvedLevel));

  const submit = () => {
    if (noteRequired || lowerLevelMissing) return;
    finalizeMutation.mutate(
      {
        applicationId: item.applicationId,
        payload: {
          finalStatus: resolvedStatus,
          finalLevel: resolvedLevel,
          finalNote: note.trim(),
          notifyStudent: true,
          overrideAggregation: false,
        },
      },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Chốt kết quả hồ sơ</DialogTitle>
          <DialogDescription>
            Quyết định này sẽ được lưu audit và thông báo cho sinh viên.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <div className="text-sm font-bold text-brand-deep">{item.studentName}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {item.studentCode ?? "--"} • {item.className ?? "--"} • {item.faculty ?? "--"}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <Info label="Cấp đăng ký" value={levelLabel[item.targetLevel]} />
              <Info label="Gợi ý" value={item.suggestedLevel ? levelLabel[item.suggestedLevel] : "--"} />
              <Info label="Readiness" value={`${item.readinessScore}`} />
              <Info label="Trạng thái" value={applicationStatusLabel[item.applicationStatus] ?? item.applicationStatus} />
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="text-sm font-bold text-brand-deep">Tổng hợp xét duyệt</div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <Info label="Tổng task" value={`${item.reviewTaskSummary.total}`} />
              <Info label="Đạt" value={`${item.reviewTaskSummary.accepted}`} />
              <Info label="Không đạt" value={`${item.reviewTaskSummary.rejected}`} />
              <Info label="Bổ sung" value={`${item.reviewTaskSummary.supplementRequired}`} />
              <Info label="Hội ý" value={`${item.reviewTaskSummary.resolutionNeeded}`} />
              <Info label="Chờ" value={`${item.reviewTaskSummary.waiting}`} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="mb-3 text-sm font-bold text-brand-deep">Quyết định cuối</div>
          <RadioGroup value={mode} onValueChange={(value) => setMode(value as DecisionMode)}>
            <DecisionOption id="target" label="Đạt cấp đăng ký" />
            <DecisionOption id="lower" label="Không đạt cấp đăng ký nhưng đạt cấp thấp hơn" />
            <DecisionOption id="failed" label="Chưa đạt" />
          </RadioGroup>

          {mode === "lower" ? (
            <label className="mt-4 block text-sm">
              <span className="mb-1 block font-semibold text-brand-deep">Cấp đạt</span>
              <select
                value={finalLevel}
                onChange={(event) => setFinalLevel(event.target.value as Level)}
                className="w-full rounded-lg border border-[#DCE7F2] px-3 py-2"
              >
                {lowerLevels.length === 0 ? (
                  <option value="">Không có cấp thấp hơn</option>
                ) : (
                  lowerLevels.map((level) => (
                    <option key={level} value={level}>
                      {levelLabel[level]}
                    </option>
                  ))
                )}
              </select>
            </label>
          ) : null}

          <label className="mt-4 block text-sm">
            <span className="mb-1 block font-semibold text-brand-deep">Ghi chú kết quả</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Nhập căn cứ và ghi chú chốt kết quả..."
              className="min-h-24 w-full rounded-lg border border-[#DCE7F2] px-3 py-2 outline-none focus:ring-2 focus:ring-[#0057C2]/20"
            />
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={submit} disabled={finalizeMutation.isPending || noteRequired || lowerLevelMissing}>
            {finalizeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Chốt kết quả
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DecisionOption({ id, label }: { id: DecisionMode; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm">
      <RadioGroupItem value={id} id={id} />
      <span className="font-medium text-brand-deep">{label}</span>
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="font-semibold text-brand-deep">{value}</div>
    </div>
  );
}
