"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOutAction } from "@/lib/auth/actions";
import { useI18n } from "@/lib/i18n/client";
import { NavLink } from "./NavLink";
import { primaryNav } from "./nav-items";

/** Full-screen menu built on the native <dialog> element (focus trap, Escape, inert background). */
export function MobileMenu({ username }: { username: string | null }) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        className="inline-flex size-11 items-center justify-center border border-ink/20 text-ink"
        aria-label={t("a11y.openMenu")}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>
      <dialog
        ref={dialogRef}
        onClose={close}
        aria-label={t("a11y.primaryNav")}
        className="m-0 h-dvh max-h-none w-full max-w-none bg-parchment p-0 text-ink backdrop:bg-ink/40"
      >
        <div className="flex h-full flex-col px-5 pb-8 pt-4">
          <div className="flex items-center justify-between border-b border-ink pb-4">
            <span className="eyebrow">{t("a11y.primaryNav")}</span>
            <button
              type="button"
              className="inline-flex size-11 items-center justify-center border border-ink/20"
              aria-label={t("a11y.closeMenu")}
              onClick={close}
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <nav className="mt-2 flex-1">
            <ol>
              {[{ href: "/", label: "nav.home" as const }, ...primaryNav, { href: "/profile", label: "nav.profile" as const }].map(
                (item) => (
                  <li key={item.href} className="border-b border-rule">
                    <NavLink
                      href={item.href}
                      onNavigate={close}
                      className="block py-4"
                      activeClassName="text-rust-ink"
                    >
                      <span className="display text-3xl">{t(item.label)}</span>
                    </NavLink>
                  </li>
                ),
              )}
            </ol>
          </nav>
          {username ? (
            <div className="grid grid-cols-2 items-center gap-3">
              <Link href="/settings" onClick={close} className="btn btn-ghost">
                {t("nav.settings")}
              </Link>
              <form action={signOutAction}>
                <button type="submit" className="btn btn-primary w-full">
                  {t("auth.signOut")}
                </button>
              </form>
              <p className="eyebrow col-span-2" dir="ltr">
                @{username}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Link href="/login" onClick={close} className="btn btn-ghost">
                {t("nav.signIn")}
              </Link>
              <Link href="/register" onClick={close} className="btn btn-primary">
                {t("nav.register")}
              </Link>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
