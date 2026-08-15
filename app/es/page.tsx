import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, FileCheck, Mail, Phone, RefreshCw, Star, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { SERVICES_ES } from "@/lib/service-data-es";
import { startingPriceLabel } from "@/lib/pricing/starting-prices";
import { SERVICE_SLUG_ES } from "@/lib/i18n/config";
import { localeAlternates } from "@/lib/i18n/metadata";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { db } from "@/lib/prisma";
import { APP_URL } from "@/lib/app-url";

export const metadata: Metadata = {
  title: {
    absolute: "611 Printing - Impresión a costo en Kansas City | Tarjetas, lonas y calcomanías",
  },
  description:
    "Imprenta en línea que vende la impresión a costo. Tarjetas de presentación, postales, lonas, letreros rígidos y calcomanías para ventanas, con diseño incluido si lo necesita. Kansas City y todo el país.",
  alternates: localeAlternates("/", "es"),
};

export const revalidate = 3600;

const BTN_PRIMARY =
  "edge h-12 bg-kc-coral px-7 text-[16.05px] font-semibold text-white transition-colors hover:bg-kc-magenta-deep";
const BTN_SECONDARY =
  "edge h-12 border border-kc-dark/20 bg-transparent px-7 text-[16.05px] font-semibold text-kc-dark transition-colors hover:border-kc-dark/40 hover:bg-kc-dark/5";

const PRODUCTS = [
  { slug: "business-cards", image: "/images/print/business-cards.webp", alt: "Pilas de tarjetas de presentación impresas", sizes: "Estándar y 5 formas especiales", bestFor: "Redes de contacto, mostradores, seguimiento" },
  { slug: "postcards", image: "/images/print/postcards.webp", alt: "Postales promocionales impresas sobre una mesa de concreto", sizes: "De 3×5 hasta 6×11 pulg", bestFor: "Correo directo, EDDM, promociones" },
  { slug: "banners", image: "/images/print/banners.webp", alt: "Una lona de vinil con ojillos amarrada a una reja", sizes: "Vinil con dobladillo y malla, de 1 a 12 pies", bestFor: "Fachadas, ferias, eventos" },
  { slug: "rigid-signs", image: "/images/print/rigid-signs.webp", alt: "Letreros rígidos troquelados recargados en una pared", sizes: "13 formas troqueladas, 5 materiales", bestFor: "Oficinas, locales, jardín y eventos" },
  { slug: "window-decals", image: "/images/print/window-decals.webp", alt: "El vidrio de un local con una calcomanía de vinil aplicada", sizes: "Vinil adhesivo, estático o perforado", bestFor: "Vidrio de local, puertas, mamparas" },
];

const GUARANTEES = [
  { icon: FileCheck, text: "PDF, JPG y PNG listos para imprenta en cada pedido" },
  { icon: Users2, text: "Un diseñador real en cada archivo, nunca una plantilla cambiada" },
  { icon: RefreshCw, text: "Revisiones incluidas en todos los paquetes de diseño" },
];

const PROCESS = [
  {
    title: "Elija el producto y el paquete",
    desc: "Escoja el producto, el tamaño y el material que necesita, y agregue lo que quiera encima. El precio se actualiza mientras elige, así que no hay que adivinar nada.",
  },
  {
    title: "Mande su arte, o nada más la idea",
    desc: "¿Ya tiene el archivo terminado? Súbalo. ¿Empieza de cero? Nuestro editor y nuestro equipo de diseño lo llevan hasta allá.",
  },
  {
    title: "Revise, corrija y descargue",
    desc: "Su primera propuesta llega en 1 a 3 días hábiles. Pida cambios, apruebe la versión final y descargue sus archivos listos para imprenta.",
  },
];

const FAQS = [
  {
    q: "¿Cómo funciona el proceso de pedido?",
    a: "Elija su producto y su paquete, suba su arte o sus notas y nuestros diseñadores se ponen a trabajar. Verá su primera propuesta en 1 a 3 días hábiles. Pida las revisiones que necesite y descargue sus archivos listos para imprenta al aprobar.",
  },
  {
    q: "¿El pedido y el pago están en español?",
    a: "No. Las páginas de producto y toda la información están en español, pero el formulario de pedido, el editor de diseño y el proceso de pago se realizan en inglés, igual que los correos de confirmación. Si prefiere hacer su pedido en español, llámenos al (816) 521-0462 y lo tomamos por teléfono.",
  },
  {
    q: "¿Qué significa que la impresión se vende a costo?",
    a: "Le cobramos por la impresión exactamente lo que nos cobra nuestro proveedor, sin margen añadido y sin mínimos. Nuestro ingreso viene de los servicios de diseño y de un cargo fijo de manejo en el envío. Si ya tiene su archivo listo, paga únicamente la impresión.",
  },
  {
    q: "No tengo un diseño terminado. ¿Aún así me pueden ayudar?",
    a: "Sí. Suba un logotipo, unos colores de marca o simplemente cuéntenos qué busca. También puede armarlo usted mismo en el editor del navegador, sin costo, antes de decidir si quiere un paquete de diseño.",
  },
  {
    q: "¿Atienden negocios fuera de Kansas City?",
    a: "Sí. 611 Printing trabaja desde el área metropolitana de Kansas City y atiende Johnson County, Dallas-Fort Worth y negocios en todo el país. Todo el pedido y la entrega de archivos se hacen en línea.",
  },
];

export default async function SpanishHomePage() {
  const t = getDictionary("es");

  // The same moderated, real testimonials the English homepage shows. Quotes are customers' own
  // words, so they are not translated - inventing a Spanish version of something a named person
  // said would be putting words in their mouth.
  const testimonials = await db.testimonial.findMany({
    where: { approved: true, featured: true },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  const [lead, ...rest] = testimonials;

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative bg-kc-bg">
        <div className="reg-bar relative z-20" />
        <div className="container-tight flex items-center px-4 pb-4 pt-14 sm:px-6 lg:min-h-[520px] lg:px-8 lg:py-16">
          <div className="lg:max-w-[52%]">
            <Reveal y={16}>
              <h1 className="display-tight text-[2.94rem] text-kc-dark sm:text-6xl lg:text-[3.75rem]">
                La impresión, a costo. El diseño, aparte.
              </h1>
            </Reveal>
            <Reveal y={16} delay={0.08}>
              <p className="mt-6 max-w-[48ch] text-[18.19px] leading-relaxed text-kc-dark/75">
                Le cobramos por la impresión exactamente lo que nos cobra nuestro proveedor, sin nada
                añadido y sin mínimos. Si necesita que hagamos el arte, ese es un servicio de diseño
                aparte con precio claro. Si ya tiene su archivo, solo paga la impresión.
              </p>
            </Reveal>
            <Reveal y={16} delay={0.16}>
              <div className="mt-9 flex flex-wrap gap-3">
                <Button asChild size="lg" className={BTN_PRIMARY}>
                  <Link href="/es/servicios">
                    {t.common.seeAll} <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2} />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className={BTN_SECONDARY}>
                  <Link href="/es/precios">{t.nav.pricing}</Link>
                </Button>
              </div>
            </Reveal>
            <Reveal y={16} delay={0.24}>
              <p className="mt-5 max-w-[48ch] text-[14.98px] leading-relaxed text-kc-dark/55">
                El pedido, el editor de diseño y el pago se realizan en inglés. Si prefiere hacer su
                pedido en español, llámenos al{" "}
                <a href="tel:+18165210462" className="font-semibold text-kc-magenta-deep hover:text-kc-dark">
                  (816) 521-0462
                </a>.
              </p>
            </Reveal>
          </div>
        </div>

        <div className="px-4 pb-16 pt-10 sm:px-6 lg:absolute lg:bottom-0 lg:right-0 lg:top-[3px] lg:w-[44%] lg:max-w-[680px] lg:p-0">
          <div className="edge relative aspect-[4/3] w-full overflow-hidden lg:aspect-auto lg:h-full lg:rounded-none">
            <Image
              src="/images/print/hero-card-fan.webp"
              alt="Un abanico de tarjetas de presentación impresas sobre un escritorio de madera"
              fill
              priority
              sizes="(min-width: 1600px) 680px, (min-width: 1024px) 44vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* ── Guarantees ── */}
      <section className="border-y border-kc-dark/10 bg-kc-bg">
        <div className="container-tight px-4 sm:px-6 lg:px-8">
          <RevealGroup className="grid grid-cols-1 divide-y divide-kc-dark/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {GUARANTEES.map(({ icon: Icon, text }) => (
              <RevealItem key={text} className="flex items-start gap-3 py-7 sm:px-7 sm:first:pl-0 sm:last:pr-0">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-kc-coral" strokeWidth={1.75} />
                <span className="text-[15.52px] leading-snug text-kc-dark/75">{text}</span>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ── Products ── */}
      <section className="band bg-kc-paper">
        <div className="container-tight">
          <Reveal className="mb-10 max-w-xl">
            <h2 className="display-tight text-3xl text-kc-dark sm:text-[2.94rem]">{t.services.heading}</h2>
            <p className="mt-4 text-[17.66px] leading-relaxed text-kc-dark/70">{t.services.intro}</p>
          </Reveal>

          <RevealGroup className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {PRODUCTS.map((p) => {
              const service = SERVICES_ES[p.slug];
              return (
                <RevealItem key={p.slug} className="h-full">
                  <Link
                    href={`/es/servicios/${SERVICE_SLUG_ES[p.slug]}`}
                    className="edge group flex h-full flex-col overflow-hidden border border-kc-dark/12 bg-white transition-colors hover:border-kc-dark/30"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-kc-bg">
                      <Image
                        src={p.image}
                        alt={p.alt}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="display-tight text-2xl text-kc-dark">{service.name}</h3>
                        <span className="shrink-0 whitespace-nowrap font-mono text-[13.38px] text-kc-dark/60">
                          {startingPriceLabel(p.slug).replace("from", t.common.from)}
                        </span>
                      </div>
                      <dl className="mt-4 space-y-2 text-[14.45px]">
                        <div>
                          <dt className="text-kc-dark/50">Tamaños</dt>
                          <dd className="text-kc-dark/75">{p.sizes}</dd>
                        </div>
                        <div>
                          <dt className="text-kc-dark/50">Ideal para</dt>
                          <dd className="text-kc-dark/75">{p.bestFor}</dd>
                        </div>
                      </dl>
                      <span className="mt-auto pt-6 text-[14.98px] font-semibold text-kc-magenta-deep transition-colors group-hover:text-kc-dark">
                        Ver precio y pedir →
                      </span>
                    </div>
                  </Link>
                </RevealItem>
              );
            })}
          </RevealGroup>
        </div>
      </section>

      {/* ── Full-bleed press sheet. Sin texto: el oficio es el mensaje. ── */}
      <section aria-hidden className="relative h-[220px] w-full overflow-hidden md:h-[340px]">
        <Image src="/images/print/press-sheet.webp" alt="" fill sizes="100vw" className="object-cover" />
      </section>

      {/* ── Cómo funciona ── */}
      <section className="band bg-kc-bg">
        <div className="container-tight grid grid-cols-1 gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <h2 className="display-tight text-3xl text-kc-dark sm:text-[2.94rem]">Cómo funciona</h2>
            <p className="mt-4 max-w-sm text-[17.66px] leading-relaxed text-kc-dark/70">
              De una idea suelta a archivos que puede mandar a cualquier imprenta, en tres pasos.
            </p>
          </div>

          <RevealGroup className="divide-y divide-kc-dark/10 border-t border-kc-dark/10">
            {PROCESS.map((item) => (
              <RevealItem key={item.title} className="py-9 first:pt-9">
                <h3 className="display-tight text-[1.71rem] text-kc-dark sm:text-[1.98rem]">{item.title}</h3>
                <p className="mt-3 max-w-[58ch] text-[16.59px] leading-relaxed text-kc-dark/70">{item.desc}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ── Ayuda con el diseño, sobre el lado vacío de la fotografía ── */}
      <section className="relative isolate overflow-hidden">
        <Image
          src="/images/print/proof-desk.webp"
          alt="Pruebas impresas, muestras de papel, una regla de acero y una lupa de imprenta sobre una mesa de concreto"
          fill
          sizes="100vw"
          className="-z-10 object-cover object-right"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-kc-bg via-kc-bg/92 to-kc-bg/0 md:via-kc-bg/80 md:to-transparent" />

        <div className="container-tight px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
          <Reveal className="max-w-lg">
            <h2 className="display-tight text-3xl text-kc-dark sm:text-[2.68rem]">
              ¿Tiene la idea, pero no el archivo?
            </h2>
            <p className="mt-4 text-[17.66px] leading-relaxed text-kc-dark/70">
              No hace falta ser diseñador para pedirnos algo. Cuéntenos qué se imagina, suba un
              logotipo o unas referencias, y una persona real arma el diseño.
            </p>
            <Button asChild size="lg" className={`${BTN_PRIMARY} mt-8`}>
              <Link href="/es/contacto">Hablar con un diseñador</Link>
            </Button>
          </Reveal>
        </div>
      </section>

      {/* ── Testimonios (reales y moderados — ocultos hasta que exista al menos uno) ── */}
      {lead && (
        <section className="band bg-kc-paper">
          <div className="container-tight max-w-4xl">
            <Reveal>
              <div className="mb-5 flex gap-1">
                {Array.from({ length: lead.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-kc-yellow text-kc-yellow" />
                ))}
              </div>
              {/* lang="en": these are customers' own words, left in the language they were written
                  in, and the attribute is what stops a screen reader pronouncing them as Spanish. */}
              <blockquote
                lang="en"
                className="display-tight text-[1.87rem] leading-[1.25] text-kc-dark sm:text-[2.41rem]"
              >
                &ldquo;{lead.text}&rdquo;
              </blockquote>
              <div className="mt-6 text-sm text-kc-dark/70">
                <span className="font-semibold text-kc-dark">{lead.name}</span>
                {lead.company ? `, ${lead.company}` : ""}
              </div>
            </Reveal>

            {rest.length > 0 && (
              <RevealGroup className="mt-14 grid grid-cols-1 gap-8 border-t border-kc-dark/10 pt-10 sm:grid-cols-2">
                {rest.map((item) => (
                  <RevealItem key={item.id}>
                    <p lang="en" className="line-clamp-3 text-[16.05px] leading-relaxed text-kc-dark/80">
                      &ldquo;{item.text}&rdquo;
                    </p>
                    <div className="mt-3 text-xs text-kc-dark/70">
                      {item.name}
                      {item.company ? `, ${item.company}` : ""}
                    </div>
                  </RevealItem>
                ))}
              </RevealGroup>
            )}
          </div>
        </section>
      )}

      {/* ── Preguntas frecuentes ── */}
      <section className="band bg-kc-bg">
        <div className="container-tight grid grid-cols-1 gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
          <h2 className="display-tight text-3xl text-kc-dark sm:text-[2.94rem]">Preguntas frecuentes</h2>

          <div>
            <Accordion className="border-t border-kc-dark/10">
              {FAQS.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border-b border-kc-dark/10">
                  <AccordionTrigger className="py-5 text-left text-[17.12px] font-semibold text-kc-dark hover:text-kc-magenta-deep hover:no-underline">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="max-w-[62ch] pb-5 text-[16.05px] leading-relaxed text-kc-dark/75">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <Button asChild variant="outline" className={`${BTN_SECONDARY} mt-8`}>
              <Link href="/es/preguntas-frecuentes">Ver todas las preguntas</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Closing ── */}
      <section className="bg-kc-ink">
        <div className="reg-bar" />
        <div className="container-tight px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="display-tight max-w-xl text-3xl text-white sm:text-[2.68rem]">
                ¿Listo para imprimir?
              </h2>
              <p className="mt-5 max-w-md text-[16.59px] leading-relaxed text-white/60">
                Elija un producto para ver tamaños, materiales y el precio real de impresión, sin
                registrarse y sin cotización por correo.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
                <a
                  href="tel:+18165210462"
                  className="flex items-center gap-2.5 font-mono text-[14.45px] text-white/70 transition-colors hover:text-white"
                >
                  <Phone className="h-4 w-4" strokeWidth={1.75} /> (816) 521-0462
                </a>
                <a
                  href="mailto:kansasdesigners@gmail.com"
                  className="flex items-center gap-2.5 text-[14.45px] text-white/70 transition-colors hover:text-white"
                >
                  <Mail className="h-4 w-4" strokeWidth={1.75} /> kansasdesigners@gmail.com
                </a>
              </div>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row">
              <Button asChild size="lg" className={`${BTN_PRIMARY} w-full sm:w-auto`}>
                <Link href="/es/servicios">
                  {t.common.seeAll} <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2} />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="edge h-12 w-full border border-white/25 bg-transparent px-7 text-[16.05px] font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/10 sm:w-auto"
              >
                <Link href="/es/contacto">{t.common.contactUs}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/*
        The same LocalBusiness node the English homepage emits, with `@id` pointing at the English
        one rather than minting a second business.

        Two @ids would describe 611 Printing to Google as two separate businesses that happen to
        share a phone number, which splits exactly the local signals the markup exists to
        consolidate. `inLanguage` and the Spanish description are what differ - this is the same
        shop, described in Spanish.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "LocalBusiness",
                "@id": `${APP_URL}/#business`,
                name: "611 Printing",
                logo: `${APP_URL}/icon-512.png`,
                image: [`${APP_URL}/icon-512.png`, `${APP_URL}/og-default.png`],
                url: `${APP_URL}/es`,
                inLanguage: "es-US",
                address: {
                  "@type": "PostalAddress",
                  addressLocality: "Shawnee",
                  addressRegion: "KS",
                  postalCode: "66203",
                  addressCountry: "US",
                },
                priceRange: "$$",
                openingHoursSpecification: {
                  "@type": "OpeningHoursSpecification",
                  dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                  opens: "09:00",
                  closes: "18:00",
                },
                telephone: "+18165210462",
                email: "kansasdesigners@gmail.com",
                description: "Estudio de impresión y diseño totalmente en línea. Atendemos en español.",
                areaServed: [
                  "Johnson County, KS",
                  "Kansas City, MO",
                  "Kansas City, KS",
                  "Dallas-Fort Worth, TX",
                  "United States",
                ],
              },
              {
                "@type": "FAQPage",
                inLanguage: "es-US",
                mainEntity: FAQS.map((faq) => ({
                  "@type": "Question",
                  name: faq.q,
                  acceptedAnswer: { "@type": "Answer", text: faq.a },
                })),
              },
            ],
          }),
        }}
      />
    </>
  );
}
