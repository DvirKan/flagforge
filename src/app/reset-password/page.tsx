import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { DisabledField } from "@/components/auth/DisabledField";
import { PreviewNotice } from "@/components/auth/PreviewNotice";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("auth.resetTitle") };
}

export default async function ResetPasswordPage() {
  const { t } = await getI18n();
  return (
    <AuthShell title={t("auth.resetTitle")}>
      <PreviewNotice text={t("auth.notYetEnabled")} />
      <form>
        <fieldset disabled className="grid gap-5">
        <DisabledField id="password" label={t("auth.newPassword")} type="password" autoComplete="new-password" />
        <button type="submit" className="btn btn-primary" disabled>
          {t("auth.submitReset")}
        </button>
        </fieldset>
      </form>
    </AuthShell>
  );
}
