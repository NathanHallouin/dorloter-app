import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { shelterApi } from "@dorloter/client";
import { Icon } from "@dorloter/ui";
import { Btn } from "@dorloter/ui";
import { Stat, Panel, Tag, Bars, MiniBtn, DashPageHead, Table, Td } from "@/components/dash/kit";

export function ShelterDashboardPage() {
  const pets = useQuery({ queryKey: ["shelter-pets"], queryFn: () => shelterApi.pets() });
  const apps = useQuery({ queryKey: ["shelter-applications"], queryFn: () => shelterApi.applications() });

  const petsList = pets.data ?? [];
  const appsList = apps.data ?? [];
  const online = petsList.filter((p) => p.status === "disponible").length;
  const pending = appsList.filter((a) => a.status === "envoyee" || a.status === "en_cours").length;
  const adopted = petsList.filter((p) => p.status === "adopte").length;
  const petName = (id: string) => petsList.find((p) => p.id === id)?.name ?? "Animal";

  return (
    <div>
      <DashPageHead
        title="Tableau de bord"
        desc="L'activité de vos protégés et les candidatures qui attendent une réponse."
        action={<Link to="/refuge/animaux"><Btn icon="plus">Ajouter un animal</Btn></Link>}
      />
      <div className="dash-stats mb-[22px] grid grid-cols-4 gap-3.5">
        <Stat icon="heart" label="Animaux en ligne" value={String(online)} sub={`${petsList.length} au total`} />
        <Stat icon="inbox" label="Candidatures à traiter" value={String(pending)} tone="brick" sub={pending > 0 ? "à étudier" : "rien en attente"} />
        <Stat icon="badgeCheck" label="Adoptions finalisées" value={String(adopted)} tone="lavande" />
        <Stat icon="eye" label="Statut du refuge" value="✓" tone="prune" sub="vérifié" />
      </div>
      <div className="dash-split grid grid-cols-[1fr_340px] items-start gap-[18px]">
        <Panel title="Candidatures récentes" hint="Les plus récentes en premier" action={<Link to="/refuge/candidatures"><MiniBtn label="Tout voir" icon="arrow" /></Link>} pad={false}>
          <div className="px-1 pt-1">
            {appsList.length === 0 ? (
              <p className="p-[18px] text-muted-foreground">Aucune candidature pour le moment.</p>
            ) : (
              <Table head={["Animal", "Logement", "Reçue", "Statut"]}>
                {appsList.slice(0, 5).map((c) => (
                  <tr key={c.id}>
                    <Td><span className="font-semibold">{petName(c.petId)}</span></Td>
                    <Td><span className="mono text-[12px] text-muted-foreground">{c.housingType ?? "—"}</span></Td>
                    <Td><span className="mono text-[12px] text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("fr-FR")}</span></Td>
                    <Td right><Tag s={c.status} /></Td>
                  </tr>
                ))}
              </Table>
            )}
          </div>
        </Panel>
        <div className="flex flex-col gap-[18px]">
          <Panel title="Animaux par statut">
            <Bars data={[
              { k: "Dispo", v: online || 0 },
              { k: "Réservé", v: petsList.filter((p) => p.status === "reserve").length },
              { k: "Adopté", v: adopted },
              { k: "Retiré", v: petsList.filter((p) => p.status === "retire").length },
            ]} />
          </Panel>
          <Panel title="Refuge vérifié">
            <div className="flex items-center gap-3">
              <span className="grid h-[42px] w-[42px] flex-none place-items-center rounded-[10px] bg-coral-600 text-sable-50"><Icon name="shieldCheck" size={22} /></span>
              <p className="text-[13.5px] leading-[1.5] text-foreground">Votre refuge affiche le badge <strong>Vérifié</strong>. SIRET et coordonnées validés par la plateforme.</p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
