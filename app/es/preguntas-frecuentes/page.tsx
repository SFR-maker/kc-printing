import type { Metadata } from "next";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClosingCta } from "@/components/layout/ClosingCta";
import { localeAlternates } from "@/lib/i18n/metadata";

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description:
    "Respuestas a las preguntas más comunes sobre los servicios de diseño de 611 Printing: formatos de archivo, tiempos de entrega, revisiones y cómo hacer un pedido.",
  alternates: localeAlternates("/faq", "es"),
};

const FAQS = [
  {
    category: "Pedidos",
    items: [
      { q: "¿Cómo hago un pedido?", a: "Elija su producto y su paquete en la página de Servicios, complete el formulario del pedido, suba los archivos o las notas que tenga y proceda al pago. Recibirá un correo de confirmación después del pago." },
      { q: "¿El pedido está en español?", a: "No. La página de producto y toda la información están en español, pero el formulario de pedido, el editor de diseño y el proceso de pago se realizan en inglés, igual que los correos de confirmación. Si prefiere hacer su pedido en español, llámenos al (816) 521-0462 y lo tomamos por teléfono." },
      { q: "¿Necesito crear una cuenta?", a: "No para comprar. Puede pedir como invitado con solo su correo electrónico. Crear una cuenta gratuita le permite dar seguimiento a su pedido, descargar sus archivos y pedir revisiones desde un mismo lugar." },
      { q: "¿Puedo pedir una cotización antes de comprar?", a: "Sí. Use el formulario de contacto o llame al (816) 521-0462. Dicho eso, la impresión ya muestra su precio real en la página de cada producto: elija tamaño, material y cantidad y verá el precio exacto, sin esperar una cotización." },
      { q: "¿Qué formas de pago aceptan?", a: "Aceptamos las principales tarjetas de crédito y débito a través de Stripe. El pago se cobra de forma segura al finalizar la compra. Stripe cumple con el estándar PCI y nosotros nunca almacenamos los datos de su tarjeta." },
    ],
  },
  {
    category: "Precios",
    items: [
      { q: "¿Qué significa que la impresión se vende a costo?", a: "Le cobramos por la impresión exactamente lo que nos cobra nuestro proveedor, sin margen añadido. Nuestro ingreso viene de los servicios de diseño y de un cargo fijo de manejo en el envío. Si usted ya tiene su archivo listo, paga únicamente el costo de impresión." },
      { q: "¿Hay pedido mínimo?", a: "No. Puede pedir una sola pieza. Los descuentos por volumen que ofrece el proveedor se reflejan automáticamente al elegir cantidades mayores." },
      { q: "¿Hay cargos recurrentes?", a: "No. Todos los servicios son pagos únicos, sin suscripciones ni cargos recurrentes." },
      { q: "¿Puedo usar un código de descuento?", a: "Sí. Ingrese su código al finalizar la compra. Solo se puede aplicar un código por pedido." },
    ],
  },
  {
    category: "Proceso de diseño",
    items: [
      { q: "¿Cuánto tarda el diseño?", a: "El tiempo estándar es de 2 a 4 días hábiles para la mayoría de los proyectos. La entrega urgente (24 a 48 horas) está disponible como complemento." },
      { q: "¿Cómo funcionan las revisiones?", a: "Después de recibir su primera propuesta, puede enviar solicitudes de revisión desde su cuenta. Cada paquete incluye un número determinado de revisiones (de 4 a 8 según el nivel). Las revisiones adicionales tienen una tarifa fija." },
      { q: "¿Y si no me gusta el diseño?", a: "Trabajamos con usted hasta que quede satisfecho dentro de las revisiones incluidas. Si aún así no queda conforme, ofrecemos revisiones adicionales con tarifa preferencial para clientes existentes." },
      { q: "¿Tengo que entregar algún material?", a: "No es obligatorio, pero ayuda. Puede subir su logotipo, colores de marca, fotos o imágenes de referencia. Mientras más contexto nos dé, mejor será la primera propuesta." },
    ],
  },
  {
    category: "Archivos y formatos",
    items: [
      { q: "¿Qué formatos de archivo entregan?", a: "Entregamos un PDF listo para imprenta con el rebase correcto, más un JPG en alta resolución y un PNG. Los letreros rígidos y las calcomanías incluyen además la línea de corte marcada." },
      { q: "¿Los archivos están listos para imprenta?", a: "Sí. Todos los archivos incluyen rebase, están en modo de color CMYK y a la resolución correcta (300-350 DPI en formatos pequeños, 150 DPI en gran formato). Puede subirlos directamente a cualquier imprenta comercial." },
      { q: "¿Qué formatos puedo subir?", a: "Aceptamos TIF, TIFF, EPS, AI, PSD, BMP, GIF, JPG, PNG y PDF. Lo ideal es que sus archivos estén a 300 DPI o más. Los logotipos deben ser vectoriales (AI, EPS o PDF) para obtener el mejor resultado." },
      { q: "¿Cómo descargo mis archivos terminados?", a: "Los archivos terminados están disponibles en su cuenta, en la sección de pedidos. También recibirá un correo cuando estén listos para descargar." },
    ],
  },
  {
    category: "Envíos y devoluciones",
    items: [
      { q: "¿Cuál es su política de devoluciones?", a: "Si el trabajo de diseño no ha comenzado, puede solicitar un reembolso completo dentro de las 24 horas posteriores a su pedido. Una vez iniciado el trabajo, los reembolsos se calculan en proporción a lo realizado. Consulte nuestra Política de Reembolsos para más detalles." },
      { q: "¿A dónde envían?", a: "Enviamos a todo Estados Unidos. El costo de envío se calcula al finalizar la compra según su dirección, y siempre lo ve antes de pagar." },
      { q: "¿Ofrecen descuentos por pedidos grandes?", a: "Sí. Si necesita varios productos o es cliente recurrente, contáctenos para una cotización a medida. Ofrecemos precios en paquete para negocios que piden varios servicios." },
    ],
  },
];

export default function SpanishFaqPage() {
  return (
    <>
      <PageHeader
        title="Preguntas frecuentes"
        lead="Todo lo que necesita saber sobre pedidos, diseño, archivos y facturación."
      />

      <section className="band-tight bg-kc-paper">
        <div className="container-tight space-y-14">
          {FAQS.map((group) => (
            <div key={group.category} className="grid grid-cols-1 gap-8 lg:grid-cols-[0.5fr_1.5fr] lg:gap-16">
              <h2 className="display-tight text-2xl text-kc-dark sm:text-[2.03rem]">{group.category}</h2>
              <Accordion className="border-t border-kc-dark/10">
                {group.items.map((item, i) => (
                  <AccordionItem key={i} value={`${group.category}-${i}`} className="border-b border-kc-dark/10">
                    <AccordionTrigger className="py-5 text-left text-[17.12px] font-semibold text-kc-dark hover:text-kc-magenta-deep hover:no-underline">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="max-w-[62ch] pb-5 text-[16.05px] leading-relaxed text-kc-dark/75">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      </section>

      <ClosingCta
        title="¿No encontró su respuesta?"
        body="Llámenos o escríbanos y le respondemos el mismo día hábil. Atendemos en español."
        primary={{ label: "Contáctenos", href: "/es/contacto" }}
        secondary={{ label: "Ver lo que imprimimos", href: "/es/servicios" }}
        showContactDetails
      />
    </>
  );
}
