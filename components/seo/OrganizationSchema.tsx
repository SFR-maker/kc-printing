export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "KC Printing",
    description: "Professional print and design services in Kansas City, MO",
    url: "https://kcprinting.com",
    telephone: "(816) 521-0462",
    email: "kansasdesigners@gmail.com",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Kansas City",
      addressRegion: "MO",
      addressCountry: "US",
    },
    areaServed: [
      { "@type": "City", name: "Kansas City, MO" },
      { "@type": "City", name: "Overland Park, KS" },
      { "@type": "City", name: "Dallas, TX" },
      { "@type": "City", name: "Plano, TX" },
      { "@type": "City", name: "Addison, TX" },
    ],
    sameAs: [],
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "18:00",
    },
    priceRange: "$$",
    "@id": "https://kcprinting.com/#organization",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
