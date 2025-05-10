import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { shelterApi } from "@/api/shelter";
import { useAuth } from "@/auth/AuthContext";
import { DashPageHead } from "@/components/dash/kit";
import { Btn } from "@dorloter/ui";

/** Profil public du refuge + paramètres back-office. */
export function ShelterProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const members = useQuery({ queryKey: ["shelter-members"], queryFn: () => shelterApi.members() });
  const settings = useQuery({ queryKey: ["shelter-settings"], queryFn: () => shelterApi.settings() });
  const myRole = members.data?.find((m) => m.userId === user?.id)?.role;
  const canManage = myRole === "owner" || myRole === "gestionnaire";
  const fosteringOpen = settings.data?.acceptsFosterApplications ?? false;

  const toggleFostering = useMutation({
    mutationFn: (open: boolean) => shelterApi.setFosteringOpen(open),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shelter-settings"] }),
  });

  const fields: [string, string][] = [
    ["Nom affiché", user?.name ?? "Mon refuge"],
    ["Email de contact", user?.email ?? ""],
    ["Téléphone", user?.phone ?? ""],
    ["Ville", user?.city ?? ""],
  ];

  return (
    <div>
      <DashPageHead title="Profil du refuge" desc="Informations publiques de votre structure et paramètres." />

      <div className="dash-split grid grid-cols-2 gap-4 max-sm:grid-cols-1">
        {fields.map(([l, v]) => (
          <label key={l} className="block">
            <span className="mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{l}</span>
            <input defaultValue={v} disabled className="mt-[7px] block h-11 w-full rounded-[9px] border border-line bg-muted px-3.5 text-[14.5px] text-foreground outline-none" />
          </label>
        ))}
      </div>
      <p className="mono mt-4 text-[11px] uppercase tracking-[0.05em] text-muted-foreground">
        L'édition de la fiche publique du refuge arrivera avec un endpoint dédié.
      </p>

      <h2 className="mono mb-3 mt-9 text-[12px] font-semibold uppercase tracking-[0.1em] text-coral-700">Paramètres</h2>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-card p-[18px]">
        <div className="min-w-0">
          <div className="font-display text-[16px] font-semibold text-foreground">Demandes spontanées de familles d'accueil</div>
          <p className="text-[13px] text-muted-foreground">Autoriser les bénévoles à demander à vous rejoindre depuis votre fiche publique.</p>
        </div>
        {canManage ? (
          <Btn size="sm" variant={fosteringOpen ? "primary" : "outline"} icon={fosteringOpen ? "check" : "x"}
            onClick={() => toggleFostering.mutate(!fosteringOpen)} disabled={toggleFostering.isPending || settings.isLoading}>
            {fosteringOpen ? "Activées" : "Désactivées"}
          </Btn>
        ) : (
          <span className="mono text-[12px] uppercase tracking-[0.06em] text-muted-foreground">{fosteringOpen ? "Activées" : "Désactivées"}</span>
        )}
      </div>
    </div>
  );
}
