import type { Metadata } from "next";
import { ConstructionNotice } from "@/components/ui/ConstructionNotice";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("achievements.title") };
}

export default async function Page() {
  const { t } = await getI18n();
  return (
    <Container>
      <PageHeader title={t("achievements.title")} lede={t("achievements.lede")} />
      <ConstructionNotice phase={5} />
    </Container>
  );
}
