import type { Metadata } from "next";
import { DifficultyIndex } from "@/components/game/DifficultyIndex";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { gameConfig } from "@/config/game";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("nav.play") };
}

export default async function PlayPage() {
  const { t } = await getI18n();
  return (
    <Container>
      <PageHeader
        plate="I"
        eyebrow={t("play.eyebrow")}
        title={t("play.title")}
        lede={t("play.lede", { count: gameConfig.standardGameLength })}
      />
      <div className="mt-10">
        <DifficultyIndex headingLevel={2} />
        <p className="mt-6 max-w-2xl text-sm text-muted">{t("difficulty.note")}</p>
        <p className="mt-6 max-w-2xl border-s-2 border-rust ps-3 text-sm text-ink-soft">{t("play.guestNote")}</p>
      </div>
    </Container>
  );
}
