/**
 * DTO devices — payload API stable pour l'enregistrement de push tokens
 * mobile.
 */

import type { DeviceToken } from "@notifications/public";

export interface DeviceTokenDto {
  id: string;
  platform: "ios" | "android";
  deviceName: string | null;
  lastSeenAt: string;
  createdAt: string;
}

export function toDeviceTokenDto(token: DeviceToken): DeviceTokenDto {
  return {
    id: token.id,
    platform: token.platform,
    deviceName: token.deviceName,
    lastSeenAt: token.lastSeenAt.toISOString(),
    createdAt: token.createdAt.toISOString(),
  };
}
