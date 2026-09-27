import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, Card } from "@/components/ui-kit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatVietnamDateTime,
  fromVietnamDateTimeInput,
  toVietnamDateTimeInput,
} from "@/lib/datetime-vietnam";
import { type CityReviewSeason, type SaveCityReviewSeasonInput } from "../api/city-season";
import { useCityReviewSeason, useSaveCityReviewSeason } from "../hooks/useCitySeason";

type FormValues = Record<keyof Omit<SaveCityReviewSeasonInput, "schoolYear" | "reason">, string>;

const emptyForm: FormValues = {
  submissionOpensAt: "",
  submissionClosesAt: "",
  reviewDeadlineAt: "",
  supplementDeadlineAt: "",
  finalizationDeadlineAt: "",
};

const dateFields: Array<{ key: keyof FormValues; label: string }> = [
  { key: "submissionOpensAt", label: "Mở đợt nộp hồ sơ" },
  { key: "submissionClosesAt", label: "Đóng đợt nộp hồ sơ" },
  { key: "reviewDeadlineAt", label: "Hạn hoàn tất review" },
  { key: "supplementDeadlineAt", label: "Hạn xử lý bổ sung" },
  { key: "finalizationDeadlineAt", label: "Hạn chốt kết quả" },
];

export function CityReviewSeasonAdministration({
  defaultSchoolYear,
}: {
  defaultSchoolYear: string;
}) {
  const [manualSchoolYear, setManualSchoolYear] = useState("");
  const schoolYear = /^\d{4}-\d{4}$/.test(defaultSchoolYear) ? defaultSchoolYear : manualSchoolYear;
  const season = useCityReviewSeason(schoolYear);
  const saveSeason = useSaveCityReviewSeason();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [reason, setReason] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    setEditing(false);
    setReason("");
    setValidationMessage("");
  }, [schoolYear]);

  function beginCreate() {
    setForm(emptyForm);
    setReason("");
    setValidationMessage("");
    setEditing(true);
  }

  function beginEdit(value: CityReviewSeason) {
    setForm({
      submissionOpensAt: toVietnamDateTimeInput(value.submissionOpensAt),
      submissionClosesAt: toVietnamDateTimeInput(value.submissionClosesAt),
      reviewDeadlineAt: toVietnamDateTimeInput(value.reviewDeadlineAt),
      supplementDeadlineAt: toVietnamDateTimeInput(value.supplementDeadlineAt),
      finalizationDeadlineAt: toVietnamDateTimeInput(value.finalizationDeadlineAt),
    });
    setReason("");
    setValidationMessage("");
    setEditing(true);
  }

  function requestSave() {
    setValidationMessage("");
    if (!/^\d{4}-\d{4}$/.test(schoolYear)) {
      setValidationMessage("Nhập năm học theo định dạng YYYY-YYYY.");
      return;
    }
    if (!reason.trim()) {
      setValidationMessage("Nhập lý do thay đổi lịch.");
      return;
    }
    const values = Object.fromEntries(
      dateFields.map(({ key }) => [key, fromVietnamDateTimeInput(form[key])]),
    ) as Record<keyof FormValues, string | null>;
    if (Object.values(values).some((value) => value === null)) {
      setValidationMessage("Chọn đầy đủ các mốc thời gian.");
      return;
    }
    if (Date.parse(values.submissionOpensAt!) >= Date.parse(values.submissionClosesAt!)) {
      setValidationMessage("Thời điểm đóng nộp phải sau thời điểm mở nộp.");
      return;
    }
    setConfirmOpen(true);
  }

  async function confirmSave() {
    const payload: SaveCityReviewSeasonInput = {
      schoolYear,
      submissionOpensAt: fromVietnamDateTimeInput(form.submissionOpensAt)!,
      submissionClosesAt: fromVietnamDateTimeInput(form.submissionClosesAt)!,
      reviewDeadlineAt: fromVietnamDateTimeInput(form.reviewDeadlineAt)!,
      supplementDeadlineAt: fromVietnamDateTimeInput(form.supplementDeadlineAt)!,
      finalizationDeadlineAt: fromVietnamDateTimeInput(form.finalizationDeadlineAt)!,
      reason: reason.trim(),
    };
    try {
      await saveSeason.mutateAsync({
        schoolYear,
        payload,
        expectedVersion: season.data?.version,
      });
      setConfirmOpen(false);
      setEditing(false);
    } catch {
      setConfirmOpen(false);
    }
  }

  return (
    <Card className="!p-0">
      <section aria-labelledby="city-review-season-title">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="city-review-season-title" className="text-base font-bold text-brand-deep">
              Quản lý mùa xét Thành phố
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Lịch tiếp nhận và các mốc xử lý cho từng năm học.
            </p>
          </div>
          {season.data ? (
            <Button variant="outline" size="sm" onClick={() => beginEdit(season.data!)}>
              Chỉnh sửa lịch
            </Button>
          ) : null}
        </div>

        {!/^\d{4}-\d{4}$/.test(defaultSchoolYear) ? (
          <div className="border-b p-4">
            <label className="grid max-w-xs gap-1 text-xs font-semibold text-muted-foreground">
              Năm học cần cấu hình
              <input
                aria-label="Năm học cần cấu hình"
                value={manualSchoolYear}
                onChange={(event) => setManualSchoolYear(event.target.value)}
                placeholder="2026-2027"
                className="h-9 rounded-md border bg-white px-3 text-sm text-brand-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </label>
          </div>
        ) : (
          <div className="px-4 pt-3 text-xs text-muted-foreground">Năm học: {schoolYear}</div>
        )}

        {season.isLoading ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">Đang tải lịch mùa xét…</p>
        ) : season.isError ? (
          <div className="flex flex-wrap items-center gap-3 px-4 py-3" role="alert">
            <span className="text-sm text-rose-700">Không tải được lịch mùa xét.</span>
            <Button size="sm" variant="outline" onClick={() => void season.refetch()}>
              Tải lại
            </Button>
          </div>
        ) : !season.data ? (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <span className="text-sm text-muted-foreground">
              {schoolYear
                ? "Chưa cấu hình lịch cho năm học này."
                : "Chọn năm học để cấu hình lịch."}
            </span>
            {schoolYear ? (
              <Button size="sm" onClick={beginCreate} disabled={editing}>
                Cấu hình mùa xét
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-x-5 gap-y-2 px-4 py-3 sm:grid-cols-2 xl:grid-cols-4">
            <SeasonStatus label="Tiếp nhận hồ sơ" value={season.data.submissionStatus} />
            <SeasonStatus label="Review" value={season.data.reviewStatus} />
            <SeasonStatus label="Bổ sung" value={season.data.supplementStatus} />
            <SeasonStatus label="Chốt kết quả" value={season.data.finalizationStatus} />
            <p className="text-xs text-muted-foreground sm:col-span-2 xl:col-span-4">
              Mở nộp {formatVietnamDateTime(season.data.submissionOpensAt)} · Đóng nộp{" "}
              {formatVietnamDateTime(season.data.submissionClosesAt)}
            </p>
          </div>
        )}

        {editing ? (
          <div className="space-y-3 border-t p-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {dateFields.map(({ key, label }) => (
                <label key={key} className="grid gap-1 text-xs font-semibold text-muted-foreground">
                  {label}
                  <input
                    type="datetime-local"
                    aria-label={label}
                    value={form[key]}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, [key]: event.target.value }))
                    }
                    className="h-9 min-w-0 rounded-md border bg-white px-2 text-sm text-brand-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  />
                </label>
              ))}
              <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
                Lý do thay đổi lịch
                <input
                  aria-label="Lý do thay đổi lịch"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="h-9 min-w-0 rounded-md border bg-white px-2 text-sm text-brand-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                />
              </label>
            </div>
            {validationMessage ? (
              <p className="text-sm text-rose-700" role="alert">
                {validationMessage}
              </p>
            ) : null}
            {saveSeason.isError ? (
              <p className="text-sm text-rose-700" role="alert">
                {saveSeason.error.message}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button onClick={requestSave} disabled={saveSeason.isPending}>
                {season.data ? "Cập nhật lịch mùa xét" : "Lưu lịch mùa xét"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditing(false)}
                disabled={saveSeason.isPending}
              >
                Hủy
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận lưu lịch mùa xét</DialogTitle>
            <DialogDescription>
              Lưu các mốc cho năm học {schoolYear}. Thời gian được hiểu theo múi giờ Việt Nam.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Quay lại
            </Button>
            <Button onClick={() => void confirmSave()} disabled={saveSeason.isPending}>
              {saveSeason.isPending ? "Đang lưu…" : "Xác nhận lưu"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function SeasonStatus({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Badge variant="outline">{seasonStatusLabel(value)}</Badge>
    </div>
  );
}

function seasonStatusLabel(value: string) {
  const labels: Record<string, string> = {
    NOT_CONFIGURED: "Chưa cấu hình",
    NOT_OPEN: "Chưa mở",
    OPEN: "Đang mở",
    CLOSED: "Đã đóng",
    EXCEPTION_ACTIVE: "Có ngoại lệ",
    ON_TRACK: "Còn hạn",
    OVERDUE: "Quá hạn",
  };
  return labels[value] ?? value;
}
