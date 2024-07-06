import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Connexion",
};

export default function LoginPage() {
  return (
    <div className="rounded-xl bg-white p-8 shadow-sm">
      <h1 className="mb-6 text-2xl font-bold text-earth-900">Connexion</h1>
      <p className="text-earth-600">Formulaire de connexion à venir.</p>
      <p className="mt-4 text-sm text-earth-500">
        Pas encore de compte ?{" "}
        <Link href="/register" className="text-teal-600 hover:underline">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}
