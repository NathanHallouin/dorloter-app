"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { deleteAccount } from "@identity/actions/profile";
import { authClient } from "@infra/auth/auth-client";

const CONFIRM_WORD = "SUPPRIMER";

export function DeleteAccountSection() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, start] = useTransition();

  return (
    <section className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
      <h2 className="text-lg font-semibold text-destructive">
        Supprimer mon compte
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Tout s&apos;en va avec : signalements, candidatures, favoris,
        notifications. Aucun retour en arrière.
      </p>

      {!open ? (
        <Button
          variant="destructive"
          className="mt-4"
          onClick={() => setOpen(true)}
        >
          Supprimer mon compte
        </Button>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm">
            Pour confirmer, tapez <strong>{CONFIRM_WORD}</strong> ci-dessous.
          </p>
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
          />
          <div className="flex gap-2">
            <Button
              variant="destructive"
              disabled={typed !== CONFIRM_WORD || pending}
              onClick={() =>
                start(async () => {
                  const r = await deleteAccount();
                  if (r.success) {
                    await authClient.signOut();
                    router.push("/");
                    router.refresh();
                  }
                })
              }
            >
              {pending ? "Suppression..." : "Je confirme la suppression"}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
