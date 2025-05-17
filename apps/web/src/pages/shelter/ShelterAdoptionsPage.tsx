import { useQuery } from "@tanstack/react-query";
import { shelterApi } from "@dorloter/client";
import { Pill } from "@dorloter/ui";
import { Panel, DashPageHead, Table, Td } from "@/components/dash/kit";

export function ShelterAdoptionsPage() {
  const pets = useQuery({ queryKey: ["shelter-pets"], queryFn: () => shelterApi.pets() });
  const apps = useQuery({ queryKey: ["shelter-applications"], queryFn: () => shelterApi.applications() });
  const petName = (id: string) => (pets.data ?? []).find((p) => p.id === id)?.name ?? "Animal";
  const done = (apps.data ?? []).filter((a) => a.status === "acceptee");

  return (
    <div>
      <DashPageHead title="Adoptions finalisées" desc="L'historique de vos belles rencontres. De quoi sourire." />
      <Panel pad={false}>
        <div className="px-1 pt-1">
          {done.length === 0 ? <p className="p-[18px] text-muted-foreground">Aucune adoption finalisée pour l'instant.</p> : (
            <Table head={["Animal", "Logement", "Date", ""]}>
              {done.map((c) => (
                <tr key={c.id}>
                  <Td><span className="font-semibold">{petName(c.petId)}</span></Td>
                  <Td><span className="text-muted-foreground">{c.housingType ?? "—"}</span></Td>
                  <Td><span className="mono text-[12px] text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("fr-FR")}</span></Td>
                  <Td right><Pill tone="green" icon="heart">Adopté</Pill></Td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </Panel>
    </div>
  );
}
