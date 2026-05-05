/* =========================
   MATCHING AUTOMATIQUE
========================= */

import { state } from "./core.js";

export function computeMatches() {
  const matchBox = document.getElementById("matchBox");
  if (!matchBox || !state.currentUserId) return;

  const me = state.allProfilesCache.find(p => p.id === state.currentUserId);
  if (!me) {
    matchBox.classList.add("hidden");
    return;
  }

  const matches = state.allProfilesCache.filter(p => {
    if (p.id === state.currentUserId) return false;
    if (p.is_banned) return false;

    const cond1 = !me.looking_for || me.looking_for === "Peu importe" || me.looking_for === p.gender;
    const cond2 = !p.looking_for || p.looking_for === "Peu importe" || p.looking_for === me.gender;

    return cond1 && cond2;
  });

  if (!matches.length) {
    matchBox.classList.add("hidden");
    return;
  }

  matchBox.classList.remove("hidden");
  matchBox.textContent = `Nous avons trouvé ${matches.length} profils compatibles avec vous.`;
}
