import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PRIVACY_CONTACT, privacy } from "@/content/privacy";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getI18n();
  return { title: privacy[locale].title, description: privacy[locale].intro };
}

export default async function PrivacyPage() {
  const { locale } = await getI18n();
  const p = privacy[locale];
  return (
    <Container>
      <article className="mx-auto max-w-3xl pt-10 md:pt-16">
        <h1 className="display text-4xl md:text-5xl">{p.title}</h1>
        <p className="mt-2 text-sm text-muted">{p.updated}</p>
        <p className="mt-6 text-lg leading-relaxed text-ink-soft">{p.intro}</p>
        {p.sections.map((s) => (
          <section key={s.title} className="mt-10">
            <h2 className="display text-2xl">{s.title}</h2>
            {s.paragraphs?.map((text) => (
              <p key={text} className="mt-3 leading-relaxed">
                {text.includes(PRIVACY_CONTACT) ? (
                  <>
                    {text.replace(PRIVACY_CONTACT, "")}
                    <a href={`mailto:${PRIVACY_CONTACT}`} className="link-underline" dir="ltr">
                      {PRIVACY_CONTACT}
                    </a>
                  </>
                ) : (
                  text
                )}
              </p>
            ))}
            {s.items ? (
              <ul className="mt-3 list-disc space-y-2 ps-6 leading-relaxed">
                {s.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
            {s.after?.map((text) => (
              <p key={text} className="mt-3 leading-relaxed">
                {text}
              </p>
            ))}
          </section>
        ))}
      </article>
    </Container>
  );
}
