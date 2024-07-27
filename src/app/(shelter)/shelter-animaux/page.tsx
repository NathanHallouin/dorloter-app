import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@infra/auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPetsByShelter } from "@adoption/public";
import { db } from "@infra/db";
import { petPhotos } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { Badge } from "@shared/ui/badge";
import { Button } from "@shared/ui/button";
import { Card, CardContent } from "@shared/ui/card";
import Image from "next/image";
import { placeholderPets } from "@shared/utils/placeholder-images";

const fallbackPhotos = Object.values(placeholderPets);

export const metadata: Metadata = {
  title: "Mes animaux - Refuge",
};

const statusLabels: Record<string, string> = {
  disponible: "Disponible",
  reserve: "Réservé",
  adopte: "Adopté",
  retire: "Retiré",
};

const statusColors: Record<string, string> = {
  disponible: "bg-green-100 text-green-800",
  reserve: "bg-lavande-100 text-lavande-800",
  adopte: "bg-coral-100 text-coral-800",
  retire: "bg-gray-100 text-gray-800",
};

export default async function ShelterCatsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.shelterId) redirect("/dashboard");

  const pets = await getPetsByShelter(session.user.shelterId);

  const photos = await db
    .select()
    .from(petPhotos)
    .where(eq(petPhotos.isPrimary, true));
  const photoMap = new Map(photos.map((p) => [p.petId, p]));

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Mes animaux</h1>
        <Link href="/shelter-animaux/new">
          <Button>Ajouter un animal</Button>
        </Link>
      </div>

      {pets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg text-muted-foreground">
              Vous n&apos;avez pas encore ajouté de chat.
            </p>
            <Link href="/shelter-animaux/new">
              <Button className="mt-4">Ajouter votre premier animal</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pets.map((pet) => {
            const photo = photoMap.get(pet.id);
            return (
              <Card key={pet.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <Image
                      src={photo?.url || fallbackPhotos[pet.name.charCodeAt(0) % fallbackPhotos.length]!}
                      alt={pet.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{pet.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {pet.breed ?? "Race inconnue"} ·{" "}
                      {pet.sex === "male"
                        ? "Mâle"
                        : pet.sex === "femelle"
                          ? "Femelle"
                          : "Sexe inconnu"}
                    </p>
                  </div>
                  <Badge className={statusColors[pet.status] ?? ""}>
                    {statusLabels[pet.status] ?? pet.status}
                  </Badge>
                  <Link href={`/shelter-animaux/${pet.id}/edit`}>
                    <Button variant="outline" size="sm">
                      Modifier
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
