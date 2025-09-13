import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { shelterApi, contractsApi, registreApi, healthApi, type HealthEventType } from "@dorloter/client";
import { Icon } from "@dorloter/ui";
import { Btn } from "@dorloter/ui";
import { Stat, Panel, Tag, Bars, MiniBtn, DashPageHead, Table, Td } from "@/components/dash/kit";

const HEALTH_LABEL: Record<HealthEventType, string> = {
  vaccin: "Vaccin", vermifuge: "Vermifuge", antiparasitaire: "Antiparasitaire", sterilisation: "Stérilisation",
  test_fiv_felv: "Test FIV/FeLV", visite: "Visite véto", traitement: "Traitement", pesee: "Pesée", autre: "Autre",
};
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

export function ShelterDashboardPage() {
  const pets = useQuery({ queryKey: ["shelter-pets"], queryFn: () => shelterApi.pets() });
  const apps = useQuery({ queryKey: ["shelter-applications"], queryFn: () => shelterApi.applications() });
  const contracts = useQuery({ queryKey: ["shelter-contracts"], queryFn: () => contractsApi.list() });
  const stats = useQuery({ queryKey: ["registre-stats"], queryFn: () => registreApi.stats() });
  const upcoming = useQuery({ queryKey: ["health-upcoming"], queryFn: () => healthApi.upcoming(60) });

  const petsList = pets.data ?? [];
  const appsList = apps.data ?? [];
  const toSign = (contracts.data ?? []).filter((c) => c.status === "brouillon" || c.status === "envoye").length;
  const online = petsList.filter((p) => p.status === "disponible").length;
  const pending = appsList.filter((a) => a.status === "envoyee" || a.status === "en_cours").length;
  const adopted = petsList.filter((p) => p.status === "adopte").length;
  const petName = (id: string) => petsList.find((p) => p.id === id)?.name ?? "Animal";
  const s = stats.data;
  const due = upcoming.data ?? [];

  return (
    <div>
      <DashPageHead
        title="Tableau de bord"
        desc="L'activité de vos protégés, les candidatures qui attendent et les indicateurs de votre refuge."
        action={<Link to="/refuge/animaux"><Btn icon="plus">Ajouter un animal</Btn></Link>}
      />
      <div className="dash-stats mb-[22px] grid grid-cols-4 gap-3.5">
        <Stat icon="heart" label="Animaux en ligne" value={String(online)} sub={`${petsList.length} au total`} />
        <Link to="/refuge/candidatures"><Stat icon="inbox" label="Candidatures à traiter" value={String(pending)} tone="brick" sub={pending > 0 ? "à étudier" : "rien en attente"} /></Link>
        <Stat icon="badgeCheck" label="Adoptions finalisées" value={String(adopted)} tone="lavande" />
        <Link to="/refuge/contrats"><Stat icon="shieldCheck" label="Contrats à signer" value={String(toSign)} tone="prune" sub={toSign > 0 ? "à finaliser" : "à jour"} /></Link>
      </div>

      {/* Indicateurs du registre légal (présence, flux, durée de séjour). */}
      <div className="dash-stats mb-[22px] grid grid-cols-4 gap-3.5">
        <Stat icon="home" label="Animaux présents" value={String(s?.present ?? "—")} sub={s ? `${s.presentCats} chats · ${s.presentDogs} chiens` : ""} />
        <Stat icon="arrow" label="Entrées cette année" value={String(s?.enteredThisYear ?? "—")} tone="lavande" />
        <Stat icon="badgeCheck" label="Adoptions cette année" value={String(s?.adoptionsThisYear ?? "—")} tone="prune" />
        <Stat icon="clock" label="Durée moyenne de séjour" value={s?.avgStayDays != null ? `${Math.round(s.avgStayDays)} j` : "—"} tone="coral" />
      </div>

      <div className="dash-split grid grid-cols-[1fr_340px] items-start gap-[18px]">
        <div className="flex flex-col gap-[18px]">
          <Panel title="Candidatures récentes" hint="Les plus récentes en premier" action={<Link to="/refuge/candidatures"><MiniBtn label="Tout voir" icon="arrow" /></Link>} pad={false}>
            <div className="px-1 pt-1">
              {appsList.length === 0 ? (
                <p className="p-[18px] text-muted-foreground">Aucune candidature pour le moment.</p>
              ) : (
                <Table head={["Animal", "Logement", "Reçue", "Statut"]}>
                  {appsList.slice(0, 5).map((c) => (
                    <tr key={c.id}>
                      <Td><Link to={`/refuge/animaux/${c.petId}`} className="font-semibold hover:text-coral-700">{petName(c.petId)}</Link></Td>
                      <Td><span className="mono text-[12px] text-muted-foreground">{c.housingType ?? "—"}</span></Td>
                      <Td><span className="mono text-[12px] text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("fr-FR")}</span></Td>
                      <Td right><Tag s={c.status} /></Td>
                    </tr>
                  ))}
                </Table>
              )}
            </div>
          </Panel>

          <Panel title="Santé · échéances à venir" hint="Rappels dans les 60 jours (en retard en rouge)">
            {due.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune échéance à venir.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {due.slice(0, 8).map((u) => {
                  const overdue = u.event.nextDueDate != null && u.event.nextDueDate < today();
                  return (
                    <li key={u.event.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className={overdue ? "rounded-full bg-brick-50 px-2 py-0.5 text-[11px] font-semibold text-brick-600" : "rounded-full bg-tint-lavande px-2 py-0.5 text-[11px] font-semibold text-lavande-700"}>{fmt(u.event.nextDueDate)}</span>
                      <Link to={`/refuge/animaux/${u.petId}`} className="font-semibold hover:text-coral-700">{u.petName}</Link>
                      <span className="text-muted-foreground">· {HEALTH_LABEL[u.event.type]}{u.event.label ? ` · ${u.event.label}` : ""}</span>
                      {overdue && <span className="mono text-[11px] uppercase text-brick-600">en retard</span>}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

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
