import { supabaseClient } from "./config.js";

export async function requireAdmin() {
  const { data: { user } } = await supabaseClient.auth.getUser();

  if (!user) {
    window.location.href = "index.html";
    return false;
  }

  // 🔥 Vérifie le rôle dans profiles
  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    alert("Accès refusé (admin uniquement)");
    window.location.href = "index.html";
    return false;
  }

  return true;
}