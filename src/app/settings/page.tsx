import type { Metadata } from "next";
import { ConstructionNotice } from "@/components/ui/ConstructionNotice";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("settings.title") };
}

export default async function Page() {
  const { t } = await getI18n();
  return (
    <Container>
      <PageHeader plate="VII" eyebrow={t("settings.eyebrow")} title={t("settings.title")} />
      <ConstructionNotice phase={3} />
    </Container>
  );
}
