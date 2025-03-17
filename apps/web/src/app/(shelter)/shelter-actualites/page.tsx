import type { Metadata } from "next";
import { Newspaper } from "lucide-react";
import { requireShelter } from "@infra/auth/session";
import { eq } from "drizzle-orm";
import { db } from "@infra/db";
import { shelters } from "@/server/db/schema";
import { getNewsPostsForShelter } from "@shelters/public";
import { PostsManager } from "./posts-manager";

export const metadata: Metadata = {
  title: "Actualités · Refuge",
};

export default async function ShelterNewsPage() {
  const session = await requireShelter();
  const [posts, shelter] = await Promise.all([
    getNewsPostsForShelter(session.user.shelterId),
    db
      .select({ isVerified: shelters.isVerified })
      .from(shelters)
      .where(eq(shelters.id, session.user.shelterId))
      .then((r) => r[0]),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="inline-flex items-center gap-2 text-3xl font-bold text-foreground">
          <Newspaper className="h-7 w-7 text-coral-500" />
          Actualités du refuge
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Publiez vos récits d&apos;adoption, comptes-rendus d&apos;événement,
          appels à l&apos;aide. Tout article apparaît sur la page publique{" "}
          <span className="font-medium text-foreground">/actualites</span> et
          dans le flux RSS du site.
        </p>
        {!shelter?.isVerified && (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Votre refuge n&apos;est pas encore vérifié par l&apos;équipe
            Dorloter. Vos articles passeront en file de modération avant
            publication.
          </p>
        )}
      </header>

      <PostsManager initialPosts={posts} />
    </div>
  );
}
