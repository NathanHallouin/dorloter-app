/** Page générique « à venir » pour les sections pas encore migrées (Phase 4). */
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <header className="mb-6">
        <p className="mono text-[11px] uppercase tracking-wide text-muted-foreground">
          Console
        </p>
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
      </header>
      <div className="rounded-card border border-dashed border-line bg-card p-8 text-center text-muted-foreground">
        Section en cours de migration.
      </div>
    </div>
  );
}
