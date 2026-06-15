"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// Helper to generate a random 6-character alphanumeric invite code
function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper to generate a custom League ID (LGA-XXXXXX)
function generateLeagueId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "LGA-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function createLeague(name: string, isPublic = false) {
  if (!name || name.trim().length < 3) {
    return { error: "El nombre de la liga debe tener al menos 3 caracteres." };
  }

  const supabase = await createClient();

  // 1. Get current authenticated user
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) {
    return { error: "No estás autenticado." };
  }

  // 2. Resolve internal user ID (Format: USR-XXX)
  const { data: dbUser, error: dbUserError } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", authUser.id)
    .single();

  if (dbUserError || !dbUser) {
    return { error: "Error al resolver la información de tu usuario." };
  }

  const userId = dbUser.id;

  // 3. Generate custom league ID and unique invite code
  const leagueId = generateLeagueId();
  let inviteCode = generateInviteCode();

  // Keep generating if invite code collides (unlikely but safe)
  let codeUnique = false;
  let attempts = 0;
  while (!codeUnique && attempts < 5) {
    const { data: existing } = await supabase
      .from("leagues")
      .select("id")
      .eq("invite_code", inviteCode)
      .maybeSingle();

    if (!existing) {
      codeUnique = true;
    } else {
      inviteCode = generateInviteCode();
      attempts++;
    }
  }

  // 4. Create the league
  const { error: leagueError } = await supabase
    .from("leagues")
    .insert({
      id: leagueId,
      name: name.trim(),
      invite_code: inviteCode,
      owner_id: userId,
      is_public: isPublic
    });

  if (leagueError) {
    return { error: `Error al crear la liga: ${leagueError.message}` };
  }

  // 5. Automatically join the creator to the league
  const { error: memberError } = await supabase
    .from("league_members")
    .insert({
      league_id: leagueId,
      user_id: userId,
    });

  if (memberError) {
    return { error: `Error al agregarte a la liga: ${memberError.message}` };
  }

  revalidatePath("/dashboard");
  return { success: true, leagueId, inviteCode };
}

export async function joinLeague(inviteCode: string) {
  const code = inviteCode?.trim().toUpperCase();
  if (!code || code.length !== 6) {
    return { error: "El código de invitación debe ser de 6 caracteres." };
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

  // 3. Find league by invite code
  const { data: league, error: leagueError } = await supabase
    .from("leagues")
    .select("id, name")
    .eq("invite_code", code)
    .maybeSingle();

  if (leagueError || !league) {
    return { error: "No se encontró ninguna liga con este código de invitación." };
  }

  // 4. Check if already a member
  const { data: member } = await supabase
    .from("league_members")
    .select("league_id")
    .eq("league_id", league.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (member) {
    return { error: "Ya eres miembro de esta liga." };
  }

  // 5. Join the league
  const { error: joinError } = await supabase
    .from("league_members")
    .insert({
      league_id: league.id,
      user_id: userId,
    });

  if (joinError) {
    return { error: `Error al unirte a la liga: ${joinError.message}` };
  }

  revalidatePath("/dashboard");
  return { success: true, leagueName: league.name };
}

export async function getPublicLeagues() {
  const supabase = await createClient();

  try {
    // 1. Get current authenticated user to exclude leagues they are already in
    const { data: { user: authUser } } = await supabase.auth.getUser();
    let userId = "";
    if (authUser) {
      const { data: dbUser } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", authUser.id)
        .maybeSingle();
      if (dbUser) userId = dbUser.id;
    }

    // 2. Get all public leagues and their members count
    const { data, error } = await supabase
      .from("leagues")
      .select(`
        id,
        name,
        invite_code,
        owner_id,
        created_at,
        league_members (
          user_id
        )
      `)
      .eq("is_public", true);

    if (error) {
      return { error: `Error al obtener ligas públicas: ${error.message}` };
    }

    // Filter out leagues where current user is already a member
    const filteredLeagues = (data || [])
      .filter((league: any) => {
        const members = league.league_members || [];
        return !members.some((m: any) => m.user_id === userId);
      })
      .map((league: any) => ({
        id: league.id,
        name: league.name,
        invite_code: league.invite_code,
        owner_id: league.owner_id,
        created_at: league.created_at,
        member_count: league.league_members?.length || 0
      }));

    return { success: true, leagues: filteredLeagues };
  } catch (err: any) {
    return { error: err.message || "Error al obtener ligas públicas." };
  }
}

export async function joinPublicLeague(leagueId: string) {
  if (!leagueId) {
    return { error: "El ID de la liga es obligatorio." };
  }

  const supabase = await createClient();

  try {
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

    // 3. Find public league
    const { data: league, error: leagueError } = await supabase
      .from("leagues")
      .select("id, name, is_public")
      .eq("id", leagueId)
      .maybeSingle();

    if (leagueError || !league) {
      return { error: "No se encontró la liga especificada." };
    }

    if (!league.is_public) {
      return { error: "Esta liga es privada y requiere código de invitación para unirse." };
    }

    // 4. Check if already a member
    const { data: member } = await supabase
      .from("league_members")
      .select("league_id")
      .eq("league_id", league.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (member) {
      return { error: "Ya eres miembro de esta liga." };
    }

    // 5. Join the league
    const { error: joinError } = await supabase
      .from("league_members")
      .insert({
        league_id: league.id,
        user_id: userId,
      });

    if (joinError) {
      return { error: `Error al unirte a la liga: ${joinError.message}` };
    }

    revalidatePath("/dashboard");
    return { success: true, leagueName: league.name };
  } catch (err: any) {
    return { error: err.message || "Error al unirte a la liga pública." };
  }
}
