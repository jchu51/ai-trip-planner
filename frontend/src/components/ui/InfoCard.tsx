import type { ReactNode } from "react";

type InfoCardProps = {
  id?: string;
  title: string;
  className?: string;
  children: ReactNode;
};

export function InfoCard({
  id,
  title,
  className = "",
  children,
}: InfoCardProps) {
  return (
    <section id={id} className={`info-card ${className}`}>
      <h2>{title}</h2>
      <div className="info-card-body">{children}</div>
    </section>
  );
}

export function InfoRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  );
}

export function SectionDivider({ title }: { title: string }) {
  return (
    <div className="section-divider">
      <span>{title}</span>
    </div>
  );
}
