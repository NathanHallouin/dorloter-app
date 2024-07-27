import type { Metadata } from "next";
import { PetForm } from "@adoption/public";

export const metadata: Metadata = {
  title: "Ajouter un animal - Refuge",
};

export default function NewCatPage() {
  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold text-foreground">
        Ajouter un animal
      </h1>
      <PetForm />
    </div>
  );
}
