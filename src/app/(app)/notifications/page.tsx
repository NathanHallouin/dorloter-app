import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notifications",
};

export default function NotificationsPage() {
  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold text-earth-900">Notifications</h1>
      {/* TODO: Centre de notifications */}
      <p className="text-earth-600">
        Vos notifications seront affichées ici.
      </p>
    </div>
  );
}
