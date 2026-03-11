import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ApiClientError, authApi, useAuth } from "@dorloter/client";
import { Btn, Rule } from "@dorloter/ui";

/**
 * Exercice en autonomie des droits RGPD depuis le profil : récupérer une copie
 * de ses données (art. 15 et 20) et supprimer son compte (art. 17).
 *
 * La suppression demande une confirmation explicite : elle est immédiate et
 * sans retour possible.
 */
export function PrivacyControls() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const download = useMutation({
    mutationFn: () => authApi.exportMyData(),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dorloter-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (e) =>
      setError(e instanceof ApiClientError ? e.message : "Échec de la récupération des données."),
  });

  const remove = useMutation({
    mutationFn: () => authApi.deleteAccount(),
    onSuccess: async (result) => {
      setDone(result.message);
      await logout();
      navigate("/", { replace: true });
    },
    onError: (e) =>
      setError(e instanceof ApiClientError ? e.message : "Échec de la suppression du compte."),
  });

  return (
    <section className="mt-7 rounded-[8px] border border-line bg-card p-[22px]">
      <Rule label="Mes données personnelles" className="mb-4" />

      <div className="grid grid-cols-2 gap-5 max-md:grid-cols-1">
        <div>
          <h3 className="text-[16px] font-semibold text-foreground">Récupérer mes données</h3>
          <p className="mt-1 text-[13.5px] leading-[1.55] text-muted-foreground">
            Téléchargez une copie complète de ce que Dorloter détient sur vous, au format JSON :
            compte, signalements, candidatures, messages, favoris et réservations.
          </p>
          <div className="mt-3">
            <Btn variant="outline" icon="download" onClick={() => download.mutate()} disabled={download.isPending}>
              {download.isPending ? "Préparation…" : "Télécharger mes données"}
            </Btn>
          </div>
        </div>

        <div>
          <h3 className="text-[16px] font-semibold text-foreground">Supprimer mon compte</h3>
          <p className="mt-1 text-[13.5px] leading-[1.55] text-muted-foreground">
            Votre compte et vos contenus sont effacés immédiatement et définitivement. Si vous avez
            signé un contrat d'adoption, celui-ci est conservé comme justificatif mais détaché de
            votre identité.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            {confirming ? (
              <>
                <Btn
                  variant="outline"
                  icon="trash"
                  onClick={() => remove.mutate()}
                  disabled={remove.isPending}
                  className="border-brick-600 bg-brick-600 text-sable-50"
                >
                  {remove.isPending ? "Suppression…" : "Confirmer la suppression"}
                </Btn>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="text-[13px] font-semibold text-muted-foreground hover:underline"
                >
                  Annuler
                </button>
              </>
            ) : (
              <Btn variant="outline" icon="trash" onClick={() => setConfirming(true)}>
                Supprimer mon compte
              </Btn>
            )}
          </div>
        </div>
      </div>

      {error && <p className="mt-4 text-[13px] font-semibold text-brick-600">{error}</p>}
      {done && <p className="mt-4 text-[13px] font-semibold text-foreground">{done}</p>}

      <p className="mt-5 border-t border-line pt-4 text-[12.5px] text-muted-foreground">
        Pour exercer vos autres droits (opposition, limitation), consultez la{" "}
        <Link to="/confidentialite" className="inline-link">
          politique de confidentialité
        </Link>
        .
      </p>
    </section>
  );
}
