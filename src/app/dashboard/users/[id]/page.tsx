"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { updateUserAvatar } from "@/app/actions/auth";
import {
  ArrowLeft,
  Trophy,
  Gamepad2,
  Lock,
  Calendar,
  AlertCircle,
  Loader2,
  User,
  CheckCircle2,
  Camera
} from "lucide-react";

type UserProfile = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  is_admin?: boolean;
  total_points?: number;
  avatar_url?: string | null;
};

type Match = {
  id: string;
  match_date: string;
  kickoff_time: string;
  team_a: string;
  team_b: string;
  score_a: number | null;
  score_b: number | null;
  is_calculated: boolean;
};

type PredictionWithMatch = {
  match_id: string;
  pred_a: number;
  pred_b: number;
  points: number;
  penalty: number;
  match: Match;
};

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const targetUserId = params.id as string;

  // DB States
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [targetUserProfile, setTargetUserProfile] = useState<UserProfile | null>(null);
  const [predictions, setPredictions] = useState<PredictionWithMatch[]>([]);
  const [countriesMap, setCountriesMap] = useState<Record<string, string>>({});

  // UI / Loading / Access States
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const compressImage = (file: File, maxW = 1024, maxH = 1024, quality = 0.7): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) {
        resolve(file);
        return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = document.createElement("img");
        img.src = event.target?.result as string;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxW) {
              height = Math.round((height * maxW) / width);
              width = maxW;
            }
          } else {
            if (height > maxH) {
              width = Math.round((width * maxH) / height);
              height = maxH;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(file);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            quality
          );
        };
        img.onerror = () => reject(new Error("Image load failed"));
      };
      reader.onerror = () => reject(new Error("File read failed"));
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const compressedBlob = await compressImage(file);
      const fileExt = "jpg";
      const fileName = `avatar_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${currentUserProfile?.id || "anon"}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("trash-talk")
        .upload(filePath, compressedBlob, {
          contentType: "image/jpeg"
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        alert(`Error de almacenamiento: ${uploadError.message}`);
        setIsUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("trash-talk")
        .getPublicUrl(filePath);

      // Save to database
      const res = await updateUserAvatar(publicUrl);
      if (res.error) {
        alert(res.error);
      } else {
        // Update local state dynamically
        setTargetUserProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
        setCurrentUserProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      }
    } catch (err) {
      console.error(err);
      alert("Error al subir la imagen.");
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndVerifyAccess();
  }, [targetUserId]);

  const fetchProfileAndVerifyAccess = async () => {
    setIsLoading(true);
    setErrorMsg("");
    setAccessDenied(false);

    try {
      // 1. Get current auth session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      // 2. Get current user profile in database
      const { data: currUser, error: currUserError } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", session.user.id)
        .single();

      if (currUserError || !currUser) {
        setErrorMsg("No se pudo verificar tu cuenta de usuario.");
        setIsLoading(false);
        return;
      }

      setCurrentUserProfile(currUser as UserProfile);

      // 3. Check if target user exists
      const { data: targetUser, error: targetUserError } = await supabase
        .from("users")
        .select("*")
        .eq("id", targetUserId)
        .maybeSingle();

      if (targetUserError || !targetUser) {
        setErrorMsg("El usuario especificado no existe.");
        setIsLoading(false);
        return;
      }

      setTargetUserProfile(targetUser as UserProfile);

      // 4. Verification: Are they the same user or do they share at least one league?
      let isAllowed = currUser.id === targetUserId;

      if (!isAllowed) {
        // Query leagues the current user belongs to
        const { data: currentLeagues } = await supabase
          .from("league_members")
          .select("league_id")
          .eq("user_id", currUser.id);

        const myLeagueIds = currentLeagues?.map((m) => m.league_id) || [];

        if (myLeagueIds.length > 0) {
          // Check if target user is in any of these leagues
          const { data: sharedLeagues } = await supabase
            .from("league_members")
            .select("league_id")
            .eq("user_id", targetUserId)
            .in("league_id", myLeagueIds);

          if (sharedLeagues && sharedLeagues.length > 0) {
            isAllowed = true;
          }
        }
      }

      if (!isAllowed) {
        setAccessDenied(true);
        setIsLoading(false);
        return;
      }

      // 5. User has access! Fetch countries map for flag urls
      const { data: countriesData } = await supabase
        .from("countries")
        .select("name, flag_url");

      const cmap: Record<string, string> = {};
      if (countriesData) {
        countriesData.forEach((c) => {
          if (c.name) cmap[c.name] = c.flag_url || "";
        });
      }
      setCountriesMap(cmap);

      // 6. Fetch target user predictions that correspond to calculated matches
      const { data: predsData, error: predsError } = await supabase
        .from("predictions")
        .select(`
          match_id,
          pred_a,
          pred_b,
          points,
          penalty,
          matches (
            id,
            team_a,
            team_b,
            score_a,
            score_b,
            kickoff_time,
            match_date,
            is_calculated
          )
        `)
        .eq("user_id", targetUserId);

      if (predsError) {
        console.error("Error fetching predictions", predsError);
      }

      if (predsData) {
        // Calculate total points dynamically from all predictions to guarantee correct points display
        const computedTotalPoints = predsData.reduce(
          (sum: number, p: any) => sum + (p.points || 0) - (p.penalty || 0),
          0
        );
        setTargetUserProfile(prev => prev ? { ...prev, total_points: computedTotalPoints } : null);

        // Filter predictions where matches exist and is_calculated is true
        const parsedPreds: PredictionWithMatch[] = (predsData || [])
          .filter((p: any) => p.matches && p.matches.is_calculated)
          .map((p: any) => ({
            match_id: p.match_id,
            pred_a: p.pred_a,
            pred_b: p.pred_b,
            points: p.points || 0,
            penalty: p.penalty || 0,
            match: p.matches as Match
          }))
          .sort((a, b) => new Date(b.match.kickoff_time).getTime() - new Date(a.match.kickoff_time).getTime());

        setPredictions(parsedPreds);
      }

    } catch (err: any) {
      console.error(err);
      setErrorMsg("Ocurrió un error inesperado al cargar el perfil.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderFlagCircle = (teamName: string, sizeClass = "w-6 h-6 text-[10px]") => {
    const flagUrl = countriesMap[teamName];
    if (flagUrl) {
      return (
        <img
          src={flagUrl}
          alt={teamName}
          className={`${sizeClass} rounded-full object-cover border border-slate-200 shrink-0 shadow-sm`}
        />
      );
    }
    return (
      <div className={`${sizeClass} rounded-full bg-slate-100 border border-slate-200 text-slate-500 font-extrabold uppercase flex items-center justify-center shrink-0 shadow-sm select-none`}>
        {teamName.substring(0, 2)}
      </div>
    );
  };

  const calculateDetailPoints = (pred: PredictionWithMatch) => {
    const rA = pred.match.score_a || 0;
    const rB = pred.match.score_b || 0;
    const pA = pred.pred_a;
    const pB = pred.pred_b;

    const realDiff = rA - rB;
    const predDiff = pA - pB;
    const realResult = realDiff > 0 ? "A" : realDiff < 0 ? "B" : "TIE";
    const predResult = predDiff > 0 ? "A" : predDiff < 0 ? "B" : "TIE";

    const hasTendency = realResult === predResult;
    const hasDiff = hasTendency && realDiff === predDiff;
    const hasLocalG = pA === rA;
    const hasVisitorG = pB === rB;

    return {
      hasTendency,
      hasDiff,
      hasLocalG,
      hasVisitorG
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center select-none">
        <Loader2 className="w-10 h-10 text-violet-700 animate-spin" />
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest mt-4">
          Cargando Perfil...
        </span>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-lg text-center flex flex-col items-center gap-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <h2 className="text-xl font-black text-slate-800 uppercase">Error</h2>
          <p className="text-sm font-semibold text-slate-500">{errorMsg}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full mt-2 py-3 bg-violet-700 hover:bg-violet-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-lg text-center flex flex-col items-center gap-4 select-none">
          <Lock className="w-12 h-12 text-red-500 animate-pulse" />
          <h2 className="text-xl font-black text-red-600 uppercase tracking-tight">Acceso Denegado</h2>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 leading-relaxed">
            No compartes ninguna liga con este usuario. Por políticas de privacidad, solo puedes ver predicciones de competidores con los que compartas al menos un grupo.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full mt-2 py-3 bg-violet-700 hover:bg-violet-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  const isMe = currentUserProfile?.id === targetUserProfile?.id;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-10">
      {/* HEADER SECTION */}
      <header className="bg-white border-b border-slate-100 px-4 sm:px-6 py-4 sticky top-0 z-40 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-xs font-black text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400" />
            <span>Volver</span>
          </button>

          <div className="bg-violet-700 text-white px-4 py-1.5 rounded-full inline-flex items-center gap-2 font-black tracking-tighter text-xs border border-violet-850 shadow-sm select-none">
            <span className="text-orange-400">✦</span>
            <span>MUNDIALARIO</span>
            <span className="text-orange-400">✦</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* USER PROFILE INFO CARD */}
        <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            {isMe ? (
              <div 
                className="relative w-16 h-16 rounded-full overflow-hidden group border border-slate-200 shadow-sm cursor-pointer shrink-0"
                onClick={() => document.getElementById("avatar-input")?.click()}
                title="Cambiar foto de perfil"
              >
                {targetUserProfile?.avatar_url ? (
                  <img
                    src={targetUserProfile.avatar_url}
                    alt={targetUserProfile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-violet-100 text-violet-850 flex items-center justify-center font-black text-2xl">
                    {targetUserProfile?.name?.[0]?.toUpperCase() || ""}
                  </div>
                )}
                
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-5 h-5 text-white/90" />
                </div>

                {isUploading && (
                  <div className="absolute inset-0 bg-white/75 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                  </div>
                )}
                
                <input
                  type="file"
                  id="avatar-input"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={isUploading}
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full overflow-hidden border border-slate-200 shadow-sm shrink-0">
                {targetUserProfile?.avatar_url ? (
                  <img
                    src={targetUserProfile.avatar_url}
                    alt={targetUserProfile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-violet-100 text-violet-850 flex items-center justify-center font-black text-2xl">
                    {targetUserProfile?.name?.[0]?.toUpperCase() || ""}
                  </div>
                )}
              </div>
            )}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                  {targetUserProfile?.name}
                </h2>
                {isMe && (
                  <span className="bg-violet-100 text-violet-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider self-center sm:self-auto">
                    Tú
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">
                ID: {targetUserProfile?.id}
              </p>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider flex items-center gap-1 justify-center sm:justify-start">
                <Calendar className="w-3.5 h-3.5" />
                Registrado el {new Date(targetUserProfile?.created_at || "").toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric"
                })}
              </p>
            </div>
          </div>

          <div className="bg-violet-50 border border-violet-100 rounded-2xl px-6 py-4 flex flex-col items-center shrink-0 shadow-xs">
            <Trophy className="w-6 h-6 text-violet-700 animate-bounce mb-1" />
            <span className="text-[10px] text-violet-600 font-black uppercase tracking-wider">Puntaje Total</span>
            <span className="text-2xl font-black text-violet-800 mt-1">
              {targetUserProfile?.total_points || 0} pts
            </span>
          </div>
        </section>

        {/* COMPLETED PREDICTIONS LIST */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-violet-700" />
              <span>Pronósticos Calculados ({predictions.length})</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Solo partidos completados
            </span>
          </div>

          {predictions.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-400 font-semibold shadow-sm select-none">
              Aún no se han completado ni calculado partidos pronosticados por este usuario.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {predictions.map((pred) => {
                const details = calculateDetailPoints(pred);
                const earnedPoints = pred.points;
                const penaltyPoints = pred.penalty;
                const kickoffDate = new Date(pred.match.kickoff_time);

                return (
                  <div
                    key={pred.match_id}
                    className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    {/* Upper Match Meta */}
                    <div className="flex justify-between items-center text-[9px] font-bold uppercase select-none tracking-wider text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {kickoffDate.toLocaleDateString("es-ES", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                      <span className="text-lime-700 bg-lime-50 px-2 py-0.5 rounded border border-lime-100 flex items-center gap-1 font-extrabold uppercase">
                        <CheckCircle2 className="w-3 h-3 text-lime-600" /> Calculado
                      </span>
                    </div>

                    {/* Comparison Board */}
                    <div className="grid grid-cols-3 gap-2 items-center py-2 select-none">
                      {/* Team A */}
                      <div className="flex flex-col items-center gap-1 text-center min-w-0">
                        {renderFlagCircle(pred.match.team_a, "w-8 h-8 text-[11px]")}
                        <span className="font-extrabold text-sm text-slate-800 truncate w-full">
                          {pred.match.team_a}
                        </span>
                        <div className="flex flex-col items-center">
                          <span className="text-slate-400 text-[8px] font-bold uppercase">Pronóstico</span>
                          <span className="text-base font-black text-slate-500">{pred.pred_a >= 0 ? pred.pred_a : "-"}</span>
                        </div>
                      </div>

                      {/* Official score */}
                      <div className="flex flex-col items-center justify-center gap-1 shrink-0">
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase">Resultado</span>
                        <div className="bg-slate-100 border border-slate-200 px-3 py-1 rounded-2xl font-black text-slate-800 text-lg">
                          {pred.match.score_a} - {pred.match.score_b}
                        </div>
                      </div>

                      {/* Team B */}
                      <div className="flex flex-col items-center gap-1 text-center min-w-0">
                        {renderFlagCircle(pred.match.team_b, "w-8 h-8 text-[11px]")}
                        <span className="font-extrabold text-sm text-slate-800 truncate w-full">
                          {pred.match.team_b}
                        </span>
                        <div className="flex flex-col items-center">
                          <span className="text-slate-400 text-[8px] font-bold uppercase">Pronóstico</span>
                          <span className="text-base font-black text-slate-500">{pred.pred_b >= 0 ? pred.pred_b : "-"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Points Breakdown details */}
                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      {pred.pred_a >= 0 ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="bg-violet-100 text-violet-800 px-3 py-1 rounded-full font-black text-xs inline-flex items-center gap-1">
                              <Trophy className="w-3.5 h-3.5 text-violet-700" />
                              <span>+{earnedPoints} pts ganados</span>
                            </span>
                            {penaltyPoints > 0 && (
                              <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-extrabold text-[10px] border border-red-100">
                                Modif: -{penaltyPoints} pts
                              </span>
                            )}
                          </div>

                          <div className="text-[9px] text-slate-400 font-bold uppercase space-y-0.5 text-right">
                            <div>Tendencia: {details.hasTendency ? "✅ +2" : "❌"}</div>
                            <div>Dif. Goles: {details.hasDiff ? "✅ +1" : "❌"}</div>
                            <div>Goles exactos: {(details.hasLocalG ? 1 : 0) + (details.hasVisitorG ? 1 : 0)}/2</div>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center gap-2 w-full py-1">
                          <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full font-black text-xs inline-flex items-center gap-1 border border-red-100">
                            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                            <span>Sin Pronóstico (-1 pt de penalización)</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
