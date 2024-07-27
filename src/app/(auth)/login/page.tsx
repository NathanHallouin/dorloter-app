import type { Metadata } from "next";
import Link from "next/link";
import { PawPrint } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Connexion",
};

export default function LoginPage() {
  return (
    <>
      {/* Logo mobile uniquement */}
      <Link
        href="/"
        className="mb-8 flex items-center gap-1 text-lg font-extrabold text-foreground lg:hidden"
      >
        <PawPrint className="h-5 w-5 text-coral-500" />
        miaou
      </Link>

      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Content de vous revoir
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        L&apos;adresse, le mot de passe, et c&apos;est reparti.
      </p>

      <div className="mt-8">
        <LoginForm />
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link
          href="/register"
          className="font-medium text-coral-500 hover:text-coral-600"
        >
          Créer un compte
        </Link>
      </p>
    </>
  );
}
