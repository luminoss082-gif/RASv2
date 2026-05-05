/* =========================
   MODIFIER PROFIL
========================= */

import { supabaseClient } from "./config.js";
import { uploadAvatar } from "./avatar-upload.js";

export function initEditProfile() {
  const editProfileForm = document.getElementById("editProfileForm");
  if (!editProfileForm) return;

  (async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const { data: me } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    document.getElementById("editPseudo").value = me.pseudo || "";
    document.getElementById("editAge").value = me.age || "";
    document.getElementById("editCity").value = me.city || "";
    document.getElementById("editGender").value = me.gender || "";
    document.getElementById("editLookingFor").value = me.looking_for || "";
    document.getElementById("editTagline").value = me.tagline || "";
    document.getElementById("preview").src = me.avatar_url || "";
  })();

  editProfileForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const form = new FormData(editProfileForm);
    const pseudo = form.get("pseudo");
    const age = form.get("age");
    const city = form.get("city");
    const gender = form.get("gender");
    const looking_for = form.get("looking_for");
    const tagline = form.get("tagline");
    const avatarFile = form.get("avatar");

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    let avatar_url = null;
    if (avatarFile && avatarFile.size > 0) {
      avatar_url = await uploadAvatar(user.id, avatarFile);
    }

    await supabaseClient.from("profiles").update({
      pseudo,
      age: age ? parseInt(age) : null,
      city,
      gender,
      looking_for,
      tagline,
      ...(avatar_url && { avatar_url })
    }).eq("id", user.id);

    window.location.href = "liste.html";
  });
}
