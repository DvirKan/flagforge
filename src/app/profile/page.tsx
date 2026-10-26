import type { Metadata } from "next";
import Link from "next/link";
import { ConstructionNotice } from "@/components/ui/ConstructionNotice";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("profile.title") };
}

export default async function ProfilePage() {
  const { t } = await getI18n();
  return (
    <Container>
      <PageHeader plate="VI" eyebrow={t("profile.eyebrow")} title={t("profile.title")} />
      <p className="mt-10 max-w-xl text-lg text-ink-soft">{t("profile.signInRequired")}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/login?next=/profile" className="btn btn-primary">{t("nav.signIn")}</Link>
        <Link href="/register" className="btn btn-ghost">{t("nav.register")}</Link>
      </div>
      <ConstructionNotice phase={5} />
    </Container>
  );
}
