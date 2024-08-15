/**
 * Mappe le payload `data` d'une notification Expo Push vers une route
 * mobile.
 *
 * Le serveur (`domains/notifications/emit.ts` côté apps/web) émet un
 * payload différent selon le type :
 *   - `match_found`        → { reportId, ... }
 *   - `report_nearby`      → { reportId, ... }
 *   - `new_cat_nearby`     → { petId, ... }
 *   - `application_update` → { petId, applicationId, ... }
 *   - `new_message`        → { url, ... }
 *
 * On choisit la route en fonction du premier id non-null trouvé
 * (priorité reportId > petId). Pour les types sans id mappable
 * (`new_message` aujourd'hui), retourne `null` — l'appelant fallback
 * sur un no-op.
 *
 * Pure function — aucune dépendance native, donc unit-testable.
 */

export type DeepLinkRoute =
  | { pathname: "/report/[id]"; params: { id: string } }
  | { pathname: "/pet/[id]"; params: { id: string } };

export function notificationDataToRoute(
  data: Record<string, unknown> | null | undefined
): DeepLinkRoute | null {
  if (!data) return null;
  const reportId = typeof data.reportId === "string" ? data.reportId : null;
  const petId = typeof data.petId === "string" ? data.petId : null;
  if (reportId) {
    return { pathname: "/report/[id]", params: { id: reportId } };
  }
  if (petId) {
    return { pathname: "/pet/[id]", params: { id: petId } };
  }
  return null;
}
