/* =========================
   PROFILS + LISTE + FILTRES
========================= */

import { supabaseClient } from "./config.js";
import { state, setCurrentUserId, setProfilesCache } from "./core.js";
import { loadFavorites, toggleFavorite } from "./favorites.js";
import { computeMatches } from "./matching.js";

export async function loadProfiles() {
  if (!window.location.pathname.includes("liste.html")) return;

  const { data: { user } } = await supabaseClient.auth.getUser();
  setCurrentUserId(user?.id || null);

  await loadFavorites();

  const { data: profiles } = await supabaseClient
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: blocks } = await supabaseClient
    .from("blocks")
    .select("blocked")
    .eq("blocker", state.currentUserId);

  const blockedIds = new Set((blocks || []).map(b => b.blocked));
  const visibleProfiles = (profiles || []).filter(p => !blockedIds.has(p.id));

  setProfilesCache(visibleProfiles);
  renderProfiles();
  renderMyProfile();
  computeMatches();
}

export function renderMyProfile() {
  const myProfileCard = document.getElementById("myProfileCard");
  if (!myProfileCard || !state.currentUserId) return;

  const me = state.allProfilesCache.find(p => p.id === state.currentUserId);
  if (!me) return;

  myProfileCard.innerHTML = `
    <img src="${me.avatar_url}" class="avatar-img">
    <div class="profile-info">
      <h3>${me.pseudo}${me.age ? ", " + me.age : ""} ${me.is_verified ? "✔️" : ""}</h3>
      <p>${me.city || ""}</p>
      <p>${me.tagline || ""}</p>
      <button class="btn ghost" onclick="window.location.href='edit-profile.html'">Modifier mon profil</button>
    </div>
  `;
}

export function renderProfiles() {
  const profilesList = document.getElementById("profilesList");
  if (!profilesList) return;

  const search = (document.getElementById("searchInput")?.value || "").toLowerCase();
  const ageMin = parseInt(document.getElementById("ageMin")?.value || "0");
  const ageMax = parseInt(document.getElementById("ageMax")?.value || "200");
  const city = (document.getElementById("cityFilter")?.value || "").toLowerCase();
  const gender = document.getElementById("genderFilter")?.value || "";
  const favoritesOnly = document.getElementById("favoritesOnly")?.checked || false;

  profilesList.innerHTML = "";

  state.allProfilesCache.filter(p => {
    if (p.is_banned) return false;
    if (favoritesOnly && !state.favoritesSet.has(p.id)) return false;

    if (search) {
      const haystack = `${p.pseudo || ""} ${p.tagline || ""}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    if (!isNaN(ageMin) && p.age && p.age < ageMin) return false;
    if (!isNaN(ageMax) && p.age && p.age > ageMax) return false;
    if (city && (!p.city || !p.city.toLowerCase().includes(city))) return false;
    if (gender && p.gender !== gender) return false;

    return true;
  }).forEach((p) => {
    const div = document.createElement("div");
    div.className = "profile-item";
    div.setAttribute("data-id", p.id);

    div.innerHTML = `
      <button class="favorite-btn ${state.favoritesSet.has(p.id) ? "filled" : ""}" data-fav="${p.id}">
        ${state.favoritesSet.has(p.id) ? "♥" : "♡"}
      </button>
      <img src="${p.avatar_url}" class="avatar-img">
      <div class="profile-info">
        <h3>${p.pseudo}${p.age ? ", " + p.age : ""} ${p.is_verified ? "✔️" : ""}</h3>
        <p>${p.city || ""}</p>
        <p>${p.tagline || ""}</p>
      </div>
    `;

    div.addEventListener("click", (e) => {
      if (e.target.closest(".favorite-btn")) return;
      window.location.href = `profile.html?id=${p.id}`;
    });

    const favBtn = div.querySelector(".favorite-btn");
    favBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(p.id);
    });

    profilesList.appendChild(div);
  });
}

export function initProfilesList() {
  const filtersForm = document.getElementById("filtersForm");
  if (filtersForm) filtersForm.addEventListener("input", renderProfiles);
  loadProfiles();
}
