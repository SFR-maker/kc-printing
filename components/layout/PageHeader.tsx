import { Reveal } from "@/components/motion/Reveal";

/**
 * Standard top-of-page block for the marketing pages: process-ink registration bar, display
 * headline, one lead paragraph. Keeps every secondary page opening the same way as the homepage
 * without repeating the markup in eight files.
 */
export function PageHeader({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="bg-kc-bg">
      <div className="reg-bar" />
      <div className="container-tight px-4 pb-12 pt-16 sm:px-6 lg:px-8 lg:pb-16 lg:pt-24">
        <Reveal className="max-w-2xl">
          <h1 className="display-tight text-[2.75rem] text-kc-dark sm:text-6xl">{title}</h1>
          {lead && (
            <p className="mt-5 text-[17px] leading-relaxed text-kc-dark/65">{lead}</p>
          )}
          {children}
        </Reveal>
      </div>
    </section>
  );
}
