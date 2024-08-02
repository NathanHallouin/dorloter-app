"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Mail, UserPlus, X, Send } from "lucide-react";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import {
  inviteShelterAdmin,
  revokeShelterInvitation,
} from "@shelters/actions/invitations";

interface Admin {
  id: string;
  name: string;
  email: string;
}

interface Invitation {
  id: string;
  email: string;
  createdAt: Date;
  expiresAt: Date;
}

interface AdminsSectionProps {
  admins: Admin[];
  pending: Invitation[];
  currentUserId: string;
}

export function AdminsSection({
  admins,
  pending,
  currentUserId,
}: AdminsSectionProps) {
  const [invitations, setInvitations] = useState(pending);
  const [sending, startSend] = useTransition();
  const [revoking, startRevoke] = useTransition();

  function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startSend(async () => {
      const r = await inviteShelterAdmin(formData);
      if (r.success) {
        toast.success("Invitation envoyée.");
        e.currentTarget.reset();
        // Optimiste : on n'a pas l'objet invitation complet ici, on laisse
        // router.refresh() côté server component ramener le nouvel état
        // au prochain navigate. Pour feedback immédiat on force un reload.
        window.location.reload();
      } else {
        toast.error(r.error ?? "Échec de l'envoi.");
      }
    });
  }

  function handleRevoke(id: string) {
    startRevoke(async () => {
      const r = await revokeShelterInvitation(id);
      if (r.success) {
        setInvitations((v) => v.filter((x) => x.id !== id));
        toast("Invitation révoquée.");
      } else {
        toast.error(r.error ?? "Impossible de révoquer.");
      }
    });
  }

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-5">
      <div>
        <h2 className="text-lg font-semibold">Équipe du refuge</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Les membres avec un accès admin peuvent gérer les chats, répondre
          aux candidatures et modifier ces infos.
        </p>
      </div>

      {/* Admins actuels */}
      <ul className="space-y-2">
        {admins.map((a) => (
          <li
            key={a.id}
            className="flex items-center gap-3 rounded-md bg-sable-50 px-3 py-2 text-sm"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-coral-100 text-xs font-semibold text-coral-700">
              {a.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {a.name}
                {a.id === currentUserId && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    (vous)
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {a.email}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {/* Invitations en attente */}
      {invitations.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Invitations en attente ({invitations.length})
          </h3>
          <ul className="space-y-2">
            {invitations.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center gap-3 rounded-md border border-dashed border-border px-3 py-2 text-sm"
              >
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{inv.email}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  expire{" "}
                  {new Date(inv.expiresAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <button
                  type="button"
                  disabled={revoking}
                  onClick={() => handleRevoke(inv.id)}
                  className="rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  aria-label="Révoquer l'invitation"
                  title="Révoquer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Nouvelle invitation */}
      <form onSubmit={handleInvite} className="space-y-2 border-t pt-4">
        <label
          htmlFor="invite-email"
          className="flex items-center gap-1.5 text-sm font-medium"
        >
          <UserPlus className="h-4 w-4" />
          Inviter un collègue
        </label>
        <div className="flex gap-2">
          <Input
            id="invite-email"
            name="email"
            type="email"
            placeholder="collegue@asso.fr"
            required
            className="flex-1"
          />
          <Button type="submit" disabled={sending}>
            {sending ? (
              "Envoi…"
            ) : (
              <>
                <Send className="mr-1.5 h-4 w-4" />
                Envoyer
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Un lien d&apos;invitation est envoyé par email, valable 7 jours.
        </p>
      </form>
    </section>
  );
}
