

/* =========================
PROFILS + LISTE + FILTRES
========================= */

import { supabaseClient } from "./config.js";
import { state, setCurrentUserId, setProfilesCache } from "./core.js";
import { loadFavorites, toggleFavorite } from "./favorites.js";

/* =========================
HELPERS
========================= */

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
"[https://cdn-icons-png.flaticon.com/512/149/149071.png](https://cdn-icons-png.flaticon.com/512/149/149071.png)";

if (!url) return defaultAvatar;

if (url.startsWith("http")) {
return url;
}

const cleanUrl = url.replace(/^/+/, "");

return `https://ulfkjmdhryaulesxlbxf.supabase.co/storage/v1/object/public/avatars/${cleanUrl}`;
}

function normalizeGender(value) {
if (!value) return "";
if (value === "Homme") return "H";
if (value === "Femme") return "F";
return value;
}

function isNewProfile(createdAt) {
if (!createdAt) return false;

const created = new Date(createdAt);

const diffDays =
(Date.now() - created.getTime()) /
(1000 * 60 * 60 * 24);

return diffDays <= 7;
}

/* =========================
MODAL PROFIL
========================= */

function openProfileModal(profile) {

const profileModal =
document.getElementById("profileModal");

const profileModalBody =
document.getElementById("profileModalBody");

if (!profileModal || !profileModalBody) return;

profileModalBody.innerHTML = `


<img
  src="${getAvatarUrl(profile.avatar_url)}"
  class="modal-profile-img"
  alt="Photo de ${profile.pseudo || "profil"}"
  onerror="this.src='https://cdn-icons-png.flaticon.com/512/149/149071.png'"
>

<div class="modal-profile-info">

  <h2>
    ${profile.pseudo || "Profil"}
    ${profile.age ? ", " + profile.age : ""}
    ${profile.is_verified ? " ✔️" : ""}
  </h2>

  <p>📍 ${profile.city || "Ville inconnue"}</p>
  <p>${profile.tagline || ""}</p>
  <p>${profile.bio || ""}</p>
  <p>🎯 Recherche : ${profile.relationship_goal || "Non précisé"}</p>
  <p>✨ Passions : ${profile.passions || "Non précisées"}</p>

  <div class="profile-status">
    ${
      profile.is_online
        ? `<span class="online-badge">🟢 En ligne</span>`
        : `<span class="offline-badge">⏰ ${formatLastSeen(profile.last_seen)}</span>`
    }
  </div>

</div>

`;

profileModal.classList.remove("hidden");
}

/* =========================
MATCH + PAIEMENT
========================= */

function showMatchBox(profile) {

const matchBox =
document.getElementById("matchBox");

if (!matchBox) return;

matchBox.classList.remove("hidden");

matchBox.innerHTML = `


<div class="card match-card">

  <h2>
    🎉 Match avec ${profile.pseudo || "ce profil"} !
  </h2>

  <p>
    Vous vous êtes likés tous les deux ❤️
  </p>

  <p>
    Débloquez maintenant le chat privé.
  </p>

  <button
    class="btn success"
    id="payMatchBtn"
    type="button"
  >
    💳 Débloquer le chat
  </button>

</div>


`;

document
.getElementById("payMatchBtn")
?.addEventListener("click", async () => {

  const currentPseudo =
    state.allProfilesCache.find(
      (u) => u.id === state.currentUserId
    )?.pseudo || "Utilisateur";

  const targetPseudo =
    profile.pseudo || "Profil";

  const message = encodeURIComponent(


`✨ LOVE CONNECT — Déblocage Chat ✨

Bonjour 👋

Un nouveau match souhaite débloquer une conversation ❤️

━━━━━━━━━━━━━━

💌 ${currentPseudo}
souhaite discuter avec
💌 ${targetPseudo}

━━━━━━━━━━━━━━

Le paiement vient d’être effectué.

Merci de débloquer leur accès au chat 🔓`
);


  window.open(
    "https://paypal.me/jeffreygadal1/5.00",
    "_blank"
  );

  setTimeout(() => {

    window.location.href =
      `https://wa.me/33676615490?text=${message}`;

  }, 1200);

});


}

/* =========================
LOAD PROFILS
========================= */

export async function loadProfiles() {

if (!window.location.pathname.includes("liste.html")) return;

const profilesList =
document.getElementById("profilesList");

const {
data: { user }
} = await supabaseClient.auth.getUser();

setCurrentUserId(user?.id || null);

if (state.currentUserId) {
await loadFavorites();
}

const { data: profiles, error } = await supabaseClient
.from("profiles")
.select("*")
.order("created_at", { ascending: false });

if (error) {

console.error("Erreur profils:", error);

if (profilesList) {
  profilesList.innerHTML = `
    <p class="error-msg">${error.message}</p>
  `;
}

return;


}

state.allProfilesCache = profiles || [];
setProfilesCache(profiles || []);

renderMyProfile();
renderProfiles();
}

/* =========================
MON PROFIL
========================= */

export function renderMyProfile() {

const myProfileCard =
document.getElementById("myProfileCard");

if (!myProfileCard) return;

if (!state.currentUserId) {


myProfileCard.innerHTML = `
  <div class="card">
    <p>Connectez-vous pour voir votre profil.</p>
  </div>
`;

return;


}

const me = state.allProfilesCache.find(
(p) => p.id === state.currentUserId
);

if (!me) return;

myProfileCard.innerHTML = `


<img
  src="${getAvatarUrl(me.avatar_url)}"
  class="avatar-img"
  alt="Mon profil"
  onerror="this.src='https://cdn-icons-png.flaticon.com/512/149/149071.png'"
>

<div class="profile-info">

  <h3>
    ${me.pseudo || "Mon profil"}
    ${me.age ? ", " + me.age : ""}
  </h3>

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

/* =========================
RENDER PROFILS
========================= */

export function renderProfiles() {

const profilesList =
document.getElementById("profilesList");

if (!profilesList) return;

const search = (
document.getElementById("searchInput")?.value || ""
).toLowerCase();

const city = (
document.getElementById("cityFilter")?.value || ""
).toLowerCase();

const gender =
document.getElementById("genderFilter")?.value || "";

const favoritesOnly =
document.getElementById("favoritesOnly")?.checked || false;

let filteredProfiles = [...state.allProfilesCache];

filteredProfiles = filteredProfiles.filter((p) => {

if (favoritesOnly && !state.favoritesSet.has(p.id)) {
  return false;
}

if (search) {

  const text =
    `${p.pseudo || ""} ${p.tagline || ""} ${p.city || ""}`
      .toLowerCase();

  if (!text.includes(search)) {
    return false;
  }
}

if (
  city &&
  !(p.city || "").toLowerCase().includes(city)
) {
  return false;
}

if (
  gender &&
  normalizeGender(p.gender) !== gender
) {
  return false;
}

return true;


});

profilesList.innerHTML = "";

filteredProfiles.forEach((p) => {


const isMe = p.id === state.currentUserId;

const div = document.createElement("div");

div.className =
  isMe
    ? "profile-item my-profile"
    : "profile-item";

div.innerHTML = `

  <button
    class="favorite-btn ${state.favoritesSet.has(p.id) ? "filled" : ""}"
    data-fav="${p.id}"
    type="button"
  >
    ${state.favoritesSet.has(p.id) ? "♥" : "♡"}
  </button>

  <img
    src="${getAvatarUrl(p.avatar_url)}"
    class="avatar-img"
    alt="Photo de ${p.pseudo || "profil"}"
    onerror="this.src='https://cdn-icons-png.flaticon.com/512/149/149071.png'"
  >

  <div class="profile-info">

    <h3>
      ${p.pseudo || "Profil"}
      ${p.age ? ", " + p.age : ""}
      ${p.is_verified ? "✔️" : ""}
      ${isNewProfile(p.created_at)
        ? `<span class="badge-new">Nouveau</span>`
        : ""
      }
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

          <button
            class="btn primary"
            type="button"
            data-like-user="${p.id}"
          >
            ❤️ Like
          </button>

          <button
            class="btn ghost"
            type="button"
            data-block-user="${p.id}"
          >
            Bloquer
          </button>

          <button
            class="btn danger"
            type="button"
            data-report-user="${p.id}"
          >
            Signaler
          </button>
        `
        : `<span class="badge-self">Mon profil</span>`
    }

  </div>
`;

const favBtn =
  div.querySelector(".favorite-btn");

const likeBtn =
  div.querySelector("[data-like-user]");

const blockBtn =
  div.querySelector("[data-block-user]");

const reportBtn =
  div.querySelector("[data-report-user]");

favBtn?.addEventListener("click", async (e) => {

  e.stopPropagation();

  await toggleFavorite(p.id);
  await loadProfiles();

});

likeBtn?.addEventListener("click", async (e) => {

  e.stopPropagation();

  if (!state.currentUserId) {
    alert("Connectez-vous.");
    return;
  }

  const { error } = await supabaseClient
    .from("likes")
    .insert({
      liker_id: state.currentUserId,
      liked_id: p.id
    });

  if (error && error.code !== "23505") {
    alert(error.message);
    return;
  }

  const { data: reverseLike } =
    await supabaseClient
      .from("likes")
      .select("id")
      .eq("liker_id", p.id)
      .eq("liked_id", state.currentUserId)
      .maybeSingle();

  if (reverseLike) {

    showMatchBox(p);

  } else {

    alert("Like envoyé ❤️");

  }

});

blockBtn?.addEventListener("click", async (e) => {

  e.stopPropagation();

  const confirmBlock = confirm(
    `Bloquer ${p.pseudo || "ce profil"} ?`
  );

  if (!confirmBlock) return;

  const { error } = await supabaseClient
    .from("blocks")
    .insert({
      blocker: state.currentUserId,
      blocked: p.id
    });

  if (error && error.code !== "23505") {
    alert(error.message);
    return;
  }

  alert("Profil bloqué.");

  await loadProfiles();

});

reportBtn?.addEventListener("click", async (e) => {

  e.stopPropagation();

  const reason = prompt(
    "Pourquoi voulez-vous signaler ce profil ?"
  );

  if (!reason) return;

  const { error } = await supabaseClient
    .from("reports")
    .insert({
      reporter_id: state.currentUserId,
      reported_id: p.id,
      reason
    });

  if (error) {
    alert(error.message);
    return;
  }

  alert("Signalement envoyé.");

});

div.addEventListener("click", (e) => {

  if (
    e.target.closest("button")
  ) {
    return;
  }

  openProfileModal(p);

});

profilesList.appendChild(div);


});
}

/* =========================
INIT
========================= */

export function initProfilesList() {

const filtersForm =
document.getElementById("filtersForm");

if (filtersForm) {
filtersForm.addEventListener(
"input",
renderProfiles
);
}

const clearFiltersBtn =
document.getElementById("clearFiltersBtn");

clearFiltersBtn?.addEventListener("click", () => {


const searchInput =
  document.getElementById("searchInput");

const cityFilter =
  document.getElementById("cityFilter");

const genderFilter =
  document.getElementById("genderFilter");

const favoritesOnly =
  document.getElementById("favoritesOnly");

if (searchInput) searchInput.value = "";
if (cityFilter) cityFilter.value = "";
if (genderFilter) genderFilter.value = "";
if (favoritesOnly) favoritesOnly.checked = false;

renderProfiles();


});

loadProfiles();
}

/* =========================
CLOSE MODAL
========================= */

document
.getElementById("closeProfileModal")
?.addEventListener("click", () => {


document
  .getElementById("profileModal")
  ?.classList.add("hidden");


});

document
.getElementById("profileModal")
?.addEventListener("click", (e) => {


if (e.target.id === "profileModal") {
  e.target.classList.add("hidden");
}

});


