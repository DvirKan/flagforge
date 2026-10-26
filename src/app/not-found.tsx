import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { getI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <Container className="graticule py-24 md:py-32">
      <p className="eyebrow tabular" dir="ltr">404 · 00°00′N 00°00′E</p>
      <p className="eyebrow mt-1">{t("notFound.eyebrow")}</p>
      <h1 className="display mt-4 text-5xl md:text-7xl">{t("notFound.title")}</h1>
      <p className="mt-4 max-w-lg text-lg text-ink-soft">{t("notFound.body")}</p>
      <Link href="/" className="btn btn-primary mt-8">
        {t("common.backHome")}
      </Link>
    </Container>
  );
}
