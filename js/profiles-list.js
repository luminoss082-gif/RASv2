/* =========================
   PROFILS + LISTE + FILTRES
========================= */

import { supabaseClient } from "./config.js";
import { state, setCurrentUserId, setProfilesCache } from "./core.js";
import { loadFavorites, toggleFavorite } from "./favorites.js";
import { computeMatches } from "./matching.js";

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

  const days = Math.floor(hours / 24);

  return `Vu il y a ${days}j`;
}

function normalizeGender(value) {
  if (!value) return "";

  if (value === "Homme") return "H";
  if (value === "Femme") return "F";

  return value;
}

/* =========================
   LOAD PROFILS
========================= */

export async function loadProfiles() {

  if (!window.location.pathname.includes("liste.html")) {
    return;
  }

  const profilesList =
    document.getElementById("profilesList");

  const {
    data: { user }
  } = await supabaseClient.auth.getUser();

  setCurrentUserId(user?.id || null);

  if (state.currentUserId) {
    await loadFavorites();
  }

  const { data: profiles, error } =
    await supabaseClient
      .from("profiles")
      .select("*")
      .order("pseudo", { ascending: true });

  console.log("PROFILES:", profiles);
  console.log("ERROR PROFILES:", error);

  if (error) {

    console.error(error);

    if (profilesList) {
      profilesList.innerHTML = `
        <p class="error-msg">
          ${error.message}
        </p>
      `;
    }

    return;
  }

  let blockedIds = new Set();

  if (state.currentUserId) {

    const { data: blocks } =
      await supabaseClient
        .from("blocks")
        .select("blocked")
        .eq("blocker", state.currentUserId);

    blockedIds = new Set(
      (blocks || []).map((b) => b.blocked)
    );
  }

console.log("USER CONNECTÉ:", state.currentUserId);
console.log("PROFILS SUPABASE:", profiles);

const visibleProfiles = (profiles || []).filter((p) => {
  if (p.is_banned) return false;
  return true;
});

  state.allProfilesCache = visibleProfiles;
  
  setProfilesCache(visibleProfiles);

  renderProfiles();

  renderMyProfile();

  try {
    computeMatches();
  } catch (err) {
    console.warn(err);
  }

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
        <p>Connectez-vous.</p>
      </div>
    `;

    return;
  }

  const me =
    state.allProfilesCache.find(
      (p) => p.id === state.currentUserId
    );

  if (!me) {

    myProfileCard.innerHTML = `
      <div class="card">
        <p>Vous n’avez pas encore de profil.</p>

        <a
          href="create-profile.html"
          class="btn primary"
        >
          Créer mon profil
        </a>
      </div>
    `;

    return;
  }

  myProfileCard.innerHTML = `
    <img
      src="${me.avatar_url || "default-avatar.png"}"
      class="avatar-img"
      onerror="this.src='default-avatar.png'"
    >

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

  const ageMin = parseInt(
    document.getElementById("ageMin")?.value || "0"
  );

  const ageMax = parseInt(
    document.getElementById("ageMax")?.value || "200"
  );

  const city = (
    document.getElementById("cityFilter")?.value || ""
  ).toLowerCase();

  const gender =
    document.getElementById("genderFilter")?.value || "";

  const favoritesOnly =
    document.getElementById("favoritesOnly")?.checked || false;

  const filteredProfiles =
    state.allProfilesCache.filter((p) => {

      if (
        favoritesOnly &&
        !state.favoritesSet.has(p.id)
      ) {
        return false;
      }

      if (search) {

        const haystack =
          `${p.pseudo || ""} ${p.tagline || ""}`
            .toLowerCase();

        if (!haystack.includes(search)) {
          return false;
        }
      }

      if (
        !isNaN(ageMin) &&
        p.age &&
        p.age < ageMin
      ) {
        return false;
      }

      if (
        !isNaN(ageMax) &&
        p.age &&
        p.age > ageMax
      ) {
        return false;
      }

      if (
        city &&
        (
          !p.city ||
          !p.city.toLowerCase().includes(city)
        )
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

  if (filteredProfiles.length === 0) {

    profilesList.innerHTML = `
      <p>Aucun profil trouvé.</p>
    `;

    return;
  }

  filteredProfiles.forEach((p) => {

    const div =
      document.createElement("div");

    div.className = "profile-item";

    div.setAttribute("data-id", p.id);

    div.innerHTML = `

      <button
        class="favorite-btn ${
          state.favoritesSet.has(p.id)
            ? "filled"
            : ""
        }"
        data-fav="${p.id}"
      >
        ${
          state.favoritesSet.has(p.id)
            ? "♥"
            : "♡"
        }
      </button>

      <img
        src="${
          p.avatar_url ||
          "default-avatar.png"
        }"
        class="avatar-img"
        onerror="this.src='default-avatar.png'"
      >

      <div class="profile-info">

        <h3>
          ${p.pseudo || "Profil"}
          ${p.age ? ", " + p.age : ""}
          ${p.is_verified ? "✔️" : ""}
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
          p.id !== state.currentUserId
            ? `
              <button
                class="btn primary"
                data-request-chat="${p.id}"
              >
                Demander à discuter
              </button>

              <button
                class="btn success"
                data-pay-chat="${p.id}"
              >
                Payer et contacter admin
              </button>
            `
            : `
              <span class="badge-self">
                Mon profil
              </span>
            `
        }

      </div>
    `;

    /* =========================
       OUVRIR PROFIL
    ========================= */

    div.addEventListener("click", (e) => {

      if (
        e.target.closest(".favorite-btn") ||
        e.target.closest("[data-request-chat]") ||
        e.target.closest("[data-pay-chat]")
      ) {
        return;
      }

      window.location.href =
        `profile.html?id=${p.id}`;

    });

    /* =========================
       FAVORIS
    ========================= */

    const favBtn =
      div.querySelector(".favorite-btn");

    if (favBtn) {

      favBtn.addEventListener(
        "click",
        async (e) => {

          e.stopPropagation();

          if (!state.currentUserId) {
            alert(
              "Connectez-vous."
            );
            return;
          }

          await toggleFavorite(p.id);

        }
      );

    }

    /* =========================
       DEMANDE DISCUSSION
    ========================= */

    const requestChatBtn =
      div.querySelector(
        "[data-request-chat]"
      );

    if (requestChatBtn) {

      requestChatBtn.addEventListener(
        "click",
        async (e) => {

          e.stopPropagation();

          if (!state.currentUserId) {

            alert(
              "Connectez-vous."
            );

            return;
          }

          const { error } =
            await supabaseClient
              .from("chat_requests")
              .insert({
                requester_id:
                  state.currentUserId,
                target_id: p.id,
                status: "pending"
              });

          if (error) {

            if (
              error.code === "23505"
            ) {

              alert(
                "Demande déjà envoyée."
              );

              return;
            }

            alert(error.message);

            return;
          }

          alert(
            "Demande envoyée !"
          );

        }
      );

    }

    /* =========================
       PAYPAL + WHATSAPP
    ========================= */

    const payChatBtn =
      div.querySelector(
        "[data-pay-chat]"
      );

    if (payChatBtn) {

      payChatBtn.addEventListener(
        "click",
        (e) => {

          e.stopPropagation();

          window.open(
            "https://paypal.me/jeffreygqadal1/5.00",
            "_blank"
          );

          const message =
            encodeURIComponent(
              `Bonjour, j'ai payé pour débloquer le chat avec ${p.pseudo || "ce profil"}. Mon pseudo est : ${state.currentUserId}. Merci !`
            );

          setTimeout(() => {

            window.location.href =
              `https://wa.me/33676615490?text=${message}`;

          }, 1500);

        }
      );

    }

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

  loadProfiles();

}