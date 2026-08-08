import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClosingCta } from "@/components/layout/ClosingCta";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { localeAlternates } from "@/lib/i18n/metadata";

export const metadata: Metadata = {
  title: "Nosotros - Estudio de diseño e impresión en línea",
  description:
    "611 Printing es un estudio de diseño e impresión totalmente en línea que atiende Kansas City, Johnson County, Dallas-Fort Worth y negocios en todo el país.",
  alternates: localeAlternates("/about", "es"),
};

// Datos verificables únicamente: nada de conteos de clientes, calificaciones ni años en el mercado
// mientras no haya cifras reales que los respalden.
const FACTS = [
  { value: "5", label: "Productos, deliberadamente pocos" },
  { value: "24hr", label: "Entrega urgente disponible" },
  { value: "8", label: "Máximo de revisiones por pedido" },
  { value: "100%", label: "En línea, sin visitas presenciales" },
];

const AREAS = ["Kansas City, MO", "Johnson County, KS", "Dallas-Fort Worth, TX", "En línea, todo el país"];

export default function SpanishAboutPage() {
  return (
    <>
      <PageHeader
        title="Un estudio hecho para el dueño de negocio de hoy"
        lead="611 Printing es un estudio de impresión y diseño totalmente en línea con base en el área metropolitana de Kansas City. Ayudamos a negocios pequeños y medianos a resolver su diseño rápido y a precio justo, sin los costos de una agencia tradicional."
      />

      <section className="border-y border-kc-dark/10 bg-kc-bg">
        <div className="container-tight px-4 sm:px-6 lg:px-8">
          <RevealGroup className="grid grid-cols-2 divide-kc-dark/10 sm:grid-cols-4 sm:divide-x">
            {FACTS.map((fact) => (
              <RevealItem key={fact.label} className="py-8 sm:px-7 sm:first:pl-0 sm:last:pr-0">
                <div className="display-tight text-[2.41rem] text-kc-dark">{fact.value}</div>
                <div className="mt-2 text-[14.45px] leading-snug text-kc-dark/70">{fact.label}</div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      <section className="band bg-kc-paper">
        <div className="container-tight grid grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <h2 className="display-tight text-3xl text-kc-dark sm:text-[2.68rem]">Cómo trabajamos</h2>
          <div className="space-y-5 text-[17.12px] leading-relaxed text-kc-dark/75">
            <p>
              Vendemos la impresión a costo. Le cobramos exactamente lo que nos cobra la imprenta con
              la que trabajamos, sin margen encima, y ese precio se ve en la página de cada producto
              antes de que usted entregue ningún dato. Nuestro ingreso viene del diseño y de un cargo
              fijo de manejo en el envío.
            </p>
            <p>
              Eso cambia la conversación. En lugar de venderle un paquete grande, la pregunta pasa a
              ser qué necesita realmente: si ya tiene su arte listo, no le vendemos diseño. Si no lo
              tiene, puede armarlo usted mismo en el editor del navegador sin costo, o pagar un
              paquete para que lo haga un diseñador.
            </p>
            <p>
              Mantenemos el catálogo corto a propósito. Cinco productos que conocemos a fondo dan
              mejores resultados que cincuenta que solo revendemos, y significa que podemos decirle
              con honestidad qué material aguanta a la intemperie y cuál no.
            </p>
          </div>
        </div>
      </section>

      <section className="band bg-kc-bg">
        <div className="container-tight">
          <Reveal className="mb-8 max-w-xl">
            <h2 className="display-tight text-3xl text-kc-dark sm:text-[2.68rem]">Dónde trabajamos</h2>
            <p className="mt-4 text-[17.12px] leading-relaxed text-kc-dark/75">
              Todo el proceso es en línea, así que la ubicación importa poco. Estas son las zonas de
              donde viene la mayoría de nuestros clientes.
            </p>
          </Reveal>
          <RevealGroup className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {AREAS.map((area) => (
              <RevealItem key={area} className="border border-kc-dark/12 bg-white px-5 py-6 text-[15.52px] font-medium text-kc-dark">
                {area}
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      <ClosingCta
        title="¿Empezamos?"
        body="Elija un producto para ver tamaños, materiales y el precio real de impresión."
        primary={{ label: "Ver lo que imprimimos", href: "/es/servicios" }}
        secondary={{ label: "Contáctenos", href: "/es/contacto" }}
        showContactDetails
      />
    </>
  );
}
