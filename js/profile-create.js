/* =========================
   CRÉATION PROFIL
========================= */

import { supabaseClient } from "./config.js";
import { getUserIP } from "./utils.js";
import { uploadAvatar } from "./avatar-upload.js";

export function initCreateProfile() {
  const createProfileForm = document.getElementById("createProfileForm");
  if (!createProfileForm) return;

  createProfileForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const form = new FormData(createProfileForm);
    const pseudo = form.get("pseudo");
    const age = form.get("age");
    const city = form.get("city");
    const gender = form.get("gender");
    const looking_for = form.get("looking_for");
    const tagline = form.get("tagline");
    const avatarFile = form.get("avatar");
    const errorMsg = document.getElementById("errorMsg");

    if (errorMsg) errorMsg.textContent = "";

    const ip = await getUserIP();
    if (!ip) {
      if (errorMsg) errorMsg.textContent = "Impossible de récupérer votre IP.";
      return;
    }

    const { data: existingProfile } = await supabaseClient
      .from("profiles")
      .select("id")
      .eq("ip_address", ip)
      .maybeSingle();

    if (existingProfile) {
      window.location.href = "edit-profile.html";
      return;
    }

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      if (errorMsg) errorMsg.textContent = "Utilisateur non connecté.";
      return;
    }

    let avatar_url = null;
    try {
      avatar_url = await uploadAvatar(user.id, avatarFile);
    } catch (uploadError) {
      if (errorMsg) errorMsg.textContent = uploadError.message;
      return;
    }

    const { error } = await supabaseClient.from("profiles").insert({
      id: user.id,
      pseudo,
      age: age ? parseInt(age) : null,
      city,
      gender,
      looking_for,
      tagline,
      avatar_url,
      ip_address: ip || null,
      is_premium: false,
      is_verified: false,
      is_banned: false
    });

    if (error) {
      if (errorMsg) errorMsg.textContent = error.message;
      return;
    }

    window.location.href = "liste.html";
  });
}
