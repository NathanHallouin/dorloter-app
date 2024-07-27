"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { authClient } from "@infra/auth/auth-client";
import { TurnstileWidget } from "@identity/public.client";

export function RegisterForm() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string>("");
  const captchaRequired = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const onVerify = useCallback((token: string) => {
    setCaptchaToken(token);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!name || !email || !password) {
      toast.error("Les trois champs sont requis.");
      setIsPending(false);
      return;
    }

    if (password.length < 8) {
      toast.error("8 caractères minimum pour le mot de passe.");
      setIsPending(false);
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Les deux mots de passe ne correspondent pas.");
      setIsPending(false);
      return;
    }

    if (captchaRequired && !captchaToken) {
      toast.error("Merci de confirmer que vous n'êtes pas un robot.");
      setIsPending(false);
      return;
    }

    const { error: signUpError } = await authClient.signUp.email(
      { email, password, name },
      {
        headers: captchaToken
          ? { "x-captcha-response": captchaToken }
          : undefined,
      }
    );

    if (signUpError) {
      toast.error("Impossible de créer le compte. L'email est peut-être déjà utilisé.");
      setIsPending(false);
      return;
    }

    toast.success("Compte créé. Un email de vérification vient de partir.");
    router.push("/dashboard");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nom</Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="Votre nom"
          required
          autoComplete="name"
        />
      </div>

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

      <div className="space-y-2">
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
        />
      </div>

      <TurnstileWidget onVerify={onVerify} />

      <Button
        type="submit"
        disabled={isPending || (captchaRequired && !captchaToken)}
        className="w-full"
      >
        {isPending ? "Création..." : "Créer mon compte"}
      </Button>
    </form>
  );
}
