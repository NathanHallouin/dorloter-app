import Link from "next/link";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-cream-200 bg-cream-50/95 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold text-amber-600">
          Miaou
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          <Link
            href="/adopter"
            className="text-sm font-medium text-earth-700 hover:text-teal-600"
          >
            Adopter
          </Link>
          <Link
            href="/perdus-trouves"
            className="text-sm font-medium text-earth-700 hover:text-teal-600"
          >
            Perdus / Trouvés
          </Link>
          <Link
            href="/refuges"
            className="text-sm font-medium text-earth-700 hover:text-teal-600"
          >
            Refuges
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-earth-700 hover:text-teal-600"
          >
            Connexion
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Inscription
          </Link>
        </div>
      </nav>
    </header>
  );
}
