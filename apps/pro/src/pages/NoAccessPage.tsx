import { useAuth } from "@dorloter/client";

/** Affiché quand un compte connecté n'a aucun accès pro (ni rôle, ni équipe). */
export function NoAccessPage() {
  const { user, logout } = useAuth();
  return (
    <div className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
      <div className="w-full max-w-md rounded-card border border-line bg-card p-7 text-center">
        <p className="mono text-[11px] uppercase tracking-wide text-muted-foreground">
          Dorloter
        </p>
        <h1 className="mb-2 font-display text-2xl font-semibold">
          Espace réservé aux professionnels
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Le compte {user?.email} n'est rattaché à aucun refuge ni aucune
          pension. Si vous gérez une structure, contactez l'équipe
          Dorloter pour l'activer.
        </p>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-field bg-primary px-4 py-2 font-semibold text-primary-foreground transition-transform hover:-translate-y-px"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
