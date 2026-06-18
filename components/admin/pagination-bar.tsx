import { Button } from "@/components/system-ui";

export function PaginationBar({
  section,
  current,
  totalPages,
  total,
  onChange,
}: {
  section: string;
  current: number;
  totalPages: number;
  total: number;
  onChange: (delta: number) => void;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
      <span>
        Página {current} de {totalPages} · {total} registros
      </span>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" disabled={current <= 1} onClick={() => onChange(-1)}>
          Anterior
        </Button>
        <Button variant="secondary" size="sm" disabled={current >= totalPages} onClick={() => onChange(1)}>
          Próxima
        </Button>
      </div>
    </div>
  );
}
