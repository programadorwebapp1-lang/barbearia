"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle } from "lucide-react";
import type { ButtonHTMLAttributes, FormEvent, InputHTMLAttributes } from "react";
import { PasswordInput } from "@/components/password-input";

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all ${props.className ?? ""}`} />;
}

function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-sky-600 text-white hover:bg-sky-700 shadow-sm ${props.className ?? ""}`} />;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberEmail, setRememberEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [firstAdminMode, setFirstAdminMode] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientPassword, setClientPassword] = useState("");

  useEffect(() => {
    const savedEmail = window.localStorage.getItem("barbearia:remembered-email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }

    fetch("/api/auth/status")
      .then((res) => res.json())
      .then((data) => {
        setFirstAdminMode(!data.hasUsers);
        setAppReady(true);
      })
      .catch(() => setAppReady(true));
  }, []);

  async function login(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error || "Nao foi possivel entrar.");
      return;
    }

    if (rememberEmail) {
      window.localStorage.setItem("barbearia:remembered-email", email);
    } else {
      window.localStorage.removeItem("barbearia:remembered-email");
    }

    router.replace(data.redirectTo);
    router.refresh();
  }

  async function bootstrapAdmin(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: "ADMIN",
      }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error || "Nao foi possivel criar o administrador.");
      return;
    }
    router.replace(data.redirectTo);
    router.refresh();
  }

  async function registerPatient(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "CLIENTE",
        email: clientEmail,
        phone: clientPhone,
        password: clientPassword,
      }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error || "Nao foi possivel criar sua conta.");
      return;
    }
    router.replace(data.redirectTo);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(212,160,23,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(15,15,15,0.08),_transparent_32%),linear-gradient(180deg,_#fffaf0_0%,_#ffffff_100%)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10 space-y-4">
          <div className="mx-auto inline-flex items-center justify-center rounded-[1.75rem] bg-white/85 border border-amber-100 shadow-[0_16px_50px_rgba(0,0,0,0.08)] px-6 py-5">
            <Image
              src="/brand-logo-icon.png"
              alt="Logo Carvalho Barbearia o Sistema de Gestão"
              title="Logo Carvalho Barbearia Sistema de Gestão"
              width={92}
              height={92}
              priority
              className="h-20 w-20 object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Carvalho Barbearia 
            </h1>
            <p className="text-slate-500 text-sm mt-1">Sistema de Gestão</p>
          </div>
        </div>

        <div className="bg-white/95 rounded-2xl border border-white/70 shadow-xl shadow-amber-100/30 p-8 backdrop-blur">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">
            {firstAdminMode ? "Crie o primeiro administrador" : mode === "login" ? "Acesse sua conta" : "Criar conta de cliente"}
          </h2>

          {!appReady ? (
            <p className="text-sm text-slate-500">Carregando...</p>
          ) : firstAdminMode ? (
            <form onSubmit={bootstrapAdmin} className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Nome</span>
                <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} required />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">E-mail</span>
                <Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required />
              </label>
              <PasswordInput label="Senha" value={adminPassword} onChange={setAdminPassword} required />
              {error && <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-700 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}
              <Button type="submit" disabled={loading} className="w-full">{loading ? "Salvando..." : "Criar administrador"}</Button>
            </form>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 mb-6">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all cursor-pointer ${
                    mode === "login" ? "bg-sky-600 text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all cursor-pointer ${
                    mode === "signup" ? "bg-sky-600 text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Criar conta
                </button>
              </div>

              {mode === "login" ? (
                <form onSubmit={login} className="space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">E-mail</span>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </label>
                  <PasswordInput label="Senha" value={password} onChange={setPassword} required />
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={rememberEmail}
                      onChange={(e) => setRememberEmail(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                    Lembrar meu e-mail
                  </label>
                  {error && <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-700 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}
                  <Button type="submit" disabled={loading} className="w-full">{loading ? "Entrando..." : "Entrar"}</Button>
                </form>
              ) : (
                <form onSubmit={registerPatient} className="space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">E-mail</span>
                    <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} required />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Telefone</span>
                    <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} required placeholder="(00) 00000-0000" />
                  </label>
                  <PasswordInput label="Senha" value={clientPassword} onChange={setClientPassword} required />
                  {error && <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-700 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}
                  <Button type="submit" disabled={loading} className="w-full">{loading ? "Criando..." : "Criar conta"}</Button>
                </form>
              )}
            </>
          )}

          {!firstAdminMode && (
            <div className="mt-6 pt-6 border-t border-slate-100 text-sm text-slate-500">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-teal-600 mt-0.5" />
                <p>O acesso é controlado por perfil. O redirecionamento é automático após o login.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
