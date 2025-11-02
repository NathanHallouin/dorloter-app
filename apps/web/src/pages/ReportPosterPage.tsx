import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "@dorloter/client";
import type { Contact, ReportDetail } from "@dorloter/client";
import { Icon, QR, Btn } from "@dorloter/ui";

const SPECIES_LABEL: Record<string, string> = { chat: "CHAT", chien: "CHIEN" };
const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

type Format = "affiche" | "languettes";

/**
 * Affiche imprimable d'un signalement perdu/trouvé (4.1). Deux formats :
 * une grande affiche A4 et une affichette à languettes détachables (numéro de
 * téléphone à arracher). QR code vers la fiche en ligne. Impression via
 * window.print + @page.
 */
export function ReportPosterPage() {
  const { id = "" } = useParams();
  const [format, setFormat] = useState<Format>("affiche");

  const report = useQuery({ queryKey: ["report", id], queryFn: () => reportsApi.get(id), enabled: !!id });
  // Contact : réservé aux connectés. En best-effort (le signaleur crée son affiche connecté).
  const contact = useQuery<Contact>({ queryKey: ["report-contact", id], queryFn: () => reportsApi.revealContact(id), enabled: !!id, retry: false });

  if (report.isLoading) return <Centered>Chargement…</Centered>;
  if (report.isError || !report.data) return <Centered>Signalement introuvable.</Centered>;

  const r = report.data;
  const phone = contact.data?.phone ?? null;
  const email = contact.data?.email ?? null;
  const url = `${window.location.origin}/perdus-trouves/${r.id}`;

  return (
    <div className="min-h-screen bg-neutral-200 py-8 print:bg-white print:py-0">
      <style>{`@page { size: A4 portrait; margin: 10mm; }`}</style>

      {/* Barre d'actions (masquée à l'impression) */}
      <div className="mx-auto mb-4 flex max-w-[720px] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <Link to={`/perdus-trouves/${r.id}`} className="text-sm text-neutral-600 hover:underline">← Retour au signalement</Link>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-md border border-neutral-300">
            <FormatTab active={format === "affiche"} onClick={() => setFormat("affiche")}>Affiche</FormatTab>
            <FormatTab active={format === "languettes"} onClick={() => setFormat("languettes")}>À languettes</FormatTab>
          </div>
          <Btn size="sm" icon="download" onClick={() => window.print()}>Imprimer / PDF</Btn>
        </div>
      </div>

      {!phone && !email && !contact.isLoading && (
        <p className="mx-auto mb-4 max-w-[720px] px-4 text-center text-[13px] text-brick-600 print:hidden">
          Le numéro de contact n'a pas pu être chargé. Connectez-vous avec le compte du signalement pour l'afficher.
        </p>
      )}

      <Poster r={r} url={url} phone={phone} email={email} format={format} />
    </div>
  );
}

function Poster({ r, url, phone, email, format }: { r: ReportDetail; url: string; phone: string | null; email: string | null; format: Format }) {
  const lost = r.type === "perdu";
  const banner = lost ? "PERDU" : "TROUVÉ";
  const bannerCls = lost ? "bg-brick-600" : "bg-coral-600";
  const photo = r.photos.find((p) => p.isPrimary)?.url ?? r.photos[0]?.url ?? null;
  const title = r.petName || (lost ? "Animal perdu" : "Animal trouvé");
  const contactLine = phone ?? email;

  const traits = [
    ["Espèce", SPECIES_LABEL[r.species] ?? r.species],
    r.breed ? ["Race", r.breed] : null,
    r.color ? ["Robe", r.color] : null,
    r.sex !== "inconnu" ? ["Sexe", r.sex === "femelle" ? "Femelle" : "Mâle"] : null,
  ].filter(Boolean) as [string, string][];

  return (
    <article className="mx-auto flex aspect-[1/1.414] w-full max-w-[720px] flex-col overflow-hidden border-[3px] border-neutral-900 bg-white shadow-lg print:max-w-none print:border-[3px] print:shadow-none">
      {/* Bandeau */}
      <div className={`${bannerCls} px-6 py-3 text-center text-white`}>
        <div className="text-[13px] font-bold uppercase tracking-[0.3em]">{r.species === "chat" ? "Chat" : "Chien"} {lost ? "perdu" : "trouvé"}</div>
        <div className="text-[64px] font-black leading-[0.95] tracking-[0.02em]">{banner}</div>
      </div>

      <div className="flex flex-1 flex-col px-6 py-5">
        <div className="flex gap-6">
          <div className="aspect-square w-[46%] flex-none overflow-hidden rounded-[6px] border-2 border-neutral-900 bg-neutral-100">
            {photo ? (
              <img src={photo} alt={title} className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center text-[96px]">{r.species === "chat" ? "🐱" : "🐶"}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[40px] font-extrabold leading-none tracking-[-0.02em] text-neutral-900">{title}</h1>
            <dl className="mt-3 space-y-1.5">
              {traits.map(([k, v]) => (
                <div key={k} className="flex gap-2 text-[16px]">
                  <dt className="w-[70px] flex-none font-semibold uppercase text-neutral-500">{k}</dt>
                  <dd className="font-semibold capitalize text-neutral-900">{v}</dd>
                </div>
              ))}
            </dl>
            {r.distinctiveSigns && (
              <p className="mt-3 text-[15px] leading-snug text-neutral-800">
                <span className="font-semibold">Signes distinctifs : </span>{r.distinctiveSigns}
              </p>
            )}
          </div>
        </div>

        <p className="mt-4 text-[15px] leading-snug text-neutral-700">{r.description}</p>

        <div className="mt-4 rounded-[6px] bg-neutral-100 px-4 py-3 text-[16px] font-semibold text-neutral-900">
          <Icon name="marker" size={16} className="mr-1.5 inline align-[-2px] text-brick-600" />
          {lost ? "Vu pour la dernière fois" : "Trouvé"} : {r.address ?? "lieu non précisé"} · le {fmtDate(r.dateEvent)}
        </div>

        {/* Contact + QR */}
        <div className="mt-auto flex items-end justify-between gap-4 pt-5">
          <div>
            <div className="text-[13px] font-bold uppercase tracking-[0.15em] text-neutral-500">Contact</div>
            {contactLine ? (
              <div className="text-[34px] font-black leading-tight text-neutral-900">{contactLine}</div>
            ) : (
              <div className="text-[18px] font-semibold text-neutral-700">Coordonnées sur dorloter.fr →</div>
            )}
            {phone && email && <div className="text-[14px] text-neutral-600">{email}</div>}
          </div>
          <div className="flex flex-none flex-col items-center">
            <QR value={url} size={104} />
            <span className="mt-1 text-[11px] font-semibold text-neutral-500">Infos & photos</span>
          </div>
        </div>
      </div>

      {/* Languettes détachables : numéro à arracher */}
      {format === "languettes" && contactLine && (
        <div className="grid flex-none grid-cols-10 border-t-2 border-dashed border-neutral-400">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-center border-neutral-300 py-3 text-[12px] font-bold text-neutral-800 [writing-mode:vertical-rl] [&:not(:last-child)]:border-r [&:not(:last-child)]:border-dashed"
            >
              {contactLine}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function FormatTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-[13px] font-semibold ${active ? "bg-coral-600 text-white" : "bg-white text-neutral-600 hover:bg-neutral-50"}`}
    >
      {children}
    </button>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-screen place-items-center text-neutral-500">{children}</div>;
}
