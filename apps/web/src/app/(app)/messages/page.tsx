import type { Metadata } from "next";
import { requireAuth } from "@infra/auth/session";
import { getInboxForUser } from "@messaging/public";
import { InboxList } from "@messaging/public";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Messages",
};

export const dynamic = "force-dynamic";

export default async function MessagesInboxPage() {
  const session = await requireAuth();
  const rows = await getInboxForUser(session.user.id);

  return (
    <PageContainer variant="stream">
      <PageHeader
        title="Messages"
        description="Vos conversations avec les refuges."
      />
      <InboxList basePath="/messages" rows={rows} />
    </PageContainer>
  );
}
