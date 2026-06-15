"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updatePasswordAction } from "@/app/actions/auth";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, Lock } from "lucide-react";

const initialState = {
  error: "",
  success: false,
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updatePasswordAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        router.push("/login");
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [state?.success, router]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden bg-slate-50">
      {/* Background Image Cover */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none">
        <Image
          src="/mudialario.png"
          alt="Mundialario Background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-white/20" />
      </div>

      <div className="w-full max-w-md space-y-8 bg-white/95 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-slate-200 relative overflow-hidden z-10">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-orange-500 to-lime-400" />
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-purple-500/10 rounded-full blur-xl" />
        <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-lime-400/15 rounded-full blur-xl" />

        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-red-500 text-white font-extrabold text-xl shadow-md shadow-purple-500/20 mb-4 tracking-tight">
            M
          </div>
          
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-1">
            Nueva Contraseña
          </h1>
          <p className="text-sm text-slate-400">
            Ingresa y confirma tu nueva contraseña de acceso
          </p>
        </div>

        {state?.success ? (
          <div className="mt-8 space-y-6 text-center animate-in zoom-in duration-300">
            <style>{`
              @keyframes progress {
                0% { width: 0%; }
                100% { width: 100%; }
              }
              .animate-progress {
                animation: progress 3.5s linear forwards;
              }
            `}</style>
            <div className="w-16 h-16 bg-lime-50 border border-lime-100 text-lime-600 rounded-full flex items-center justify-center mx-auto text-2xl shadow-sm animate-bounce">
              🔒
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">¡Contraseña Guardada!</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Tu contraseña ha sido restablecida correctamente. Redirigiéndote al inicio de sesión...
              </p>
            </div>
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-violet-700 rounded-full animate-progress" />
            </div>
          </div>
        ) : (
          <form action={formAction} className="mt-8 space-y-4">
            {state?.error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2">
                <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{state.error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Nueva Contraseña
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer"
                  title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Confirmar Nueva Contraseña
              </label>
              <div className="relative">
                <input
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer"
                  title={showConfirmPassword ? "Ocultar contraseña" : "Ver contraseña"}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-red-500 hover:from-purple-500 hover:to-red-400 shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isPending ? "Restableciendo..." : "Restablecer Contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
