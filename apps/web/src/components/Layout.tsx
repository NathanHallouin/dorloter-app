import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CompareBar } from "@/components/CompareBar";

export function Layout() {
  const isConsole = /^\/(refuge|pension|admin)(\/|$)/.test(useLocation().pathname);
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1"><Outlet /></main>
      {!isConsole && <Footer />}
      {!isConsole && <CompareBar />}
    </div>
  );
}
