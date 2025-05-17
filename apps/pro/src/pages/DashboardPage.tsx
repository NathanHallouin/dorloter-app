/** Tableau de bord (placeholder · les vraies pages arrivent en Phase 4). */
export function DashboardPage() {
  const stats = [
    { label: "Annonces actives", value: "—" },
    { label: "Candidatures en cours", value: "—" },
    { label: "Adoptions ce mois", value: "—" },
    { label: "Messages non lus", value: "—" },
  ];

  return (
    <div>
      <header className="mb-6">
        <p className="mono text-[11px] uppercase tracking-wide text-muted-foreground">
          Console
        </p>
        <h1 className="font-display text-2xl font-semibold">Tableau de bord</h1>
      </header>

      <div className="dash-stats grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-card border border-line bg-card p-4"
          >
            <div className="font-display text-3xl font-semibold tabular">
              {s.value}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        Espace pro Dorloter. Les consoles refuge, pension et vétérinaire sont en
        cours de migration ici.
      </p>
    </div>
  );
}
