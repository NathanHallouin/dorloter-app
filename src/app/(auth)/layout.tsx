import Link from "next/link";
import Image from "next/image";
import { PawPrint } from "lucide-react";
import { placeholderCovers } from "@shared/utils/placeholder-images";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Panel gauche - photo + overlay */}
      <div className="relative hidden w-1/2 lg:block">
        <Image
          src={placeholderCovers.authPanel}
          alt=""
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-linear-to-br from-coral-600/80 via-coral-500/70 to-lavande-500/60" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link
            href="/"
            className="flex items-center gap-1 text-lg font-extrabold text-white"
          >
            <PawPrint className="h-5 w-5" />
            miaou
          </Link>
          <div>
            <p className="text-3xl font-bold leading-snug text-white">
              Chaque chat mérite
              <br />
              une seconde chance.
            </p>
            <p className="mt-4 max-w-sm text-coral-100">
              Rejoignez la communauté Dorloter et aidez les refuges à trouver des
              familles pour leurs protégés.
            </p>
          </div>
          <p className="text-sm text-white/60">
            &copy; {new Date().getFullYear()} Dorloter
          </p>
        </div>
      </div>

      {/* Panel droit - formulaire */}
      <div className="flex w-full items-center justify-center bg-sable-50 px-4 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
