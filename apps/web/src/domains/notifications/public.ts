/**
 * API publique du domaine notifications.
 *
 * Depuis Phase 3, les domaines ne notifient plus en direct : ils publient
 * leurs events métier (`adoption.pet_published`, `lost-found.matches_discovered`,
 * `messaging.message_sent`, ...) et notifications écoute via
 * `./listeners.ts` pour faire le fanout in-app/email/push.
 *
 * `emitNotification` reste exporté pour les cas où un caller interne
 * (cron, admin action) a besoin de pousser une notification one-off sans
 * passer par un event. À utiliser avec parcimonie.
 */

// ─── Emission ───────────────────────────────────────────────────────────────
export { emitNotification } from "./emit";

// ─── Actions ────────────────────────────────────────────────────────────────
export {
  markNotificationRead,
  markAllNotificationsRead,
} from "./actions";
export { updateNotificationPreferences } from "./actions/preferences";

// ─── Services (logique métier — appelés par Server Actions ET API v1) ──────
export {
  listUserNotifications as listUserNotificationsService,
  countUnreadNotifications as countUnreadNotificationsService,
  markNotificationRead as markNotificationReadService,
  markAllNotificationsRead as markAllNotificationsReadService,
  type NotificationItem,
  type NotificationListFilters,
  type NotificationListResult,
} from "./services/notifications.service";
export {
  registerDevice as registerDeviceService,
  unregisterDevice as unregisterDeviceService,
  getActiveTokensForUser as getActiveDeviceTokensService,
  deleteTokensByValue as deleteDeviceTokensByValueService,
  type DeviceToken,
  type DevicePlatform,
  type RegisterDeviceInput,
} from "./services/devices.service";

// ─── Queries ────────────────────────────────────────────────────────────────
export { getUserNotifications, getUnreadCount } from "./queries";

// ─── Préférences ────────────────────────────────────────────────────────────
export {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_META,
  mergeWithDefaults,
  isChannelEnabled,
} from "./preferences";
export type {
  NotificationChannel,
  NotificationChannelPrefs,
  NotificationPreferences,
  NotificationType,
} from "./preferences";

// ─── Components ─────────────────────────────────────────────────────────────
export { NotificationBell } from "./components/notification-bell";
export { NotificationList } from "./components/notification-list";
export { NotificationPreferencesForm } from "./components/notification-preferences-form";
