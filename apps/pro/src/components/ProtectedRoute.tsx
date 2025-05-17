import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@dorloter/client";

/** Garde d'authentification : redirige vers /login si pas de session. */
export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">
        Chargement…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
