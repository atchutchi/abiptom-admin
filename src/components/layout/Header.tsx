"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-6">
      {title && (
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      )}
      <div className="ml-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          aria-label="Terminar sessão"
        >
          <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
          Sair
        </Button>
      </div>
    </header>
  );
}
