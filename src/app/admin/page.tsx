import type { Metadata } from "next";
import { ConstructionNotice } from "@/components/ui/ConstructionNotice";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireAdmin } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("admin.title") };
}

export default async function Page() {
  await requireAdmin(); // database-backed role check; non-admins get a 404
  const { t } = await getI18n();
  return (
    <Container>
      <PageHeader plate="VIII" eyebrow={t("admin.eyebrow")} title={t("admin.title")} />
      <ConstructionNotice phase={6} />
    </Container>
  );
}
