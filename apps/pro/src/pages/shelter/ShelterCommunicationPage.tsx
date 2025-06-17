import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { communicationsApi, type CampaignAudience, type EmailCampaign } from "@dorloter/client";
import { cn } from "@dorloter/ui";
import { DashPageHead, Panel, MiniBtn, field, Select } from "@/components/dash/kit";

const AUD: Record<CampaignAudience, string> = {
  benevoles: "Bénévoles actifs",
  abonnes: "Abonnés du refuge",
  tous: "Tous (bénévoles + abonnés)",
};
const AUDS = Object.keys(AUD) as CampaignAudience[];

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "";

export function ShelterCommunicationPage() {
  const qc = useQueryClient();
  const [audience, setAudience] = useState<CampaignAudience>("tous");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const counts = useQuery({ queryKey: ["campaign-audiences"], queryFn: () => communicationsApi.audiences() });
  const history = useQuery({ queryKey: ["campaigns"], queryFn: () => communicationsApi.list() });

  const send = useMutation({
    mutationFn: communicationsApi.send,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      setSubject("");
      setBody("");
    },
  });

  const reach = counts.data?.[audience] ?? 0;
  const input = field;

  function onSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (reach === 0) return;
    const ok = window.confirm(
      `Envoyer « ${subject} » à ${reach} destinataire${reach > 1 ? "s" : ""} (${AUD[audience]}) ?`,
    );
    if (ok) send.mutate({ subject, body, audience });
  }

  return (
    <div>
      <DashPageHead
        title="Communication"
        desc="Composez une newsletter et envoyez-la à vos bénévoles et abonnés. Idéal pour annoncer une collecte, un événement ou de nouvelles adoptions."
      />

      <Panel title="Nouvelle campagne">
        <form onSubmit={onSend} className="grid gap-3">
          <label className="text-xs text-muted-foreground">
            Audience
            <Select
              value={audience}
              onChange={(v) => setAudience(v as CampaignAudience)}
              options={AUDS.map((a) => ({ value: a, label: `${AUD[a]} (${counts.data?.[a] ?? 0})` }))}
              className="mt-1 md:max-w-xs"
            />
          </label>

          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            maxLength={255}
            placeholder="Objet de l'email"
            className={input}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={8}
            placeholder="Votre message… (les retours à la ligne sont conservés)"
            className={cn(input, "resize-y")}
          />

          <div className="flex flex-wrap items-center gap-3">
            <MiniBtn
              label={send.isPending ? "Envoi…" : `Envoyer à ${reach} destinataire${reach > 1 ? "s" : ""}`}
              icon="send"
              tone="green"
            />
            {reach === 0 && (
              <span className="text-xs text-muted-foreground">
                Aucun destinataire joignable pour cette audience.
              </span>
            )}
            {send.isSuccess && <span className="text-xs text-coral-600">Campagne envoyée.</span>}
            {send.isError && <span className="text-xs text-brick-600">Échec de l'envoi.</span>}
          </div>
        </form>
      </Panel>

      {history.isError && <p className="mt-4 text-brick-600">Accès refuge requis.</p>}

      <h3 className="mono mt-8 mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
        Historique des envois
      </h3>
      <div className="flex flex-col gap-2">
        {(history.data ?? []).map((c: EmailCampaign) => (
          <div key={c.id} className="rounded-card border border-line bg-card p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold">{c.subject}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">{AUD[c.audience]}</span>
              <span className="text-[12px] text-muted-foreground">
                {c.recipientCount} destinataire{c.recipientCount > 1 ? "s" : ""}
              </span>
              <span className="ml-auto text-[12px] text-muted-foreground">{fmtDate(c.sentAt)}</span>
            </div>
            <p className="mt-1.5 line-clamp-2 whitespace-pre-line text-[13px] text-muted-foreground">{c.body}</p>
          </div>
        ))}
        {history.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune campagne envoyée pour le moment.</p>
        )}
      </div>
    </div>
  );
}
