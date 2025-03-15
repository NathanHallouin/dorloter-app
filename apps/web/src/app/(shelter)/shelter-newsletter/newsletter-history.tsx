import { Calendar, Users } from "lucide-react";
import {
  NEWSLETTER_LABELS,
  type ShelterNewsletter,
} from "@shelters/public";

export function NewsletterHistory({
  items,
}: {
  items: ShelterNewsletter[];
}) {
  return (
    <ul className="space-y-2">
      {items.map((n) => (
        <li
          key={n.id}
          className="rounded-xl border border-border bg-card p-4"
        >
          <details>
            <summary className="cursor-pointer list-none">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-coral-200 bg-coral-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-coral-700">
                    {NEWSLETTER_LABELS[n.kind]}
                  </span>
                  <strong className="text-foreground">{n.subject}</strong>
                </span>
                <span className="inline-flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(n.sentAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {n.recipientCount}
                  </span>
                </span>
              </div>
            </summary>
            <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">
              {n.body}
            </p>
          </details>
        </li>
      ))}
    </ul>
  );
}
