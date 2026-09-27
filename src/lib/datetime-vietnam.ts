const vietnamTimeZone = "Asia/Ho_Chi_Minh";

export function formatVietnamDateTime(value: string | null | undefined) {
  if (!value) return "Chưa cấu hình";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cấu hình";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: vietnamTimeZone,
  }).format(date);
}

export function toVietnamDateTimeInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: vietnamTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const valueByType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${valueByType.year}-${valueByType.month}-${valueByType.day}T${valueByType.hour}:${valueByType.minute}`;
}

export function fromVietnamDateTimeInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00+07:00`);
  if (Number.isNaN(date.getTime()) || toVietnamDateTimeInput(date.toISOString()) !== value)
    return null;
  return date.toISOString();
}
