"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@shared/ui/button";
import { Input } from "@shared/ui/input";
import { Label } from "@shared/ui/label";
import { authClient } from "@infra/auth/auth-client";
import { TurnstileWidget } from "@identity/public.client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
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
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      toast.error("Veuillez remplir tous les champs.");
      setIsPending(false);
      return;
    }

    if (captchaRequired && !captchaToken) {
      toast.error("Merci de confirmer que vous n'êtes pas un robot.");
      setIsPending(false);
      return;
    }

    const { error } = await authClient.signIn.email(
      { email, password },
      {
        headers: captchaToken
          ? { "x-captcha-response": captchaToken }
          : undefined,
      }
    );

    if (error) {
      toast.error("Email ou mot de passe incorrect.");
      setIsPending(false);
      return;
    }

    toast.success("Bienvenue.");
    router.push(
      callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/dashboard"
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Mot de passe</Label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-coral-500 hover:text-coral-600"
          >
            Mot de passe oublié ?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>

      <TurnstileWidget onVerify={onVerify} />

      <Button
        type="submit"
        disabled={isPending || (captchaRequired && !captchaToken)}
        className="w-full"
      >
        {isPending ? "Connexion..." : "Se connecter"}
      </Button>
    </form>
  );
}
