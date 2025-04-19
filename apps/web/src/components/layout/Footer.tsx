import { Link } from "react-router-dom";
import { Icon } from "@/ui/Icon";

export function Footer() {
  const COLS: [string, [string, string][]][] = [
    ["Adopter", [["Catalogue", "/adopter"], ["Mode swipe", "/adopter/swipe"], ["Quiz de compatibilité", "/quiz"], ["Mes favoris", "/favoris"]]],
    ["Communauté", [["Perdus & trouvés", "/perdus-trouves"], ["Signaler un animal", "/perdus-trouves/nouveau"], ["Messagerie", "/messages"], ["Notre mission", "/a-propos"]]],
    ["Annuaires", [["Refuges", "/refuges"], ["Pensions", "/pensions"], ["Vétérinaires", "/veterinaires"], ["Mon compte", "/profil"]]],
  ];
  return (
    <footer className="mt-5 bg-prune-900 text-sable-100">
      <div className="mx-auto max-w-[1180px] px-8 pb-7 pt-[52px]">
        <div className="mono mb-[26px] border-b border-white/15 pb-[18px] text-[10.5px] font-medium uppercase tracking-[0.18em] text-lavande-300">
          La gazette des animaux · colophon
        </div>
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-9 max-md:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex text-white"><Icon name="paw" size={24} stroke={2.2} /></span>
              <span className="brandword text-[24px] font-bold tracking-[-0.02em] text-white">dorloter</span>
            </span>
            <p className="serif-i mt-3.5 max-w-[270px] text-[18px] leading-[1.5] text-sable-200">
              Réunir adoption responsable, entraide et services de confiance, pour chaque compagnon.
            </p>
            <div className="mt-5 flex gap-2.5">
              {["heart", "paw", "mail"].map((ic) => <span key={ic} className="grid h-[38px] w-[38px] place-items-center rounded-[6px] border border-white/20 text-sable-100"><Icon name={ic} size={18} /></span>)}
            </div>
          </div>
          {COLS.map(([title, links]) => (
            <div key={title}>
              <h4 className="mono text-[11px] font-semibold uppercase tracking-[0.14em] text-lavande-300">{title}</h4>
              <ul className="mt-3.5 flex list-none flex-col gap-[11px]">
                {links.map(([l, to]) => <li key={l}><Link to={to} className="text-[14.5px] text-sable-200">{l}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-5">
          <p className="mono text-[11.5px] tracking-[0.04em] text-sable-300">© 2026 Dorloter · Association loi 1901</p>
          <div className="flex gap-5">
            {["Mentions légales", "Confidentialité", "CGU"].map((l) => <span key={l} className="mono cursor-pointer text-[11.5px] tracking-[0.04em] text-sable-300">{l}</span>)}
          </div>
        </div>
      </div>
    </footer>
  );
}
