import { Phone, Mail, MessageSquare } from "lucide-react";
import { ContactForm } from "@/components/contact/ContactForm";

/**
 * The form itself lives in components/contact/ContactForm, which the Spanish page shares. Only the
 * surrounding contact details are per-page, so this is a Server Component again - the whole page
 * used to be a Client Component purely because react-hook-form lived in it, which is also why its
 * metadata had to be exported from a sibling layout.tsx.
 */
export default function ContactPage() {
  return (
    <>
      <section className="bg-kc-bg">
        <div className="reg-bar" />
        <div className="container-tight px-4 pb-10 pt-16 sm:px-6 lg:px-8 lg:pb-12 lg:pt-24">
          <div className="max-w-2xl">
            <h1 className="display-tight text-[2.94rem] text-kc-dark sm:text-6xl">
              Let&apos;s talk about your project
            </h1>
            <p className="mt-5 text-[18.19px] leading-relaxed text-kc-dark/75">
              Call, text, or fill out the form. We respond to all enquiries within a few hours
              during business days.
            </p>
          </div>
        </div>
      </section>

      <section className="band-tight bg-kc-paper">
        <div className="container-tight grid grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <dl className="divide-y divide-kc-dark/12 border-t border-kc-dark/12">
              {[
                {
                  icon: <Phone className="h-4 w-4 text-kc-coral" strokeWidth={1.75} />,
                  label: "Phone and text",
                  value: "(816) 521-0462",
                  href: "tel:+18165210462",
                },
                {
                  icon: <Mail className="h-4 w-4 text-kc-coral" strokeWidth={1.75} />,
                  label: "Email",
                  value: "kansasdesigners@gmail.com",
                  href: "mailto:kansasdesigners@gmail.com",
                },
                {
                  icon: <MessageSquare className="h-4 w-4 text-kc-coral" strokeWidth={1.75} />,
                  label: "Response time",
                  value: "Within a few hours",
                  href: null,
                },
              ].map((item) => (
                // dt and dd must be the only children of a dl group. The icon sat alongside an
                // inner div holding them, which put the term and its value outside the list as far
                // as assistive tech was concerned; moving the icon into the dt fixes the structure
                // and reads better too, since it labels the term rather than floating beside it.
                <div key={item.label} className="py-4">
                  <dt className="flex items-center gap-2 text-[13.91px] text-kc-dark/70">
                    <span className="shrink-0">{item.icon}</span>
                    {item.label}
                  </dt>
                  <dd className="mt-0.5 pl-6">
                    {item.href ? (
                      <a
                        href={item.href}
                        className="text-[16.05px] font-medium text-kc-dark transition-colors hover:text-kc-magenta-deep"
                      >
                        {item.value}
                      </a>
                    ) : (
                      <span className="text-[16.05px] font-medium text-kc-dark">{item.value}</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-10">
              <h2 className="text-[13.91px] font-semibold text-kc-dark">Service areas</h2>
              <ul className="mt-3 space-y-1.5 text-[14.98px] text-kc-dark/70">
                {["Kansas City, MO", "Johnson County, KS", "Dallas-Fort Worth, TX", "Nationwide Online"].map((city) => (
                  <li key={city}>{city}</li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <ContactForm locale="en" />
          </div>
        </div>
      </section>
    </>
  );
}
