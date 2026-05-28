"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export type NavItem = {
  href: string;
  label: string;
  icon?: React.ReactNode;
};

/**
 * Vertical/horizontal nav used by both the admin sidebar and the shop tab bar.
 */
export function PortalNav({
  items,
  orientation = "vertical",
  className,
}: {
  items: NavItem[];
  orientation?: "vertical" | "horizontal";
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        orientation === "vertical" ? "flex flex-col gap-1" : "flex items-center gap-1",
        className
      )}
    >
      {items.map((item) => {
        const isActive =
          pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground",
              orientation === "horizontal" && "tap-target justify-center"
            )}
          >
            {item.icon}
            <span className={orientation === "horizontal" ? "sr-only sm:not-sr-only" : ""}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
