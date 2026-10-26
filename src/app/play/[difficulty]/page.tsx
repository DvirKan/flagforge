import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GameClient } from "@/components/game/GameClient";
import { Container } from "@/components/ui/Container";
import { isDifficulty } from "@/config/game";
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
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-ink pb-2 pt-3 md:pb-4 md:pt-8">
        <h1 className="flex items-baseline gap-3">
          <span className="eyebrow">
            <span className="text-rust-ink">I</span>
            <span className="mx-2 text-rule-strong" aria-hidden="true">—</span>
            {t("play.eyebrow")}
          </span>
          <span className="display text-xl md:text-3xl">{t(`difficulty.${difficulty}`)}</span>
        </h1>
        <Link href="/play" className="text-sm link-underline">
          {t("game.changeDifficulty")}
        </Link>
      </div>
      <GameClient difficulty={difficulty} />
    </Container>
  );
}
