"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@shared/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-16">
      <div className="text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">
          Là, ça a coincé.
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          Un truc a mal tourné de notre côté. Réessayez, ou revenez à
          l&apos;accueil — si ça revient, dites-le nous.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-muted-foreground">
            Référence : <code className="font-mono">{error.digest}</code>
          </p>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>Réessayer</Button>
          <Button variant="outline" onClick={() => (window.location.href = "/")}>
            Retour à l&apos;accueil
          </Button>
        </div>
      </div>
    </div>
  );
}
