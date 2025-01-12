"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { verifyVeterinarian } from "@veterinarians/public.client";

export function VerifyVetButton({ vetId }: { vetId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Confirmer la vérification de ce cabinet ?")) return;
    startTransition(async () => {
      const res = await verifyVeterinarian(vetId);
      if (res.success) {
        toast.success("Cabinet vérifié.");
        router.refresh();
      } else {
        toast.error(res.error ?? "Erreur");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Check className="h-3.5 w-3.5" />
      )}
      Valider
    </button>
  );
}
