import type { LegalDoc } from "@/content/legal/en";

export function LegalPage({ title, doc }: { title: string; doc: LegalDoc }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="text-4xl font-extrabold">{title}</h1>
      <p className="text-muted-foreground mt-2 text-sm">Last updated: {doc.updated}</p>
      <p className="mt-6 text-lg">{doc.intro}</p>
      {doc.sections.map((s) => (
        <section key={s.heading} className="mt-10">
          <h2 className="text-2xl font-bold">{s.heading}</h2>
          {s.body.map((p) => (
            <p key={p} className="text-muted-foreground mt-3 leading-relaxed">
              {p}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
