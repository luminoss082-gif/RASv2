/* =========================
   FAVORIS
========================= */

import { supabaseClient } from "./config.js";
import { state, setCurrentUserId, setFavoritesSet } from "./core.js";
import { renderProfiles } from "./profiles-list.js";

export async function loadFavorites() {
  if (!state.currentUserId) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    setCurrentUserId(user?.id || null);
  }
  if (!state.currentUserId) return;

  const { data } = await supabaseClient
    .from("favorites")
    .select("target_id")
    .eq("user_id", state.currentUserId);

  setFavoritesSet(new Set((data || []).map(f => f.target_id)));
}

export async function toggleFavorite(targetId) {
  if (!state.currentUserId) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    setCurrentUserId(user?.id || null);
  }
  if (!state.currentUserId) return;

  if (state.favoritesSet.has(targetId)) {
    await supabaseClient.from("favorites")
      .delete()
      .eq("user_id", state.currentUserId)
      .eq("target_id", targetId);

    state.favoritesSet.delete(targetId);
  } else {
    await supabaseClient.from("favorites").insert({
      user_id: state.currentUserId,
      target_id: targetId
    });

    state.favoritesSet.add(targetId);
  }

  renderProfiles();
}
