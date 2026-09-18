import type { ReactNode } from "react";

type SectionProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
};

export function Section({ title, subtitle, children, className = "" }: SectionProps) {
  return (
    <section className={`mx-auto max-w-7xl px-4 pt-14 sm:px-6 lg:px-8 ${className}`.trim()}>
      <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}
