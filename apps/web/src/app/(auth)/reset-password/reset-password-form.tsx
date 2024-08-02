"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { authClient } from "@infra/auth/auth-client";

interface FormState {
  error: string | null;
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      const password = formData.get("password") as string;
      const confirm = formData.get("confirm") as string;

      if (!password || password.length < 8) {
        return { error: "Le mot de passe doit faire au moins 8 caractères." };
      }
      if (password !== confirm) {
        return { error: "Les mots de passe ne correspondent pas." };
      }

      const { error } = await authClient.resetPassword({
        token,
        newPassword: password,
      });

      if (error) {
        return {
          error:
            error.code === "INVALID_TOKEN"
              ? "Ce lien est invalide ou expiré."
              : "Une erreur est survenue. Réessayez.",
        };
      }

      router.push("/login?reset=1");
      return { error: null };
    },
    { error: null }
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="password">Nouveau mot de passe</Label>
        <Input
          id="password"
          name="password"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm">Confirmation</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
        />
      </div>

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </form>
  );
}
