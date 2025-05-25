import { Navigate } from "react-router-dom";
import { useAuth } from "@dorloter/client";

/**
 * Aiguillage de l'accueil pro selon le rôle. Les membres d'équipe (role=user
 * mais permissions refuge) atterrissent sur la console refuge par défaut.
 */
export function ConsoleHome() {
  const { user } = useAuth();
  if (user?.role === "platform_admin") return <Navigate to="/admin" replace />;
  if (user?.role === "pension_admin") return <Navigate to="/pension" replace />;
  return <Navigate to="/refuge" replace />;
}
