"use client";

import { useState } from "react";
import type { AxiosError } from "axios";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { storefrontAuthApi } from "@/lib/api/storefront-auth";
import { useToast } from "@/hooks/useToast";
import { TokenService } from "@/src/lib/auth/tokens";

type FieldErrors = Record<string, string[]>;

type ErrorPayload = {
  message?: string;
  errors?: FieldErrors;
};

export default function StorefrontLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast, toasts } = useToast();
  const [form, setForm] = useState({ email: "", password: "", remember: false });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const resolvePostLoginRedirect = () => {
    const redirect = searchParams.get("redirect");
    if (!redirect || !redirect.startsWith("/")) {
      return "/";
    }

    return redirect;
  };

  const setErrorState = (message: string, nextFieldErrors: FieldErrors = {}) => {
    setError(message);
    setFieldErrors(nextFieldErrors);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setFieldErrors({});

    try {
      const profile = await storefrontAuthApi.login({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        remember: form.remember,
      });

      TokenService.clearToken();
      TokenService.setUserProfile({
        id: profile.id,
        email: profile.email,
        name: profile.name,
      });

      toast({ title: "Berhasil", description: "Login customer berhasil.", variant: "success" });
      router.push(resolvePostLoginRedirect());
      router.refresh();
    } catch (rawError) {
      const axiosError = rawError as AxiosError<ErrorPayload>;
      setErrorState(
        axiosError.response?.data?.message ?? axiosError.message ?? "Login gagal.",
        axiosError.response?.data?.errors ?? {}
      );
      toast({
        title: "Gagal",
        description: axiosError.response?.data?.message ?? "Login gagal.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <main className="flex min-h-screen w-full items-center justify-center bg-slate-100 px-4 py-10">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mx-auto mb-6 flex w-fit flex-col gap-1" aria-hidden>
            <Image
              src="/assets/images/hero/e-hero.png"
              alt="Entraverse Logo"
              width={48}
              height={48}
              className="mx-auto mb-6 h-auto w-12"
            />
          </div>

          <h1 className="mb-8 text-center text-3xl font-semibold tracking-tight text-slate-900">
            Masuk Customer
          </h1>

          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">Akun superadmin atau staff?</p>
            <p className="mt-1">
              Gunakan halaman{" "}
              <Link href="/auth/login" className="font-semibold text-amber-950 underline underline-offset-2 hover:text-amber-700">
                Login Admin
              </Link>{" "}
              untuk masuk ke dashboard.
            </p>
          </div>

          {error ? (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <p>{error}</p>
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label htmlFor="email" className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-sky-500"
                autoComplete="email"
              />
              {fieldErrors.email?.[0] ? <span className="text-xs text-rose-600">{fieldErrors.email[0]}</span> : null}
            </label>

            <label htmlFor="password" className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Kata Sandi</span>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-10 text-slate-900 outline-none transition focus:border-sky-500"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-700"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password?.[0] ? <span className="text-xs text-rose-600">{fieldErrors.password[0]}</span> : null}
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.remember}
                onChange={(event) => setForm((prev) => ({ ...prev, remember: event.target.checked }))}
              />
              Ingat saya
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Memproses..." : "Masuk"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Belum punya akun?{" "}
            <Link href="/register" className="font-semibold text-sky-600 hover:underline">
              Daftar
            </Link>
          </p>

          <p className="mt-3 text-center text-xs text-slate-500">Halaman ini khusus akun customer.</p>
        </section>
      </main>

      <div className="fixed right-4 top-4 z-[9999] flex w-[280px] flex-col gap-2">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`rounded-xl border px-3 py-2 text-sm shadow-sm ${
              item.variant === "destructive"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            <p className="font-semibold">{item.title}</p>
            {item.description ? <p>{item.description}</p> : null}
          </div>
        ))}
      </div>
    </>
  );
}
