import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConstructionNotice } from "@/components/ui/ConstructionNotice";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { gameConfig, isDifficulty } from "@/config/game";
import { getI18n } from "@/lib/i18n/server";

interface Props {
  params: Promise<{ difficulty: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { difficulty } = await params;
  const { t } = await getI18n();
  return { title: isDifficulty(difficulty) ? `${t("nav.play")} · ${t(`difficulty.${difficulty}`)}` : t("nav.play") };
}

export default async function GamePage({ params }: Props) {
  const { difficulty } = await params;
  if (!isDifficulty(difficulty)) notFound();
  const { t } = await getI18n();
  return (
    <Container>
      <PageHeader
        plate="I"
        eyebrow={`${t("play.eyebrow")} · ${t("common.questions", { count: gameConfig.standardGameLength })}`}
        title={t(`difficulty.${difficulty}`)}
        lede={t(`difficulty.${difficulty}Blurb`)}
      />
      <ConstructionNotice phase={2} />
    </Container>
  );
}
