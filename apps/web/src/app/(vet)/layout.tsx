import { redirect } from "next/navigation";
import { requireVeterinarian } from "@infra/auth/session";
import { getVeterinarianById } from "@veterinarians/public";
import { VetHeader } from "./_components/vet-header";
import { VetSidebar } from "./_components/vet-sidebar";

export default async function VetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireVeterinarian();
  const vet = await getVeterinarianById(session.user.vetId);
  if (!vet) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col bg-sable-50/40">
      <VetHeader
        user={session.user}
        vetName={vet.name}
        vetVerified={vet.isVerified}
      />
      <div className="flex w-full flex-1 flex-col gap-8 px-4 py-8 md:flex-row md:px-6 lg:px-8">
        <VetSidebar />
        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
