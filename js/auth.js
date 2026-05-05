/* =========================
   AUTH / SESSION
========================= */

import { supabaseClient } from "./config.js";
import { state, setCurrentUserId } from "./core.js";

export async function autoLogin() {
  const { data: session } = await supabaseClient.auth.getSession();
  if (!session.session) await supabaseClient.auth.signInAnonymously();
}

export async function initCurrentUser() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  setCurrentUserId(user?.id || null);
}

export async function checkExistingProfile() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_banned) {
    alert("Votre compte a été banni.");
    document.body.innerHTML = "<h1>Compte banni</h1>";
    return;
  }

  if (profile && window.location.pathname.includes("create-profile.html")) {
    window.location.href = "edit-profile.html";
  }
}

export async function getCurrentProfile() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return profile;
}

export function initHomeRedirect() {
  document.addEventListener("DOMContentLoaded", async () => {
    if (!window.location.pathname.includes("index.html")) return;
    const profile = await getCurrentProfile();
    window.location.href = profile ? "liste.html" : "create-profile.html";
  });
}
