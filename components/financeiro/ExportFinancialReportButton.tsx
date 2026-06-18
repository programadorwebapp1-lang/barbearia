"use client";

import { Download } from "lucide-react";

export function ExportFinancialReportButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
    >
      <Download className="w-4 h-4" />
      Exportar relatório
    </a>
  );
}
