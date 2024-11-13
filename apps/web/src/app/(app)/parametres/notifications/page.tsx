import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@infra/db";
import { users } from "@/server/db/schema";
import { requireAuth } from "@infra/auth/session";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import {
  NotificationPreferencesForm,
  mergeWithDefaults,
} from "@notifications/public";

export const metadata: Metadata = {
  title: "Préférences de notifications",
};

export default async function NotificationsPreferencesPage() {
  const session = await requireAuth();

  const [user] = await db
    .select({
      notificationPreferences: users.notificationPreferences,
      pushSubscription: users.pushSubscription,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const preferences = mergeWithDefaults(user?.notificationPreferences ?? null);
  const pushSupported = !!user?.pushSubscription;

  return (
    <PageContainer variant="wide">
      <Link
        href="/notifications"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Retour aux notifications
      </Link>
      <PageHeader
        title="Préférences de notifications"
        description="Choisissez ce que vous voulez recevoir, par push et par email. Vous gardez la main."
      />
      <NotificationPreferencesForm
        initial={preferences}
        pushSupported={pushSupported}
      />
    </PageContainer>
  );
}
