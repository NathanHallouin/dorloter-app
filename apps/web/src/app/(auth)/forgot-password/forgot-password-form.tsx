"use client";

import { useActionState } from "react";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { authClient } from "@infra/auth/auth-client";

interface FormState {
  error: string | null;
  sent: boolean;
}

async function submit(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = formData.get("email") as string;
  if (!email) return { error: "Email requis.", sent: false };

  const { error } = await authClient.requestPasswordReset({
    email,
    redirectTo: "/reset-password",
  });

  if (error) {
    return { error: "Une erreur est survenue. Réessayez.", sent: false };
  }

  return { error: null, sent: true };
}

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(submit, {
    error: null,
    sent: false,
  });

  if (state.sent) {
    return (
      <div className="rounded-md bg-teal-50 p-4 text-sm text-teal-800">
        Si cette adresse est liée à un compte, un mail vient de partir.
        Jetez un œil dans la boîte · et dans les spams au cas où.
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="chat@dorloter.fr"
          required
          autoComplete="email"
        />
      </div>

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "On vous envoie le lien…" : "Envoyer le lien"}
      </Button>
    </form>
  );
}
