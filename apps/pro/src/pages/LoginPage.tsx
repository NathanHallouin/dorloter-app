import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@dorloter/client";

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

  return (
    <div className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-card border border-line bg-card p-6"
      >
        <p className="mono text-[11px] uppercase tracking-wide text-muted-foreground">
          Dorloter
        </p>
        <h1 className="mb-5 font-display text-2xl font-semibold">Espace pro</h1>

        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-muted-foreground">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-field border border-line bg-background px-3 py-2 outline-none focus:border-primary"
          />
        </label>

        <label className="mb-4 block text-sm">
          <span className="mb-1 block text-muted-foreground">Mot de passe</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-field border border-line bg-background px-3 py-2 outline-none focus:border-primary"
          />
        </label>

        {error && <p className="mb-3 text-sm text-brick-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-field bg-primary px-3 py-2 font-semibold text-primary-foreground transition-[transform,opacity] hover:-translate-y-px disabled:opacity-60"
        >
          {submitting ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
