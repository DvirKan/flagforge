import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DeleteAccountForm, LanguageForm, PasswordForm, ProfileForm } from "@/components/settings/SettingsForms";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireViewer } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { isAdminClientConfigured } from "@/lib/supabase/admin";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("settings.title") };
}

function Section({ title, children, danger = false }: { title: string; children: ReactNode; danger?: boolean }) {
  return (
    <section className={["grid gap-4 border-t py-8 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-10", danger ? "border-danger" : "border-ink"].join(" ")}>
      <h2 className={["display text-2xl", danger ? "text-danger" : ""].join(" ")}>{title}</h2>
      <div className="max-w-lg">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const viewer = await requireViewer("/settings");
  const { t } = await getI18n();
  return (
    <Container>
      <PageHeader title={t("settings.title")} />
      <div className="mt-10">
        <Section title={t("settings.profileSection")}>
          <ProfileForm username={viewer.username} displayName={viewer.displayName} />
        </Section>
        <Section title={t("settings.languageSection")}>
          <LanguageForm />
        </Section>
        <Section title={t("settings.passwordSection")}>
          <PasswordForm />
        </Section>
        <Section title={t("settings.accountSection")}>
          <p className="text-sm text-muted">{t("settings.emailLabel")}</p>
          <p className="mt-1" dir="ltr">
            {viewer.email ?? "—"}
          </p>
        </Section>
        <Section title={t("settings.deleteTitle")} danger>
          <p className="mb-5 text-ink-soft">{t("settings.deleteBody")}</p>
          {isAdminClientConfigured() ? <DeleteAccountForm username={viewer.username} /> : <p className="text-sm">{t("settings.deleteUnavailable")}</p>}
        </Section>
      </div>
    </Container>
  );
}
