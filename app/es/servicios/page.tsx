import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { SERVICES_ES } from "@/lib/service-data-es";
import { startingPriceLabel } from "@/lib/pricing/starting-prices";
import { SERVICE_SLUG_ES } from "@/lib/i18n/config";
import { localeAlternates } from "@/lib/i18n/metadata";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const metadata: Metadata = {
  title: "Servicios",
  description:
    "Tarjetas de presentación, postales, lonas publicitarias, letreros rígidos y calcomanías para ventanas. Impresión a costo y diseño aparte, con archivo listo para imprenta en cada pedido.",
  alternates: localeAlternates("/services", "es"),
};

export const revalidate = 3600;

/**
 * Product photography and the short pitch under each card.
 *
 * Keyed by English slug like everything else. The `highlights` are the three things a shop owner
 * actually decides on - what it is made of, what sizes exist, and what they get back - rather than
 * marketing adjectives.
 */
const CARDS: { slug: string; image: string; alt: string; description: string; highlights: string[] }[] = [
  {
    slug: "business-cards",
    image: "/images/print/business-cards.webp",
    alt: "Pilas de tarjetas de presentación impresas con bordes de corte visibles",
    description: "Tamaño estándar y formas especiales, en papeles de 14pt a 32pt extragrueso, con rebase y zona segura correctos.",
    highlights: ["Estándar y 5 formas especiales", "4 papeles, de 14pt a 32pt", "Hasta 8 revisiones incluidas"],
  },
  {
    slug: "postcards",
    image: "/images/print/postcards.webp",
    alt: "Un montón de postales promocionales impresas sobre una mesa de concreto",
    description: "Seis tamaños populares desde 3×5 hasta 6×11, diseño de frente y reverso y formatos listos para campañas EDDM.",
    highlights: ["De 3×5 a 6×11, listo para EDDM", "Diseño de frente y reverso", "Hasta 8 revisiones incluidas"],
  },
  {
    slug: "banners",
    image: "/images/print/banners.webp",
    alt: "Una lona de vinil con dobladillo y ojillos metálicos, amarrada a una reja",
    description: "Vinil de gran formato y malla perforada para fachadas, rejas y eventos al aire libre. Con dobladillo en los cuatro lados y ojillos donde los necesite.",
    highlights: ["Vinil y malla, de 1 a 12 pies", "Dobladillo en 4 lados, ojillos opcionales", "Hasta 8 revisiones incluidas"],
  },
  {
    slug: "rigid-signs",
    image: "/images/print/rigid-signs.webp",
    alt: "Cuatro letreros rígidos troquelados recargados en una pared de estudio",
    description: "Señalización rígida troquelada en trece formas, impresa en Yard Sign, plástico corrugado, PVC, foam board o aluminio.",
    highlights: ["13 formas, 5 materiales", "Archivo con línea de corte incluido", "Hasta 8 revisiones incluidas"],
  },
  {
    slug: "window-decals",
    image: "/images/print/window-decals.webp",
    alt: "El vidrio de un local con una calcomanía de vinil impresa aplicada",
    description: "Gráficos para ventanas en vinil adhesivo, adhesivo estático o película perforada translúcida. Cortados en once formas y removibles sin dejar residuo.",
    highlights: ["3 películas, 11 formas de corte", "117 tamaños, de 6 pulg a 5 pies", "Se retiran sin dejar residuo"],
  },
];

const BTN_PRIMARY =
  "edge h-12 bg-kc-coral px-7 text-[16.05px] font-semibold text-white transition-colors hover:bg-kc-magenta-deep";

export default function SpanishServicesPage() {
  const t = getDictionary("es");

  return (
    <>
      <section className="bg-kc-bg">
        <div className="reg-bar" />
        <div className="container-tight px-4 pb-12 pt-16 sm:px-6 lg:px-8 lg:pb-16 lg:pt-24">
          <Reveal className="max-w-2xl">
            <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-kc-teal">{t.services.eyebrow}</div>
            <h1 className="display-tight text-4xl text-kc-dark sm:text-5xl lg:text-6xl">{t.services.heading}</h1>
            <p className="mt-5 text-[17.66px] leading-relaxed text-kc-dark/70">{t.services.intro}</p>
          </Reveal>
        </div>
      </section>

      <section className="band bg-kc-paper">
        <div className="container-tight">
          <RevealGroup className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {CARDS.map((card) => {
              const service = SERVICES_ES[card.slug];
              const href = `/es/servicios/${SERVICE_SLUG_ES[card.slug]}`;
              return (
                <RevealItem key={card.slug} className="h-full">
                  <Link href={href} className="edge group flex h-full flex-col overflow-hidden border border-kc-dark/12 bg-white transition-colors hover:border-kc-dark/30">
                    <div className="relative aspect-[4/3] overflow-hidden bg-kc-bg">
                      <Image
                        src={card.image}
                        alt={card.alt}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="display-tight text-2xl text-kc-dark">{service.name}</h2>
                        <span className="shrink-0 whitespace-nowrap font-mono text-[13.38px] text-kc-dark/60">
                          {/* startingPriceLabel returns "from $19"; the Spanish page says "desde $19". */}
                          {startingPriceLabel(card.slug).replace("from", t.common.from)}
                        </span>
                      </div>
                      <p className="mt-3 text-[15.52px] leading-relaxed text-kc-dark/70">{card.description}</p>
                      <ul className="mt-4 space-y-1.5">
                        {card.highlights.map((h) => (
                          <li key={h} className="text-[14.45px] text-kc-dark/60">· {h}</li>
                        ))}
                      </ul>
                      <span className="mt-auto pt-6 text-[14.98px] font-semibold text-kc-magenta-deep transition-colors group-hover:text-kc-dark">
                        {t.common.learnMore} →
                      </span>
                    </div>
                  </Link>
                </RevealItem>
              );
            })}
          </RevealGroup>
        </div>
      </section>

      <section className="bg-kc-ink">
        <div className="reg-bar" />
        <div className="container-tight px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="display-tight max-w-xl text-3xl text-white sm:text-[2.68rem]">
                ¿No está seguro de qué necesita?
              </h2>
              <p className="mt-5 max-w-md text-[16.59px] leading-relaxed text-white/60">
                Cuéntenos qué quiere lograr y le decimos qué producto, tamaño y material le conviene.
                Hablamos español.
              </p>
            </div>
            <Button asChild size="lg" className={`${BTN_PRIMARY} shrink-0`}>
              <Link href="/es/contacto">
                {t.nav.contact} <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2} />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
