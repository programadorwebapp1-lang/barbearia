import { BrandLogo } from "@/components/brand-logo";

export function LoadingScreen({ label = "Carregando sistema..." }: { label?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(212,160,23,0.22),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(15,15,15,0.1),_transparent_32%),linear-gradient(180deg,_#fffaf0_0%,_#fff2cf_100%)] px-4">
      <div className="relative flex w-full max-w-md flex-col items-center gap-6 rounded-[2rem] border border-white/70 bg-white/80 p-8 text-center shadow-2xl backdrop-blur">
        <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-white/70 via-transparent to-amber-50/60" />
        <div className="relative">
          <BrandLogo compact priority className="h-20 w-20 rounded-[1.5rem] border border-amber-100 bg-white p-3 shadow-[0_18px_40px_rgba(0,0,0,0.08)]" />
        </div>
        <div className="relative space-y-2">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-amber-200 border-t-amber-500" />
          <p className="text-sm font-semibold tracking-wide text-slate-900">{label}</p>
          <p className="text-xs text-slate-500">Carvalho Barbearia - Sistema de Gestão</p>
        </div>
      </div>
    </div>
  );
}
