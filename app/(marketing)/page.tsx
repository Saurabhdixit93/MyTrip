import { ArrowRight, BadgeCheck, CheckCircle2, Divide, QrCode, ShieldCheck, Smartphone, UserRoundCheck, WifiOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { t, type MessageKey } from "@/lib/i18n";
import { absoluteUrl, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.name}: split group trip expenses & settle over UPI` },
  alternates: { canonical: "/" },
};

const FEATURES: { icon: typeof Divide; title: MessageKey; body: MessageKey }[] = [
  { icon: Divide, title: "marketing.f1Title", body: "marketing.f1Body" },
  { icon: UserRoundCheck, title: "marketing.f2Title", body: "marketing.f2Body" },
  { icon: QrCode, title: "marketing.f3Title", body: "marketing.f3Body" },
  { icon: BadgeCheck, title: "marketing.f4Title", body: "marketing.f4Body" },
  { icon: WifiOff, title: "marketing.f5Title", body: "marketing.f5Body" },
  { icon: ShieldCheck, title: "marketing.f6Title", body: "marketing.f6Body" },
];

const STEPS: { title: MessageKey; body: MessageKey }[] = [
  { title: "marketing.how1Title", body: "marketing.how1Body" },
  { title: "marketing.how2Title", body: "marketing.how2Body" },
  { title: "marketing.how3Title", body: "marketing.how3Body" },
];

const FAQS: { q: MessageKey; a: MessageKey }[] = [
  { q: "faq.q1", a: "faq.a1" },
  { q: "faq.q2", a: "faq.a2" },
  { q: "faq.q3", a: "faq.a3" },
  { q: "faq.q4", a: "faq.a4" },
  { q: "faq.q5", a: "faq.a5" },
];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    logo: absoluteUrl("/icons/icon-512.png"),
  },
  {
    "@context": "https://schema.org",
    "@type": ["WebApplication", "SoftwareApplication"],
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any (installable PWA)",
    browserRequirements: "Requires JavaScript. Works best in a modern browser.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    inLanguage: "en-IN",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map(({ q, a }) => ({
      "@type": "Question",
      name: t(q),
      acceptedAnswer: { "@type": "Answer", text: t(a) },
    })),
  },
];

export default function LandingPage() {
  return (
    <>
      <JsonLd data={jsonLd} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_30rem_at_80%_-10%,color-mix(in_oklch,var(--primary)_22%,transparent),transparent),radial-gradient(40rem_24rem_at_0%_10%,color-mix(in_oklch,var(--highlight)_22%,transparent),transparent)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-20 md:grid-cols-2 md:pt-24">
          <div className="space-y-6">
            <p className="bg-secondary text-secondary-foreground inline-flex rounded-full px-3 py-1 text-xs font-semibold">
              {t("marketing.heroEyebrow")}
            </p>
            <h1 className="text-4xl leading-[1.05] font-extrabold text-balance sm:text-5xl md:text-6xl">
              {t("marketing.heroTitle")}
            </h1>
            <p className="text-muted-foreground max-w-xl text-lg text-pretty">{t("marketing.heroSubtitle")}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 rounded-xl px-6 text-base">
                <Link href="/trips/new">
                  {t("marketing.heroCta")} <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-xl px-6 text-base">
                <Link href="/join">{t("marketing.heroSecondary")}</Link>
              </Button>
            </div>
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <Smartphone className="size-4" aria-hidden /> {t("marketing.heroNote")}
            </p>
          </div>
          <HeroMock />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <h2 className="text-3xl font-bold md:text-4xl">{t("marketing.howTitle")}</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="bg-card rounded-2xl border p-6">
              <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-full font-bold">{i + 1}</span>
              <h3 className="mt-4 text-lg font-semibold">{t(step.title)}</h3>
              <p className="text-muted-foreground mt-2">{t(step.body)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <h2 className="text-3xl font-bold md:text-4xl">{t("marketing.featuresTitle")}</h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="bg-card rounded-2xl border p-6">
              <Icon className="text-primary size-6" aria-hidden />
              <h3 className="mt-4 font-semibold">{t(title)}</h3>
              <p className="text-muted-foreground mt-1 text-sm">{t(body)}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* UPI */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="bg-primary text-primary-foreground grid gap-8 rounded-3xl p-8 md:grid-cols-2 md:p-12">
          <div>
            <h2 className="text-3xl font-bold md:text-4xl">{t("marketing.upiTitle")}</h2>
            <p className="mt-4 opacity-90">{t("marketing.upiBody")}</p>
          </div>
          <ul className="space-y-4 self-center">
            {(["marketing.upiPoint1", "marketing.upiPoint2", "marketing.upiPoint3"] as const).map((k) => (
              <li key={k} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
                <span>{t(k)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-16">
        <h2 className="text-3xl font-bold md:text-4xl">{t("marketing.faqTitle")}</h2>
        <div className="mt-8 divide-y rounded-2xl border">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {t(q)}
                <span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="text-muted-foreground mt-3">{t(a)}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 pt-8 pb-24 text-center">
        <h2 className="mx-auto max-w-2xl text-3xl font-bold text-balance md:text-4xl">{t("marketing.finalTitle")}</h2>
        <Button asChild size="lg" className="mt-8 h-12 rounded-xl px-8 text-base">
          <Link href="/trips/new">{t("marketing.finalCta")}</Link>
        </Button>
      </section>
    </>
  );
}

function HeroMock() {
  const rows = [
    { title: "Dinner at Baga", by: "Rahul paid", amount: "₹2,400" },
    { title: "Villa, 2 nights", by: "Coach paid", amount: "₹18,000" },
    { title: "Scuba diving", by: "Priya paid", amount: "₹9,600" },
  ];
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-sm">
      <div className="bg-card rounded-[2.25rem] border p-4 shadow-2xl shadow-primary/10">
        <div className="bg-primary text-primary-foreground rounded-3xl p-5">
          <p className="text-sm opacity-85">Goa Trip · 6 members</p>
          <p className="mt-1 text-sm opacity-85">You owe the Coach</p>
          <p className="font-heading tabular mt-1 text-4xl font-extrabold">₹3,240.00</p>
          <div className="bg-highlight text-highlight-foreground mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold">
            <QrCode className="size-4" /> Pay Now via UPI
          </div>
        </div>
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.title} className="bg-muted/60 flex items-center justify-between rounded-2xl px-4 py-3">
              <span>
                <span className="block text-sm font-semibold">{r.title}</span>
                <span className="text-muted-foreground text-xs">{r.by}</span>
              </span>
              <span className="tabular text-sm font-semibold">{r.amount}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
