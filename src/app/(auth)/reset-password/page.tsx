import type { Metadata } from "next";
import Link from "next/link";
import { PawPrint } from "lucide-react";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Nouveau mot de passe",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  return (
    <>
      <Link
        href="/"
        className="mb-8 flex items-center gap-1 text-lg font-extrabold text-foreground lg:hidden"
      >
        <PawPrint className="h-5 w-5 text-coral-500" />
        miaou
      </Link>

      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Nouveau mot de passe
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Choisissez un mot de passe solide (8 caractères minimum).
      </p>

      <div className="mt-8">
        {error || !token ? (
          <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
            Ce lien est invalide ou expiré.{" "}
            <Link
              href="/forgot-password"
              className="font-medium underline"
            >
              Demander un nouveau lien
            </Link>
            .
          </div>
        ) : (
          <ResetPasswordForm token={token} />
        )}
      </div>
    </>
  );
}
