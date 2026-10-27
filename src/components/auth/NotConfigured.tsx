import { getI18n } from "@/lib/i18n/server";

export async function NotConfigured() {
  const { t } = await getI18n();
  return (
    <p role="note" className="border-s-2 border-rust bg-parchment px-3 py-2 text-sm text-ink-soft">
      {t("auth.notConfigured")}
    </p>
  );
}
