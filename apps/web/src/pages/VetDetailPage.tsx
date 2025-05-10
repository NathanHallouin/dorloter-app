import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { vetsApi } from "@/api/vets";
import { Icon } from "@dorloter/ui";
import { Btn, Pill, Rule } from "@dorloter/ui";

const SERVICE_LABELS: Record<string, string> = {
  xray: "Imagerie", surgery: "Chirurgie", dental: "Dentisterie", hospitalization: "Hospitalisation",
  behavior: "Comportement", homeopathy: "Homéopathie", lab: "Laboratoire",
};

export function VetDetailPage() {
  const { slug = "" } = useParams();
  const { data: v, isLoading, isError } = useQuery({ queryKey: ["vet", slug], queryFn: () => vetsApi.get(slug), enabled: slug !== "" });

  if (isLoading) return <p className="mx-auto max-w-[1080px] px-8 py-[60px] text-muted-foreground">Chargement…</p>;
  if (isError || !v) return <p className="mx-auto max-w-[1080px] px-8 py-[60px] text-brick-600">Cabinet introuvable.</p>;

  const species = [v.acceptsCats && ["cat", "Chats"], v.acceptsDogs && ["dog", "Chiens"], v.acceptsNac && ["paw", "NAC"]].filter(Boolean) as [string, string][];
  const services = Object.entries(v.services ?? {}).filter(([, on]) => on).map(([k]) => SERVICE_LABELS[k] ?? k);
  const contactRows: [string, string | null][] = [["pin", v.address], ["clock", v.openingHours], ["phone", v.phone], ["mail", v.email]];

  return (
    <div>
      <div className="relative h-[280px] bg-muted">
        {v.coverUrl ? <img src={v.coverUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-sable-300"><Icon name="stethoscope" size={56} /></div>}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(12,22,16,.78),transparent_60%)]" />
        <div className="absolute left-0 right-0 top-5">
          <div className="mx-auto max-w-[1080px] px-8">
            <Link to="/veterinaires" className="mono inline-flex h-[38px] items-center gap-1.5 rounded-[6px] bg-[rgba(251,248,241,.94)] px-[13px] text-[12px] font-semibold uppercase tracking-[0.06em] text-prune-800">
              <Icon name="chevron" size={14} className="rotate-180" /> Tous les vétérinaires
            </Link>
          </div>
        </div>
        <div className="absolute bottom-[22px] left-0 right-0">
          <div className="mx-auto max-w-[1080px] px-8">
            <div className="flex items-center gap-[9px]">
              <h1 className="text-[40px] font-semibold tracking-[-0.01em] text-sable-50">{v.name}</h1>
              <span className="text-sable-50"><Icon name="badgeCheck" size={24} /></span>
            </div>
            <p className="mono mt-[5px] text-[12px] uppercase tracking-[0.06em] text-sable-200">N° Ordre {v.orderNumber} · SIRET {v.siret}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1080px] grid-cols-[1fr_340px] items-start gap-[30px] px-8 pb-[60px] pt-[30px] max-md:grid-cols-1">
        <div>
          {v.emergencyAvailable && (
            <div className="mb-[22px] flex items-center gap-3 rounded-[10px] border border-brick-300 bg-brick-50 px-[18px] py-3.5">
              <span className="grid h-10 w-10 flex-none place-items-center rounded-[9px] bg-brick-500 text-sable-50"><Icon name="clock" size={20} /></span>
              <p className="text-[14px] leading-[1.5] text-foreground">Service d'<strong>urgences ouvert 24h/24</strong>. En cas de détresse, appelez avant de vous déplacer.</p>
            </div>
          )}
          {v.description && (<><h2 className="text-[24px] font-semibold text-foreground">À propos</h2><p className="mt-2.5 max-w-[600px] text-[15.5px] leading-[1.6] text-foreground">{v.description}</p></>)}

          {services.length > 0 && (
            <>
              <Rule label="Services" className="my-[18px] mt-7" />
              <div className="grid grid-cols-2 gap-2.5">
                {services.map((s) => (
                  <div key={s} className="flex items-center gap-2.5 rounded-[8px] border border-line bg-card px-3.5 py-3">
                    <span className="text-coral-600"><Icon name="check" size={17} /></span>
                    <span className="text-[14px] font-medium text-foreground">{s}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {species.length > 0 && (
            <>
              <Rule label="Animaux pris en charge" className="my-4 mt-7" />
              <div className="flex flex-wrap gap-2">
                {species.map(([ic, lbl]) => <Pill key={lbl} tone="lavande" icon={ic}>{lbl}</Pill>)}
              </div>
            </>
          )}
        </div>

        <aside className="sticky top-24 rounded-card border border-line bg-card p-[18px]">
          {v.consultationPrice != null && (
            <p className="mono text-[12px] uppercase tracking-[0.06em] text-muted-foreground">
              Consultation dès <strong className="tabular text-[18px] text-foreground">{v.consultationPrice} €</strong>
            </p>
          )}
          <div className="mt-4 flex flex-col gap-[9px]">
            {contactRows.filter(([, t]) => t).map(([ic, tx]) => (
              <div key={ic} className="flex items-start gap-2.5">
                <span className="mt-px text-muted-foreground"><Icon name={ic} size={16} /></span>
                <span className="text-[13.5px] text-foreground">{tx}</span>
              </div>
            ))}
          </div>
          <div className="mt-[18px] flex flex-col gap-[9px]">
            {v.phone && <a href={`tel:${v.phone}`}><Btn full icon="phone">Appeler le cabinet</Btn></a>}
            {v.website && <a href={v.website} target="_blank" rel="noreferrer"><Btn full variant="outline" iconRight="external">Site web</Btn></a>}
          </div>
        </aside>
      </div>
    </div>
  );
}
