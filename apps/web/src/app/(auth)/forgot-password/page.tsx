import type { Metadata } from "next";
import Link from "next/link";
import { PawPrint } from "lucide-react";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Mot de passe oublié",
};

export default function ForgotPasswordPage() {
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
        Mot de passe oublié
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Votre adresse, et on vous envoie un lien pour en choisir un nouveau.
      </p>

      <div className="mt-8">
        <ForgotPasswordForm />
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-coral-500 hover:text-coral-600"
        >
          Retour à la connexion
        </Link>
      </p>
    </>
  );
}
