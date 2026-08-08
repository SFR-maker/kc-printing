import type { Locale } from "./config";

/**
 * Interface copy for the pages that exist in both languages.
 *
 * Product content - names, taglines, specs, FAQs - is not here. That lives in lib/service-data and
 * lib/service-data-es, because it is content the shop edits rather than interface furniture, and
 * mixing the two produces a dictionary nobody can find anything in.
 *
 * The English half is the source of truth for the shape: `Dictionary` is derived from it, so adding
 * a string in English and forgetting the Spanish is a type error rather than a missing label
 * discovered in production.
 */

const en = {
  nav: {
    services: "Services",
    specials: "Specials",
    pricing: "Pricing",
    portfolio: "Portfolio",
    about: "About",
    contact: "Contact",
    account: "My account",
    signIn: "Sign in",
    startDesigning: "Start designing",
    menu: "Menu",
    closeMenu: "Close menu",
    language: "Language",
  },
  common: {
    orderNow: "Order now",
    order: "Order",
    contactUs: "Contact us",
    seeAll: "See everything we print",
    from: "from",
    mostPopular: "Most popular",
    learnMore: "Learn more",
    getStarted: "Get started",
  },
  service: {
    startDesigning: "Start designing",
    orderWithoutDesigning: "Order without designing",
    designYourself: "Design it yourself in the browser, free, no software",
    realDesigner: "A real designer builds the layout for you",
    filesIncluded: "Print-ready PDF, JPG, and PNG with every order",
    revisionsIncluded: "Revisions included on every package",
    templatesHeading: "Start from a template",
    templatesBody: "Pick one, change anything, and download a print-ready file.",
    specsHeading: "Sizes, stock, and files",
    variantsHeading: "Which film do you need?",
    variantsBody:
      "All three go up easily and come off without residue. The difference is where they stick and what they do to the view through the glass.",
    packagesHeading: "Design packages",
    packagesBody: "Printing is sold at cost. These are the design services on top of it.",
    addOnsHeading: "Add-ons",
    faqHeading: "Common questions",
    startFromDesign: "Start from a design",
    startFromDesignBody: "Open any of these in the editor and make it yours, or start from a blank file.",
    seeAllExamples: "See all examples",
    preferDescribe: "Prefer to describe it?",
    generateStarting: "Generate a starting design",
    editFromThere: "and edit it from there.",
    choosePackage: "Choose your package",
    choosePackageBody: "Every package includes print-ready file delivery and revisions.",
    addOnsTitle: "Add-ons",
    /** "{product} questions" - the product name is substituted at render time. */
    questionsTitle: "{product} questions",
    readyHeading: "Ready to order your {product}?",
    readyBody: "Choose a package, share your brand details, and your first draft arrives in 1 to 3 business days.",
    /** Shown on Spanish pages only, where it is a real caveat rather than a statement of nothing. */
    orderFlowLanguageNote: "",
  },
  specials: {
    eyebrow: "Specials",
    heading: "What's on offer right now",
    intro: "Current promotions across print and design. Codes apply at checkout.",
    empty:
      "No specials are running at the moment. Our everyday pricing is print at cost with no minimums, so it is worth a look either way.",
    useCode: "Use code",
    ends: "Ends",
    dismiss: "Dismiss this announcement",
    seeOffer: "See the offer",
  },
  services: {
    eyebrow: "Services",
    heading: "Everything we print",
    intro:
      "Print sold at cost, design sold separately, and a print-ready file with every order. Pick a product to see sizes, stock and real pricing.",
  },
  pricing: {
    eyebrow: "Pricing",
    heading: "Design packages, plainly priced",
    intro:
      "Printing is sold at cost - what our supplier charges, with nothing added. These are the design services on top of it, and you only pay for one if you want us to make the artwork.",
    perProduct: "Per product",
    printSeparate: "Print priced separately at checkout",
  },
  footer: {
    servicesHeading: "What we print",
    companyHeading: "Company",
    legalHeading: "Legal",
    areasHeading: "Where we work",
    rights: "All rights reserved.",
  },
} as const;

/** The shape every locale must fill, taken from English so the two cannot diverge silently. */
export type Dictionary = {
  [K in keyof typeof en]: { [P in keyof (typeof en)[K]]: string };
};

const es: Dictionary = {
  nav: {
    services: "Servicios",
    specials: "Ofertas",
    pricing: "Precios",
    portfolio: "Portafolio",
    about: "Nosotros",
    contact: "Contacto",
    account: "Mi cuenta",
    signIn: "Iniciar sesión",
    startDesigning: "Empezar a diseñar",
    menu: "Menú",
    closeMenu: "Cerrar menú",
    language: "Idioma",
  },
  common: {
    orderNow: "Pedir ahora",
    order: "Pedir",
    contactUs: "Contáctenos",
    seeAll: "Ver todo lo que imprimimos",
    from: "desde",
    mostPopular: "El más popular",
    learnMore: "Más información",
    getStarted: "Comenzar",
  },
  service: {
    startDesigning: "Empezar a diseñar",
    orderWithoutDesigning: "Pedir sin diseñar",
    designYourself: "Diséñelo usted mismo en el navegador, gratis y sin programas",
    realDesigner: "Un diseñador real arma el diseño por usted",
    filesIncluded: "PDF, JPG y PNG listos para imprenta en cada pedido",
    revisionsIncluded: "Revisiones incluidas en todos los paquetes",
    templatesHeading: "Empiece con una plantilla",
    templatesBody: "Elija una, cambie lo que quiera y descargue un archivo listo para imprenta.",
    specsHeading: "Tamaños, materiales y archivos",
    variantsHeading: "¿Cuál película necesita?",
    variantsBody:
      "Las tres se colocan con facilidad y se retiran sin dejar residuo. La diferencia está en dónde se adhieren y en lo que hacen con la vista a través del vidrio.",
    packagesHeading: "Paquetes de diseño",
    packagesBody: "La impresión se vende a costo. Estos son los servicios de diseño aparte.",
    addOnsHeading: "Complementos",
    faqHeading: "Preguntas frecuentes",
    startFromDesign: "Empiece con un diseño",
    startFromDesignBody: "Abra cualquiera de estos en el editor y hágalo suyo, o empiece con un archivo en blanco.",
    seeAllExamples: "Ver todos los ejemplos",
    preferDescribe: "¿Prefiere describirlo?",
    generateStarting: "Genere un diseño inicial",
    editFromThere: "y edítelo desde ahí.",
    choosePackage: "Elija su paquete",
    choosePackageBody: "Todos los paquetes incluyen entrega de archivos listos para imprenta y revisiones.",
    addOnsTitle: "Complementos",
    questionsTitle: "Preguntas sobre {product}",
    readyHeading: "¿Listo para pedir sus {product}?",
    readyBody: "Elija un paquete, comparta los datos de su marca y su primera propuesta llega en 1 a 3 días hábiles.",
    // The one string that is intentionally empty in English and populated in Spanish: the checkout
    // is genuinely English-only, and the Spanish pages have to say so before someone commits to it.
    orderFlowLanguageNote:
      "El pedido, el editor de diseño y el pago se realizan en inglés. Si prefiere hacer su pedido en español, llámenos al (816) 521-0462.",
  },
  specials: {
    eyebrow: "Ofertas",
    heading: "Lo que tenemos en oferta ahora",
    intro: "Promociones vigentes en impresión y diseño. Los códigos se aplican al pagar.",
    empty:
      "No hay ofertas vigentes en este momento. Nuestro precio de todos los días es impresión a costo y sin mínimos, así que de todas formas vale la pena revisar.",
    useCode: "Use el código",
    ends: "Termina el",
    dismiss: "Cerrar este anuncio",
    seeOffer: "Ver la oferta",
  },
  services: {
    eyebrow: "Servicios",
    heading: "Todo lo que imprimimos",
    intro:
      "Impresión vendida a costo, diseño aparte y un archivo listo para imprenta en cada pedido. Elija un producto para ver tamaños, materiales y precios reales.",
  },
  pricing: {
    eyebrow: "Precios",
    heading: "Paquetes de diseño con precios claros",
    intro:
      "La impresión se vende a costo: lo que nos cobra nuestro proveedor, sin nada añadido. Estos son los servicios de diseño aparte, y solo paga uno si quiere que nosotros hagamos el arte.",
    perProduct: "Por producto",
    printSeparate: "La impresión se cotiza aparte al pagar",
  },
  footer: {
    servicesHeading: "Lo que imprimimos",
    companyHeading: "Empresa",
    legalHeading: "Legal",
    areasHeading: "Dónde trabajamos",
    rights: "Todos los derechos reservados.",
  },
};

const DICTIONARIES: Record<Locale, Dictionary> = { en, es };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES.en;
}
