"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { getRecentVisits, type RecentVisit } from "./track-visit";

export function RecentVisits() {
  const [visits, setVisits] = useState<RecentVisit[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setVisits(getRecentVisits());
    setMounted(true);
  }, []);

  if (!mounted || visits.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        Vu récemment
      </h2>
      <ul className="space-y-1.5">
        {visits.slice(0, 8).map((v) => (
          <li key={v.url}>
            <Link
              href={v.url}
              className="block truncate rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-sable-50"
            >
              {v.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
