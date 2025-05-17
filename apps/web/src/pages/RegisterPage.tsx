import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@dorloter/client";
import { ApiClientError } from "@dorloter/client";
import { AuthShell } from "@/components/AuthShell";
import { Field, Input } from "@dorloter/ui";
import { Btn } from "@dorloter/ui";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await register(email, name, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Inscription impossible.");
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="text-[32px] font-semibold tracking-[-0.01em] text-foreground">Créer un compte</h1>
      <p className="mt-1.5 text-[14.5px] text-muted-foreground">Rejoignez la communauté Dorloter.</p>
      <form onSubmit={onSubmit} className="mt-[26px] flex flex-col gap-4">
        <Field label="Nom complet"><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Prénom Nom" /></Field>
        <Field label="E-mail"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.fr" /></Field>
        <Field label="Mot de passe (8 caractères min.)"><Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></Field>
        {error && <p className="text-[13px] text-brick-600">{error}</p>}
        <Btn type="submit" full size="lg" icon="badgeCheck" disabled={pending}>{pending ? "Création…" : "Créer mon compte"}</Btn>
      </form>
      <p className="mt-[22px] text-center text-[13.5px] text-muted-foreground">
        Déjà un compte ?{" "}
        <Link to="/login" className="font-bold text-coral-700">Se connecter</Link>
      </p>
    </AuthShell>
  );
}
