/* =========================
   STORIES
========================= */

import { supabaseClient } from "./config.js";
import { getProfileIdFromUrl } from "./core.js";

export async function loadStories() {
  const storiesBar = document.getElementById("storiesBar");
  if (!storiesBar) return;

  const { data: stories, error } = await supabaseClient
    .from("stories")
    .select(`
      id,
      image_url,
      text,
      created_at,
      profiles:user_id (
        pseudo,
        avatar_url
      )
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Erreur stories :", error.message);
    return;
  }

  storiesBar.innerHTML = "";

  (stories || []).forEach((s) => {
    const div = document.createElement("div");
    div.className = "story-item";
    div.innerHTML = `
      <img src="${s.profiles.avatar_url}" class="story-avatar">
      <div>${s.profiles.pseudo}</div>
    `;
    div.onclick = () => alert(`${s.profiles.pseudo} : ${s.text || "Story"}`);
    storiesBar.appendChild(div);
  });
}

export async function initProfileStories() {
  const storiesBar = document.getElementById("storiesBar");
  if (!storiesBar) return;

  const profileId = getProfileIdFromUrl();
  if (!profileId) return;

  const { data, error } = await supabaseClient
    .from("stories")
    .select("*")
    .eq("profile_id", profileId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur chargement stories:", error);
    return;
  }

  const stories = data || [];
  if (!stories.length) {
    storiesBar.style.display = "none";
    return;
  }

  storiesBar.innerHTML = "";
  storiesBar.style.display = "flex";

  stories.forEach(story => {
    const item = document.createElement("div");
    item.className = "story-item";

    const img = document.createElement("img");
    img.src = story.media_url;
    img.alt = "Story";

    item.appendChild(img);
    storiesBar.appendChild(item);
    item.addEventListener("click", () => openStoryViewer(story, stories));
  });
}

export function openStoryViewer(currentStory, allStories = []) {
  let overlay = document.getElementById("storyOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "storyOverlay";
    overlay.className = "story-overlay";

    const img = document.createElement("img");
    img.id = "storyOverlayImage";
    overlay.appendChild(img);

    document.body.appendChild(overlay);
    overlay.addEventListener("click", () => { overlay.style.display = "none"; });
  }

  const img = document.getElementById("storyOverlayImage");
  img.src = currentStory.media_url;
  overlay.style.display = "flex";
}

export function initStories() {
  if (document.getElementById("storiesBar")) loadStories();
  initProfileStories();
}
