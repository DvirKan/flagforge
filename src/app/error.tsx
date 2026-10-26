"use client";

import { useEffect } from "react";
import { Container } from "@/components/ui/Container";
import { useI18n } from "@/lib/i18n/client";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    // Only the digest is logged client-side; server details stay in server logs.
    console.error("Route error", error.digest ?? "(no digest)");
  }, [error]);
  return (
    <Container className="py-24">
      {error.digest ? <p className="eyebrow text-danger tabular" dir="ltr">{error.digest}</p> : null}
      <h1 className="display mt-4 text-5xl">{t("common.errorTitle")}</h1>
      <p className="mt-4 max-w-lg text-ink-soft">{t("common.errorBody")}</p>
      <button type="button" onClick={reset} className="btn btn-primary mt-8">
        {t("common.retry")}
      </button>
    </Container>
  );
}
