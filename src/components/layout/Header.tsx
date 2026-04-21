"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const homeHref = pathname?.startsWith("/staff")
    ? "/staff/me/dashboard"
    : "/admin/dashboard";

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-6">
      <div className="flex min-w-0 items-center gap-4">
        <Link href={homeHref} aria-label="ABIPTOM">
          <Image
            src="/brand/abiptom-logo.png"
            alt="ABIPTOM"
            width={126}
            height={32}
            className="h-8 w-auto"
            priority
          />
        </Link>
        {title && (
          <h1 className="truncate text-lg font-semibold text-gray-900">{title}</h1>
        )}
      </div>
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
