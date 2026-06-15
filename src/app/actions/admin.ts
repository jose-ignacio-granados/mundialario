"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// Helper to generate a custom Match ID (MTCH-XXXXXX)
function generateMatchId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "MTCH-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper to verify admin role
async function verifyAdmin(supabase: any) {
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) {
    throw new Error("No autenticado.");
  }

  const { data: dbUser, error: dbUserError } = await supabase
    .from("users")
    .select("is_admin")
    .eq("auth_id", authUser.id)
    .single();

  if (dbUserError || !dbUser || !dbUser.is_admin) {
    throw new Error("Acceso denegado. No tienes permisos de administrador.");
  }

  return dbUser;
}

export async function createMatch(matchDate: string, kickoffTime: string, teamA: string, teamB: string) {
  if (!matchDate || !kickoffTime || !teamA || !teamB) {
    return { error: "Todos los campos del partido son obligatorios." };
  }

  if (teamA.trim() === teamB.trim()) {
    return { error: "Los equipos local y visitante no pueden ser iguales." };
  }

  const supabase = await createClient();

  try {
    await verifyAdmin(supabase);

    // Auto-create countries if they do not exist
    const { data: countryA } = await supabase
      .from("countries")
      .select("id")
      .eq("name", teamA.trim())
      .maybeSingle();

    if (!countryA) {
      await supabase
        .from("countries")
        .insert({ name: teamA.trim(), flag_url: null });
    }

    const { data: countryB } = await supabase
      .from("countries")
      .select("id")
      .eq("name", teamB.trim())
      .maybeSingle();

    if (!countryB) {
      await supabase
        .from("countries")
        .insert({ name: teamB.trim(), flag_url: null });
    }

    const matchId = generateMatchId();

    const { error } = await supabase
      .from("matches")
      .insert({
        id: matchId,
        match_date: matchDate,
        kickoff_time: kickoffTime,
        team_a: teamA.trim(),
        team_b: teamB.trim(),
        score_a: null,
        score_b: null,
        is_calculated: false
      });

    if (error) {
      return { error: `Error al crear partido: ${error.message}` };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/admin");
    return { success: true, matchId };
  } catch (err: any) {
    return { error: err.message || "Error al verificar permisos de administrador." };
  }
}

export async function updateMatchScore(matchId: string, scoreA: number, scoreB: number) {
  if (scoreA < 0 || scoreB < 0) {
    return { error: "Los marcadores de los partidos no pueden ser negativos." };
  }

  const supabase = await createClient();

  try {
    await verifyAdmin(supabase);

    const { error } = await supabase
      .from("matches")
      .update({
        score_a: scoreA,
        score_b: scoreB,
        is_calculated: false // Reset points calculations flag so points can be re-run
      })
      .eq("id", matchId);

    if (error) {
      return { error: `Error al registrar marcador: ${error.message}` };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/admin");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Error al verificar permisos de administrador." };
  }
}

export async function calculateMatchPointsAction(matchId: string) {
  const supabase = await createClient();

  try {
    await verifyAdmin(supabase);

    // Call stored procedure calculate_match_points(p_match_id)
    const { error } = await supabase.rpc("calculate_match_points", {
      p_match_id: matchId
    });

    if (error) {
      return { error: `Error al calcular puntos de predicciones: ${error.message}` };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/admin");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Error al verificar permisos de administrador." };
  }
}

export async function getCountries() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("countries")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return { error: `Error al obtener países: ${error.message}` };
  }
  return { success: true, countries: data || [] };
}

export async function saveCountry(name: string, flagUrl: string) {
  if (!name.trim()) {
    return { error: "El nombre del país es obligatorio." };
  }

  const supabase = await createClient();

  try {
    await verifyAdmin(supabase);

    const { error } = await supabase
      .from("countries")
      .upsert(
        {
          name: name.trim(),
          flag_url: flagUrl.trim() || null
        },
        { onConflict: "name" }
      );

    if (error) {
      return { error: `Error al guardar país: ${error.message}` };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/admin");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Error al verificar permisos de administrador." };
  }
}

export async function editMatchDetails(
  matchId: string,
  teamA: string,
  teamB: string,
  matchDate: string,
  kickoffTime: string,
  scoreA: number | null,
  scoreB: number | null
) {
  if (!matchId || !teamA || !teamB || !matchDate || !kickoffTime) {
    return { error: "Todos los campos obligatorios del partido deben ser provistos." };
  }

  if (teamA.trim() === teamB.trim()) {
    return { error: "Los equipos local y visitante no pueden ser iguales." };
  }

  const supabase = await createClient();

  try {
    await verifyAdmin(supabase);

    // Auto-create countries if they do not exist
    const { data: countryA } = await supabase
      .from("countries")
      .select("id")
      .eq("name", teamA.trim())
      .maybeSingle();

    if (!countryA) {
      await supabase
        .from("countries")
        .insert({ name: teamA.trim(), flag_url: null });
    }

    const { data: countryB } = await supabase
      .from("countries")
      .select("id")
      .eq("name", teamB.trim())
      .maybeSingle();

    if (!countryB) {
      await supabase
        .from("countries")
        .insert({ name: teamB.trim(), flag_url: null });
    }

    // Fetch existing match details to check if score is modified
    const { data: existingMatch } = await supabase
      .from("matches")
      .select("score_a, score_b, is_calculated")
      .eq("id", matchId)
      .single();

    let shouldResetCalculation = false;
    if (existingMatch) {
      const scoreChanged = existingMatch.score_a !== scoreA || existingMatch.score_b !== scoreB;
      if (scoreChanged) {
        shouldResetCalculation = true;
      }
    }

    const updateData: any = {
      team_a: teamA.trim(),
      team_b: teamB.trim(),
      match_date: matchDate,
      kickoff_time: kickoffTime,
      score_a: scoreA,
      score_b: scoreB,
    };

    if (shouldResetCalculation) {
      updateData.is_calculated = false;
    }

    const { error } = await supabase
      .from("matches")
      .update(updateData)
      .eq("id", matchId);

    if (error) {
      return { error: `Error al modificar partido: ${error.message}` };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/admin");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Error al verificar permisos de administrador." };
  }
}
