"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Button } from "@shared/ui/button";
import { verifyShelter } from "@shelters/public.client";

export function VerifyShelterButton({ shelterId }: { shelterId: string }) {
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700">
        <ShieldCheck className="h-4 w-4" />
        Vérifié
      </span>
    );
  }

  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await verifyShelter(shelterId);
          if (r.success) {
            setDone(true);
            toast.success("Refuge vérifié.");
          } else {
            toast.error(r.error ?? "Échec.");
          }
        })
      }
    >
      <ShieldCheck className="mr-1.5 h-4 w-4" />
      Valider
    </Button>
  );
}
