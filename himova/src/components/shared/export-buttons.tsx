"use client";

import { useTranslations } from "next-intl";
import { Download, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

export type CsvSection = {
  title: string;
  headers: string[];
  rows: (string | number)[][];
};

function escapeCsv(value: string | number): string {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildCsv(sections: CsvSection[]): string {
  const lines: string[] = [];
  for (const section of sections) {
    lines.push(escapeCsv(section.title));
    lines.push(section.headers.map(escapeCsv).join(","));
    for (const row of section.rows) {
      lines.push(row.map(escapeCsv).join(","));
    }
    lines.push(""); // blank line between sections
  }
  return lines.join("\n");
}

/**
 * Download report data as a CSV file (opens in Excel). Multiple sections are
 * stacked in one file with a title row each. Pure client-side, no deps.
 */
export function ExportButtons({
  filename,
  sections,
}: {
  filename: string;
  sections: CsvSection[];
}) {
  const t = useTranslations("exports");

  function downloadCsv() {
    const csv = buildCsv(sections);
    // BOM so Excel reads UTF-8 (Nepali names) correctly.
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex gap-2 print:hidden">
      <Button variant="outline" size="sm" onClick={downloadCsv}>
        <Download className="mr-1.5 h-4 w-4" aria-hidden />
        {t("excel")}
      </Button>
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="mr-1.5 h-4 w-4" aria-hidden />
        {t("pdf")}
      </Button>
    </div>
  );
}
