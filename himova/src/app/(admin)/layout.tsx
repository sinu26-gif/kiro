import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Boxes,
  Users,
  ClipboardList,
  Package,
  Trophy,
  BarChart3,
  Settings,
} from "lucide-react";

import { LanguageToggle } from "@/components/shared/language-toggle";
import { Logo } from "@/components/shared/logo";
import { LogoutButton } from "@/components/shared/logout-button";
import { PortalNav, type NavItem } from "@/components/shared/portal-nav";

/**
 * Admin portal layout (desktop-first sidebar shell).
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("adminNav");

  const items: NavItem[] = [
    { href: "/admin", label: t("dashboard"), icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: "/admin/products", label: t("products"), icon: <Boxes className="h-4 w-4" /> },
    { href: "/admin/shopkeepers", label: t("shopkeepers"), icon: <Users className="h-4 w-4" /> },
    { href: "/admin/orders", label: t("orders"), icon: <ClipboardList className="h-4 w-4" /> },
    { href: "/admin/stock", label: t("stock"), icon: <Package className="h-4 w-4" /> },
    { href: "/admin/leaderboard", label: t("leaderboard"), icon: <Trophy className="h-4 w-4" /> },
    { href: "/admin/reports", label: t("reports"), icon: <BarChart3 className="h-4 w-4" /> },
    { href: "/admin/settings", label: t("settings"), icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link href="/admin" aria-label="Himova admin">
            <Logo size="md" />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="container grid flex-1 gap-6 py-6 md:grid-cols-[220px_1fr]">
        <aside className="hidden md:block">
          <PortalNav items={items} className="sticky top-20" />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
