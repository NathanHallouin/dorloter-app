import Link from "next/link";
import { Bell } from "lucide-react";
import { getCurrentSession } from "@infra/auth/session";
import { getUnreadCount } from "@notifications/queries";

export async function NotificationBell() {
  const session = await getCurrentSession();
  if (!session) return null;

  const count = await getUnreadCount(session.user.id);

  return (
    <Link
      href="/notifications"
      className="relative rounded-full p-2 text-muted-foreground transition hover:bg-sable-100 hover:text-foreground"
      aria-label={`Notifications${count > 0 ? ` (${count} non lue${count > 1 ? "s" : ""})` : ""}`}
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral-500 px-1 text-[10px] font-bold leading-none text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
