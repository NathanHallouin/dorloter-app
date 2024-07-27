"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@shared/ui/button";
import { toggleFollowShelter } from "@shelters/actions/follow";

export function FollowButton({
  shelterId,
  initialFollowers,
}: {
  shelterId: string;
  initialFollowers: number;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(initialFollowers);
  const [hydrated, setHydrated] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    fetch(`/api/shelters/${shelterId}/follow`)
      .then((r) => r.json())
      .then((data: { following: boolean; authed: boolean }) => {
        setFollowing(data.following);
        setAuthed(data.authed);
        setHydrated(true);
      })
      .catch(() => setHydrated(true));
  }, [shelterId]);

  function handleClick() {
    if (!authed) {
      router.push(`/login?callbackUrl=/refuges/${shelterId}`);
      return;
    }
    start(async () => {
      const r = await toggleFollowShelter(shelterId);
      if (r.success && r.data) {
        setFollowing(r.data.following);
        setFollowers((f) => (r.data!.following ? f + 1 : f - 1));
        toast.success(
          r.data.following
            ? "Vous suivez ce refuge. Alertes quand ils publient un chat."
            : "Vous ne suivez plus ce refuge."
        );
      }
    });
  }

  return (
    <Button
      variant={following ? "outline" : "default"}
      onClick={handleClick}
      disabled={pending || !hydrated}
      className="gap-1.5"
    >
      {following ? (
        <>
          <BellOff className="h-4 w-4" />
          Suivi · {followers}
        </>
      ) : (
        <>
          <Bell className="h-4 w-4" />
          Suivre · {followers}
        </>
      )}
    </Button>
  );
}
