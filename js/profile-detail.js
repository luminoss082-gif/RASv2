/* =========================
   PROFIL DÉTAILLÉ + ACTIONS
========================= */

import { supabaseClient, ADMIN_ID } from "./config.js";
import { createNotification } from "./notifications.js";
import { toggleFavorite } from "./favorites.js";

export function initProfileDetail() {
  const profileDetail = document.getElementById("profileDetail");
  if (!profileDetail) return;

  (async () => {
    const params = new URLSearchParams(location.search);
    const id = params.get("id");

    const { data: profile, error } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !profile) {
      profileDetail.innerHTML = "<p>Profil introuvable.</p>";
      return;
    }

    profileDetail.innerHTML = `
      <img
  src="${getAvatarUrl(p.avatar_url)}"
  class="avatar-img"
  onerror="this.src='default-avatar.png'"
>
      <h2>${profile.pseudo}${profile.age ? ", " + profile.age : ""} ${profile.is_verified ? "✔️" : ""}</h2>
      <p>${profile.city || ""}</p>
      <p>${profile.tagline || ""}</p>
      <div class="profile-actions">

  <button class="btn primary" id="requestChatBtn">
    Demander à discuter
  </button>

  <button
    class="btn success hidden"
    id="payChatBtn"
  >
    Payer pour débloquer le chat
  </button>

</div>
      <button id="favoriteBtn" class="btn ghost full">⭐ Favori</button>
      <button id="reportBtn" class="btn danger full">🚨 Signaler</button>
      <button id="blockBtn" class="btn danger ghost full">⛔ Bloquer</button>
    `;

    const favoriteBtn = document.getElementById("favoriteBtn");
    const reportBtn = document.getElementById("reportBtn");
    const blockBtn = document.getElementById("blockBtn");


    if (favoriteBtn) {
      favoriteBtn.onclick = async () => {
        await toggleFavorite(id);
        alert("Favoris mis à jour !");
      };
    }

    if (reportBtn) {
      reportBtn.onclick = async () => {
        const reason = prompt("Pourquoi signalez-vous ce profil ?");
        if (!reason) return;

        const { data: { user } } = await supabaseClient.auth.getUser();
        await supabaseClient.from("reports").insert({ reporter: user.id, target: id, reason });
        await createNotification(ADMIN_ID, "report", "Un nouveau signalement a été envoyé", "admin-dashboard.html");
        alert("Signalement envoyé.");
      };
    }

    if (blockBtn) {
      blockBtn.onclick = async () => {
        const confirmBlock = confirm("Voulez-vous vraiment bloquer ce profil ?");
        if (!confirmBlock) return;

        const { data: { user } } = await supabaseClient.auth.getUser();
        await supabaseClient.from("blocks").insert({ blocker: user.id, blocked: id });
        alert("Profil bloqué.");
        window.location.href = "liste.html";
      };
    }
  })();
}
