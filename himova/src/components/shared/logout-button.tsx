"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";

import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

/**
 * Renders a "Log out" button that calls the logout server action.
 */
export function LogoutButton() {
  const t = useTranslations("auth");
  const [pending, start] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => start(() => void logout())}
      disabled={pending}
    >
      <LogOut className="mr-2 h-4 w-4" aria-hidden />
      {t("logout")}
    </Button>
  );
}
