import { supabaseClient } from "./config.js";

export async function requireAdmin() {
  // 🔹 Récupère l'utilisateur connecté
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

  if (userError) {
    console.error("Erreur getUser:", userError);
  }

  if (!user) {
    console.warn("Aucun utilisateur connecté → redirection");
    window.location.href = "index.html";
    return false;
  }

  // 🔹 Vérifie le rôle dans la table profiles
  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Erreur chargement profil:", profileError);
    alert("Erreur interne. Impossible de vérifier votre rôle.");
    window.location.href = "index.html";
    return false;
  }

  // 🔥 Si pas de profil OU pas admin → accès refusé
  if (!profile || profile.role !== "admin") {
    alert("Accès refusé (admin uniquement)");
    window.location.href = "index.html";
    return false;
  }

  // 🔥 L'utilisateur est admin → OK
  return true;
}
