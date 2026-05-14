/* =========================
   CRÉATION PROFIL
========================= */

import { supabaseClient } from "./config.js";
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

    const {
      data: { user },
      error: userError
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      if (errorMsg) errorMsg.textContent = "Utilisateur non connecté.";
      return;
    }

    let avatar_url = null;

    try {
      if (avatarFile && avatarFile.size > 0) {
        avatar_url = await uploadAvatar(user.id, avatarFile);
      }
    } catch (uploadError) {
      console.warn("Avatar non envoyé :", uploadError.message);
      avatar_url = null;
    }

    const { error } = await supabaseClient.from("profiles").upsert({
      id: user.id,
      pseudo,
      age: age ? parseInt(age, 10) : null,
      city,
      gender,
      looking_for,
      tagline,
      avatar_url,
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