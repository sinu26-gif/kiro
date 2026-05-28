import Link from "next/link";

import { LanguageToggle } from "@/components/shared/language-toggle";
import { Logo } from "@/components/shared/logo";

/**
 * Layout for public, unauthenticated routes (landing, login, public leaderboard).
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" aria-label="Himova home">
            <Logo size="md" />
          </Link>
          <LanguageToggle />
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Himova. Made for Nepal.</p>
      </footer>
    </div>
  );
}
