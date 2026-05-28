import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Home as HomeIcon,
  ShoppingBag,
  ShoppingCart,
  Package,
  Receipt,
  Users,
  BarChart3,
  Trophy,
  Settings,
} from "lucide-react";

import { LanguageToggle } from "@/components/shared/language-toggle";
import { Logo } from "@/components/shared/logo";
import { LogoutButton } from "@/components/shared/logout-button";
import { PortalNav, type NavItem } from "@/components/shared/portal-nav";

/**
 * Shopkeeper portal layout. Mobile-first: top header, content, fixed bottom tab bar.
 */
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <ShopShell>{children}</ShopShell>;
}

function ShopShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("shopNav");

  const primary: NavItem[] = [
    { href: "/shop", label: t("home"), icon: <HomeIcon className="h-5 w-5" /> },
    { href: "/shop/catalog", label: t("catalog"), icon: <ShoppingBag className="h-5 w-5" /> },
    { href: "/shop/pos", label: t("pos"), icon: <Receipt className="h-5 w-5" /> },
    { href: "/shop/orders", label: t("orders"), icon: <Package className="h-5 w-5" /> },
    { href: "/shop/leaderboard", label: t("leaderboard"), icon: <Trophy className="h-5 w-5" /> },
  ];

  const secondary: NavItem[] = [
    { href: "/shop/cart", label: t("cart"), icon: <ShoppingCart className="h-5 w-5" /> },
    { href: "/shop/stock", label: t("stock"), icon: <Package className="h-5 w-5" /> },
    { href: "/shop/customers", label: t("customers"), icon: <Users className="h-5 w-5" /> },
    { href: "/shop/reports", label: t("reports"), icon: <BarChart3 className="h-5 w-5" /> },
    { href: "/shop/settings", label: t("settings"), icon: <Settings className="h-5 w-5" /> },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link href="/shop" aria-label="Himova home">
            <Logo size="md" />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle className="hidden sm:inline-flex" />
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Desktop / tablet: also show secondary nav as a side rail */}
      <div className="container grid flex-1 gap-6 py-6 lg:grid-cols-[200px_1fr]">
        <aside className="hidden lg:block">
          <PortalNav items={[...primary, ...secondary]} />
        </aside>
        <main className="min-w-0 pb-24 lg:pb-6">{children}</main>
      </div>

      {/* Mobile bottom tab bar — primary actions only */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur lg:hidden"
        aria-label="Primary navigation"
      >
        <div className="container">
          <PortalNav items={primary} orientation="horizontal" className="justify-between py-1" />
        </div>
      </nav>
    </div>
  );
}
