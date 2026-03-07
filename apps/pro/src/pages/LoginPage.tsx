import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@dorloter/client";
import { Btn, Icon } from "@dorloter/ui";

/** Connexion à l'espace pro (le role-gating fin viendra en Phase 4). */
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch {
      setError("Identifiants invalides.");
    } finally {
      setSubmitting(false);
    }
  }

  const input =
    "w-full rounded-field border border-line bg-background px-3.5 py-2.5 text-[14.5px] outline-none transition-colors focus:border-coral-500 focus:ring-2 focus:ring-coral-500/15";

  return (
    <div className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-11 flex-none place-items-center rounded-[12px] bg-prune-700 text-sable-50 shadow-[0_6px_18px_rgba(20,16,8,.18)]">
            <Icon name="shield" size={24} />
          </span>
          <div>
            <div className="font-display text-[22px] font-semibold leading-none tracking-[-0.01em]">Dorloter</div>
            <div className="font-mono mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Espace professionnel
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="rounded-card border border-line bg-card p-6 shadow-[0_12px_40px_rgba(20,16,8,.06)]">
          <h1 className="font-display text-[24px] font-semibold">Connexion</h1>
          <p className="mb-5 mt-1 text-[14px] leading-relaxed text-muted-foreground">
            Accédez à la console de votre refuge, pension ou de la plateforme.
          </p>

          <label className="mb-3.5 block">
            <span className="font-mono mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Email
            </span>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={input}
              placeholder="vous@refuge.fr"
            />
          </label>

          <label className="mb-5 block">
            <span className="font-mono mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Mot de passe
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={input}
              placeholder="••••••••"
            />
          </label>

          {error && (
            <p className="mb-4 flex items-center gap-2 rounded-field border border-brick-300 bg-brick-50 px-3 py-2 text-[13px] font-medium text-brick-700">
              <Icon name="alert" size={15} /> {error}
            </p>
          )}

          <Btn type="submit" full disabled={submitting} icon={submitting ? undefined : "arrow"}>
            {submitting ? "Connexion…" : "Se connecter"}
          </Btn>
        </form>

        <p className="mt-5 text-center text-[12.5px] text-muted-foreground">
          Espace réservé aux refuges et pensions partenaires.
        </p>
      </div>
    </div>
  );
}
