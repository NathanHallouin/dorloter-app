import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@infra/db";
import { users } from "@/server/db/schema";
import { requireVeterinarian } from "@infra/auth/session";

export const metadata: Metadata = {
  title: "Équipe · Vétérinaire",
};

export default async function VetTeamPage() {
  const session = await requireVeterinarian();
  const teamMembers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.vetId, session.user.vetId));

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
          Équipe
        </p>
        <h1 className="mt-1 text-3xl font-bold text-foreground">
          Équipe du cabinet
        </h1>
        <p className="mt-2 text-muted-foreground">
          Comptes administrateurs ayant accès à ce cabinet sur Dorloter.
        </p>
      </header>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <header className="border-b border-border bg-muted/30 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-foreground">
            {teamMembers.length} membre{teamMembers.length > 1 ? "s" : ""} actif
            {teamMembers.length > 1 ? "s" : ""}
          </h2>
        </header>
        <ul className="divide-y divide-border">
          {teamMembers.map((member) => {
            const initial = member.name.trim().charAt(0).toUpperCase() || "?";
            const isCurrent = member.id === session.user.id;
            return (
              <li
                key={member.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-700">
                  {initial}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">
                    {member.name}
                    {isCurrent && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
                        Vous
                      </span>
                    )}
                  </p>
                  <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {member.email}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  depuis le{" "}
                  {new Date(member.createdAt).toLocaleDateString("fr-FR")}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-xl border border-dashed border-teal-200 bg-teal-50/30 p-5 text-sm text-teal-900">
        <p className="font-medium">Invitations d&apos;équipe à venir</p>
        <p className="mt-1 text-teal-800">
          Pour ajouter un autre vétérinaire ou un assistant à votre cabinet,
          contactez-nous à{" "}
          <a
            href="mailto:hello@dorloter.fr"
            className="font-medium underline"
          >
            hello@dorloter.fr
          </a>
          . Le système d&apos;invitations multi-comptes sera bientôt
          intégré, comme pour les refuges.
        </p>
      </div>
    </div>
  );
}
