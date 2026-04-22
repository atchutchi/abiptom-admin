"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  IdCard,
  Package,
  CheckSquare,
  Wallet,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/db/schema";
import { getDefaultRoute } from "@/lib/auth/rbac";
import { getUserInitials } from "@/lib/users/avatar";

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
    label: "RH / Contratos",
    href: "/admin/hr/contracts",
    icon: IdCard,
    roles: ["ca", "dg"],
  },
  {
    label: "Despesas",
    href: "/admin/expenses",
    icon: Receipt,
    roles: ["ca", "dg"],
  },
  {
    label: "Stock",
    href: "/admin/stock",
    icon: Package,
    roles: ["ca", "dg", "coord"],
  },
  {
    label: "Tarefas",
    href: "/admin/tasks",
    icon: CheckSquare,
    roles: ["ca", "dg", "coord"],
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
  {
    label: "Meus projectos",
    href: "/staff/me/projects",
    icon: ClipboardList,
    roles: ["staff", "coord"],
  },
  {
    label: "Histórico salarial",
    href: "/staff/me/salary-history",
    icon: Wallet,
    roles: ["staff", "coord"],
  },
  {
    label: "Minhas tarefas",
    href: "/staff/me/tasks",
    icon: CheckSquare,
    roles: ["staff", "coord"],
  },
];

interface SidebarProps {
  role: UserRole;
  userName: string;
  userAvatarUrl?: string | null;
}

const SIDEBAR_COLLAPSED_KEY = "abiptom_sidebar_collapsed";

export function Sidebar({ role, userName, userAvatarUrl }: SidebarProps) {
  const pathname = usePathname();
  const isStaff = role === "staff";
  const [collapsed, setCollapsed] = useState(false);

  const items = isStaff
    ? STAFF_NAV_ITEMS
    : NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) =>
        role === "coord" && item.href === "/admin/dashboard"
          ? { ...item, href: "/staff/me/dashboard" }
          : item
      );
  const homeHref = getDefaultRoute(role);
  const footerHref = isStaff ? "/staff/me/profile" : "/admin/profile";
  const initials = getUserInitials(userName);

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored === "1") {
      setCollapsed(true);
      return;
    }

    if (stored === null && window.innerWidth < 1024) {
      setCollapsed(true);
    }
  }, []);

  function toggleSidebar() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "flex min-h-screen flex-col bg-gray-900 text-gray-100 transition-[width] duration-200",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-gray-700",
          collapsed ? "px-3" : "px-4"
        )}
      >
        <Link
          href={homeHref}
          className={cn(
            "min-w-0 text-gray-100",
            collapsed ? "inline-flex items-center" : "inline-flex items-center px-2"
          )}
          title="ABIPTOM Admin"
        >
          {!collapsed && (
            <Image
              src="/brand/abiptom-logo.png"
              alt="ABIPTOM"
              width={112}
              height={28}
              className="h-7 w-auto"
              priority
            />
          )}
          {collapsed && (
            <Image
              src="/brand/abiptom-logo.png"
              alt="ABIPTOM"
              width={32}
              height={32}
              className="h-8 w-8 rounded-full bg-white object-contain p-0.5"
              priority
            />
          )}
          {!collapsed && (
            <span className="ml-2 text-xs font-normal text-gray-400">Admin</span>
          )}
        </Link>
        <button
          type="button"
          onClick={toggleSidebar}
          className="ml-auto rounded-md p-2 text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
          aria-label={collapsed ? "Expandir sidebar" : "Minimizar sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
          ) : (
            <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className={cn("space-y-0.5", collapsed ? "px-2" : "px-3")}>
          {items.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/admin/dashboard" &&
                item.href !== "/staff/me/dashboard" &&
                (pathname?.startsWith(item.href) ?? false));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center rounded-lg py-2 text-sm transition-colors",
                    collapsed ? "justify-center px-2" : "gap-3 px-3",
                    active
                      ? "bg-gray-700 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  {collapsed ? <span className="sr-only">{item.label}</span> : item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User footer */}
      <div
        className={cn(
          "border-t border-gray-700 pb-4 pt-3",
          collapsed ? "px-2" : "px-3"
        )}
      >
        <Link
          href={footerHref}
          title={collapsed ? `${userName} (${role.toUpperCase()})` : undefined}
          className={cn(
            "flex items-center rounded-lg py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white",
            collapsed ? "justify-center px-2" : "gap-3 px-3"
          )}
        >
          <Avatar size="sm" className="h-8 w-8">
            {userAvatarUrl ? (
              <AvatarImage src={userAvatarUrl} alt={userName} />
            ) : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          {collapsed ? (
            <span className="sr-only">{userName}</span>
          ) : (
            <div className="min-w-0">
              <p className="truncate font-medium text-white">{userName}</p>
              <p className="text-xs text-gray-400 uppercase">{role}</p>
            </div>
          )}
        </Link>
      </div>
    </aside>
  );
}
