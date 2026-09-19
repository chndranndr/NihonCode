import type { ReactNode } from "react";

export function Panel({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="panel">
      <header className="panel-head">
        <h2 className="micro-label">{title}</h2>
        {actions}
      </header>
      {children}
    </section>
  );
}

/** Locked state for features deferred past MVP: teaches, never a dead tile. */
export function LockedPanel({ title, reason }: { title: string; reason: string }) {
  return (
    <section className="panel panel-locked" aria-disabled="true">
      <header className="panel-head">
        <h2 className="micro-label">{title}</h2>
        <span className="micro-label lock-tag">LOCKED</span>
      </header>
      <p className="locked-reason">{reason}</p>
    </section>
  );
}

/** Teaching-empty state: explains what the panel shows once data exists. */
export function EmptyPanel({ title, teach }: { title: string; teach: string }) {
  return (
    <section className="panel">
      <header className="panel-head">
        <h2 className="micro-label">{title}</h2>
      </header>
      <p className="empty-teach">{teach}</p>
    </section>
  );
}
