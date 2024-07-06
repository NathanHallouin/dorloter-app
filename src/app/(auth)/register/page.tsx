import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Inscription",
};

export default function RegisterPage() {
  return (
    <div className="rounded-xl bg-white p-8 shadow-sm">
      <h1 className="mb-6 text-2xl font-bold text-earth-900">Inscription</h1>
      <p className="text-earth-600">
        Formulaire d&apos;inscription à venir.
      </p>
      <p className="mt-4 text-sm text-earth-500">
        Déjà un compte ?{" "}
        <Link href="/login" className="text-teal-600 hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
