/* =========================
   VARIABLES GLOBALES
========================= */

export const state = {
  currentUserId: null,
  allProfilesCache: [],
  favoritesSet: new Set(),
  notifList: [],
  currentChatUserId: null
};

export function setCurrentUserId(id) {
  state.currentUserId = id;
}

export function setProfilesCache(profiles) {
  state.allProfilesCache = profiles || [];
}

export function setFavoritesSet(set) {
  state.favoritesSet = set || new Set();
}

export function setNotifList(list) {
  state.notifList = list || [];
}

export function getProfileIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}
