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
 * Shared nav used by both the admin sidebar (vertical) and the shop tab bar (horizontal).
 * Adds an active-indicator bar so the current tab is unambiguous on mobile.
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
        orientation === "vertical" ? "flex flex-col gap-1" : "flex items-center",
        className
      )}
    >
      {items.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && item.href !== "/admin" && item.href !== "/shop"
            ? pathname.startsWith(`${item.href}/`)
            : false);

        if (orientation === "horizontal") {
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 rounded-md px-2 py-2 text-[11px] font-medium tap-target",
                "transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.icon}
              <span className="leading-none">{item.label}</span>
              {isActive ? (
                <span
                  aria-hidden
                  className="absolute inset-x-3 -top-px h-0.5 rounded-full bg-primary"
                />
              ) : null}
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            )}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
