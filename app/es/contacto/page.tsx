import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { localeAlternates } from "@/lib/i18n/metadata";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Contacte a 611 Printing. Atendemos en español por teléfono. Llame al (816) 521-0462 o escríbanos para una cotización o para hacer su pedido.",
  alternates: localeAlternates("/contact", "es"),
};

/**
 * Contact details rather than a translated form.
 *
 * The English contact page posts to /api/contact, which routes the message to an inbox read in
 * English. Putting a Spanish form in front of that would take a message in Spanish and hand it to
 * someone who replies in English - so this page leads with the phone number, where the shop can
 * actually hold the conversation in Spanish, and offers email as the written alternative.
 */
const CHANNELS = [
  {
    icon: Phone,
    label: "Teléfono",
    value: "(816) 521-0462",
    href: "tel:+18165210462",
    note: "Atendemos en español. Es la vía más rápida para pedir o cotizar.",
  },
  {
    icon: Mail,
    label: "Correo electrónico",
    value: "kansasdesigners@gmail.com",
    href: "mailto:kansasdesigners@gmail.com",
    note: "Escríbanos en español; le respondemos el mismo día hábil.",
  },
];

const DETAILS = [
  { icon: MapPin, label: "Zona de servicio", value: "Área metropolitana de Kansas City, Johnson County, Dallas-Fort Worth y todo el país en línea." },
  { icon: Clock, label: "Horario", value: "Lunes a viernes, 9:00 a 18:00. Los mensajes de fin de semana se responden el lunes." },
];

export default function SpanishContactPage() {
  return (
    <>
      <PageHeader
        title="Hablemos"
        lead="Cuéntenos qué necesita imprimir y le decimos qué producto, tamaño y material le conviene. Sin compromiso y sin esperar días por una cotización."
      />

      <section className="band bg-kc-paper">
        <div className="container-tight">
          <RevealGroup className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {CHANNELS.map((c) => (
              <RevealItem key={c.label} className="h-full">
                <a
                  href={c.href}
                  className="edge group flex h-full flex-col border border-kc-dark/12 bg-white p-7 transition-colors hover:border-kc-dark/30"
                >
                  <c.icon className="h-5 w-5 text-kc-coral" strokeWidth={1.75} aria-hidden="true" />
                  <div className="mt-5 text-[13.91px] font-medium uppercase tracking-wide text-kc-dark/50">{c.label}</div>
                  <div className="mt-1 text-[20px] font-semibold text-kc-dark transition-colors group-hover:text-kc-magenta-deep">
                    {c.value}
                  </div>
                  <p className="mt-3 text-[15.52px] leading-relaxed text-kc-dark/70">{c.note}</p>
                </a>
              </RevealItem>
            ))}
          </RevealGroup>

          <RevealGroup className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            {DETAILS.map((d) => (
              <RevealItem key={d.label} className="flex items-start gap-3">
                <d.icon className="mt-1 h-4 w-4 shrink-0 text-kc-teal" strokeWidth={1.75} aria-hidden="true" />
                <div>
                  <div className="text-[14.45px] font-medium text-kc-dark">{d.label}</div>
                  <p className="mt-1 text-[15.52px] leading-relaxed text-kc-dark/70">{d.value}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      <section className="band bg-kc-bg">
        <div className="container-tight grid grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <h2 className="display-tight text-3xl text-kc-dark sm:text-[2.68rem]">¿Prefiere pedir en línea?</h2>
          <div className="space-y-5 text-[17.12px] leading-relaxed text-kc-dark/75">
            <p>
              Puede hacerlo sin hablar con nadie. Elija su producto, tamaño, material y cantidad y
              verá el precio exacto de impresión al instante, sin registrarse.
            </p>
            <p>
              Tenga en cuenta que el formulario de pedido, el editor de diseño y el proceso de pago
              están en inglés, igual que los correos de confirmación. Si prefiere hacerlo en español,
              llámenos y tomamos el pedido por teléfono.
            </p>
            <p>
              <Link href="/es/servicios" className="font-semibold text-kc-magenta-deep transition-colors hover:text-kc-dark">
                Ver todo lo que imprimimos
              </Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
