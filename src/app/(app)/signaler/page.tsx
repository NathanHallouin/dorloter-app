import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Signaler un chat",
};

export default function SignalerPage() {
  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold text-earth-900">
        Signaler un chat perdu ou trouvé
      </h1>
      {/* TODO: Formulaire signalement avec carte */}
      <p className="text-earth-600">
        Le formulaire de signalement sera affiché ici.
      </p>
    </div>
  );
}
