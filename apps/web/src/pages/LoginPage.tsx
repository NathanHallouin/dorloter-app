import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@dorloter/client";
import { ApiClientError } from "@dorloter/client";
import { AuthShell } from "@/components/AuthShell";
import { Field, Input } from "@dorloter/ui";
import { Btn } from "@dorloter/ui";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Connexion impossible.");
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="text-[32px] font-semibold tracking-[-0.01em] text-foreground">Bon retour</h1>
      <p className="mt-1.5 text-[14.5px] text-muted-foreground">Connectez-vous pour suivre vos favoris et candidatures.</p>
      <form onSubmit={onSubmit} className="mt-[26px] flex flex-col gap-4">
        <Field label="E-mail"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.fr" /></Field>
        <Field label="Mot de passe"><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></Field>
        {error && <p className="text-[13px] text-brick-600">{error}</p>}
        <Btn type="submit" full size="lg" icon="user" disabled={pending}>{pending ? "Connexion…" : "Se connecter"}</Btn>
      </form>
      <p className="mt-[22px] text-center text-[13.5px] text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link to="/register" className="font-bold text-coral-700">Créer un compte</Link>
      </p>
    </AuthShell>
  );
}
