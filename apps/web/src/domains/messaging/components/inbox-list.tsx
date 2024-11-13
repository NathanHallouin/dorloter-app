import Link from "next/link";
import Image from "next/image";
import { MessageCircle } from "lucide-react";
import { cn } from "@shared/utils";

type Common = {
  id: string;
  subject: string | null;
  lastMessageAt: Date;
  lastMessagePreview: string | null;
  lastSenderType: string | null;
  unreadCount: number;
};

type UserInboxRow = Common & {
  shelterName: string;
  shelterLogoUrl: string | null;
  petId: string | null;
  petName: string | null;
};

type ShelterInboxRow = Common & {
  userName: string;
  userImage: string | null;
  petId: string | null;
  petName: string | null;
};

/**
 * Liste de conversations. Rendue côté serveur. Utilisée pour /messages
 * (côté user) et /shelter-messages (côté refuge).
 */
export function InboxList({
  basePath,
  rows,
}:
  | { basePath: "/messages"; rows: UserInboxRow[] }
  | { basePath: "/shelter-messages"; rows: ShelterInboxRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        Aucune conversation pour le moment.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {rows.map((row) => {
        const isShelterSide = basePath === "/shelter-messages";
        const peerName = isShelterSide
          ? (row as ShelterInboxRow).userName
          : (row as UserInboxRow).shelterName;
        const avatarUrl = isShelterSide
          ? (row as ShelterInboxRow).userImage
          : (row as UserInboxRow).shelterLogoUrl;
        const unread = row.unreadCount > 0;

        return (
          <li key={row.id}>
            <Link
              href={`${basePath}/${row.id}`}
              className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
            >
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-primary/10">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="" fill className="object-cover" sizes="40px" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-primary">
                    {peerName?.charAt(0).toUpperCase() ?? "?"}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "truncate",
                      unread ? "font-semibold text-foreground" : "text-foreground"
                    )}
                  >
                    {peerName}
                  </span>
                  {row.petName && (
                    <span className="truncate rounded-full bg-lavande-50 px-2 py-0.5 text-[10px] font-medium text-lavande-700">
                      {row.petName}
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    "mt-0.5 truncate text-sm",
                    unread
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {row.lastMessagePreview ?? "·"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] text-muted-foreground">
                  {relativeTime(new Date(row.lastMessageAt))}
                </span>
                {unread && (
                  <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-coral-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {row.unreadCount}
                  </span>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}j`;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

// Suppress unused import warning for MessageCircle (kept for phase 2 empty state)
void MessageCircle;
