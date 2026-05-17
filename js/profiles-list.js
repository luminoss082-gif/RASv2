/* =========================
   PROFILS + LISTE + FILTRES
========================= */

import { supabaseClient } from "./config.js";
import { state, setCurrentUserId, setProfilesCache } from "./core.js";
import { loadFavorites, toggleFavorite } from "./favorites.js";

function formatLastSeen(dateString) {
  if (!dateString) return "Hors ligne";

  const date = new Date(dateString);
  const diff = Math.floor((Date.now() - date.getTime()) / 60000);

  if (diff < 1) return "À l’instant";
  if (diff < 60) return `Vu il y a ${diff} min`;

  const hours = Math.floor(diff / 60);
  if (hours < 24) return `Vu il y a ${hours}h`;

  return `Vu il y a ${Math.floor(hours / 24)}j`;
}

function getAvatarUrl(url) {
  const defaultAvatar =
    "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  if (!url) return defaultAvatar;
  if (url.startsWith("http")) return url;

  return `https://ulfkjmdhryaulesxlbxf.supabase.co/storage/v1/object/public/avatars/${url}`;
}

function normalizeGender(value) {
  if (!value) return "";
  if (value === "Homme") return "H";
  if (value === "Femme") return "F";
  return value;
}

function openProfileModal(profile) {
  const profileModal = document.getElementById("profileModal");
  const profileModalBody = document.getElementById("profileModalBody");

  if (!profileModal || !profileModalBody) return;

  profileModalBody.innerHTML = `
    <img
      src="${getAvatarUrl(profile.avatar_url)}"
      class="modal-profile-img"
    >

    <div class="modal-profile-info">
      <h2>${profile.pseudo || "Profil"}${profile.age ? ", " + profile.age : ""}</h2>
      <p>📍 ${profile.city || "Ville inconnue"}</p>
      <p>${profile.tagline || ""}</p>
      <p>${profile.bio || ""}</p>

      ${
        profile.is_online
          ? `<span class="online-badge">🟢 En ligne</span>`
          : `<span class="offline-badge">⏰ ${formatLastSeen(profile.last_seen)}</span>`
      }
    </div>
  `;

  profileModal.classList.remove("hidden");
}

export async function loadProfiles() {
  if (!window.location.pathname.includes("liste.html")) return;

  const profilesList = document.getElementById("profilesList");

  const { data: { user } } = await supabaseClient.auth.getUser();
  setCurrentUserId(user?.id || null);

  if (state.currentUserId) {
    await loadFavorites();
  }

  const { data: profiles, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);

    if (profilesList) {
      profilesList.innerHTML = `<p class="error-msg">${error.message}</p>`;
    }

    return;
  }

  const visibleProfiles = (profiles || []).filter((p) => !p.is_banned);

  state.allProfilesCache = visibleProfiles;
  setProfilesCache(visibleProfiles);

  renderMyProfile();
  renderProfiles();
}

export function renderMyProfile() {
  const myProfileCard = document.getElementById("myProfileCard");
  if (!myProfileCard) return;

  if (!state.currentUserId) {
    myProfileCard.innerHTML = `
      <div class="card">
        <p>Connectez-vous pour voir votre profil.</p>
      </div>
    `;
    return;
  }

  const me = state.allProfilesCache.find((p) => p.id === state.currentUserId);

  if (!me) {
    myProfileCard.innerHTML = `
      <div class="card">
        <p>Votre profil n’existe pas encore.</p>
        <a href="create-profile.html" class="btn primary">Créer mon profil</a>
      </div>
    `;
    return;
  }

  myProfileCard.innerHTML = `
    <img src="${getAvatarUrl(me.avatar_url)}" class="avatar-img">

    <div class="profile-info">
      <h3>
        ${me.pseudo || "Mon profil"}
        ${me.age ? ", " + me.age : ""}
        ${me.is_verified ? "✔️" : ""}
      </h3>

      <div class="profile-status">
        ${
          me.is_online
            ? `<span class="online-badge">🟢 En ligne</span>`
            : `<span class="offline-badge">⏰ ${formatLastSeen(me.last_seen)}</span>`
        }
      </div>

      <p>${me.city || ""}</p>
      <p>${me.tagline || ""}</p>

      <button
        type="button"
        class="btn ghost"
        onclick="window.location.href='edit-profile.html'"
      >
        Modifier mon profil
      </button>
    </div>
  `;
}

export function renderProfiles() {
  const profilesList = document.getElementById("profilesList");
  if (!profilesList) return;

  const search = (document.getElementById("searchInput")?.value || "").toLowerCase();
  const city = (document.getElementById("cityFilter")?.value || "").toLowerCase();
  const gender = document.getElementById("genderFilter")?.value || "";
  const favoritesOnly = document.getElementById("favoritesOnly")?.checked || false;

  let filteredProfiles = [...state.allProfilesCache];

  filteredProfiles = filteredProfiles.filter((p) => {
    if (p.is_banned) return false;
    if (favoritesOnly && !state.favoritesSet.has(p.id)) return false;

    if (search) {
      const text = `${p.pseudo || ""} ${p.tagline || ""}`.toLowerCase();
      if (!text.includes(search)) return false;
    }

    if (city && !(p.city || "").toLowerCase().includes(city)) return false;
    if (gender && normalizeGender(p.gender) !== gender) return false;

    return true;
  });

  profilesList.innerHTML = "";

  if (filteredProfiles.length === 0) {
    profilesList.innerHTML = `<p>Aucun profil trouvé.</p>`;
    return;
  }

  filteredProfiles.forEach((p) => {
    const isMe = p.id === state.currentUserId;
    const div = document.createElement("div");

    div.className = isMe ? "profile-item my-profile" : "profile-item";
    div.dataset.id = p.id;

    div.innerHTML = `
      <button
        class="favorite-btn ${state.favoritesSet.has(p.id) ? "filled" : ""}"
        data-fav="${p.id}"
        type="button"
      >
        ${state.favoritesSet.has(p.id) ? "♥" : "♡"}
      </button>

      <img src="${getAvatarUrl(p.avatar_url)}" class="avatar-img">

      <div class="profile-info">
        <h3>
          ${p.pseudo || "Profil"}
          ${p.age ? ", " + p.age : ""}
          ${p.is_verified ? "✔️" : ""}
          ${isMe ? `<span class="badge-self">Mon profil</span>` : ""}
        </h3>

        <div class="profile-status">
          ${
            p.is_online
              ? `<span class="online-badge">🟢 En ligne</span>`
              : `<span class="offline-badge">⏰ ${formatLastSeen(p.last_seen)}</span>`
          }
        </div>

        <p>${p.city || ""}</p>
        <p>${p.tagline || ""}</p>

        ${
          !isMe
            ? `
              <button class="btn primary" type="button" data-request-chat="${p.id}">
                Demander à discuter
              </button>

              <button class="btn success" type="button" data-pay-chat="${p.id}">
                Payer
              </button>

       <button
  class="btn ghost hidden-whatsapp-btn"
  type="button"
  data-whatsapp-pay="${p.id}"
  style="display:none;"
>
  J’ai payé — contacter admin
</button>
            `
            : `<span class="badge-self">Mon profil</span>`
        }
      </div>
    `;

    div.addEventListener("click", (e) => {
      if (
        e.target.closest(".favorite-btn") ||
        e.target.closest("[data-request-chat]") ||
        e.target.closest("[data-pay-chat]") ||
        e.target.closest("[data-whatsapp-pay]")
      ) {
        return;
      }

      openProfileModal(p);
    });

    const favBtn = div.querySelector(".favorite-btn");

    favBtn?.addEventListener("click", async (e) => {
      e.stopPropagation();

      if (!state.currentUserId) {
        alert("Connectez-vous.");
        return;
      }

      await toggleFavorite(p.id);
      await loadProfiles();
    });

    const requestChatBtn = div.querySelector("[data-request-chat]");

    requestChatBtn?.addEventListener("click", async (e) => {
      e.stopPropagation();

      if (!state.currentUserId) {
        alert("Connectez-vous.");
        return;
      }

      const { error } = await supabaseClient
        .from("chat_requests")
        .insert({
          requester_id: state.currentUserId,
          target_id: p.id,
          status: "pending"
        });

      if (error) {
        if (error.code === "23505") {
          alert("Demande déjà envoyée.");
          return;
        }

        alert(error.message);
        return;
      }

      alert("Demande envoyée !");
    });

const payChatBtn =
  div.querySelector("[data-pay-chat]");

const whatsappPayBtn =
  div.querySelector("[data-whatsapp-pay]");

  payChatBtn?.addEventListener(
  "click",
  (e) => {

    e.stopPropagation();

    window.open(
      "https://paypal.me/jeffreygadal1/5.00",
      "_blank"
    );

    alert(
      "Après le paiement PayPal, cliquez sur le bouton WhatsApp."
    );

    if (whatsappPayBtn) {
      whatsappPayBtn.style.display = "flex";
    }

  }
);

    whatsappPayBtn?.addEventListener("click", (e) => {
      e.stopPropagation();

      const confirmPaid = confirm(
        "Confirmez-vous avoir payé sur PayPal ?"
      );

      if (!confirmPaid) return;

const currentUser =
  state.allProfilesCache.find(
    u => u.id === state.currentUserId
  );

const requesterName =
  currentUser?.pseudo || "Utilisateur";

const message = encodeURIComponent(
  `Bonjour,

J'ai payé pour débloquer le chat avec :
${p.pseudo || "ce profil"}

Nom utilisateur :
${requesterName}

ID utilisateur :
${state.currentUserId}

Merci !`
);
      window.location.href = `https://wa.me/33676615490?text=${message}`;
    });

    profilesList.appendChild(div);
  });
}

export function initProfilesList() {
  const filtersForm = document.getElementById("filtersForm");

  if (filtersForm) {
    filtersForm.addEventListener("input", renderProfiles);
  }

  loadProfiles();
}

document.getElementById("closeProfileModal")?.addEventListener("click", () => {
  document.getElementById("profileModal")?.classList.add("hidden");
});

document.getElementById("profileModal")?.addEventListener("click", (e) => {
  if (e.target.id === "profileModal") {
    e.target.classList.add("hidden");
  }
});