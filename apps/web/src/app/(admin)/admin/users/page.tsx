import { EmptyState } from "@shared/ui/empty-state";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Mail, MailX, Search } from "lucide-react";
import { Badge } from "@shared/ui/badge";
import { getAdminUsersList } from "@identity/public";
import { Input } from "@shared/ui/input";
import { UserBadge } from "@gamification/public";

export const metadata: Metadata = {
  title: "Utilisateurs · Plateforme",
};

type SearchParams = {
  q?: string;
  role?: string;
  page?: string;
};

const ROLE_FILTERS = [
  { value: "all", label: "Tous" },
  { value: "user", label: "Adoptants" },
  { value: "shelter_admin", label: "Admins refuge" },
  { value: "platform_admin", label: "Admins plateforme" },
] as const;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const search = params.q ?? "";
  const roleFilter = (params.role ?? "all") as
    | "all"
    | "user"
    | "shelter_admin"
    | "platform_admin";
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 25;

  const { rows, total } = await getAdminUsersList({
    search: search || undefined,
    role: roleFilter,
    page,
    pageSize,
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Utilisateurs</h1>
        <p className="mt-2 text-muted-foreground">
          {total.toLocaleString("fr-FR")}{" "}
          {total > 1 ? "comptes enregistrés" : "compte enregistré"}.
        </p>
      </header>

      {/* Recherche + filtres */}
      <form
        method="get"
        className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3"
      >
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={search}
            placeholder="Nom, email…"
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ROLE_FILTERS.map((f) => {
            const params = new URLSearchParams();
            if (search) params.set("q", search);
            if (f.value !== "all") params.set("role", f.value);
            const qs = params.toString();
            const active = roleFilter === f.value;
            return (
              <Link
                key={f.value}
                href={qs ? `/admin/users?${qs}` : "/admin/users"}
                className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-foreground text-background"
                    : "border border-border bg-card text-foreground hover:bg-muted"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
        {/* Bouton submit caché : Enter dans l'input submit le form */}
        <button type="submit" className="sr-only">
          Rechercher
        </button>
      </form>

      {/* Table */}
      {rows.length === 0 ? (
        <EmptyState title="Aucun utilisateur ne correspond à ces critères." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Utilisateur</th>
                <th className="px-4 py-3 text-left font-medium">Rôle</th>
                <th className="px-4 py-3 text-left font-medium">Refuge</th>
                <th className="px-4 py-3 text-right font-medium">Activité</th>
                <th className="px-4 py-3 text-left font-medium">Inscrit</th>
                <th className="px-4 py-3 text-left font-medium">
                  Dernière session
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((u) => (
                <tr
                  key={u.id}
                  className="transition-colors hover:bg-muted/40"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="flex items-center gap-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {u.name.trim().charAt(0).toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">
                          {u.name}
                        </div>
                        <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                          {u.emailVerified ? (
                            <Mail className="h-3 w-3 text-green-600" />
                          ) : (
                            <MailX className="h-3 w-3 text-amber-600" />
                          )}
                          <span className="truncate">{u.email}</span>
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {u.shelterName ? (
                      <span className="truncate">{u.shelterName}</span>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-xs tabular-nums text-muted-foreground">
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <span title="Signalements perdus/trouvés">
                        {u.reportsCount} sig.
                      </span>
                      <span className="text-border">·</span>
                      <span title="Candidatures adoption">
                        {u.applicationsCount} cand.
                      </span>
                      {u.resolvedCount > 0 && (
                        <UserBadge
                          count={u.resolvedCount}
                          variant="compact"
                          className="ml-1"
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {u.lastSessionAt
                      ? relativeTime(new Date(u.lastSessionAt))
                      : "Jamais"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} sur {totalPages}
          </span>
          <div className="flex gap-2">
            <PageLink
              active={hasPrev}
              params={params}
              page={page - 1}
              label="Précédent"
              icon={<ChevronLeft className="h-4 w-4" />}
            />
            <PageLink
              active={hasNext}
              params={params}
              page={page + 1}
              label="Suivant"
              icon={<ChevronRight className="h-4 w-4" />}
              iconRight
            />
          </div>
        </div>
      )}
    </div>
  );
}

function RoleBadge({
  role,
}: {
  role: "user" | "shelter_admin" | "pension_admin" | "platform_admin";
}) {
  if (role === "platform_admin") {
    return <Badge className="bg-prune text-white hover:bg-prune/90">Plateforme</Badge>;
  }
  if (role === "shelter_admin") {
    return <Badge className="bg-lavande text-white hover:bg-lavande/90">Refuge</Badge>;
  }
  if (role === "pension_admin") {
    return <Badge className="bg-coral text-white hover:bg-coral/90">Pension</Badge>;
  }
  return <Badge variant="outline">Adoptant</Badge>;
}

function PageLink({
  active,
  params,
  page,
  label,
  icon,
  iconRight,
}: {
  active: boolean;
  params: SearchParams;
  page: number;
  label: string;
  icon: React.ReactNode;
  iconRight?: boolean;
}) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.role) qs.set("role", params.role);
  qs.set("page", String(page));
  const href = `/admin/users?${qs.toString()}`;

  if (!active) {
    return (
      <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-border px-3 py-1.5 text-muted-foreground/50">
        {!iconRight && icon}
        {label}
        {iconRight && icon}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 hover:bg-muted"
    >
      {!iconRight && icon}
      {label}
      {iconRight && icon}
    </Link>
  );
}

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) return "à l'instant";
    return `il y a ${diffHours}h`;
  }
  if (diffDays === 1) return "hier";
  if (diffDays < 30) return `il y a ${diffDays}j`;
  if (diffDays < 365) return `il y a ${Math.floor(diffDays / 30)} mois`;
  return `il y a ${Math.floor(diffDays / 365)} an${diffDays >= 730 ? "s" : ""}`;
}
