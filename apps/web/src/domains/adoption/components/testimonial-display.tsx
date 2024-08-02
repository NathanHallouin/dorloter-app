import Image from "next/image";
import { Quote } from "lucide-react";

/**
 * Affichage public d'un témoignage post-adoption sur la fiche chat.
 * Montre le prénom du témoin (pas le nom complet, par confort RGPD),
 * la date, la photo si présente.
 */
export function TestimonialDisplay({
  content,
  photoUrl,
  userName,
  createdAt,
}: {
  content: string;
  photoUrl: string | null;
  userName: string;
  createdAt: Date | string;
}) {
  const firstName = userName.split(" ")[0] ?? userName;
  const date = new Date(createdAt).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  return (
    <section className="relative overflow-hidden rounded-xl border border-lavande-200 bg-gradient-to-br from-lavande-50/60 to-card p-5 md:p-6">
      <Quote className="absolute right-4 top-4 h-10 w-10 text-lavande-200" />
      <div className="relative flex flex-col gap-4 md:flex-row">
        {photoUrl && (
          <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-xl md:h-40 md:w-40">
            <Image
              src={photoUrl}
              alt=""
              fill
              className="object-cover"
              sizes="160px"
              unoptimized
            />
          </div>
        )}
        <div className="flex-1">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-lavande-700">
            Depuis l&apos;adoption
          </p>
          <blockquote className="whitespace-pre-line text-foreground">
            {content}
          </blockquote>
          <p className="mt-3 text-xs text-muted-foreground">
            — {firstName}, {date}
          </p>
        </div>
      </div>
    </section>
  );
}
