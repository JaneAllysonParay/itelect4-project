import type { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

function SectionCard({ title, description, children, className = "" }: SectionCardProps) {
  return (
    <section className={`rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 ${className}`}>
      <header className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-card-foreground">{title}</h2>
        {description && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </header>
      {children}
    </section>
  );
}

export default SectionCard;
