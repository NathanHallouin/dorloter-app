"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@shared/ui/button";
import { acceptShelterInvitation } from "@shelters/actions/invitations";

export function AcceptInvitation({ token }: { token: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAccept() {
    setError(null);
    start(async () => {
      const r = await acceptShelterInvitation(token);
      if (!r.success) {
        setError(r.error ?? "Impossible d'accepter.");
        toast.error(r.error ?? "Impossible d'accepter.");
        return;
      }
      toast.success("Bienvenue dans l'équipe.");
      router.push("/shelter-animaux");
      router.refresh();
    });
  }

  return (
    <div className="mt-6 space-y-3">
      <Button className="w-full" size="lg" disabled={pending} onClick={handleAccept}>
        {pending ? "En cours…" : "Rejoindre l'équipe"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
