"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  Heart,
  HeartHandshake,
  MailOpen,
  MessageCircle,
  PawPrint,
  Radio,
} from "lucide-react";
import { Button } from "@shared/ui/button";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@notifications/actions";
import { cn } from "@shared/utils";
import type { Notification } from "@/types";

interface Props {
  notifications: Notification[];
  unreadCount: number;
}

type Tab = "all" | "unread";

const ICON_BY_TYPE: Record<
  string,
  { icon: React.ReactNode; tone: string; label: string }
> = {
  match_found: {
    icon: <HeartHandshake className="h-4 w-4" />,
    tone: "bg-coral-50 text-coral-700",
    label: "Correspondance",
  },
  application_update: {
    icon: <Heart className="h-4 w-4" fill="currentColor" />,
    tone: "bg-lavande-50 text-lavande-700",
    label: "Candidature",
  },
  new_cat_nearby: {
    icon: <PawPrint className="h-4 w-4" />,
    tone: "bg-sable-100 text-foreground",
    label: "Adoption",
  },
  report_nearby: {
    icon: <Radio className="h-4 w-4" />,
    tone: "bg-prune-50 text-prune-800",
    label: "Signalement",
  },
  new_message: {
    icon: <MessageCircle className="h-4 w-4" />,
    tone: "bg-lavande-50 text-lavande-700",
    label: "Message",
  },
};

interface QuickAction {
  href: string;
  label: string;
}

function quickActionFor(n: Notification): QuickAction | null {
  const data = (n.data ?? {}) as Record<string, unknown>;
  if (n.type === "match_found" && typeof data.reportId === "string") {
    return { href: `/perdus-trouves/${data.reportId}`, label: "Voir la piste" };
  }
  if (n.type === "application_update") {
    return { href: "/candidatures", label: "Voir mes candidatures" };
  }
  if (n.type === "new_cat_nearby" && typeof data.petId === "string") {
    const name = typeof data.petName === "string" ? data.petName : "le profil";
    return { href: `/adopter/${data.petId}`, label: `Voir ${name}` };
  }
  if (n.type === "report_nearby" && typeof data.reportId === "string") {
    return {
      href: `/mes-signalements/${data.reportId}/edit`,
      label: "Compléter ma fiche",
    };
  }
  if (n.type === "new_message" && typeof data.url === "string") {
    return { href: data.url, label: "Répondre" };
  }
  return null;
}

function timeRelative(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return "à l'instant";
  if (sec < 3600) return `il y a ${Math.floor(sec / 60)} min`;
  if (sec < 86400) return `il y a ${Math.floor(sec / 3600)} h`;
  const days = Math.floor(sec / 86400);
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} j`;
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem.`;
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: days >= 365 ? "numeric" : undefined,
  });
}

interface Bucket {
  key: "today" | "week" | "older";
  label: string;
  items: Notification[];
}

function bucketize(items: Notification[]): Bucket[] {
  const today: Notification[] = [];
  const week: Notification[] = [];
  const older: Notification[] = [];
  const now = Date.now();
  for (const it of items) {
    const ageDays =
      (now - new Date(it.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays < 1) today.push(it);
    else if (ageDays < 7) week.push(it);
    else older.push(it);
  }
  return [
    { key: "today", label: "Aujourd'hui", items: today },
    { key: "week", label: "Cette semaine", items: week },
    { key: "older", label: "Plus ancien", items: older },
  ].filter((b) => b.items.length > 0) as Bucket[];
}

export function NotificationList({ notifications }: Props) {
  const [items, setItems] = useState(notifications);
  const [pendingAll, startAll] = useTransition();
  const [tab, setTab] = useState<Tab>("all");

  const visibleItems = useMemo(
    () => (tab === "unread" ? items.filter((n) => !n.isRead) : items),
    [items, tab]
  );

  const unread = items.filter((n) => !n.isRead).length;

  function markOne(id: string) {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, isRead: true } : x)));
    void markNotificationRead(id);
  }

  function markAll() {
    startAll(async () => {
      await markAllNotificationsRead();
      setItems((xs) => xs.map((x) => ({ ...x, isRead: true })));
    });
  }

  const buckets = bucketize(visibleItems);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div
          role="tablist"
          aria-label="Filtrer les notifications"
          className="inline-flex items-center rounded-full border border-border bg-card p-1"
        >
          <TabBtn
            active={tab === "all"}
            onClick={() => setTab("all")}
            label="Tout"
            count={items.length}
          />
          <TabBtn
            active={tab === "unread"}
            onClick={() => setTab("unread")}
            label="Non lues"
            count={unread}
            highlight
          />
        </div>

        {unread > 0 && (
          <Button
            size="sm"
            variant="ghost"
            disabled={pendingAll}
            onClick={markAll}
            className="gap-1.5"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      {visibleItems.length === 0 ? (
        <EmptyView tab={tab} hadAny={items.length > 0} />
      ) : (
        <div className="space-y-6">
          {buckets.map((b) => (
            <section key={b.key} aria-label={b.label}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {b.label}
              </h2>
              <ul className="space-y-2">
                {b.items.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onMarkRead={() => markOne(n.id)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="border-t border-border pt-3 text-center text-xs text-muted-foreground">
        Trop de bruit ? Ajustez vos{" "}
        <Link
          href="/parametres/notifications"
          className="font-medium text-coral-600 hover:underline"
        >
          préférences
        </Link>{" "}
        · vous gardez la main sur ce que vous recevez.
      </p>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  label,
  count,
  highlight = false,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-sm font-medium transition",
        active
          ? "bg-coral-500 text-white shadow-sm"
          : "text-foreground hover:bg-muted"
      )}
    >
      {label}
      <span
        className={cn(
          "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums",
          active
            ? "bg-white/20 text-white"
            : highlight && count > 0
              ? "bg-coral-500 text-white"
              : "bg-muted text-muted-foreground"
        )}
      >
        {count}
      </span>
    </button>
  );
}

function EmptyView({ tab, hadAny }: { tab: Tab; hadAny: boolean }) {
  if (tab === "unread") {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-coral-50 text-coral-500">
          <MailOpen className="h-7 w-7" />
        </div>
        <p className="font-semibold text-foreground">
          Tout est à jour, bravo
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Plus aucune notification non lue. Repassez quand vous voulez.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-12 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-coral-50 text-coral-500">
        <Bell className="h-7 w-7" />
      </div>
      <p className="font-semibold text-foreground">
        {hadAny ? "Plus rien à signaler" : "Tout est calme"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {hadAny
          ? "Vos notifications réapparaîtront ici dès qu'il y a du mouvement."
          : "On vous prévient dès qu'une candidature, un match ou un message arrive."}
      </p>
    </div>
  );
}

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: () => void;
}) {
  const meta = ICON_BY_TYPE[notification.type] ?? {
    icon: <Bell className="h-4 w-4" />,
    tone: "bg-sable-100 text-foreground",
    label: "Notification",
  };
  const action = quickActionFor(notification);

  return (
    <li
      className={cn(
        "rounded-2xl border p-4 transition",
        notification.isRead
          ? "border-border bg-card"
          : "border-coral-200 bg-coral-50/30"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            meta.tone
          )}
          aria-hidden
        >
          {meta.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {meta.label}
            </span>
            <span className="text-xs text-muted-foreground">
              · {timeRelative(notification.createdAt)}
            </span>
            {!notification.isRead && (
              <span
                className="ml-auto h-2 w-2 rounded-full bg-coral-500"
                aria-label="Non lue"
              />
            )}
          </div>
          <h3
            className={cn(
              "mt-0.5 text-sm",
              notification.isRead ? "font-medium" : "font-semibold"
            )}
          >
            {notification.title}
          </h3>
          {notification.body && (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {notification.body}
            </p>
          )}

          {(action || !notification.isRead) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {action && (
                <Link
                  href={action.href}
                  onClick={() => {
                    if (!notification.isRead) onMarkRead();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-coral-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-coral-600"
                >
                  {action.label}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
              {!notification.isRead && (
                <button
                  type="button"
                  onClick={onMarkRead}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                >
                  <Check className="h-3 w-3" />
                  Marquer comme lue
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
