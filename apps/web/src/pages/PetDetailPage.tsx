import { useState } from "react";
import type { ReactNode } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { petsApi } from "@dorloter/client";
import { favoritesApi } from "@dorloter/client";
import { applicationsApi } from "@dorloter/client";
import { messagingApi } from "@dorloter/client";
import { useAuth } from "@dorloter/client";
import { ApiClientError } from "@dorloter/client";
import { cn } from "@dorloter/ui";
import { Icon } from "@dorloter/ui";
import { Btn, Pill, CompatPills } from "@dorloter/ui";
import { ReportContentButton } from "@/components/ReportContentButton";

const AGE_LABEL: Record<string, string> = { chaton: "Chaton", jeune: "Jeune", adulte: "Adulte", senior: "Senior" };

export function PetDetailPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [motivation, setMotivation] = useState("");
  const [applied, setApplied] = useState(false);

  const { data: pet, isLoading, isError } = useQuery({ queryKey: ["pet", id], queryFn: () => petsApi.get(id), enabled: id !== "" });

  const favorite = useMutation({ mutationFn: () => favoritesApi.add(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["favorites"] }) });
  const apply = useMutation({ mutationFn: () => applicationsApi.create({ petId: id, motivation }), onSuccess: () => setApplied(true) });
  const contact = useMutation({
    mutationFn: (shelterId: string) => messagingApi.open({ shelterId, petId: id, subject: `Au sujet de ${pet?.name ?? "cet animal"}` }),
    onSuccess: (c) => navigate(`/messages/${c.id}`),
  });

  if (isLoading) return <Centered>Chargement…</Centered>;
  if (isError || !pet) return <Centered tone="brick">Animal introuvable.</Centered>;

  const main = pet.photos.find((p) => p.isPrimary) ?? pet.photos[0];
  const facts: [string, string, string][] = [
    ["cat", "Espèce", pet.species],
    [pet.sex === "femelle" ? "venus" : "mars", "Sexe", pet.sex],
    ["clock", "Âge", pet.ageCategory ? AGE_LABEL[pet.ageCategory]! : "Inconnu"],
    ["sparkles", "Robe", pet.color ?? "—"],
  ];
  const health: [string, string][] = [
    ...(pet.isSterilized ? [["scissors", "Stérilisé·e"] as [string, string]] : []),
    ...(pet.isVaccinated ? [["syringe", "Vacciné·e"] as [string, string]] : []),
    ...(pet.isChipped ? [["badgeCheck", "Identifié·e"] as [string, string]] : []),
    ...(pet.fivFelv === "negatif" ? [["shieldCheck", "FIV/FeLV négatif"] as [string, string]] : []),
  ];

  return (
    <div className="mx-auto max-w-[1080px] px-8 pb-[60px] pt-[26px]">
      <Link to="/adopter" className="mono inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.08em] text-coral-700">
        <Icon name="arrow" size={14} className="rotate-180" /> Retour au catalogue
      </Link>

      <div className="mt-[18px] grid grid-cols-2 items-start gap-8 max-md:grid-cols-1">
        {/* galerie */}
        <div>
          <div className="aspect-[4/5] overflow-hidden border border-foreground bg-muted">
            {main ? <img src={main.url} alt={pet.name} className="h-full w-full object-cover" />
              : <div className="grid h-full w-full place-items-center text-[80px] text-sable-300">{pet.species === "chat" ? "🐱" : "🐶"}</div>}
          </div>
          {pet.photos.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {pet.photos.slice(0, 5).map((p) => (
                <img key={p.id} src={p.url} alt="" className="h-16 w-16 rounded-[4px] border border-line object-cover" />
              ))}
            </div>
          )}
        </div>

        {/* info */}
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[40px] font-semibold tracking-[-0.02em] text-foreground">{pet.name}</h1>
            <span className={pet.sex === "femelle" ? "text-coral-500" : "text-lavande-500"}><Icon name={pet.sex === "femelle" ? "venus" : "mars"} size={24} /></span>
          </div>
          <p className="mt-1 text-[15px] text-muted-foreground">
            {(pet.ageCategory ? AGE_LABEL[pet.ageCategory] : "Âge ?")} · {pet.breed ?? "Croisé"}{pet.shelter ? ` · ${pet.shelter.name}` : ""}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            {facts.map((f, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-[4px] border border-line bg-background px-3 py-[11px]">
                <span className="text-coral-500"><Icon name={f[0]} size={18} /></span>
                <div>
                  <div className="mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{f[1]}</div>
                  <div className="text-[14px] font-semibold capitalize text-foreground">{f[2]}</div>
                </div>
              </div>
            ))}
          </div>

          <SectionTitle>S'entend avec</SectionTitle>
          <CompatPills cats={pet.okWithCats} dogs={pet.okWithDogs} children={pet.okWithChildren} />

          {health.length > 0 && (
            <>
              <SectionTitle>Santé &amp; identité</SectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {health.map((h, i) => <Pill key={i} tone="green" icon={h[0]}>{h[1]}</Pill>)}
              </div>
            </>
          )}

          {pet.adoptionFee != null && (
            <div className="mt-[22px] flex items-center justify-between rounded-[4px] border border-coral-300 bg-coral-50 px-4 py-3.5">
              <div>
                <div className="mono text-[11px] font-semibold uppercase tracking-[0.06em] text-coral-700">Frais d'adoption</div>
                <div className="tabular text-[24px] font-extrabold text-coral-700">{pet.adoptionFee} €</div>
              </div>
              <p className="max-w-[200px] text-right text-[12px] text-coral-700">Inclut identification, vaccins et stérilisation.</p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2.5">
            {user ? (
              <>
                {pet.shelter && <Btn icon="message" onClick={() => contact.mutate(pet.shelter!.id)} disabled={contact.isPending}>Contacter le refuge</Btn>}
                <Btn variant="outline" icon="heart" onClick={() => favorite.mutate()} disabled={favorite.isPending || favorite.isSuccess}>
                  {favorite.isSuccess ? "En favori" : "Sauver"}
                </Btn>
              </>
            ) : (
              <Btn variant="outline" icon="user" onClick={() => navigate("/login")}>Connectez-vous pour candidater</Btn>
            )}
            <ReportContentButton contentType="pet" contentId={pet.id} />
          </div>
        </div>
      </div>

      {/* histoire */}
      {pet.description && (
        <section className="mt-[34px] max-w-[720px]">
          <SectionTitle>Son histoire</SectionTitle>
          <p className="lead-drop whitespace-pre-line text-[16px] leading-[1.7] text-foreground">{pet.description}</p>
        </section>
      )}

      {/* candidature */}
      {user && (
        <section className="mt-[30px] max-w-[720px] rounded-[6px] border border-line bg-card p-[22px]">
          <h2 className="text-[22px] font-semibold text-foreground">Candidater à l'adoption</h2>
          {applied ? (
            <p className="mt-2.5 text-coral-600">Votre candidature a bien été envoyée au refuge. 🎉</p>
          ) : (
            <form className="mt-3.5" onSubmit={(e) => { e.preventDefault(); apply.mutate(); }}>
              <textarea
                required minLength={10} value={motivation} onChange={(e) => setMotivation(e.target.value)}
                placeholder="Présentez-vous et expliquez votre motivation (min. 10 caractères)…"
                className="h-[110px] w-full resize-y rounded-[4px] border border-line bg-background px-3 py-2.5 text-[14.5px] text-foreground outline-none focus:border-coral-500"
              />
              {apply.isError && <p className="mt-2 text-[13px] text-brick-600">{apply.error instanceof ApiClientError ? apply.error.message : "Envoi impossible."}</p>}
              <div className="mt-3"><Btn type="submit" icon="send" disabled={apply.isPending}>{apply.isPending ? "Envoi…" : "Envoyer ma candidature"}</Btn></div>
            </form>
          )}
        </section>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h4 className="mono mb-[9px] mt-[22px] text-[11.5px] font-semibold uppercase tracking-[0.1em] text-foreground">{children}</h4>;
}

function Centered({ children, tone = "muted-foreground" }: { children: ReactNode; tone?: "muted-foreground" | "brick" }) {
  return <p className={cn("mx-auto max-w-[1080px] px-8 py-[60px]", tone === "brick" ? "text-brick-600" : "text-muted-foreground")}>{children}</p>;
}
