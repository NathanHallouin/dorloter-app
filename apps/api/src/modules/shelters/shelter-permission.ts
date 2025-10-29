/** Permissions fines au sein d'un refuge, dérivées du rôle du membre. */

export const ShelterPermission = {
  PetsRead: 'pets:read',
  PetsWrite: 'pets:write',
  ApplicationsRead: 'applications:read',
  ApplicationsWrite: 'applications:write',
  MessagesRead: 'messages:read',
  MessagesWrite: 'messages:write',
  FostersRead: 'fosters:read',
  FostersWrite: 'fosters:write',
  VolunteersRead: 'volunteers:read',
  VolunteersWrite: 'volunteers:write',
  EventsRead: 'events:read',
  EventsWrite: 'events:write',
  InventoryRead: 'inventory:read',
  InventoryWrite: 'inventory:write',
  CommunicationsRead: 'communications:read',
  CommunicationsWrite: 'communications:write',
  ProfileWrite: 'profile:write',
  MembersManage: 'members:manage',
} as const;

export type ShelterPermission = (typeof ShelterPermission)[keyof typeof ShelterPermission];

/** Rôle d'un membre dans un refuge (valeur DB : owner / gestionnaire / benevole). */
export const ShelterMemberRole = {
  /** Responsable : tout, y compris la gestion de l'équipe. */
  Owner: 'owner',
  /** Gestionnaire : tout sauf la gestion de l'équipe. */
  Manager: 'gestionnaire',
  /** Bénévole : lecture partout + réponse aux messages. */
  Volunteer: 'benevole',
} as const;

export type ShelterMemberRole = (typeof ShelterMemberRole)[keyof typeof ShelterMemberRole];

export function parseMemberRole(value: string): ShelterMemberRole | null {
  return value === ShelterMemberRole.Owner ||
    value === ShelterMemberRole.Manager ||
    value === ShelterMemberRole.Volunteer
    ? value
    : null;
}

/** Permissions accordées au bénévole : lecture partout + réponse aux messages. */
const VOLUNTEER_PERMISSIONS: ReadonlySet<ShelterPermission> = new Set([
  ShelterPermission.PetsRead,
  ShelterPermission.ApplicationsRead,
  ShelterPermission.MessagesRead,
  ShelterPermission.MessagesWrite,
  ShelterPermission.FostersRead,
  ShelterPermission.VolunteersRead,
  ShelterPermission.EventsRead,
  ShelterPermission.InventoryRead,
  ShelterPermission.CommunicationsRead,
]);

/** Le rôle accorde-t-il la permission demandée ? */
export function roleHasPermission(
  role: ShelterMemberRole,
  permission: ShelterPermission,
): boolean {
  switch (role) {
    case ShelterMemberRole.Owner:
      return true;
    case ShelterMemberRole.Manager:
      return permission !== ShelterPermission.MembersManage;
    case ShelterMemberRole.Volunteer:
      return VOLUNTEER_PERMISSIONS.has(permission);
  }
}
