import { getI18n } from "@/lib/i18n/server";
import type { ChallengeStatus } from "@/server/admin/calendar";

const STYLE: Record<ChallengeStatus, string> = {
  published: "bg-success-wash text-success",
  draft: "bg-[#fbf1d9] text-[#8a5d08]",
  missing: "bg-danger-wash text-danger",
};

export async function StatusBadge({ status }: { status: ChallengeStatus }) {
  const { t } = await getI18n();
  const label = status === "published" ? t("admin.statusPublished") : status === "draft" ? t("admin.statusDraft") : t("admin.statusMissing");
  return <span className={["inline-block w-24 rounded-full px-2.5 py-0.5 text-center text-xs font-medium", STYLE[status]].join(" ")}>{label}</span>;
}
