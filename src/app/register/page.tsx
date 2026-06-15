"use client";

import { useActionState, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { registerUser } from "@/app/actions/auth";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";

const initialState = {
  error: "",
  success: false,
};

// Custom particle celebration emitter
const SuccessCelebration = () => {
  const particles = Array.from({ length: 45 }).map((_, i) => {
    const isBall = i % 4 === 0;
    const colors = ["bg-red-500", "bg-lime-400", "bg-violet-600", "bg-orange-500", "bg-blue-500"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const delay = Math.random() * 2.5;
    const duration = 2.5 + Math.random() * 3.5;
    return { id: i, isBall, color: randomColor, left, delay, duration };
  });

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden select-none">
      <style>{`
        @keyframes fall {
          0% {
            transform: translateY(-50px) rotate(0deg);
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: 0;
          }
        }
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-fall {
          animation-name: fall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .animate-progress {
          animation: progress 3.5s linear forwards;
        }
      `}</style>
      {particles.map(p => (
        <div
          key={p.id}
          className={`absolute -top-12 animate-fall ${p.isBall ? "" : `${p.color} w-3 h-3 rounded-sm`}`}
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        >
          {p.isBall ? (
            <div className="animate-spin text-3xl" style={{ animationDuration: "2s" }}>
              ⚽
            </div>
          ) : (
            <div className="w-full h-full transform rotate-45" />
          )}
        </div>
      ))}
    </div>
  );
};

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("invite") || "";
  const [state, formAction, isPending] = useActionState(registerUser, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        router.push("/dashboard");
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [state?.success, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Image Cover (Full opacity, crisp details) */}
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
        {/* Decorative accents */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-orange-500 to-lime-400" />
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-purple-500/10 rounded-full blur-xl" />
        <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-lime-400/15 rounded-full blur-xl" />

        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-red-500 text-white font-extrabold text-xl shadow-md shadow-purple-500/20 mb-4 tracking-tight">
            M
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-1">
            Crear Cuenta
          </h1>
          <p className="text-sm text-slate-400">
            Únete a Mundialario y compite con tus amigos
          </p>
        </div>

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
              Nombre de Usuario
            </label>
            <input
              name="name"
              type="text"
              required
              placeholder="Ej. golazo10"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Correo Electrónico
            </label>
            <input
              name="email"
              type="email"
              required
              placeholder="tu@correo.com"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Contraseña
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
              Confirmar Contraseña
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

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Código de Liga (Opcional)
            </label>
            <input
              name="leagueCode"
              type="text"
              maxLength={6}
              defaultValue={inviteCode}
              placeholder="Ej. A1B2C3"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all uppercase"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPending ? "Registrando..." : "Registrarse"}
          </button>

          <p className="text-center text-xs text-slate-400 mt-4">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="font-semibold text-purple-600 hover:text-purple-500">
              Inicia sesión aquí
            </Link>
          </p>
        </form>
      </div>

      {/* Success Celebration Modal Overlay */}
      {state?.success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <SuccessCelebration />
          <div className="bg-white p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl border border-slate-100 flex flex-col items-center gap-4 animate-in zoom-in duration-300">
            <div className="text-5xl animate-bounce">🏆</div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">¡Registro Exitoso!</h2>
            <p className="text-sm text-slate-500 font-semibold leading-relaxed">
              Te has registrado en Mundialario con éxito. Serás redirigido al panel en unos segundos...
            </p>
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-violet-700 rounded-full animate-progress" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm font-semibold">Cargando formulario...</p>
        </div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
