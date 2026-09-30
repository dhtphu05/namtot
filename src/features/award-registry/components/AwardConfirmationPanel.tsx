import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function AwardConfirmationPanel({
  canConfirm,
  validRows,
  blockingRows,
  pending,
  error,
  onConfirm,
}: {
  canConfirm: boolean;
  validRows: number;
  blockingRows: number;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
}) {
  return (
    <Card className="border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
            Điểm xác nhận
          </p>
          <h2 className="mt-1 text-base font-semibold text-slate-950">
            Xác nhận dữ liệu công nhận
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Hệ thống sẽ kiểm tra lại toàn bộ danh sách và lưu các sinh viên được công nhận. Đây là
            bước đưa dữ liệu thành nguồn chính thức.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" disabled={!canConfirm || pending}>
              Xác nhận dữ liệu công nhận
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xác nhận dữ liệu công nhận?</AlertDialogTitle>
              <AlertDialogDescription>
                Hệ thống sẽ kiểm tra lại {validRows} dòng hợp lệ và lưu danh sách sinh viên. Sau khi
                xác nhận, các thao tác chỉnh sửa bản nháp hiện có sẽ không còn khả dụng.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Quay lại kiểm tra</AlertDialogCancel>
              <AlertDialogAction onClick={onConfirm}>Xác nhận và lưu dữ liệu</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-emerald-800">
          {validRows} dòng hợp lệ
        </p>
        <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-900">
          {blockingRows} dòng còn cần xử lý
        </p>
      </div>
      {blockingRows > 0 || validRows === 0 ? (
        <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Hãy xử lý các dòng có lỗi hoặc xung đột trước khi xác nhận. Dữ liệu sẽ được kiểm tra lại
          trước khi ghi nhận chính thức.
        </p>
      ) : null}
      {error && (
        <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
    </Card>
  );
}
