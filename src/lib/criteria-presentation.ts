export const coreCriterionKeys = [
  "ethics",
  "academic",
  "physical",
  "volunteer",
  "integration",
] as const;

export type CoreCriterionKey = (typeof coreCriterionKeys)[number];
export type CriterionIconKey =
  "ShieldCheck" | "GraduationCap" | "Dumbbell" | "HeartHandshake" | "Globe2";

export const coreCriterionPresentation: Record<
  CoreCriterionKey,
  { label: string; icon: CriterionIconKey; aliases: readonly string[] }
> = {
  ethics: { label: "Đạo đức tốt", icon: "ShieldCheck", aliases: ["dao-duc"] },
  academic: { label: "Học tập tốt", icon: "GraduationCap", aliases: ["hoc-tap"] },
  physical: { label: "Thể lực tốt", icon: "Dumbbell", aliases: ["the-luc"] },
  volunteer: { label: "Tình nguyện tốt", icon: "HeartHandshake", aliases: ["tinh-nguyen"] },
  integration: { label: "Hội nhập tốt", icon: "Globe2", aliases: ["hoi-nhap"] },
};

export function getCoreCriterionKey(value?: string | null): CoreCriterionKey | null {
  if (!value) return null;
  if (Object.hasOwn(coreCriterionPresentation, value)) return value as CoreCriterionKey;
  return (
    coreCriterionKeys.find((key) => coreCriterionPresentation[key].aliases.includes(value)) ?? null
  );
}

export function getCoreCriterionPresentation(value?: string | null) {
  const key = getCoreCriterionKey(value);
  return key ? coreCriterionPresentation[key] : null;
}

export function getCoreCriterionLabel(value?: string | null) {
  return getCoreCriterionPresentation(value)?.label ?? "Chưa rõ tiêu chí";
}
