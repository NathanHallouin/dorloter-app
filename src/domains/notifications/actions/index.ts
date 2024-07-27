"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@infra/auth/session";
import { DomainError } from "@infra/api/errors";
import {
  markNotificationRead as markNotificationReadService,
  markAllNotificationsRead as markAllNotificationsReadService,
} from "../services/notifications.service";
import type { ActionResponse } from "@/types";

export async function markNotificationRead(
  notificationId: string
): Promise<ActionResponse> {
  const session = await requireAuth();

  try {
    await markNotificationReadService(session.user.id, notificationId);
  } catch (err) {
    if (err instanceof DomainError) {
      return { success: false, error: err.message };
    }
    throw err;
  }

  revalidatePath("/notifications");
  return { success: true };
}

export async function markAllNotificationsRead(): Promise<ActionResponse> {
  const session = await requireAuth();
  await markAllNotificationsReadService(session.user.id);
  revalidatePath("/notifications");
  return { success: true };
}
