import { getI18n } from "@/lib/i18n/server";

/**
 * Honest placeholder for a feature that has not been implemented yet.
 * It never renders sample data; it states which development phase delivers the feature.
 */
export async function ConstructionNotice({ phase }: { phase: number }) {
  const { t } = await getI18n();
  return (
    <section
      role="status"
      className="relative mt-10 border border-dashed border-control bg-paper/60 px-5 py-6 md:px-8"
    >
      <p className="eyebrow text-rust-ink">{t("common.comingTitle")}</p>
      <p className="mt-2 max-w-2xl text-ink-soft">{t("common.comingBody", { phase })}</p>
    </section>
  );
}
