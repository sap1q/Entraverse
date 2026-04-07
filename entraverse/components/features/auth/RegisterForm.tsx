"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";

const getStrength = (password: string): number => {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
};

export default function RegisterForm() {
  const router = useRouter();
  const { register, isLoading, error, fieldErrors } = useAuth();
  const { toast, toasts } = useToast();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
    role: "staff",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);

  const strength = useMemo(() => getStrength(form.password), [form.password]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const success = await register({
      name: form.name,
      email: form.email,
      password: form.password,
      password_confirmation: form.password_confirmation,
      role: form.role as "superadmin" | "staff" | "editor",
    });

    if (success) {
      toast({ title: "Berhasil", description: "Registrasi berhasil.", variant: "success" });
      router.push("/admin/dashboard");
      return;
    }

    toast({ title: "Gagal", description: error || "Registrasi gagal.", variant: "destructive" });
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

          <h1 className="mb-6 text-center text-2xl font-bold text-slate-900">Register Admin</h1>

          {error ? (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <p>{error}</p>
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label htmlFor="name" className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Nama</span>
              <input
                id="name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-sky-500"
              />
              {fieldErrors.name?.[0] ? (
                <span className="text-xs text-rose-600">{fieldErrors.name[0]}</span>
              ) : null}
            </label>

            <label htmlFor="email" className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-sky-500"
              />
              {fieldErrors.email?.[0] ? (
                <span className="text-xs text-rose-600">{fieldErrors.email[0]}</span>
              ) : null}
            </label>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Password</span>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-10 text-slate-900 outline-none transition focus:border-sky-500"
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
              </label>
              {fieldErrors.password?.[0] ? (
                <span className="text-xs text-rose-600">{fieldErrors.password[0]}</span>
              ) : null}
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all ${
                    strength <= 1 ? "w-1/4 bg-rose-500" : strength === 2 ? "w-2/4 bg-amber-500" : strength === 3 ? "w-3/4 bg-blue-500" : "w-full bg-emerald-500"
                  }`}
                />
              </div>
              <p className="text-xs text-slate-500">Strength: {strength}/4</p>
            </div>

            <label htmlFor="password_confirmation" className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Konfirmasi Password</span>
              <div className="relative">
                <input
                  id="password_confirmation"
                  type={showPasswordConfirmation ? "text" : "password"}
                  value={form.password_confirmation}
                  onChange={(event) => setForm((prev) => ({ ...prev, password_confirmation: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-10 text-slate-900 outline-none transition focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirmation((previous) => !previous)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-700"
                  aria-label={showPasswordConfirmation ? "Sembunyikan konfirmasi password" : "Tampilkan konfirmasi password"}
                >
                  {showPasswordConfirmation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password_confirmation?.[0] ? (
                <span className="text-xs text-rose-600">{fieldErrors.password_confirmation[0]}</span>
              ) : null}
            </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Role</span>
            <select
              value={form.role}
              onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-500"
            >
              <option value="staff">Staff</option>
              <option value="editor">Editor</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </label>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Memproses..." : "Daftar"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-600">
            Sudah punya akun?{" "}
            <Link href="/auth/login" className="font-semibold text-blue-600 hover:underline">
              Login
            </Link>
          </p>
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
