import { supabaseClient } from "./config.js";

export async function initSettings() {
  if (!window.location.pathname.includes("settings.html")) return;

  const form = document.getElementById("settingsForm");
  if (!form) return;

  const bioInput = document.getElementById("bio");
  const passionsInput = document.getElementById("passions");
  const goalInput = document.getElementById("relationship_goal");
  const msg = document.getElementById("settingsMsg");

  const { data: { user } } = await supabaseClient.auth.getUser();

  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("bio, passions, relationship_goal")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
    bioInput.value = profile.bio || "";
    passionsInput.value = profile.passions || "";
    goalInput.value = profile.relationship_goal || "";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const { error } = await supabaseClient
      .from("profiles")
      .update({
        bio: bioInput.value.trim(),
        passions: passionsInput.value.trim(),
        relationship_goal: goalInput.value
      })
      .eq("id", user.id);

    if (error) {
      msg.textContent = error.message;
      msg.className = "error-msg";
      return;
    }

    msg.textContent = "Paramètres enregistrés ✅";
    msg.className = "success-msg";
  });
}