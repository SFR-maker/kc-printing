import type { ServiceDef } from "./service-data";
import { SERVICES } from "./service-data";

/**
 * Spanish product content.
 *
 * Keyed by the English slug, not the Spanish one, so this stays aligned with lib/pricing, the
 * Product table and every other thing in the codebase that identifies a product. The Spanish URL
 * segment is a routing concern and lives in lib/i18n/config.
 *
 * Prices, package names and add-on names are not repeated here - they come from the English
 * definition at merge time. A price that could be edited in one language and not the other is a
 * bug waiting to happen, and "Silver / Gold / Platinum" are product tier names rather than words,
 * the same way they are left untranslated on the Spanish sites of the suppliers we buy from.
 *
 * The translations are written rather than transliterated. "Print-ready" is not "listo para
 * imprimir" - the trade term is "listo para imprenta" - and a US Spanish-speaking shop owner says
 * "lona" for a vinyl banner, not "bandera" or "pancarta".
 */

interface ServiceCopyEs {
  name: string;
  tagline: string;
  description: string;
  specs: { label: string; value: string }[];
  packageFeatures: string[][];
  addOnDescriptions: string[];
  faqs: { q: string; a: string }[];
}

const COPY: Record<string, ServiceCopyEs> = {
  "business-cards": {
    name: "Tarjetas de Presentación",
    tagline: "Primeras impresiones que perduran. Tarjetas profesionales diseñadas y entregadas rápido.",
    description:
      "Diseño de tarjetas de presentación en tamaños estándar y formas especiales. Entregamos archivos listos para imprenta a 300-350 DPI con 0.1 pulg de rebase, listos para cualquier imprenta comercial.",
    specs: [
      { label: "Tamaño estándar", value: "2 pulg x 3.5 pulg" },
      { label: "Formas especiales", value: "Cuadrada, círculo, óvalo, delgada, hoja" },
      { label: "Papeles", value: "14pt brillante, 14pt sin recubrir, 16pt mate, 32pt extragrueso" },
      { label: "Rebase", value: "0.1 pulg en todos los lados" },
      { label: "Formatos de archivo", value: "TIF, TIFF, EPS, AI, PSD, BMP, GIF, JPG, PNG, PDF" },
      { label: "Resolución", value: "300 a 350 DPI recomendado" },
      { label: "Entrega", value: "PDF, JPG y PNG listos para imprenta" },
    ],
    packageFeatures: [
      ["1-2 imágenes o logotipos", "Textos básicos incluidos", "Hasta 4 revisiones", "PDF y JPG listos para imprenta", "Entrega en 3-5 días hábiles"],
      ["3-4 imágenes o logotipos", "Textos básicos incluidos", "Hasta 6 revisiones", "Entrega en PDF, JPG y PNG", "Entrega en 2-3 días hábiles", "Dos propuestas de diseño"],
      ["5 o más imágenes o logotipos", "Textos completos", "Hasta 8 revisiones", "Paquete completo de archivos", "Entrega prioritaria en 1-2 días hábiles", "Tres propuestas de diseño", "Diseño de frente y reverso incluido"],
    ],
    addOnDescriptions: [
      "Diseño completo para el reverso de su tarjeta",
      "Entrega garantizada en 24 horas",
      "Código QR personalizado que enlaza a su sitio web o redes",
      "Una propuesta de diseño adicional para elegir",
    ],
    faqs: [
      { q: "¿De qué tamaño debe ser mi tarjeta de presentación?", a: "El tamaño estándar es 2 pulg x 3.5 pulg. También ofrecemos cuadrada (2.5 x 2.5), delgada (1.75 x 3.5), círculo (2.5 pulg de diámetro) y forma de hoja. Las formas especiales pueden variar según la imprenta." },
      { q: "¿Qué papel me recomiendan?", a: "El 14pt brillante es el más elegido por sus colores vivos. El 16pt mate se siente premium y es fácil de escribir encima. El extragrueso de 32pt causa buena impresión en eventos de negocios." },
      { q: "¿Necesito entregar algún archivo?", a: "No es obligatorio. Puede subir su logotipo, colores de marca e imágenes de referencia. Si empieza de cero, nuestra herramienta con IA le ayuda a definir su idea antes de que el diseñador comience." },
      { q: "¿Cómo funciona el rebase?", a: "Añadimos 0.1 pulg de rebase en todos los lados de su diseño. Así, al cortar la tarjeta, no quedan bordes blancos por variación de corte. Su contenido importante se mantiene dentro de la zona segura." },
      { q: "¿Puedo imprimir el archivo yo mismo o con mi propia imprenta?", a: "Sí. Usted recibe los archivos finales listos para imprenta y puede usar cualquier imprenta comercial. Seguimos las especificaciones estándar de la industria para rebase, resolución y modo de color." },
      { q: "¿Cuántas revisiones incluye?", a: "Silver incluye hasta 4 revisiones, Gold hasta 6 y Platinum hasta 8. Las revisiones adicionales están disponibles con una tarifa fija." },
    ],
  },
  postcards: {
    name: "Postales",
    tagline: "Diseños de postales de alto impacto para campañas de marketing, envíos EDDM y correo directo.",
    description:
      "Diseños de postales llamativos en varios tamaños. Ideales para campañas EDDM, contacto con clientes, promoción de eventos y marketing de temporada. Disponible con diseño de frente y reverso.",
    specs: [
      { label: "Tamaños populares", value: "3x5, 4x6, 5x7, 5.5x8.5, 6x9, 6x11 pulg" },
      { label: "Tamaños a medida", value: "Desde 2x4 pulg hasta 9x12 pulg" },
      { label: "Papeles", value: "14pt brillante, 16pt mate, blanco liso, perlado, extragrueso" },
      { label: "Opciones", value: "Solo frente o frente y reverso, esquinas redondeadas, listo para EDDM" },
      { label: "EDDM", value: "Panel de dirección y zona postal para Every Door Direct Mail" },
      { label: "Rebase", value: "0.125 pulg en todos los lados" },
      { label: "Entrega", value: "PDF, JPG y PNG listos para imprenta" },
    ],
    packageFeatures: [
      ["1-2 imágenes o logotipos", "Textos básicos incluidos", "Hasta 4 revisiones", "Diseño del frente", "Archivos listos para imprenta"],
      ["3-4 imágenes o logotipos", "Textos básicos incluidos", "Hasta 6 revisiones", "Diseño de frente y reverso", "Opción de panel EDDM", "Dos propuestas de diseño"],
      ["5 o más imágenes o logotipos", "Textos completos", "Hasta 8 revisiones", "Diseño de frente y reverso", "Diseño listo para EDDM", "Diseño para campaña de correo", "Paquete completo de archivos"],
    ],
    addOnDescriptions: [
      "Área de dirección y zona postal para Every Door Direct Mail",
      "Especificación de esquinas redondeadas para un acabado premium",
      "Entrega garantizada en 24 horas",
      "Bloque de dirección con formato para combinar con su lista de correo",
    ],
    faqs: [
      { q: "¿Qué es EDDM y lo necesito?", a: "Every Door Direct Mail es un programa del servicio postal que le permite enviar correo a rutas completas sin tener una lista de direcciones. Si piensa usar EDDM, elija un tamaño que cumpla los requisitos del USPS (mínimo 3.5 x 5 pulg) y agregue el complemento de panel EDDM." },
      { q: "¿Cuál es el tamaño de postal más popular?", a: "Los tamaños 4 x 6 pulg y 6 x 9 pulg son los más solicitados. Los tamaños grandes como 6 x 9 o 6 x 11 suelen tener mejor tasa de apertura y destacan más en el buzón." },
      { q: "¿Pueden diseñar el frente y el reverso?", a: "Sí. Los paquetes Gold y Platinum incluyen diseño de frente y reverso. El paquete Silver cubre solo el frente. El reverso se enfoca en datos de contacto, panel de correo o contenido promocional adicional." },
      { q: "¿Qué formatos de archivo entregan?", a: "Recibe un PDF listo para imprenta con el rebase correcto, un JPG en alta resolución y un PNG. Los archivos están listos para cualquier imprenta comercial o en línea." },
      { q: "¿Cuánto tarda el diseño?", a: "El tiempo estándar es de 2 a 4 días hábiles. La entrega urgente en 24 horas está disponible como complemento con costo adicional." },
      { q: "¿Pueden diseñar una postal de cualquier tamaño?", a: "Sí. Manejamos tamaños a medida desde 2 x 4 pulg hasta 9 x 12 pulg. Indique su medida en las notas del pedido y la respetamos con precisión." },
    ],
  },
  banners: {
    name: "Lonas Publicitarias",
    tagline: "Lonas profesionales para ferias, fachadas y promociones al aire libre. Listas para imprenta, a especificación y entregadas rápido.",
    description:
      "Diseños a medida para lonas de vinil de gran formato y malla perforada, con dobladillo en los cuatro lados y ojillos metálicos. Los archivos incluyen rebase, zona segura y guías de colocación de ojillos.",
    specs: [
      { label: "Tipo de lona", value: "Vinil con dobladillo o malla perforada" },
      { label: "Materiales", value: "Vinil scrim de 13 oz (brillante o mate), malla de 8 oz" },
      { label: "Tamaños de vinil", value: "Desde 2x4 pies hasta 4x10 pies, a medida hasta 6x20 pies" },
      { label: "Materiales de vinil", value: "Malla 8oz, scrim 13oz brillante, scrim 13oz mate" },
      { label: "Rebase", value: "0.125 pulg en todos los lados" },
      { label: "Zona segura", value: "0.25 pulg desde todos los bordes" },
      { label: "Acabado", value: "Dobladillo en los 4 lados, incluido. Ojillos cada 2 pies o en las 4 esquinas." },
      { label: "Entrega", value: "PDF listo para imprenta con guías, JPG en alta resolución" },
    ],
    packageFeatures: [
      ["1-2 imágenes o logotipos", "Textos básicos", "Hasta 4 revisiones", "PDF listo para imprenta con rebase", "Guías de zona segura y ojillos"],
      ["3-4 imágenes o logotipos", "Textos básicos", "Hasta 6 revisiones", "PDF listo para imprenta con rebase", "Dos propuestas de diseño"],
      ["5 o más imágenes o logotipos", "Textos completos", "Hasta 8 revisiones", "Paquete completo de archivos", "Tres propuestas de diseño", "Entrega prioritaria"],
    ],
    addOnDescriptions: [
      "Terminado en 24 horas",
      "Una propuesta de diseño adicional",
      "Diseño de tarjeta de presentación a juego con su lona",
      "Diagrama de colocación de ojillos listo para imprenta",
      "Diseño completo para ambos lados",
    ],
    faqs: [
      { q: "¿Elijo vinil o malla?", a: "El vinil scrim es la opción general y lo que la mayoría necesita, en interiores o exteriores. La malla es perforada y deja pasar el viento, que es lo que se requiere en una reja, un andamio o cualquier muro expuesto: una lona sólida en esa posición actúa como vela y se rasga en los ojillos." },
      { q: "¿Cuál es el tamaño de lona más común?", a: "Los tamaños 3 x 6 pies y 4 x 8 pies cubren la mayoría de fachadas y eventos. Imprimimos desde 1 x 2 pies hasta 4 x 12 pies, con dobladillo en los cuatro lados y ojillos cada 2 pies o en las esquinas." },
      { q: "¿Qué rebase y zona segura necesito?", a: "Diseñamos con 0.125 pulg de rebase en todos los lados. Mantenga el contenido importante al menos a 0.5 pulg de los bordes. Las lonas de vinil incluyen guías de colocación de ojillos si las solicita." },
      { q: "¿Qué formato de archivo necesita la imprenta?", a: "La mayoría de las imprentas aceptan PDF o JPG en alta resolución. Entregamos ambos, con marcas de corte y guías de rebase incluidas." },
      { q: "¿Puedo usar los colores y el logotipo de mi marca?", a: "Sí. Suba su logotipo y sus lineamientos de marca en el pedido. Si no tiene un manual de marca, complete el cuestionario y nuestro diseñador igualará sus colores lo más fielmente posible." },
      { q: "¿Puedo pedir una lona de vinil a medida?", a: "Sí. Manejamos tamaños a medida desde 1x2 pies hasta 6x20 pies. Indique sus medidas en las notas del pedido y las respetamos con precisión." },
    ],
  },
  "rigid-signs": {
    name: "Letreros Rígidos",
    tagline: "Señalización rígida troquelada en 13 formas, impresa en Yard Sign, plástico corrugado, PVC, foam board y aluminio.",
    description:
      "Diseños de letreros rígidos cortados a la forma (círculo, estrella, flecha, casa o cuadrado redondeado) en el material adecuado para su uso. Los archivos incluyen rebase y una línea de corte limpia.",
    specs: [
      { label: "Formas", value: "Cuadrado redondeado, círculo, estrella, flecha, casa" },
      { label: "Materiales", value: "Yard Sign, plástico corrugado, PVC, foam board y aluminio" },
      { label: "Tamaños", value: "Desde 12x12 pulg hasta 18x10 pulg según la forma, medidas a la orden disponibles" },
      { label: "Rebase", value: "0.125 pulg en todos los lados" },
      { label: "Zona segura", value: "0.5 a 0.75 pulg desde la línea de corte según la forma" },
      { label: "Entrega", value: "PDF listo para imprenta con línea de corte, JPG en alta resolución" },
    ],
    packageFeatures: [
      ["1-2 imágenes o logotipos", "Textos básicos", "Hasta 4 revisiones", "PDF listo para imprenta con línea de corte"],
      ["3-4 imágenes o logotipos", "Textos básicos", "Hasta 6 revisiones", "PDF listo para imprenta con línea de corte", "Dos propuestas de diseño"],
      ["5 o más imágenes o logotipos", "Textos completos", "Hasta 8 revisiones", "Paquete completo de archivos", "Tres propuestas de diseño", "Entrega prioritaria"],
    ],
    addOnDescriptions: [
      "Terminado en 24 horas",
      "Una propuesta de diseño adicional",
      "Una forma troquelada fuera del catálogo estándar, cortada a su contorno",
      "Diagrama listo para imprenta de separadores o soportes de montaje",
    ],
    faqs: [
      { q: "¿Qué material me conviene?", a: "El aluminio da un aspecto premium y duradero para fachadas y oficinas. El PVC y el foam board son ligeros y económicos para interiores o exhibiciones temporales. El plástico corrugado y el Yard Sign son los más resistentes a la intemperie y los más económicos para letreros de jardín y eventos. Cuéntenos su caso y le recomendamos el material correcto." },
      { q: "¿Puedo pedir una forma que no esté en la lista?", a: "Sí. Agregue el complemento de forma a medida y describa (o suba) el contorno que necesita. Creamos la línea de corte para que coincida." },
      { q: "¿Cómo funciona la línea de corte?", a: "Diseñamos sobre un lienzo rectangular estándar con espacio suficiente para su forma y luego aplicamos la forma como línea de corte precisa al exportar. Lo que usted diseña se traslada exactamente al letrero troquelado final, con 0.125 pulg de rebase para que el color llegue al borde sin espacios blancos." },
      { q: "¿Qué formato de archivo necesita la imprenta?", a: "Entregamos un PDF listo para imprenta con la línea de corte marcada, más una vista previa en JPG de alta resolución. Ambos incluyen guías de rebase y zona segura." },
      { q: "¿Puedo usar los colores y el logotipo de mi marca?", a: "Sí. Suba su logotipo y sus lineamientos de marca en el pedido. Si no tiene un manual de marca, complete el cuestionario y nuestro diseñador igualará sus colores lo más fielmente posible." },
    ],
  },
  "window-decals": {
    name: "Calcomanías para Ventanas",
    tagline: "Convierta el vidrio de su local en su mejor vendedor. Calcomanías, adhesivos estáticos y película perforada.",
    description:
      "Gráficos para ventanas impresos en vinil adhesivo, adhesivo estático o película perforada translúcida. Cortados en once formas y en tamaños desde 6 pulgadas hasta 5 pies, y se retiran sin dejar residuo.",
    specs: [
      { label: "Películas", value: "Vinil adhesivo 3 mil, adhesivo estático blanco 8 mil, perforada 70/30 de 6 mil" },
      { label: "Formas", value: "Rectángulo, rectángulo redondeado, cuadrado, círculo, óvalo, estrella, octágono, flecha, casa, edificio" },
      { label: "Tamaños", value: "Desde 24 x 6 pulg hasta 60 x 40 pulg, 117 tamaños entre todas las formas" },
      { label: "Impresión", value: "Full color en la cara frontal. Tintas ecosolventes." },
      { label: "Rebase", value: "0.125 pulg en todos los lados" },
      { label: "Zona segura", value: "0.5 pulg desde la línea de corte" },
      { label: "Resolución", value: "150 DPI al tamaño final" },
      { label: "Entrega", value: "PDF listo para imprenta con línea de corte, JPG en alta resolución" },
    ],
    packageFeatures: [
      ["1-2 imágenes o logotipos", "Textos básicos", "Hasta 4 revisiones", "PDF listo para imprenta con línea de corte"],
      ["3-4 imágenes o logotipos", "Textos básicos", "Hasta 6 revisiones", "PDF listo para imprenta con línea de corte", "Dos propuestas de diseño"],
      ["5 o más imágenes o logotipos", "Textos completos", "Hasta 8 revisiones", "Paquete completo de archivos", "Tres propuestas de diseño", "Entrega prioritaria"],
    ],
    addOnDescriptions: [
      "Terminado en 24 horas",
      "Una propuesta de diseño adicional",
      "Arte invertido para aplicar por dentro del vidrio y que se lea correctamente desde la calle",
      "Guía impresa de colocación y aplicación a la medida de su ventana",
    ],
    faqs: [
      { q: "¿Cuál es la diferencia entre calcomanía, adhesivo estático y película perforada?", a: "La calcomanía es vinil adhesivo: se pega a cualquier superficie lisa y limpia, por dentro o por fuera, y es la opción resistente para algo que va a durar más de una temporada. El adhesivo estático no lleva pegamento; la estática lo sostiene al vidrio, así que se puede reposicionar y es ideal para promociones que cambia cada mes. La película perforada tiene micro perforaciones: desde afuera se ve como un gráfico sólido y desde adentro se puede ver hacia la calle, que es lo que necesita en una ventana donde su personal o sus clientes están sentados." },
      { q: "¿Daña el vidrio o deja residuo?", a: "No. Las tres películas son removibles y no dejan residuo. Los adhesivos estáticos se desprenden sin esfuerzo; las calcomanías y las películas perforadas se retiran limpiamente, y calentarlas con una secadora facilita despegar una pieza grande de una sola vez." },
      { q: "¿Pueden imprimir algo que se lea correctamente desde adentro del local?", a: "Sí. Agregue el complemento de arte invertido y espejeamos el diseño para aplicarlo en la cara interior del vidrio, de modo que se lea bien desde la calle. Esto además protege la impresión de la intemperie y de rayones." },
      { q: "¿Cómo mido mi ventana?", a: "Mida el vidrio, no el marco, y tome el ancho y el alto menores si el cristal no es perfectamente cuadrado. Después elija el tamaño inmediato inferior: una calcomanía del tamaño exacto de la abertura no deja margen para colocarla, y media pulgada de vidrio libre alrededor del gráfico se ve intencional en lugar de apretado." },
      { q: "¿Cuánto duran los gráficos de ventana a la intemperie?", a: "El vinil adhesivo dura de tres a cinco años en exteriores y prácticamente de forma indefinida en interiores. La película perforada dura alrededor de tres años en exteriores. Los adhesivos estáticos son producto de interior y conviene tratarlos como temporales: están hechos para cambiarse, no para resistir el clima." },
      { q: "¿Imprimen tinta blanca?", a: "No. Las películas se imprimen a full color sobre material blanco o transparente, y lo que quede sin imprimir en las películas transparentes deja ver el vidrio detrás. Si su diseño necesita texto en blanco, colóquelo sobre un fondo de color impreso en lugar de depender de tinta blanca." },
    ],
  },
};

/**
 * Merges the Spanish copy over the English definition.
 *
 * Built at module load rather than per request: it is pure data, and doing it once means the Spanish
 * pages carry no per-render cost the English ones do not.
 *
 * Anything without a translation falls through to English rather than disappearing. A missing
 * Spanish FAQ shows the English one, which is worse than a translation and far better than a
 * product page with no answers on it.
 */
function translate(slug: string, base: ServiceDef): ServiceDef {
  const copy = COPY[slug];
  if (!copy) return base;
  return {
    ...base,
    name: copy.name,
    tagline: copy.tagline,
    description: copy.description,
    specs: copy.specs,
    packages: base.packages.map((p, i) => ({ ...p, features: copy.packageFeatures[i] ?? p.features })),
    addOns: base.addOns.map((a, i) => ({ ...a, desc: copy.addOnDescriptions[i] ?? a.desc })),
    faqs: copy.faqs,
  };
}

export const SERVICES_ES: Record<string, ServiceDef> = Object.fromEntries(
  Object.entries(SERVICES).map(([slug, def]) => [slug, translate(slug, def)]),
);
