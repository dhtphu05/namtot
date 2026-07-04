import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

type OcrTextPreviewProps = {
  text?: string | null;
};

export function OcrTextPreview({ text }: OcrTextPreviewProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const safeText = text?.trim() ?? "";

  if (!safeText) {
    return (
      <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
        Chưa có nội dung đã đọc để hiển thị.
      </p>
    );
  }

  const copyText = async () => {
    await navigator.clipboard.writeText(safeText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-md border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen((value) => !value)}>
          {open ? "Ẩn nội dung đã đọc" : "Xem nội dung đã đọc"}
        </Button>
        {open ? (
          <Button type="button" variant="outline" size="sm" onClick={copyText}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Đã copy" : "Copy"}
          </Button>
        ) : null}
      </div>
      {open ? (
        <pre className="max-h-56 overflow-auto whitespace-pre-wrap p-3 text-sm leading-relaxed text-foreground">
          {safeText}
        </pre>
      ) : null}
    </div>
  );
}
