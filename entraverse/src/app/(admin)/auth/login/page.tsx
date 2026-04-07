"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { authApi } from "@/lib/api/auth";
import { persistAuthToken } from "@/lib/axios";
import { setStoredAdmin } from "@/lib/utils/storage";

type LoginFormValues = {
  email: string;
  password: string;
};

export default function AdminLoginPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues): Promise<void> => {
    try {
      const response = await authApi.login({ ...values, remember: false });
      const data = response.data;
      persistAuthToken(data.token, false, data.expires_in, data.refresh_token);
      setStoredAdmin(data.admin);
      router.push("/admin/dashboard");
    } catch (error) {
      setError("root", {
        message: error instanceof Error ? error.message : "Login gagal.",
      });
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mx-auto mb-6 flex w-fit flex-col gap-1" aria-hidden>
          <span className="h-1 w-12 rounded-full bg-sky-500" />
          <span className="h-1 w-12 rounded-full bg-emerald-500" />
          <span className="h-1 w-12 rounded-full bg-indigo-500" />
        </div>

        <h1 className="mb-8 text-center text-3xl font-semibold tracking-tight text-slate-900">
          Selamat Datang
        </h1>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-sky-500"
              {...register("email", {
                required: "Email wajib diisi",
                pattern: {
                  value: /^\S+@\S+$/i,
                  message: "Format email tidak valid",
                },
              })}
            />
            {errors.email ? (
              <p className="text-xs text-red-600">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Kata Sandi
            </label>
            <input
              id="password"
              type="password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-sky-500"
              {...register("password", {
                required: "Kata sandi wajib diisi",
              })}
            />
            {errors.password ? (
              <p className="text-xs text-red-600">{errors.password.message}</p>
            ) : null}
          </div>

          {errors.root?.message ? (
            <p className="text-sm text-red-600">{errors.root.message}</p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link href="#" className="text-sm font-medium text-sky-600 hover:underline">
            Lupa Password?
          </Link>
        </div>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-sm text-slate-500">atau</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="space-y-3">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <path
                fill="#EA4335"
                d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.5 14.6 2.6 12 2.6 6.9 2.6 2.8 6.7 2.8 11.8S6.9 21 12 21c6.9 0 9.1-4.8 9.1-7.3 0-.5 0-.9-.1-1.3H12z"
              />
              <path
                fill="#34A853"
                d="M2.8 7.3l3.2 2.3c.9-1.7 2.7-2.9 4.9-2.9 1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.5 14.6 2.6 12 2.6c-3.5 0-6.5 2-8 4.7z"
              />
              <path
                fill="#FBBC05"
                d="M12 21c2.5 0 4.6-.8 6.2-2.3l-2.9-2.4c-.8.5-1.9.9-3.3.9-2.6 0-4.7-1.7-5.5-4L3.2 15.7C4.7 18.7 8.1 21 12 21z"
              />
              <path
                fill="#4285F4"
                d="M21.1 13.7c0-.5 0-.9-.1-1.3H12v3.9h5.5c-.3 1.4-1.1 2.5-2.2 3.2l2.9 2.4c1.7-1.6 2.9-4 2.9-8.2z"
              />
            </svg>
            Masuk dengan Google
          </button>

          <button
            type="button"
            className="w-full rounded-lg bg-sky-100 px-4 py-2.5 text-sm font-medium text-sky-700 transition hover:bg-sky-200"
          >
            Masuk sebagai Tamu
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          Belum punya akun?{" "}
          <Link href="#" className="font-medium text-sky-600 hover:underline">
            Daftar sekarang
          </Link>
        </p>
      </section>
    </main>
  );
}
