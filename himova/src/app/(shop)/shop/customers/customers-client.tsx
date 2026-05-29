"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, Users } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatNpr, formatDate } from "@/lib/format";
import { formatPhoneForDisplay } from "@/lib/auth/phone";

export type CustomerRow = {
  id: string;
  name: string | null;
  phone: string | null;
  spentPaisa: number;
  visits: number;
  lastVisit: string | null;
};

export function CustomersClient({ rows }: { rows: CustomerRow[] }) {
  const t = useTranslations("customers");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        (r.name ?? "").toLowerCase().includes(needle) ||
        (r.phone ?? "").includes(needle)
    );
  }, [rows, q]);

  if (rows.length === 0) {
    return (
      <Card className="border-dashed bg-card/60 p-10 text-center">
        <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">{t("empty")}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search")}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noResults")}</p>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("name")}</th>
                  <th className="px-4 py-3 font-medium">{t("phone")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("spent")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("visits")}</th>
                  <th className="px-4 py-3 font-medium">{t("lastVisit")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{r.name ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {r.phone ? formatPhoneForDisplay(r.phone) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {formatNpr(r.spentPaisa)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.visits}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.lastVisit ? formatDate(r.lastVisit) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
