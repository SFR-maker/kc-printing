import { PageHeader } from "@/components/layout/PageHeader";
import { ClosingCta } from "@/components/layout/ClosingCta";

export interface LegalSection {
  heading: string;
  body: string[];
}

/**
 * Shared shell for terms / privacy / refund-policy. These are read, not skimmed, so the body runs
 * in a single measure-limited column with numbered headings and hairline separation - no cards, no
 * accent colour, nothing competing with the text.
 */
export function LegalPage({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <PageHeader title={title}>
        <p className="mt-5 font-mono text-[13px] text-kc-dark/50">Last updated: {updated}</p>
      </PageHeader>

      <section className="band-tight bg-kc-paper">
        <div className="container-tight">
          <div className="max-w-[68ch] divide-y divide-kc-dark/12 border-t border-kc-dark/12">
            {sections.map((section, i) => (
              <section key={section.heading} className="grid grid-cols-1 gap-3 py-8 sm:grid-cols-[3rem_1fr] sm:gap-6">
                <span className="font-mono text-[13px] text-kc-dark/40">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h2 className="display-tight text-[1.35rem] text-kc-dark">{section.heading}</h2>
                  <div className="mt-3 space-y-4 text-[15.5px] leading-relaxed text-kc-dark/70">
                    {section.body.map((para) => (
                      <p key={para}>{para}</p>
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>

      <ClosingCta
        title="Questions about this policy?"
        body="Get in touch and a real person will answer."
        primary={{ label: "Contact us", href: "/contact" }}
        showContactDetails
      />
    </>
  );
}
