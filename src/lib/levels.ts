import type { Level } from "@/features/review/types";

export const ACTIVE_LEVELS: Exclude<Level, "central">[] = ["school", "university", "city"];
export const ACTIVE_LEVELS_HIGH_TO_LOW: Exclude<Level, "central">[] = [
  "city",
  "university",
  "school",
];

export const levelLabel: Record<Level, string> = {
  school: "Cấp Trường",
  university: "Cấp ĐHĐN",
  city: "Cấp Thành phố",
  central: "Cấp Trung ương",
};

export function getLevelLabel(level?: Level | null) {
  return level ? levelLabel[level] : "--";
}

export function isActiveLevel(level?: Level | null): level is Exclude<Level, "central"> {
  return Boolean(level && level !== "central");
}

export function isLegacyCentral(level?: Level | null) {
  return level === "central";
}

export function getFinalizeActionLabel(suggestedLevel?: Level | null) {
  if (!suggestedLevel) return "Chốt không đạt";
  return `Chốt đạt ${getLevelLabel(suggestedLevel)}`;
}

export function getDownrankReason(targetLevel?: Level | null, suggestedLevel?: Level | null) {
  if (!targetLevel) return "Chưa có cấp đăng ký.";
  if (targetLevel === "central") return "Ngoài phạm vi flow chính hiện tại.";
  if (!suggestedLevel) return "Chưa đủ điều kiện đạt cấp nào.";
  if (targetLevel === suggestedLevel) return "Đủ điều kiện theo cấp đăng ký.";
  return `Hạ từ ${getLevelLabel(targetLevel)} xuống ${getLevelLabel(suggestedLevel)} theo gợi ý cấp đạt.`;
}
