import { requirePlatformAdmin } from "@infra/auth/session";
import { getAdminPendingCounts } from "@moderation/public";
import { AdminHeader } from "./_components/admin-header";
import { AdminSidebar } from "./_components/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePlatformAdmin();
  const counts = await getAdminPendingCounts();
  return (
    <div className="flex min-h-screen flex-col bg-sable-50/40">
      <AdminHeader user={session.user} />
      <div className="flex w-full flex-1 flex-col gap-8 px-4 py-8 md:flex-row md:px-6 lg:px-8">
        <AdminSidebar counts={counts} />
        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
