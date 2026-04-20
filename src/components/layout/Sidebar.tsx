"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Briefcase,
  DollarSign,
  Receipt,
  ClipboardList,
  BarChart3,
  Settings,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/db/schema";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Painel",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    roles: ["ca", "dg", "coord"],
  },
  {
    label: "Utilizadores",
    href: "/admin/users",
    icon: Users,
    roles: ["ca", "dg"],
  },
  {
    label: "Clientes",
    href: "/admin/clients",
    icon: Briefcase,
    roles: ["ca", "dg", "coord"],
  },
  {
    label: "Facturas",
    href: "/admin/invoices",
    icon: FileText,
    roles: ["ca", "dg", "coord"],
  },
  {
    label: "Projectos",
    href: "/admin/projects",
    icon: ClipboardList,
    roles: ["ca", "dg", "coord"],
  },
  {
    label: "Folha Salarial",
    href: "/admin/salary",
    icon: DollarSign,
    roles: ["ca", "dg"],
  },
  {
    label: "Despesas",
    href: "/admin/expenses",
    icon: Receipt,
    roles: ["ca", "dg"],
  },
  {
    label: "Dividendos",
    href: "/admin/dividends",
    icon: DollarSign,
    roles: ["ca"],
  },
  {
    label: "Relatórios",
    href: "/admin/reports",
    icon: BarChart3,
    roles: ["ca", "dg"],
  },
  {
    label: "Definições",
    href: "/admin/settings",
    icon: Settings,
    roles: ["ca"],
  },
];

const STAFF_NAV_ITEMS: NavItem[] = [
  {
    label: "O meu painel",
    href: "/staff/me/dashboard",
    icon: LayoutDashboard,
    roles: ["staff", "coord"],
  },
];

interface SidebarProps {
  role: UserRole;
  userName: string;
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const isStaff = role === "staff";

  const items = isStaff ? STAFF_NAV_ITEMS : NAV_ITEMS.filter((item) =>
    item.roles.includes(role)
  );

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-gray-900 text-gray-100">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-700">
        <span className="text-lg font-bold tracking-tight">ABIPTOM</span>
        <span className="ml-2 text-xs text-gray-400 font-normal">Admin</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-0.5 px-3">
          {items.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/admin/dashboard" &&
                item.href !== "/staff/me/dashboard" &&
                pathname.startsWith(item.href));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                    active
                      ? "bg-gray-700 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User footer */}
      <div className="px-3 pb-4 border-t border-gray-700 pt-3">
        <Link
          href={isStaff ? "/staff/me/dashboard" : "/admin/profile"}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <User className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate font-medium text-white">{userName}</p>
            <p className="text-xs text-gray-400 uppercase">{role}</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
