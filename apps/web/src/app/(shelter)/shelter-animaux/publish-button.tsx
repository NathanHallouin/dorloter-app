"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, EyeOff } from "lucide-react";
import { Button } from "@shared/ui/button";
import { updatePetStatus } from "@adoption/actions/pets";

interface Props {
  petId: string;
  currentStatus: "pre_adoptable" | "disponible";
}

export function PublishPetButton({ petId, currentStatus }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function run(
    nextStatus: "pre_adoptable" | "disponible",
    successMsg: string
  ) {
    startTransition(async () => {
      const result = await updatePetStatus(petId, nextStatus);
      if (!result.success) {
        toast.error(result.error ?? "Mise à jour impossible.");
        return;
      }
      toast.success(successMsg);
      router.refresh();
    });
  }

  if (currentStatus === "pre_adoptable") {
    return (
      <Button
        type="button"
        size="sm"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          run("disponible", "Animal publié dans le catalogue public.");
        }}
        disabled={isPending}
      >
        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
        Publier
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        run("pre_adoptable", "Fiche masquée du catalogue public.");
      }}
      disabled={isPending}
      title="Retirer du catalogue, passer en observation"
    >
      <EyeOff className="mr-1 h-3.5 w-3.5" />
      Dépublier
    </Button>
  );
}
