import { PageHeader } from "@/components/layout/PageHeader";

export function TopBar({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return <PageHeader title={title} subtitle={subtitle} action={action} />;
}
