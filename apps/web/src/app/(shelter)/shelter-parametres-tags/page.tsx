import type { Metadata } from "next";
import { Tags } from "lucide-react";
import { requireShelter } from "@infra/auth/session";
import { getTagsForShelter } from "@shelters/public";
import { TagsManager } from "./tags-manager";

export const metadata: Metadata = {
  title: "Étiquettes · Refuge",
};

export default async function ShelterTagsPage() {
  const session = await requireShelter();
  const tags = await getTagsForShelter(session.user.shelterId);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-lavande-700">
          Paramètres
        </p>
        <h1 className="mt-1 inline-flex items-center gap-2 text-3xl font-bold text-foreground">
          <Tags className="h-7 w-7 text-coral-500" />
          Étiquettes personnalisées
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Catégorisez vos animaux selon vos besoins internes (« urgent »,
          « besoins FA », « comportement délicat »...) ou exposez certaines
          étiquettes au public (badge sur la fiche). Plafond de 10 par
          refuge.
        </p>
      </header>

      <TagsManager initialTags={tags} />
    </div>
  );
}
