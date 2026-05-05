/* =========================
   MA CARTE PROFIL
========================= */

import { supabaseClient } from "./config.js";

export async function loadMyProfileCard() {
  const card = document.getElementById("myProfileCard");
  if (!card) return;

  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  const { data: me } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!me) {
    card.innerHTML = `
      <div class="warning">
        Vous n'avez pas encore créé votre profil.
        <a href="create-profile.html" class="btn small">Créer mon profil</a>
      </div>
    `;
    return;
  }

  card.innerHTML = `
    <div class="my-card">
      <img src="${me.avatar_url}" class="avatar-small">
      <div>
        <h3>${me.pseudo}</h3>
        <p>${me.age} ans – ${me.city}</p>
        <a href="edit-profile.html" class="btn small">Modifier mon profil</a>
      </div>
    </div>
  `;
}
