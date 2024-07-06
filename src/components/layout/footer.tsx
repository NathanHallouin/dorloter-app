import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-cream-200 bg-cream-50 px-4 py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 text-sm text-earth-500 md:flex-row md:justify-between">
        <p>&copy; {new Date().getFullYear()} Miaou. Tous droits réservés.</p>
        <div className="flex gap-6">
          <Link href="/adopter" className="hover:text-teal-600">
            Adopter
          </Link>
          <Link href="/perdus-trouves" className="hover:text-teal-600">
            Perdus / Trouvés
          </Link>
          <Link href="/refuges" className="hover:text-teal-600">
            Refuges
          </Link>
        </div>
      </div>
    </footer>
  );
}
