import type { Metadata } from "next";
import Link from "next/link";
import { Settings } from "lucide-react";
import { NotificationList } from "@notifications/public";
import { requireAuth } from "@infra/auth/session";
import {
  getUserNotifications,
  getUnreadCount,
} from "@notifications/public";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Notifications",
};

export default async function NotificationsPage() {
  const session = await requireAuth();
  const [items, unreadCount] = await Promise.all([
    getUserNotifications(session.user.id, 100),
    getUnreadCount(session.user.id),
  ]);

  return (
    <PageContainer variant="stream">
      <PageHeader
        title="Notifications"
        description="Tout ce qui se passe pour vous : pistes pour vos signalements, suivi de candidatures, messages, refuges suivis."
        actions={
          <Link
            href="/parametres/notifications"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            <Settings className="h-3.5 w-3.5" />
            Préférences
          </Link>
        }
      />
      <NotificationList notifications={items} unreadCount={unreadCount} />
    </PageContainer>
  );
}
