import type { Metadata } from "next";
import Link from "next/link";
import { PawPrint } from "lucide-react";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Inscription",
};

export default function RegisterPage() {
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
        On y va
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Trois champs, trente secondes.
      </p>

      <div className="mt-8">
        <RegisterForm />
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Déjà un compte ?{" "}
        <Link
          href="/login"
          className="font-medium text-coral-500 hover:text-coral-600"
        >
          Se connecter
        </Link>
      </p>
    </>
  );
}
