"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function savePrediction(matchId: string, predA: number, predB: number) {
  if (predA < 0 || predB < 0) {
    return { error: "Los marcadores no pueden ser negativos." };
  }

  const supabase = await createClient();

  // 1. Get current authenticated user
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) {
    return { error: "No estás autenticado." };
  }

  // 2. Resolve internal user ID
  const { data: dbUser, error: dbUserError } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", authUser.id)
    .single();

  if (dbUserError || !dbUser) {
    return { error: "Error al resolver la información de tu usuario." };
  }

  const userId = dbUser.id;

  // 3. Retrieve match kickoff time
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("kickoff_time, team_a, team_b")
    .eq("id", matchId)
    .single();

  if (matchError || !match) {
    return { error: "El partido especificado no existe." };
  }

  if (!match.kickoff_time) {
    return { error: "La hora de inicio del partido no está definida." };
  }
  const now = new Date();
  const kickoff = new Date(match.kickoff_time);

  if (now >= kickoff) {
    return { 
      error: `El partido entre ${match.team_a} y ${match.team_b} ya comenzó (${kickoff.toLocaleTimeString()}). No se admiten más predicciones.` 
    };
  }

  // 5. Check if prediction exists to determine if this is a modification
  const { data: existingPred } = await supabase
    .from("predictions")
    .select("id, penalty")
    .eq("user_id", userId)
    .eq("match_id", matchId)
    .maybeSingle();

  let penalty = 0;
  if (existingPred) {
    penalty = (existingPred.penalty || 0) + 3;
  }

  // 6. Upsert prediction (Unique constraint unique_user_match handles conflicts)
  const { error: upsertError } = await supabase
    .from("predictions")
    .upsert(
      {
        user_id: userId,
        match_id: matchId,
        pred_a: predA,
        pred_b: predB,
        penalty: penalty
      },
      { onConflict: "user_id,match_id" }
    );

  if (upsertError) {
    return { error: `Error al guardar la predicción: ${upsertError.message}` };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
