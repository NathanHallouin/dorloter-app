import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="text-center py-20">
      <p className="text-5xl">🐾</p>
      <h1 className="mt-4 text-2xl font-bold text-stone-800">Page introuvable</h1>
      <Link to="/" className="mt-4 inline-block text-teal-700 hover:underline">
        Retour à l'accueil
      </Link>
    </div>
  );
}
